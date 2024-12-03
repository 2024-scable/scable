import json
import re
from collections import deque
from urllib.parse import unquote
import sys

def load_json(file_path):
    """JSON 파일 로드"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"에러: JSON 파일 로드 실패: {file_path}\n{e}")
        return None

def save_json(data, file_path):
    """JSON 파일 저장"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"결과가 {file_path}에 저장되었습니다.")
    except Exception as e:
        print(f"에러: JSON 파일 저장 실패: {file_path}\n{e}")

def clean_purl(purl):
    """
    PURL에서 URL 인코딩을 제거하여 일관된 형식을 유지합니다.
    예: pkg:npm/%40esbuild/sunos-x64@0.19.12 -> pkg:npm/@esbuild/sunos-x64@0.19.12
    """
    return unquote(purl)

def extract_name_from_ref(ref):
    """
    Extract the package name from a PURL ref.
    Handles namespaced packages.
    E.g., 'pkg:npm/@esbuild/sunos-x64@0.19.12' -> '@esbuild/sunos-x64'
    'pkg:pypi/flask@1.1.2' -> 'flask'
    """
    pattern = r'^pkg:[^/]+/(?:(@[^/]+)\/)?([^@]+)@.+$'
    match = re.match(pattern, ref)
    if match:
        namespace = match.group(1)
        name = match.group(2)
        if namespace:
            return f"{namespace}/{name}"
        else:
            return name
    else:
        print(f"경고: ref 형식이 올바르지 않습니다 - {ref}")
        # As a fallback, extract name after last '/' and before '@'
        try:
            name_part = ref.split('/')[-1]
            name = name_part.split('@')[0]
            return name
        except Exception as e:
            print(f"에러: ref에서 name 추출 실패 - {ref}\n{e}")
            return ref

def determine_color(ref, package_map, reachable_libraries):
    """
    색상 결정
    - Red: reachable.json에 존재 (name matches)
    - Orange: CVE가 있음
    - Gray: 그 외
    """
    package = package_map.get(ref, {})
    vulnerabilities = package.get("vulnerabilities", [])

    # Extract name from ref
    name = extract_name_from_ref(ref)

    if name in reachable_libraries:
        return "Red"
    elif vulnerabilities:
        return "Orange"
    else:
        return "Gray"

def build_package_map(sbom_detail):
    """sbom-detail.json에서 패키지 맵 생성 (ref -> unique_id, vulnerabilities)"""
    package_map = {}
    for comp in sbom_detail.get("components", []):
        purl = comp.get("purl", "")
        if not purl:
            continue
        ref = clean_purl(purl)  # URL 인코딩 제거
        package_map[ref] = {
            "unique_id": comp.get("unique_id"),
            "vulnerabilities": comp.get("vulnerabilities", [])
        }
    return package_map

def build_dependency_map(cyclonedx):
    """sbom-cyclonedx.json에서 종속성 맵 생성 (ref -> [dependsOn])"""
    dependency_map = {}
    for dep in cyclonedx.get("dependencies", []):
        ref = dep.get("ref")
        dependsOn = dep.get("dependsOn", [])
        if ref:
            cleaned_ref = clean_purl(ref)  # URL 인코딩 제거
            cleaned_dependsOn = [clean_purl(dep) for dep in dependsOn]
            dependency_map[cleaned_ref] = cleaned_dependsOn
    return dependency_map

def get_reachable_libraries(reachable_data):
    """reachable.json에서 reachable-library 목록 추출"""
    return {item.get("reachable-library") for item in reachable_data if item.get("reachable-library")}

def filter_dependencies(package_map, dependency_map, reachable_libraries):
    """
    CVE가 있는 패키지와 그 종속성만 포함하도록 필터링
    """
    # CVE가 있는 패키지 식별
    cve_packages = {ref for ref, data in package_map.items() if data["vulnerabilities"]}

    # BFS 큐 초기화
    queue = deque(cve_packages)
    included_refs = set()

    while queue:
        current_ref = queue.popleft()
        if current_ref in included_refs:
            continue
        included_refs.add(current_ref)
        # 현재 패키지의 종속성 추가
        for dep_ref in dependency_map.get(current_ref, []):
            if dep_ref not in included_refs:
                queue.append(dep_ref)
    return included_refs

def create_filtered_dependencies(package_map, dependency_map, reachable_libraries, included_refs):
    """필터링된 종속성 목록 생성"""
    filtered_dependencies = []
    for ref in included_refs:
        package = package_map.get(ref, {})
        unique_id = package.get("unique_id")
        if unique_id is None:
            # unique_id가 없는 경우, 자동으로 생성 (예: 해시값)
            unique_id = "Null"
        vulnerabilities = package.get("vulnerabilities", [])
        color = determine_color(ref, package_map, reachable_libraries)

        # 포함된 종속성만 유지
        depends_on = [dep for dep in dependency_map.get(ref, []) if dep in included_refs]

        filtered_dependencies.append({
            "ref": ref,
            "unique_id": unique_id,
            "color": color,
            "cve": vulnerabilities,
            "dependsOn": depends_on
        })

    return filtered_dependencies

def main():
    target_repo_path = sys.argv[1]  
    start_time = sys.argv[2]
    repo_name = sys.argv[3]
    date = sys.argv[4]

    # 파일 경로 설정
    sbom_detail_path = f"{target_repo_path}/sbom-detail.json"
    sbom_cyclonedx_path = f"{target_repo_path}/{date}-{start_time}-{repo_name}-scable-CycloneDX.json"
    reachable_path = f"{target_repo_path}/reachable.json"
    output_path = f"{target_repo_path}/dependency.json"

    # 데이터 로드
    sbom_detail = load_json(sbom_detail_path)
    if not sbom_detail:
        print(f"{sbom_detail_path}을(를) 로드하지 못했습니다.")
        return

    sbom_cyclonedx = load_json(sbom_cyclonedx_path)
    if not sbom_cyclonedx:
        print(f"{sbom_cyclonedx_path}을(를) 로드하지 못했습니다.")
        return

    reachable_data = load_json(reachable_path)
    if not reachable_data:
        print(f"{reachable_path}을(를) 로드하지 못했습니다.")
        return

    # 패키지 맵 및 종속성 맵 생성
    package_map = build_package_map(sbom_detail)
    dependency_map = build_dependency_map(sbom_cyclonedx)


    # reachable-library 목록 추출
    reachable_libraries = get_reachable_libraries(reachable_data)


    # 종속성 필터링
    included_refs = filter_dependencies(package_map, dependency_map, reachable_libraries)

    # 필터링된 종속성 목록 생성
    filtered_dependencies = create_filtered_dependencies(
        package_map,
        dependency_map,
        reachable_libraries,
        included_refs
    )

    # 결과 저장
    save_json({"dependencies": filtered_dependencies}, output_path)
    print("[+] merge ok")

if __name__ == "__main__":
    main()
