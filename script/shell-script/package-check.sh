#!/bin/bash
repo_url=$1
repo_name=$2
lan=$3
target_repo_path=$4
start_time=$5
date=$6

python3 /home/scable/script/package-check/detail.py "$repo_name" "$target_repo_path" "$start_time" "$date"
python3 /home/scable/script/package-check/sum.py "$repo_name" "$target_repo_path" "$start_time" "$date"
python3 /home/scable/script/package-check/malicious-package-check.py "$repo_name" "$target_repo_path" "$start_time" "$date"           