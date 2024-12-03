import sys
import json
import os

def update_analyze_repo(date, start_time, repo_name):
    file_path = "/home/scable/result-html/public/public_directories.json"
    new_entry = f"{date}_{start_time}_{repo_name}"
    
    # Ensure file and directory existence
    if not os.path.exists(os.path.dirname(file_path)):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            try:
                data = json.load(file)
                if not isinstance(data, dict) or "directories" not in data:
                    data = {"directories": []}
            except json.JSONDecodeError:
                data = {"directories": []}
    else:
        data = {"directories": []}
    
    if new_entry not in data["directories"]:
        data["directories"].append(new_entry)
    
    try:
        with open(file_path, "w") as file:
            json.dump(data, file, indent=4)
    except IOError as e:
        print(f"Error writing to file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 /home/scable/script/etc/analyze-repo-update.py <date> <start_time> <repo_name>")
        sys.exit(1)
    
    date = sys.argv[1]
    start_time = sys.argv[2]
    repo_name = sys.argv[3]
    
    update_analyze_repo(date, start_time, repo_name)
