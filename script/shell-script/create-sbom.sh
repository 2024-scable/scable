#!/bin/bash
repo_url=$1
repo_name=$2
lan=$3
target_repo_path=$4
start_time=$5
date=$6

python3 /home/scable/script/create-sbom/cdxgen.py "$repo_url" "$repo_name" "$target_repo_path"

python3 /home/scable/script/create-sbom/add_cve.py "$target_repo_path" "$repo_name"

python3 /home/scable/script/create-sbom/spdx.py "$target_repo_path" "$repo_name"
python3 /home/scable/script/create-sbom/swid.py "$target_repo_path" "$repo_name"

jq . "$target_repo_path/$repo_name-scable.json" > "$target_repo_path/$date-$start_time-$repo_name-scable-CycloneDX.json"
jq . "$target_repo_path/$repo_name-spdx.json" > "$target_repo_path/$date-$start_time-$repo_name-scable-SPDX.json"
mv "$target_repo_path/$repo_name-swid.xml" "$target_repo_path/$date-$start_time-$repo_name-scable-swid.xml"

rm -rf "$target_repo_path/$repo_name-scable.json"
rm -rf "$target_repo_path/$repo_name-spdx.json"
rm -rf "$target_repo_path/$repo_name-CycloneDX.json"