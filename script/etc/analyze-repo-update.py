import sys
import json
import os

def update_analyze_repo(date, start_time, repo_name):
    file_path = "/home/scable/result-html/public/public_directories.json"
    new_entry = f"{date}_{start_time}_{repo_name}"
    
    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            data = json.load(file)
    else:
        data = {"directories": []}
    
    if new_entry not in data["directories"]:
        data["directories"].append(new_entry)
    
    with open(file_path, "w") as file:
        json.dump(data, file, indent=4)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 /home/scable/script/etc/analyze-repo-update.py <date> <start_time> <repo_name>")
        sys.exit(1)
    
    date = sys.argv[1]
    start_time = sys.argv[2]
    repo_name = sys.argv[3]
    
    update_analyze_repo(date, start_time, repo_name)

