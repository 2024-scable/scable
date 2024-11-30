import json
import re
import sys

def load_imported_modules(file_path):
    word_to_module = {}
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_number, line in enumerate(f, 1):
                parts = line.strip().split()
                if len(parts) < 1:
                    print(f"Warning: Line {line_number} in {file_path} is empty.")
                    continue
                module = parts[0]
                for word in parts:
                    if word != "None" and word not in word_to_module:
                        word_to_module[word] = module
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error while reading file {file_path}: {e}")
        sys.exit(1)
    return word_to_module

def load_output_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in {file_path}.")
        sys.exit(1)
    except Exception as e:
        print(f"Error while reading file {file_path}: {e}")
        sys.exit(1)
    return data

def save_output_json(data, file_path):
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error while saving JSON file: {e}")
        sys.exit(1)

def extract_words(library_name):
    cleaned = re.sub(r'[()\{\},\-]', ' ', library_name)
    words = cleaned.split()
    return words

def add_reachable_library(output_data, word_to_module):
    for item in output_data:
        library_name = item.get("library-name", "")
        words = extract_words(library_name)
        reachable = None
        for word, module in word_to_module.items():
            if word in words:
                reachable = module
                break
        if reachable:
            new_item = {}
            for key in item:
                new_item[key] = item[key]
                if key == "library-name":
                    new_item["reachable-library"] = reachable
            item.clear()
            item.update(new_item)
    return output_data

def main():
    target_repo_path = sys.argv[1]
    imported_parsing_file = f"{target_repo_path}/import-parsing.txt"
    transform_json_file = f"{target_repo_path}/csvtxt-transform.json"
    output_file = f"{target_repo_path}/library-diff.json"

    word_to_module = load_imported_modules(imported_parsing_file)
    output_data = load_output_json(transform_json_file)

    updated_data = add_reachable_library(output_data, word_to_module)

    save_output_json(updated_data, output_file)
    print(f"Updated JSON saved to '{output_file}'.")

if __name__ == "__main__":
    main()