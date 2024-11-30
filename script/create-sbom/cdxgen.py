import os
import subprocess
import shutil
import sys
import json

def load_settings():
    with open("settings.json", "r") as f:
        return json.load(f)

def add_env_variable(variable_name, variable_value):
    check_command = f'grep -q "export {variable_name}=" ~/.bashrc || grep -q "export {variable_name}=" ~/.bash_profile'
    result = subprocess.run(check_command, shell=True)

    if result.returncode == 0:
        print(f"{variable_name} already exists in ~/.bashrc or ~/.bash_profile")
    else:
        add_command = f'echo "export {variable_name}={variable_value}" >> ~/.bashrc'
        subprocess.run(add_command, shell=True)
        print(f"{variable_name} added to ~/.bashrc")

def setup_env_variables(settings):
    os.environ['FETCH_LICENSE'] = 'true'
    add_env_variable("FETCH_LICENSE", 'true')

    github_token = settings.get("GITHUB_API_TOKEN", "")
    if github_token:
        os.environ['GITHUB_TOKEN'] = github_token
        add_env_variable("GITHUB_TOKEN", github_token)
        print("GitHub API Token has been set as an environment variable.")
    else:
        print("[ERROR] GitHub API Token is missing. Please update 'settings.json' with a valid token.")
        sys.exit(1)

def generate_sbom(github_url, repo_name, target_repo_path):
    repo_clone_path = os.path.join(target_repo_path, f"{repo_name}-repo")

    if os.path.exists(repo_clone_path):
        print(f"Directory {repo_clone_path} already exists. Deleting and recloning.")
        shutil.rmtree(repo_clone_path)

    subprocess.run(["git", "clone", github_url, repo_clone_path], check=True)

    sbom_file = f"{repo_name}-CycloneDX.json"
    sbom_command = f"cd {repo_clone_path} && cdxgen -r . -o ../{sbom_file}"
    subprocess.run(sbom_command, shell=True, check=True)

    if not os.path.exists(target_repo_path):
        os.makedirs(target_repo_path)

    dest_file_path = os.path.join(target_repo_path, sbom_file)
    shutil.move(os.path.join(target_repo_path, sbom_file), dest_file_path)
    print(f"SBOM generated and moved to: {dest_file_path}")

if __name__ == "__main__":
    settings = load_settings()
    setup_env_variables(settings)

    github_url = sys.argv[1]
    repo_name = sys.argv[2]
    target_repo_path = sys.argv[3]

    generate_sbom(github_url, repo_name, target_repo_path)
