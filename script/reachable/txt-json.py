import json
import os
import sys

def convert_txt_to_json(target_repo_path):
    txt_path = os.path.join(target_repo_path, "reachable.txt")
    json_path = os.path.join(target_repo_path, "reachable.json")

    data = []
    with open(txt_path, "r") as txt_file:
        lines = txt_file.readlines()

    for line in lines:
        parts = line.split("Sink-Function :")[1].strip()
        items = parts.split("Reachable-Library : ")
        sink_function = items[0].strip()
        lib_and_location = items[1].split("File : ")
        reachable_library = lib_and_location[0].strip()
        file_and_line = lib_and_location[1].split("Line : ")
        file_path = file_and_line[0].strip()
        line_range = file_and_line[1].strip()

        data.append({
            "Sink-Function": sink_function,
            "Reachable-Library": reachable_library,
            "File": file_path,
            "Line": line_range
        })

    with open(json_path, "w") as json_file:
        json.dump(data, json_file, indent=4)

    os.remove(txt_path)

if __name__ == "__main__":
    target_repo_path = sys.argv[1]
    convert_txt_to_json(target_repo_path)