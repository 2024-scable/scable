#!/bin/bash
repo_url=$1
repo_name=$2
lan=$3
target_repo_path=$4
start_time=$5
date=$6

echo ""
echo -e "\033[32m[*] SCABLE ANALYZE START\033[0m"
mkdir "/home/scable/result-html/public/${date}_${start_time}_${repo_name}" >>${target_repo_path}/log.txt 2>&1
python3 "/home/scable/script/etc/analyze-repo-update.py" "$date" "$start_time" "$repo_name" >>${target_repo_path}/log.txt 2>&1
bash /home/scable/script/shell-script/create-sbom.sh "$repo_url" "$repo_name" "$lan" "$target_repo_path" "$start_time" "$date" >>${target_repo_path}/log.txt 2>&1
echo -e "\033[32m[+] CREATE SBOM COMPLETE\033[0m"
bash /home/scable/script/shell-script/reachable.sh "$repo_url" "$repo_name" "$lan" "$target_repo_path" "$start_time" "$date" >>${target_repo_path}/log.txt 2>&1
echo -e "\033[32m[+] REACHABLE ANALYZE COMPLETE\033[0m"
bash /home/scable/script/shell-script/package-check.sh "$repo_url" "$repo_name" "$lan" "$target_repo_path" "$start_time" "$date" >>${target_repo_path}/log.txt 2>&1
echo -e "\033[32m[+] PACKAGE ANALYZE COMPLETE\033[0m"
bash /home/scable/script/shell-script/finishing-work.sh "$repo_url" "$repo_name" "$lan" "$target_repo_path" "$start_time" "$date" >>${target_repo_path}/log.txt 2>&1
echo -e "\033[32m[+] FINISHING WORK COMPLETE\033[0m"
echo ""
