#!/bin/bash
repo_url=$1
repo_name=$2
lan=$3
target_repo_path=$4
start_time=$5
date=$6

end_time=$(python3 -c "
import pytz
from datetime import datetime
seoul_tz = pytz.timezone('Asia/Seoul')
seoul_time = datetime.now(seoul_tz)
print(seoul_time.strftime('%H-%M-%S'))
")

sqlite3 /home/scable/log/scable-log.db <<EOF
UPDATE log SET end_time="$end_time" WHERE start_time="$start_time";
EOF

python3 /home/scable/script/etc/merge.py "$target_repo_path" "$start_time" "$repo_name" "$date" 
mv "${target_repo_path}/reachable.json" "/home/scable/result-html/public/${date}_${start_time}_${repo_name}"
mv "${target_repo_path}/packagecheck-summary.json" "/home/scable/result-html/public/${date}_${start_time}_${repo_name}"
mv "${target_repo_path}/sbom-detail.json" "/home/scable/result-html/public/${date}_${start_time}_${repo_name}"
mv "${target_repo_path}/sbom-summary.json" "/home/scable/result-html/public/${date}_${start_time}_${repo_name}"
cp "${target_repo_path}/${date}-${start_time}-${repo_name}-scable-CycloneDX.json" "/home/scable/result-html/public/${date}_${start_time}_${repo_name}/sbom-cyclonedx.json"
cp "${target_repo_path}/${date}-${start_time}-${repo_name}-scable-SPDX.json" "/home/scable/result-html/public/${date}_${start_time}_${repo_name}/sbom-spdx.json"
cp "${target_repo_path}/${date}-${start_time}-${repo_name}-scable-swid.xml" "/home/scable/result-html/public/${date}_${start_time}_${repo_name}/sbom-swid.xml"
mv "${target_repo_path}/dependency.json" "/home/scable/result-html/public/${date}_${start_time}_${repo_name}"

cd "$target_repo_path" || exit 1
zip -r "$repo_name-scable.zip" ./*

missing_settings=$(python3 -c "
import json
try:
    with open('/home/scable/settings.json') as f:
        settings = json.load(f)
    required_keys = ['SLACK_WEBHOOK_URL', 'SLACK_TOKEN', 'USER_TAG', 'SLACK_CHANNEL_ID']
    missing = [key for key in required_keys if key not in settings or not settings[key]]
    if missing:
        print('MISSING')
except Exception as e:
    print('MISSING')
")

if [[ "$missing_settings" == "MISSING" ]]; then
    echo "[!] Required SLACK configuration values are missing. Skipping Slack notification."
else
    python3 /home/scable/script/etc/slack-webhook.py "$repo_name" "$target_repo_path" "$start_time" "$end_time" "$date"
fi
