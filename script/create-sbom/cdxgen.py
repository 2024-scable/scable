import os
import subprocess
import shutil
import sys
import urllib.parse

def is_url(path):
    try:
        result = urllib.parse.urlparse(path)
        return result.scheme in ('http', 'https') and result.netloc != ''
    except ValueError:
        return False

def generate_sbom(source_path, repo_name, target_repo_path):
    try:
        if not os.path.exists(target_repo_path):
            os.makedirs(target_repo_path)

        repo_clone_path = os.path.join(target_repo_path, f"{repo_name}-repo")

        if is_url(source_path):
            if os.path.exists(repo_clone_path):
                print(f"Directory {repo_clone_path} already exists. Deleting and recloning.")
                shutil.rmtree(repo_clone_path)

            subprocess.run(["git", "clone", source_path, repo_clone_path], check=True)
            analysis_path = repo_clone_path
        else:
            source_path = os.path.abspath(source_path)
            if not os.path.exists(source_path):
                print(f"[ERROR] The local directory {source_path} does not exist.")
                sys.exit(1)

            if os.path.exists(repo_clone_path):
                print(f"Directory {repo_clone_path} already exists. Deleting and recopying.")
                shutil.rmtree(repo_clone_path)

            shutil.copytree(source_path, repo_clone_path)
            analysis_path = repo_clone_path

        sbom_file = f"{repo_name}-CycloneDX.json"
        sbom_output_path = os.path.join(target_repo_path, sbom_file)

        cdxgen_command = f"cd '{analysis_path}' && cdxgen -r . -o '{sbom_output_path}'"
        print(f"Running command: {cdxgen_command}")

        env = os.environ.copy()

        subprocess.run(cdxgen_command, shell=True, check=True, env=env)

        print(f"SBOM generated and saved to: {sbom_output_path}")

    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Command '{e.cmd}' returned non-zero exit status {e.returncode}.")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python script.py <source_path> <repo_name> <target_repo_path>")
        sys.exit(1)

    source_path = sys.argv[1]
    repo_name = sys.argv[2]
    target_repo_path = sys.argv[3]

    generate_sbom(source_path, repo_name, target_repo_path)
