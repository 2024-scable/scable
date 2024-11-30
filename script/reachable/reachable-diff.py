import json
import os
import sys

def load_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: '{file_path}' file not found.")
        exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in '{file_path}'.")
        exit(1)

def load_import_form(file_path):
    try:
        library_mapping = {}
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) > 1:
                    # 첫 번째는 패키지명, 나머지는 top-level 모듈들
                    package_name = parts[0].lower()
                    top_level_modules = [module.lower() for module in parts[1:]]
                    for module in top_level_modules:
                        library_mapping[module] = package_name
                elif len(parts) == 1:
                    # top-level 모듈이 없는 경우 패키지명 자체를 매핑
                    package_name = parts[0].lower()
                    library_mapping[package_name] = package_name
        return library_mapping
    except FileNotFoundError:
        print(f"Error: '{file_path}' file not found.")
        exit(1)

# FIX: requirements.txt에 버전 정보가 없으므로 간단히 패키지명만 로드
def load_requirements(file_path):
    try:
        package_names = set()
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # 주석과 빈 줄 무시
                if not line or line.startswith('#'):
                    continue
                # 패키지명만 존재하므로 직접 추가
                package_name = line.lower()
                package_names.add(package_name)
        return package_names
    except FileNotFoundError:
        print(f"Error: '{file_path}' file not found.")
        exit(1)

def save_json(data, file_path):
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error: An issue occurred while saving the JSON file. {e}")
        exit(1)

def map_reachable_library(reachable_library, library_mapping, requirements_packages):
    """
    주어진 reachable_library를 매핑된 패키지명으로 변환합니다.
    1. 정확한 매핑이 있는지 확인합니다.
    2. 중첩된 모듈인 경우 상위 모듈을 순차적으로 확인하여 매핑합니다.
    3. 매핑되지 않은 경우 requirements_packages에서 확인합니다.
    """
    # 1. 정확한 매핑 확인
    if reachable_library in library_mapping:
        return library_mapping[reachable_library]
    
    # 2. 중첩된 모듈인 경우 상위 모듈을 확인
    parts = reachable_library.split('.')
    for i in range(len(parts)-1, 0, -1):
        prefix = '.'.join(parts[:i])
        if prefix in library_mapping:
            return library_mapping[prefix]
    
    # 3. requirements.txt에서 패키지명 확인
    if reachable_library in requirements_packages:
        return reachable_library
    
    # 매핑되지 않은 경우 None 반환
    return None

def filter_and_map_data(json_data, library_mapping, requirements_packages):
    filtered_data = []
    for item in json_data:
        reachable_library = item.get("reachable-library", "").lower()
        if not reachable_library:
            continue  # reachable-library가 없는 경우 건너뜁니다.
        
        mapped_package = map_reachable_library(reachable_library, library_mapping, requirements_packages)
        if mapped_package:
            item["reachable-library"] = mapped_package
            filtered_data.append(item)
        # 매핑되지 않은 경우 필터링하여 제외합니다.
    return filtered_data

def main():
    if len(sys.argv) < 2:
        print("Error: Target repository path is required as an argument.")
        exit(1)

    target_repo_path = sys.argv[1]

    reachable_sorting_file = os.path.join(target_repo_path, "reachable-sorting.json")
    import_form_file = os.path.join(target_repo_path, "import-form.txt")
    requirements_file = os.path.join(target_repo_path, "requirements.txt")  # FIX: requirements.txt 경로
    output_file = os.path.join(target_repo_path, "reachable.json")

    json_data = load_json(reachable_sorting_file)
    library_mapping = load_import_form(import_form_file)
    requirements_packages = load_requirements(requirements_file)  # FIX: requirements.txt 로드

    filtered_data = filter_and_map_data(json_data, library_mapping, requirements_packages)  # FIX: 매핑 로직 수정

    save_json(filtered_data, output_file)
    print(f"Filtered JSON saved to '{output_file}'.")

if __name__ == "__main__":
    main()
