import json
import sys
import re

def extract_cve_libraries(json_path, target_repo_path):
    with open(json_path, "r") as file:
        data = json.load(file)

    vulnerable_packages = set()
    vulnerabilities = data.get("vulnerabilities", [])

    for vulnerability in vulnerabilities:
        affects = vulnerability.get("affects", [])
        for affect in affects:
            ref = affect.get("ref", "")
            if ref.startswith("pkg:pypi/"):
                match = re.match(r"^pkg:pypi/([^@]+)@.+$", ref)
                if match:
                    package_name = match.group(1)
                    vulnerable_packages.add(package_name)
                else:
                    print(f"Unrecognized purl format: {ref}")
            else:
                continue

    with open(f"{target_repo_path}/requirements.txt", "w") as output_file:
        for package in vulnerable_packages:
            output_file.write(f"{package}\n")

if __name__ == "__main__":
    sbom_path = sys.argv[1]
    target_repo_path = sys.argv[2]
    extract_cve_libraries(sbom_path, target_repo_path)
