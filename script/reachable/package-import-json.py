import json
from collections import OrderedDict
import sys

def load_import_file(file_path):
    with open(file_path, "r") as file:
        lines = [line.strip().split() for line in file if line.strip()]
    return lines

def load_reachable_json(json_path):
    with open(json_path, "r") as file:
        data = json.load(file)
    return data

def save_reachable_json(json_path, data):
    with open(json_path, "w") as file:
        json.dump(data, file, indent=4)

def update_reachable_json(import_data, reachable_data):
    for line in import_data:
        package_name, *aliases = line

        for i, entry in enumerate(reachable_data):
            if entry["Reachable-Library"] in aliases:
                updated_entry = OrderedDict([
                    ("Sink-Function", entry["Sink-Function"]),
                    ("Reachable-Package", package_name),
                    ("Reachable-Library", entry["Reachable-Library"]),
                    ("File", entry["File"]),
                    ("Line", entry["Line"])
                ])
                reachable_data[i] = updated_entry
                break

def main(target_repo_path):
    import_file_path = f"{target_repo_path}/package-import.txt"
    reachable_json_path = f"{target_repo_path}/reachable.json"

    import_data = load_import_file(import_file_path)
    reachable_data = load_reachable_json(reachable_json_path)

    update_reachable_json(import_data, reachable_data)

    save_reachable_json(reachable_json_path, reachable_data)

if __name__ == "__main__":
    target_repo_path = sys.argv[1]
    main(target_repo_path)