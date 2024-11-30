from importlib.metadata import distribution
import sys

def get_top_level(package_name):
    try:
        dist = distribution(package_name)
        top_level = dist.read_text("top_level.txt")
        return [module.strip() for module in top_level.splitlines() if module.strip()] if top_level else None
    except:
        return None

def generate_import_form(requirements_path, target_repo_path):
    with open(requirements_path, "r") as req_file:
        packages = [line.strip() for line in req_file if line.strip()]

    output_path = f"{target_repo_path}/import-form.txt"
    with open(output_path, "w") as output_file:
        for package in packages:
            top_level = get_top_level(package)
            if top_level:
                if isinstance(top_level, list):  
                    output_file.write(f"{package} " + " ".join(top_level) + "\n")
                else: 
                    output_file.write(f"{package} {top_level}\n")
            else:  
                output_file.write(f"{package} None\n")


if __name__ == "__main__":
    target_repo_path = sys.argv[1]
    requirements_path = f"{target_repo_path}/requirements.txt"
    generate_import_form(requirements_path, target_repo_path)

