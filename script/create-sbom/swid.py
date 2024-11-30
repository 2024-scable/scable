import xml.etree.ElementTree as ET
import uuid
import os
import hashlib
import json
import sys

class CycloneDXToSWIDConverter:
    def __init__(self, cyclonedx_file_path):
        self.cyclonedx_file_path = cyclonedx_file_path
        self.sbom_data = self.parse_cyclonedx()

    def parse_cyclonedx(self):
        with open(self.cyclonedx_file_path, 'r') as file:
            return json.load(file)

    def generate_swid(self):
        root = ET.Element('SoftwareIdentity', {
            'xmlns': 'http://standards.iso.org/iso/19770/-2/2015/schema.xsd',
            'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
            'name': self.sbom_data.get('metadata', {}).get('component', {}).get('name', 'Unknown Software') or 'Unknown Software',
            'tagId': str(uuid.uuid4()),
            'tagVersion': '1',
            'version': self.sbom_data.get('metadata', {}).get('component', {}).get('version', '0.0.0') or '0.0.0',
            'versionScheme': 'semver',
            '{http://www.w3.org/XML/1998/namespace}lang': 'en'
        })

        ET.SubElement(root, 'Entity', {
            'name': 'SCABLE',
            'role': 'tagCreator',
            'regid': 'http://scable.com'
        })

        component_data = self.sbom_data.get('metadata', {}).get('component', {})
        entity_name = component_data.get('name') or 'Unknown'
        entity_regid = component_data.get('bom-ref') or 'Unknown'

        ET.SubElement(root, 'Entity', {
            'name': entity_name,
            'role': 'softwareCreator',
            'regid': entity_regid
        })

        payload = ET.SubElement(root, 'Payload')
        components = self.sbom_data.get('components', [])
        for component in components:
            file_name = component.get('name') or 'Unknown File'
            file_version = component.get('version', '1.0.0') or '1.0.0'
            hashes = component.get('hashes', [])
            file_hash = None
            for hash_info in hashes:
                if hash_info.get('alg') == 'SHA-512':
                    file_hash = hash_info.get('content')
                    break

            file_elem_attribs = {
                'name': file_name,
                'version': file_version
            }
            if file_hash:
                file_elem_attribs['hash'] = file_hash

            ET.SubElement(payload, 'File', file_elem_attribs)

        for component in components:
            licenses = component.get('licenses', [])
            for license_info in licenses:
                license_url = license_info.get('license', {}).get('url')
                if license_url:
                    ET.SubElement(root, 'Link', {
                        'rel': 'license',
                        'href': license_url
                    })

        return root

    def save_swid(self, output_path):
        root = self.generate_swid()
        tree = ET.ElementTree(root)
        self.indent(root)
        tree.write(output_path, encoding='UTF-8', xml_declaration=True)

    def indent(self, elem, level=0):
        i = "\n" + level * "  "
        if len(elem):
            if not elem.text or not elem.text.strip():
                elem.text = i + "  "
            if not elem.tail or not elem.tail.strip():
                elem.tail = i
            for subelem in elem:
                self.indent(subelem, level + 1)
            if not subelem.tail or not subelem.tail.strip():
                subelem.tail = i
        else:
            if level and (not elem.tail or not elem.tail.strip()):
                elem.tail = i

if __name__ == "__main__":
    target_repo_path = sys.argv[1]
    repo_name = sys.argv[2]

    cyclonedx_file = f"{target_repo_path}/{repo_name}-scable.json"
    output_swid_file = f"{target_repo_path}/{repo_name}-swid.xml"

    converter = CycloneDXToSWIDConverter(cyclonedx_file)
    converter.save_swid(output_swid_file)

    print(f"SWID tag successfully created at {output_swid_file}")
