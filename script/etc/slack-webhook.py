import json
import urllib3
import sys
import os
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

http = urllib3.PoolManager()

def load_settings(file_path="/home/scable/settings.json"):
    try:
        with open(file_path, "r") as f:
            settings = json.load(f)
            return settings
    except FileNotFoundError:
        raise EnvironmentError(f"Settings file '{file_path}' not found.")
    except json.JSONDecodeError:
        raise EnvironmentError(f"Failed to decode JSON from '{file_path}'.")

settings = load_settings()

slack_webhook_url = settings.get("SLACK_WEBHOOK_URL")
slack_token = settings.get("SLACK_TOKEN")
user_tag = settings.get("USER_TAG")
channel_id = settings.get("SLACK_CHANNEL_ID")

if not slack_webhook_url or not slack_token or not user_tag or not channel_id:
    raise EnvironmentError("Missing required Slack settings: SLACK_WEBHOOK_URL, SLACK_TOKEN, USER_TAG, SLACK_CHANNEL_ID.")

client = WebClient(token=slack_token)

def send_slack_alert(first_observed_at, end_time, repository_name, channel, date, user_tag=user_tag, color='#87CEEB'):
    sbom_url = f"http://localhost:5173/{date}_{first_observed_at}_{repository_name}"

    slack_message = {
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*SCABLE ALERT*"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": f"*Start Time:*\n{first_observed_at}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*End Time:*\n{end_time}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Repository:*\n{repository_name}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*SBOM Reporting:*\n<{sbom_url}|{sbom_url}>"
                            }
                        ]
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": user_tag
                        }
                    }
                ]
            }
        ]
    }

    try:
        response = client.chat_postMessage(
            channel=channel,
            attachments=slack_message["attachments"]
        )
        return {
            'statusCode': response["ok"],
            'ts': response["ts"],
            'body': response["message"]
        }
    except SlackApiError as e:
        return {
            'statusCode': 500,
            'body': f"Error sending message to Slack: {e.response['error']}"
        }

def upload_file_to_slack(file_path, channel, thread_ts):
    if not os.path.exists(file_path):
        return {
            'statusCode': 404,
            'body': f"File not found: {file_path}"
        }

    try:
        response = client.files_upload_v2(
            channel=channel,
            file=file_path.strip(),
            title="SCABLE ZIP FILE",
            thread_ts=thread_ts
        )
        return {
            'statusCode': response["ok"],
            'file_url': response['file']['permalink']
        }
    except SlackApiError as e:
        return {
            'statusCode': 500,
            'body': f"Error uploading file to Slack: {e.response['error']}"
        }

if __name__ == "__main__":
    try:
        repo_name = sys.argv[1].strip()
        target_repo_path = sys.argv[2].strip()
        start_time = sys.argv[3].strip()
        end_time = sys.argv[4].strip()
        date = sys.argv[5].strip()

        response = send_slack_alert(start_time, end_time, repo_name, channel_id, date)
        print(response)

        ts = response['ts'] if response['statusCode'] is True else None

        if ts:
            zip_file_path = f"{target_repo_path}/{repo_name}-scable.zip".strip()
            file_upload_response = upload_file_to_slack(zip_file_path, channel_id, ts)
            print(file_upload_response)
    except IndexError:
        print("Error: Missing required command-line arguments: repo_name, target_repo_path, start_time, end_time, date.")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)
