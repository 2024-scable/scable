import json
import requests
from packageurl import PackageURL
import concurrent.futures
import threading
import pandas as pd
import os
import glob
import re
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
csv_file_path = "/home/scable/nvd_database/cve_cvss3_data.csv"
cve_data = pd.read_csv(csv_file_path, encoding='ISO-8859-1', low_memory=False, dtype=str)

def clean_text(input_text):
    cleaned_text = re.sub(r'[^\x00-\x7F]+', ' ', input_text)
    cleaned_text = re.sub(r'(?<!\()https?://[^\s]+', lambda match: f"({match.group()})", cleaned_text)
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
    cleaned_text = cleaned_text.strip()
    return cleaned_text

def query_osv(ecosystem, name, version, retries=3):
    if not ecosystem or not name:
        print(f"Invalid request: ecosystem={ecosystem}, name={name}")
        return []

    url = "https://api.osv.dev/v1/query"
    payload = {
        "package": {
            "name": name,
            "ecosystem": ecosystem
        }
    }

    if version:
        payload["version"] = version

    for attempt in range(retries):
        try:
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data.get("vulns", [])
        except requests.exceptions.RequestException as e:
            print(f"OSV API request failed - Attempt {attempt + 1}/{retries}: {e}")
            if attempt == retries - 1:
                return []

def add_vulnerabilities_to_sbom(sbom_file):
    with open(sbom_file, 'r', encoding='utf-8') as file:
        sbom = json.load(file)

    components = sbom.get("components", [])
    vulnerabilities_dict = {}
    lock = threading.Lock()

    def process_component(component):
        purl = component.get("purl")
        if not purl:
            print(f"No purl found in component: {component.get('name')}")
            return

        try:
            purl_obj = PackageURL.from_string(purl)
        except Exception as e:
            print(f"Invalid purl '{purl}': {e}")
            return

        ecosystem = purl_obj.type
        name = f"{purl_obj.namespace}/{purl_obj.name}" if purl_obj.namespace else purl_obj.name
        version = purl_obj.version

        ecosystem_mapping = {
            "pypi": "PyPI",
            "maven": "Maven",
            "npm": "npm",
        }
        ecosystem = ecosystem_mapping.get(ecosystem, ecosystem.capitalize())

        if not ecosystem:
            print(f"Invalid ecosystem: {ecosystem}")
            return

        print(f"Querying vulnerabilities for {ecosystem} {name} {version}...")
        vulns = query_osv(ecosystem, name, version)

        if vulns:
            for vuln in vulns:
                cve_id = next((alias for alias in vuln.get("aliases", []) if alias.startswith("CVE")), None)
                if cve_id:
                    with lock:
                        if cve_id not in vulnerabilities_dict:
                            cve_info = cve_data[cve_data["CVE_ID"] == cve_id]
                            if not cve_info.empty:
                                cve_info = cve_info.iloc[0]
                                if (cve_info["Base_Severity"] == "N/A" or pd.isna(cve_info["Base_Severity"]) or
                                    cve_info["Base_Score"] == "N/A" or pd.isna(cve_info["Base_Score"]) or
                                    cve_info["CVSS_Version"] == "N/A" or pd.isna(cve_info["CVSS_Version"]) or
                                    cve_info["Vector_String"] == "N/A" or pd.isna(cve_info["Vector_String"])):

                                    ratings = []
                                else:
                                    cvss_version = str(cve_info["CVSS_Version"]).replace('.', '')
                                    if cvss_version == "30":
                                        cvss_version = "3"
                                    ratings = [{
                                        "severity": cve_info["Base_Severity"].lower(),
                                        "score": cve_info["Base_Score"],
                                        "method": f"CVSSv{cvss_version}",
                                        "vector": cve_info["Vector_String"]
                                    }]
                            else:
                                ratings = []

                            published = vuln.get("published")
                            modified = vuln.get("modified")

                            cleaned_text = clean_text(vuln.get("details", ""))

                            vulnerabilities_dict[cve_id] = {
                                "id": cve_id,
                                "source": {
                                    "name": "OSV-DEV",
                                    "url": f"https://osv.dev/vulnerability/{vuln.get('id')}"
                                },
                                "description": str(cleaned_text),
                                "ratings": ratings,
                                "published": published,
                                "updated": modified,
                                "affects": []
                            }

                        affect_ref = component.get("bom-ref")
                        if affect_ref not in [affect["ref"] for affect in vulnerabilities_dict[cve_id]["affects"]]:
                            vulnerabilities_dict[cve_id]["affects"].append({
                                "ref": affect_ref
                            })
        else:
            print(f"No vulnerabilities found: {name} {version}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        executor.map(process_component, components)

    sbom["vulnerabilities"] = list(vulnerabilities_dict.values())
    return sbom

if __name__ == "__main__":
    target_repo_path = sys.argv[1]
    repo_name = sys.argv[2]
    current_dir = target_repo_path

    json_files = glob.glob(os.path.join(current_dir, f"{repo_name}-CycloneDX.json"))
    if not json_files:
        print(f"No JSON files found in {target_repo_path}.")
    else:
        sbom_file = json_files[0]
        print(f"Selected SBOM file: {sbom_file}")

        sbom = add_vulnerabilities_to_sbom(sbom_file)

        updated_output_file = os.path.join(current_dir, f"{repo_name}-scable.json")
        with open(updated_output_file, 'w', encoding='utf-8') as outfile:
            json.dump(sbom, outfile, indent=4)

        print(f"Updated SBOM saved: {updated_output_file}")
