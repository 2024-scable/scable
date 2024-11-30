#!/bin/bash
repo_url=$1
repo_name=$2
lan=$3
target_repo_path=$4
start_time=$5
date=$6

mkdir "/home/scable/result-html/public/${date}_${start_time}_${repo_name}"
python3 "/home/scable/script/etc/analyze-repo-update.py" "$date" "$start_time" "$repo_name"

bash /home/scable/script/shell-script/create-sbom.sh "$repo_url" "$repo_name" "$lan" "$target_repo_path" "$start_time" "$date"

bash /home/scable/script/shell-script/reachable.sh "$repo_url" "$repo_name" "$lan" "$target_repo_path" "$start_time" "$date"

bash /home/scable/script/shell-script/package-check.sh "$repo_url" "$repo_name" "$lan" "$target_repo_path" "$start_time" "$date"

bash /home/scable/script/shell-script/finishing-work.sh "$repo_url" "$repo_name" "$lan" "$target_repo_path" "$start_time" "$date" 