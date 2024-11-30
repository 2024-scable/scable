import json
import sys

def load_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"Error: '{file_path}' file not found.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in '{file_path}'.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: An issue occurred while reading '{file_path}'. {e}")
        sys.exit(1)

def save_json(data, file_path):
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error: An issue occurred while saving the JSON file. {e}")
        sys.exit(1)

def process_data(data):
    processed = []
    seen_sink_functions = set()

    for item in data:
        if "reachable-library" in item:
            if "library-name" in item:
                del item["library-name"]
            sink_function = item.get("sink-function")
            if sink_function:
                if sink_function not in seen_sink_functions:
                    processed.append(item)
                    seen_sink_functions.add(sink_function)
    return processed

def main():
    target_repo_path = sys.argv[1]
    library_diff_file = f"{target_repo_path}/library-diff.json"
    output_file = f"{target_repo_path}/reachable-sorting.json"

    data = load_json(library_diff_file)
    processed_data = process_data(data)
    save_json(processed_data, output_file)
    print(f"Processed JSON saved to '{output_file}'.")

if __name__ == "__main__":
    main()