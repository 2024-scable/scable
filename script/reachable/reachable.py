import sys
import os

def get_unique_words_from_file(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        words = set(word for line in file for word in line.split())
    return words

def find_matching_modules(fourth_column_file, imported_modules_file, grouped_output_file, output_file):
    fourth_column_words = get_unique_words_from_file(fourth_column_file)

    reachable_libraries = []
    with open(imported_modules_file, "r", encoding="utf-8") as file:
        for line in file:
            imported_words = line.split()
            if imported_words and any(word in fourth_column_words for word in imported_words):
                reachable_libraries.append(imported_words)

    final_modules = []
    seen_entries = set()
    with open(grouped_output_file, "r", encoding="utf-8") as file:
        grouped_lines = file.readlines()

    for words in reachable_libraries:
        for line in grouped_lines:
            if any(word in line for word in words):
                line_parts = line.split()
                if len(line_parts) >= 3:
                    module_entry = (
                        line_parts[0],
                        words[0],
                        line_parts[-2],
                        line_parts[-1]
                    )
                    if module_entry not in seen_entries:
                        seen_entries.add(module_entry)
                        final_modules.append({
                            "Sink-Function": line_parts[0],
                            "Reachable-Library": words[0],
                            "File": line_parts[-2],
                            "Line": line_parts[-1]
                        })

    with open(output_file, "w", encoding="utf-8") as f:
        for module in final_modules:
            f.write(
                f"Sink-Function : {module['Sink-Function']:<30} "
                f"Reachable-Library : {module['Reachable-Library']:<15} "
                f"File : {module['File']:<20} "
                f"Line : {module['Line']}\n"
            )

target_repo_path = sys.argv[1]

fourth_column_file = os.path.join(target_repo_path, "fourth_column_unique_data.txt")
imported_modules_file = os.path.join(target_repo_path, "imported_modules.txt")
grouped_output_file = os.path.join(target_repo_path, "grouped_output.txt")
output_file = os.path.join(target_repo_path, "reachable.txt")

find_matching_modules(fourth_column_file, imported_modules_file, grouped_output_file, output_file)