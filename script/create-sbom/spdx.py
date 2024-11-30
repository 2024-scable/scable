import json
import uuid
import re
import os
import sys
from datetime import datetime

def load_cyclonedx_bom(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def create_spdx_document(cyclonedx_data):
    return {
        "spdxVersion": "SPDX-2.2",
        "SPDXID": "SPDXRef-DOCUMENT",
        "name": cyclonedx_data.get("metadata", {}).get("component", {}).get("name", "CycloneDX to SPDX"),
        "dataLicense": "CC0-1.0",
        "documentNamespace": f"http://spdx.org/spdxdocs/{str(uuid.uuid4())}",
        "creationInfo": {
            "created": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "creators": ["Tool: SCABLE"]
        },
        "packages": [],
        "relationships": []
    }

def convert_components_to_spdx_packages(cyclonedx_data, spdx_doc):
    seen_packages = set()
    package_refs = {}
    for component in cyclonedx_data.get("components", []):
        name = re.sub(r'[^0-9a-zA-Z\.\-\+]', '', component.get('name', 'NO_NAME'))
        version = re.sub(r'[^0-9a-zA-Z\.\-\+]', '', component.get('version', 'NO_VERSION'))
        package_id = f"SPDXRef-{name}-{version}"
        
        if (name, version) in seen_packages:
            continue
        seen_packages.add((name, version))
        package_refs[component.get("bom-ref", "")] = package_id
        
        licenses = component.get("licenses", [{}])
        license_info = licenses[0].get("license", {}) if licenses else {}
        
        package = {
            "SPDXID": package_id,
            "name": component.get("name", "NOASSERTION"),
            "versionInfo": version,
            "supplier": f"Organization: {component.get('publisher', 'NOASSERTION')}" if component.get('publisher') else "NOASSERTION",
            "downloadLocation": re.match(r'^(NONE|NOASSERTION|(((git|hg|svn|bzr)\+)?(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|ssh:\/\/|git:\/\/|svn:\/\/|sftp:\/\/|ftp:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+){0,100}\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?)|(git\+git@[a-zA-Z0-9\.\-]+:[a-zA-Z0-9\/\.@\-]+)|(bzr\+lp:[a-zA-Z0-9\.\-]+))$', component.get("externalReferences", [{}])[0].get("url", "NOASSERTION")) and component.get("externalReferences", [{}])[0].get("url", "NOASSERTION") or "NOASSERTION",
            "homepage": component.get("externalReferences", [{}])[0].get("url", "NOASSERTION"),
            "checksums": [{
                "algorithm": re.sub(r'[^A-Za-z0-9]', '', hash_entry.get("alg", "NOASSERTION")).upper(),
                "checksumValue": hash_entry.get("content", "NOASSERTION")
            } for hash_entry in component.get("hashes", [])],
            "licenseConcluded": license_info.get("id", "NOASSERTION"),
            "licenseDeclared": license_info.get("id", "NOASSERTION"),
            "copyrightText": component.get("author", "NOASSERTION"),
            "summary": component.get("description", "NOASSERTION"),
            "externalRefs": []
        }

        for vuln in cyclonedx_data.get("vulnerabilities", []):
            affects = vuln.get("affects", [])
            for affected in affects:
                if affected.get("ref", "") == component.get("bom-ref", ""):
                    package["externalRefs"].append({
                        "referenceType": "SECURITY_ADVISORY",
                        "referenceLocator": vuln.get("id", "NOASSERTION"),
                        "referenceCategory": "SECURITY"
                    })

        if not package.get("externalRefs"):
            package.pop("externalRefs")
        spdx_doc["packages"].append(package)

        spdx_doc["relationships"].append({
            "spdxElementId": "SPDXRef-DOCUMENT",
            "relatedSpdxElement": package_id,
            "relationshipType": "DESCRIBES"
        })

    for dependency in cyclonedx_data.get("dependencies", []):
        ref = dependency.get("ref")
        depends_on = dependency.get("dependsOn", [])
        if ref in package_refs and depends_on:
            for dep in depends_on:
                if dep in package_refs:
                    spdx_doc["relationships"].append({
                        "spdxElementId": package_refs[ref],
                        "relatedSpdxElement": package_refs[dep],
                        "relationshipType": "DEPENDS_ON"
                    })

def save_spdx_document(spdx_doc, output_file_path):
    with open(output_file_path, 'w') as spdx_file:
        json.dump(spdx_doc, spdx_file, indent=2)

def main(target_repo_path, repo_name):
    for file_name in os.listdir(target_repo_path):
        if file_name.endswith('-scable.json'):
            cyclonedx_data = load_cyclonedx_bom(os.path.join(target_repo_path, file_name))
            spdx_doc = create_spdx_document(cyclonedx_data)
            convert_components_to_spdx_packages(cyclonedx_data, spdx_doc)
            output_file_name = os.path.join(target_repo_path, f"{repo_name}-spdx.json")
            save_spdx_document(spdx_doc, output_file_name)
            print(f"Conversion completed successfully, SPDX file saved as '{output_file_name}'")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 spdx.py <target_repo_path> <repo_name>")
    else:
        target_repo_path = sys.argv[1]
        repo_name = sys.argv[2]
        main(target_repo_path, repo_name)
