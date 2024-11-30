import os
import ast
import sys

def find_imports_in_file(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        try:
            tree = ast.parse(file.read(), filename=file_path)
        except SyntaxError:
            print(f"Skipping file with syntax error: {file_path}")
            return []

        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append({
                        "alias": alias.asname if alias.asname else "None",
                        "module": alias.name,
                        "function": "None"
                    })
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    for alias in node.names:
                        imports.append({
                            "alias": alias.asname if alias.asname else "None",
                            "module": node.module,
                            "function": alias.name
                        })
        return imports

def find_imports_in_project(root_dir):
    imports = []
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".py"):
                file_path = os.path.join(dirpath, filename)
                imports_in_file = find_imports_in_file(file_path)
                imports.extend(imports_in_file)
    return imports

target_repo_path = sys.argv[1]
repo_name = sys.argv[2]
project_path = os.path.join(target_repo_path, f"{repo_name}-repo")
imported_modules = find_imports_in_project(project_path)

output_path = os.path.join(target_repo_path, "import-parsing.txt")
with open(output_path, "w", encoding="utf-8") as f:
    for item in imported_modules:
        f.write(f"{item['module']} {item['alias']} {item['function']}\n")