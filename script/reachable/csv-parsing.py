import sys
import os
import pandas as pd
import json

def main():
    target_repo_path = sys.argv[1]
    repo_name = sys.argv[2]

    file_path = f"{target_repo_path}/{repo_name}.csv"
    output_json_path = f"{target_repo_path}/reachable-sorting.json"

    if not os.path.exists(file_path):
        print(f"Warning: CSV file '{file_path}' not found. Creating empty 'reachable-sorting.json'.")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)
        sys.exit(0)

    try:
        data = pd.read_csv(file_path, header=None)
    except pd.errors.EmptyDataError:
        print(f"Warning: CSV file '{file_path}' is empty. Creating empty 'reachable-sorting.json'.")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)
        sys.exit(0)
    except Exception as e:
        print(f"Error while reading CSV file '{file_path}': {e}")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)
        sys.exit(0)

    if data.empty:
        print(f"Warning: CSV file '{file_path}' contains no data. Creating empty 'reachable-sorting.json'.")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)
        sys.exit(0)

    required_columns = [3, 4, 5]
    missing_columns = [col for col in required_columns if col not in data.columns]
    if missing_columns:
        print(f"Warning: CSV file '{file_path}' is missing columns: {missing_columns}. Creating empty 'reachable-sorting.json'.")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)
        sys.exit(0)

    try:
        fourth_column_data = data[3].astype(str).str.replace('"', '', regex=False)
        fifth_column_data = data[4].astype(str)
        sixth_column_data = data[5].astype(str)
    except Exception as e:
        print(f"Error while processing columns: {e}")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)
        sys.exit(0)

    flattened_data = []
    for i, text in enumerate(fourth_column_data):
        lines = text.splitlines()
        fifth_value = fifth_column_data[i]
        sixth_value = sixth_column_data[i]
        for line in lines:
            if line.strip():  
                flattened_data.append((line.strip(), fifth_value, sixth_value))

    if not flattened_data:
        print("Warning: No data to process after flattening. Creating empty 'reachable-sorting.json'.")
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=4)
        sys.exit(0)

    grouped_data = {}
    for text, fifth_value, sixth_value in flattened_data:
        words = text.split()
        if not words:
            continue
        first_word = words[0]
        if first_word not in grouped_data:
            grouped_data[first_word] = []
        grouped_data[first_word].append((text, fifth_value, sixth_value))

    def compress_range(numbers):
        numbers = sorted(set(map(int, numbers)))
        if len(numbers) == 1:
            return str(numbers[0])
        return f"{numbers[0]}~{numbers[-1]}"

    output_lines = []
    unique_data = set()
    for first_word, entries in grouped_data.items():
        all_lines = [line_number for _, _, line_number in entries]
        compressed_range = compress_range(all_lines)

        for text, fifth_value, _ in entries:
            if text not in unique_data:
                output_lines.append(f"{text} {fifth_value} {compressed_range}")
                unique_data.add(text)

    unique_data_path = f"{target_repo_path}/fourth_column_unique_data.txt"
    try:
        pd.Series(list(unique_data)).to_csv(unique_data_path, index=False, header=False)
    except Exception as e:
        print(f"Error while saving '{unique_data_path}': {e}")
        sys.exit(1)

    output_path = f"{target_repo_path}/csv-parsing.txt"
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(output_lines))
    except Exception as e:
        print(f"Error while saving '{output_path}': {e}")
        sys.exit(1)

    print(f"Successfully processed CSV data. Outputs saved to '{unique_data_path}' and '{output_path}'.")

if __name__ == "__main__":
    main()
