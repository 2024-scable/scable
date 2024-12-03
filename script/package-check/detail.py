import json
import sys

def load_json_data(json_file_path):
    with open(json_file_path, 'r', encoding='utf-8') as json_file:
        return json.load(json_file)

def extract_components_data(data):
    unique_components = set()
    data_list = []
    unique_id_counter = 1

    if 'components' in data:
        components = data['components']
        vulnerabilities = data.get('vulnerabilities', [])
        dependencies = data.get('dependencies', [])

        dependencies_dict = {dep['ref']: dep.get('dependsOn', []) for dep in dependencies}

        for component in components:
            group = component.get('group', '')
            name = component.get('name', 'N/A')
            version = component.get('version', 'N/A')
            scope = component.get('scope', 'N/A')

            licenses = []
            for license_info in component.get('licenses', []):
                license_data = license_info.get('license', {})
                license_name = license_data.get('id', license_data.get('name', 'N/A'))
                license_url = license_data.get('url', 'N/A')

                licenses.append({
                    "license_name": license_name,
                    "license_url": license_url
                })

            license_urls = ', '.join([lic["license_url"] for lic in licenses if lic["license_url"] != "N/A"])
            hashes = ', '.join([f"{hash_info.get('alg', 'N/A')}: {hash_info.get('content', 'N/A')}" for hash_info in
                                component.get('hashes', [])])
            external_references = ', '.join([ref.get('url', 'N/A') for ref in component.get('externalReferences', []) if
                                             ref.get('url', '').startswith("https")])

            purl = component.get('purl', 'N/A')
            if "npm" in purl:
                ecosystem = "npm"
            elif "github" in purl:
                ecosystem = "GitHub"
            elif "maven" in purl:
                ecosystem = "Maven"
            elif "pypi" in purl:
                ecosystem = "PyPI"
            else:
                ecosystem = "Unknown"

            component_vulnerabilities = []
            for vulnerability in vulnerabilities:
                for affected in vulnerability.get('affects', []):
                    if affected.get('ref') == component.get('bom-ref', 'N/A'):
                        cve_id = vulnerability.get('id', 'N/A')
                        ratings = vulnerability.get('ratings', [])

                        severity = ratings[0].get('severity', 'unknown').lower() if ratings else 'unknown'
                        score = ratings[0].get('score', 'N/A') if ratings else 'N/A'
                        method = ratings[0].get('method', 'N/A') if ratings else 'N/A'
                        vector = ratings[0].get('vector', 'N/A') if ratings else 'N/A'
                        cve_link = f"https://cve.mitre.org/cgi-bin/cvename.cgi?name={cve_id}" if cve_id.startswith(
                            "CVE-") else 'N/A'

                        description = vulnerability.get('description', 'N/A')
                        updated = vulnerability.get('updated', 'N/A')
                        published = vulnerability.get('published', 'N/A')

                        component_vulnerabilities.append({
                            "cve_id": cve_id,
                            "severity": severity,
                            "score": score,
                            "method": method,
                            "vector": vector,
                            "cve_link": cve_link,
                            "description": description,
                            "updated": updated,
                            "published": published
                        })

            dependencies_list = dependencies_dict.get(component.get('bom-ref', 'N/A'), [])
            dependencies_str = ', '.join(dependencies_list) if dependencies_list else 'None'

            unique_key = (group, name, version)
            if unique_key not in unique_components:
                unique_components.add(unique_key)
                data_list.append({
                    "unique_id": unique_id_counter,
                    "group": group,
                    "name": name,
                    "ecosystem": ecosystem,
                    "version": version,
                    "scope": scope,
                    "licenses": licenses if licenses else [{"license_name": "N/A", "license_url": "N/A"}],
                    "hashes": hashes,
                    "external_references": external_references,
                    "type": component.get('type', 'N/A'),
                    "purl": purl,
                    "bomref": component.get('bom-ref', 'N/A'),
                    "vulnerabilities": component_vulnerabilities,
                    "dependencies": dependencies_str
                })
                unique_id_counter += 1

    return data_list

def save_to_json(data_list, json_file_path):
    wrapped_data = {"components": data_list}
    with open(json_file_path, "w", encoding="utf-8") as json_file:
        json.dump(wrapped_data, json_file, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    repo_name = sys.argv[1]
    target_repo_path = sys.argv[2]
    start_time = sys.argv[3]
    date = sys.argv[4]

    json_file_path = f"{target_repo_path}/{date}-{start_time}-{repo_name}-scable-CycloneDX.json"
    output_json_file_path = f"{target_repo_path}/sbom-detail.json"

    data = load_json_data(json_file_path)
    data_list = extract_components_data(data)
    save_to_json(data_list, output_json_file_path)
