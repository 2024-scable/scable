import json
from flask import Blueprint, request, render_template, redirect, url_for
import threading

settingsController = Blueprint("settingsController", __name__)

settings_lock = threading.Lock()

def load_settings():
    with settings_lock:
        try:
            with open("settings.json", "r") as f:
                settings = json.load(f)
                print("Settings successfully loaded.")
                return settings
        except (FileNotFoundError, json.JSONDecodeError):
            print("Settings file not found or invalid. Returning default settings.")
            return {}

def save_settings(settings):
    with settings_lock:  
        try:
            print(f"Saving settings: {settings}")
            with open("settings.json", "w") as f:
                json.dump(settings, f, indent=4)
            print("Settings have been successfully saved.")
        except Exception as e:
            print(f"Error saving settings: {str(e)}")

def get_success_message(settings):
    configured_settings = []

    if settings.get("GITHUB_API_TOKEN"):
        configured_settings.append("GitHub")

    slack_fields = [
        settings.get("SLACK_WEBHOOK_URL"),
        settings.get("SLACK_TOKEN"),
        settings.get("USER_TAG"),
        settings.get("SLACK_CHANNEL_ID"),
    ]
    if all(slack_fields):
        configured_settings.append("Slack")

    jenkins_fields = [
        settings.get("JENKINS_URL"),
        settings.get("JENKINS_USER"),
        settings.get("JENKINS_API_TOKEN"),
    ]
    if all(jenkins_fields):
        configured_settings.append("Jenkins")

    if settings.get("BLOCK_REPUTATION_THRESHOLD"):
        thresholds = ", ".join(settings["BLOCK_REPUTATION_THRESHOLD"])
        configured_settings.append(f"Reputation Threshold ({thresholds})")

    if settings.get("SKIP_REPUTATION_PACKAGES"):
        skip_packages = ", ".join(settings["SKIP_REPUTATION_PACKAGES"])
        configured_settings.append(f"Skip Packages ({skip_packages})")

    if configured_settings:
        return f"Configured settings: {', '.join(configured_settings)}."
    return "No settings configured."

@settingsController.route("/settings", methods=["GET"])
def settings():
    success = request.args.get("success", None)
    settings = load_settings()
    success_message = get_success_message(settings) if success else None
    return render_template("settings.html", settings=settings, success_message=success_message)

@settingsController.route("/update-all-settings", methods=["POST"])
def update_all_settings():
    new_settings = request.form.to_dict(flat=False)

    github_api_token = new_settings.get("github_api_token", [""])[0]
    if not github_api_token:
        print("GitHub API Token is required. Please provide a valid value.")
        return "GitHub API Token is required. Please provide a valid value.", 400

    block_reputation_threshold = new_settings.get("block_reputation_threshold[]", [])
    print(f"Received BLOCK_REPUTATION_THRESHOLD: {block_reputation_threshold}")

    skip_packages = new_settings.get("skip_reputation_packages", [""])[0].split(",")
    skip_packages = [pkg.strip() for pkg in skip_packages if pkg.strip()]
    print(f"Received SKIP_REPUTATION_PACKAGES: {skip_packages}")

    settings = {
        "SLACK_WEBHOOK_URL": new_settings.get("slack_webhook_url", [""])[0],
        "SLACK_TOKEN": new_settings.get("slack_token", [""])[0],
        "USER_TAG": new_settings.get("user_tag", [""])[0],
        "SLACK_CHANNEL_ID": new_settings.get("slack_channel_id", [""])[0],
        "JENKINS_URL": new_settings.get("jenkins_url", [""])[0],
        "JENKINS_USER": new_settings.get("jenkins_user", [""])[0],
        "JENKINS_API_TOKEN": new_settings.get("jenkins_api_token", [""])[0],
        "GITHUB_API_TOKEN": github_api_token,
        "BLOCK_REPUTATION_THRESHOLD": block_reputation_threshold,
        "SKIP_REPUTATION_PACKAGES": skip_packages,
    }

    print(f"Final settings to save: {settings}")

    save_settings(settings)
    print("All settings have been successfully saved.")
    return redirect(url_for("settingsController.settings", success=1))
