import json
import sys

repo_name = sys.argv[1]
target_repo_path = sys.argv[2]
start_time = sys.argv[3]
date = sys.argv[4]

input_file_path = f"{target_repo_path}/{date}-{start_time}-{repo_name}-scable-CycloneDX.json"
output_file_path = f"{target_repo_path}/sbom-summary.json"

with open(input_file_path, "r", encoding="utf-8") as file:
    sbom_data = json.load(file)

summary = {
    "project": sbom_data.get("metadata", {}).get("component", {}).get("name", "알 수 없음"),
    "format": sbom_data.get("bomFormat", "알 수 없음"),
    "version": sbom_data.get("specVersion", "알 수 없음"),
    "id": sbom_data.get("serialNumber", "알 수 없음"),
    "last_update": sbom_data.get("metadata", {}).get("timestamp", "알 수 없음"),
    "tool": ["SCABLE"],
    "author": ["SCABLE"],
    "license_sum": {
        "usedlicense": 0
    },
    "package_sum": {
        "total": 0,
        "npm": 0,
        "GitHub": 0,
        "Maven": 0,
        "PyPI": 0,
        "기타": 0
    },
    "vuln_sum": {
        "total": 0,
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "unknown": 0
    }
}

components = sbom_data.get("components", []) or sbom_data.get("metadata", {}).get("component", {}).get("components", [])

for component in components:
    summary["package_sum"]["total"] += 1

    licenses = component.get("licenses", [])
    for license_info in licenses:
        license_id = license_info.get("license", {}).get("id", "알 수 없음")
        if license_id in summary["license_sum"]:
            summary["license_sum"][license_id] += 1
        else:
            summary["license_sum"][license_id] = 1

    purl = component.get("purl", "").lower()
    if "npm" in purl:
        summary["package_sum"]["npm"] += 1
    elif "github" in purl:
        summary["package_sum"]["GitHub"] += 1
    elif "maven" in purl:
        summary["package_sum"]["Maven"] += 1
    elif "pypi" in purl:
        summary["package_sum"]["PyPI"] += 1
    else:
        summary["package_sum"]["기타"] += 1

    vulnerabilities = component.get("vulnerabilities", [])
    for vulnerability in vulnerabilities:
        summary["vuln_sum"]["total"] += 1
        ratings = vulnerability.get("ratings", [])
        severity = ratings[0].get("severity", "unknown").lower() if ratings else "unknown"
        if severity in summary["vuln_sum"]:
            summary["vuln_sum"][severity] += 1
        else:
            summary["vuln_sum"]["unknown"] += 1

for vulnerability in sbom_data.get("vulnerabilities", []):
    summary["vuln_sum"]["total"] += 1
    ratings = vulnerability.get("ratings", [])
    severity = ratings[0].get("severity", "unknown").lower() if ratings else "unknown"
    if severity in summary["vuln_sum"]:
        summary["vuln_sum"][severity] += 1
    else:
        summary["vuln_sum"]["unknown"] += 1

summary["license_sum"]["usedlicense"] = len(summary["license_sum"]) - 1 

with open(output_file_path, "w", encoding="utf-8") as file:
    json.dump(summary, file, ensure_ascii=False, indent=4)

print(f"Summary file has been created: {output_file_path}")
