#!/bin/bash
repo_url=$1
repo_name=$2
lan=$3
target_repo_path=$4
start_time=$5
date=$6

codeql database create "${target_repo_path}/repo-db" --language="${lan}" --source-root="${target_repo_path}/${repo_name}-repo"
codeql database analyze "${target_repo_path}/repo-db" "/home/scable/codeql-repo/${lan}/ql/src/Security/scable" --ram 4096 --threads=0 --format=csv --output="${target_repo_path}/${repo_name}.csv" --rerun

python3 /home/scable/script/reachable/csv-parsing.py "$target_repo_path" "$repo_name"
reachable_sorting_json="$target_repo_path/reachable-sorting.json"

if [ -f "$reachable_sorting_json" ]; then
    echo "reachable-sorting.json found. Skipping the remaining scripts."
    echo "[]" > "$target_repo_path/reachable.json"
    rm -rf "$target_repo_path/repo-db" \
           "$target_repo_path/${repo_name}-repo" \
           "$target_repo_path/${current_date}-${repo_name}" \
           "$target_repo_path/reachable-sorting.json" \
           "$target_repo_path/$repo_name.csv"
    exit 0
fi

csv_parsing_txt="$target_repo_path/csv-parsing.txt"
if [ ! -f "$csv_parsing_txt" ]; then
    echo "csv-parsing.txt not found. Skipping the remaining scripts."
    echo "[]" > "$target_repo_path/reachable.json"
    rm -rf "$target_repo_path/repo-db" \
           "$target_repo_path/${repo_name}-repo" \
           "$target_repo_path/${date}-${repo_name}" \
           "$target_repo_path/reachable-sorting.json" \
           "$target_repo_path/$repo_name.csv" 
    exit 0
fi

python3 /home/scable/script/reachable/csvtxt-json-transform.py "$target_repo_path"
python3 /home/scable/script/reachable/import-parsing.py "$target_repo_path" "$repo_name"
python3 /home/scable/script/reachable/library-diff.py "$target_repo_path"
python3 /home/scable/script/reachable/reachable-sorting.py "$target_repo_path"

python3 /home/scable/script/reachable/sbom-cve.py "$target_repo_path/${date}-${start_time}-${repo_name}-scable-CycloneDX.json" "$target_repo_path"   
python3 -m venv "$target_repo_path/${date}-${repo_name}"                                                
source "$target_repo_path/${date}-${repo_name}/bin/activate"                                            
pip install -r "$target_repo_path/requirements.txt"                                                     
python3 /home/scable/script/reachable/import-normalize.py "$target_repo_path"                           
deactivate
python3 /home/scable/script/reachable/reachable-diff.py "$target_repo_path"                              
                                                                                               
rm -rf "$target_repo_path/repo-db" \
       "$target_repo_path/csv-parsing.txt" \
       "$target_repo_path/csvtxt-transform.json" \
       "$target_repo_path/fourth_column_unique_data.txt" \
       "$target_repo_path/${repo_name}-repo" \
       "$target_repo_path/import-parsing.txt" \
       "$target_repo_path/${date}-${repo_name}" \
       "$target_repo_path/library-diff.json" \
       "$target_repo_path/requirements.txt" \
       "$target_repo_path/$repo_name.csv" \
       "$target_repo_path/reachable-sorting.json" \
       "$target_repo_path/import-form.txt"
