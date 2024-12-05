import json
import re
from collections import deque
from urllib.parse import unquote
import sys

def load_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error: Failed to load JSON file: {file_path}\n{e}")
        return None

def save_json(data, file_path):
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"The result has been saved to {file_path}.")
    except Exception as e:
        print(f"Error: Failed to save JSON file: {file_path}\n{e}")

def clean_purl(purl):
    return unquote(purl)

def extract_name_from_ref(ref):
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
        print(f"Warning: Incorrect ref format - {ref}")
        try:
            name_part = ref.split('/')[-1]
            name = name_part.split('@')[0]
            return name
        except Exception as e:
            print(f"Error: Failed to extract name from ref - {ref}\n{e}")
            return ref

def determine_color(ref, package_map, reachable_libraries):
    package = package_map.get(ref, {})
    vulnerabilities = package.get("vulnerabilities", [])
    name = extract_name_from_ref(ref)
    if reachable_libraries and name in reachable_libraries:
        return "Red"
    elif vulnerabilities:
        return "Orange"
    else:
        return "Gray"

def build_package_map(sbom_detail):
    package_map = {}
    for comp in sbom_detail.get("components", []):
        purl = comp.get("purl", "")
        if not purl:
            continue
        ref = clean_purl(purl)
        package_map[ref] = {
            "unique_id": comp.get("unique_id"),
            "vulnerabilities": comp.get("vulnerabilities", [])
        }
    return package_map

def build_dependency_map(cyclonedx):
    dependency_map = {}
    for dep in cyclonedx.get("dependencies", []):
        ref = dep.get("ref")
        dependsOn = dep.get("dependsOn", [])
        if ref:
            cleaned_ref = clean_purl(ref)
            cleaned_dependsOn = [clean_purl(dep) for dep in dependsOn]
            dependency_map[cleaned_ref] = cleaned_dependsOn
    return dependency_map

def get_reachable_libraries(reachable_data):
    if not reachable_data:
        print("No reachable libraries found.")
        return set()
    return {item.get("reachable-library") for item in reachable_data if item.get("reachable-library")}

def filter_dependencies(package_map, dependency_map, reachable_libraries):
    cve_packages = {ref for ref, data in package_map.items() if data["vulnerabilities"]}
    if reachable_libraries:
        reachable_refs = {ref for ref in package_map if extract_name_from_ref(ref) in reachable_libraries}
        initial_refs = cve_packages.union(reachable_refs)
    else:
        initial_refs = cve_packages
    # Remove the lines that include all packages when initial_refs is empty
    # if not initial_refs:
    #     initial_refs = set(package_map.keys())
    queue = deque(initial_refs)
    included_refs = set()
    while queue:
        current_ref = queue.popleft()
        if current_ref in included_refs:
            continue
        included_refs.add(current_ref)
        for dep_ref in dependency_map.get(current_ref, []):
            if dep_ref not in included_refs:
                queue.append(dep_ref)
    return included_refs

def create_filtered_dependencies(package_map, dependency_map, reachable_libraries, included_refs):
    filtered_dependencies = []
    for ref in included_refs:
        package = package_map.get(ref, {})
        unique_id = package.get("unique_id")
        if unique_id is None:
            unique_id = "Null"
        vulnerabilities = package.get("vulnerabilities", [])
        color = determine_color(ref, package_map, reachable_libraries)
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
    sbom_detail_path = f"{target_repo_path}/sbom-detail.json"
    sbom_cyclonedx_path = f"{target_repo_path}/{date}-{start_time}-{repo_name}-scable-CycloneDX.json"
    reachable_path = f"{target_repo_path}/reachable.json"
    output_path = f"{target_repo_path}/dependency.json"
    sbom_detail = load_json(sbom_detail_path)
    if not sbom_detail:
        print(f"Failed to load {sbom_detail_path}.")
        sbom_detail = {"components": []}
    sbom_cyclonedx = load_json(sbom_cyclonedx_path)
    if not sbom_cyclonedx:
        print(f"Failed to load {sbom_cyclonedx_path}.")
        sbom_cyclonedx = {"dependencies": []}
    reachable_data = load_json(reachable_path)
    if not reachable_data:
        print(f"Failed to load {reachable_path}.")
        reachable_data = []
    package_map = build_package_map(sbom_detail)
    dependency_map = build_dependency_map(sbom_cyclonedx)
    reachable_libraries = get_reachable_libraries(reachable_data)
    included_refs = filter_dependencies(package_map, dependency_map, reachable_libraries)
    if not included_refs:
        print("No dependencies with CVEs found. The dependency.json file will contain an empty array.")
        filtered_dependencies = []
    else:
        filtered_dependencies = create_filtered_dependencies(
            package_map,
            dependency_map,
            reachable_libraries,
            included_refs
        )
    save_json({"dependencies": filtered_dependencies}, output_path)
    print("[+] merge ok")

if __name__ == "__main__":
    main()
