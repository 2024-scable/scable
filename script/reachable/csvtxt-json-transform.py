import json
import sys

target_repo_path = sys.argv[1]
input_file = f"{target_repo_path}/csv-parsing.txt"
output_file = f"{target_repo_path}/csvtxt-transform.json"

result = []

try:
    with open(input_file, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 7: 
                json_object = {
                    "sink-function": parts[0],
                    "library-name": " ".join(parts[1:4]),
                    "library-function": parts[4],
                    "path": parts[5],
                    "line": parts[6],
                }
                result.append(json_object)
except FileNotFoundError:
    print(f"Error: Input file {input_file} not found.")
    sys.exit(1)
except Exception as e:
    print(f"Error occurred: {e}")
    sys.exit(1)

try:
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=4, ensure_ascii=False)
    print(f"JSON file created: {output_file}")
except Exception as e:
    print(f"Error occurred: Problem while saving JSON file - {e}")
    sys.exit(1)