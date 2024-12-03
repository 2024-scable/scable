from config import Config, Database
from flask import Blueprint, request, jsonify, Response, stream_with_context
from datetime import datetime
from engine.typosquattingCheck import TypoSquattingChecker
from engine.reputationCheck import ReputationChecker
import os
import threading
import json
import subprocess

SCAController = Blueprint("SCAController", __name__)

def normalizeLanguage(lan):
    lan = lan.lower()
    if lan in ['js', 'javascript']:
        return 'javascript'
    elif lan in ['p', 'py', 'python']:
        return 'python'
    elif lan in ['j', 'java']:
        return 'java'
    else:
        return None

def get_platform_to_language(platform):
    if platform in ["pypi"]:
        return "python"
    elif platform in ["maven", "gradle"]:
        return "java"
    else:
        return None

def generate_sbom_output(repo_url, repo_name, lan, target_repo_path, start_time, current_date):
    try:
        script_path = "/home/scable/script/shell-script/main.sh"  
        command = [
            "stdbuf", "-oL",  
            "/bin/bash",
            script_path,
            repo_url,
            repo_name,
            lan,
            target_repo_path,
            start_time,
            current_date
        ]
        
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        for line in iter(process.stdout.readline, ''):
            if line:
                yield line
            else:
                break
        process.stdout.close()
        process.wait()

        if process.returncode == 0:
            reporting_url = f"http://localhost:5173/{current_date}_{start_time}_{repo_name}"
            Database.update_sbom_result(current_date, start_time, repo_name, "completed", reporting_url)
        else:
            Database.update_sbom_result(current_date, start_time, repo_name, "failed", None)
            yield json.dumps({"error": "SBOM generation failed"}, ensure_ascii=False, indent=2) + '\n'
            return

        conn = Database.get_database_connect()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT status, result_url FROM log
            WHERE date = ? AND start_time = ? AND repo_name = ?
        """, (current_date, start_time, repo_name))
        result = cursor.fetchone()
        conn.close()

        if result:
            status, result_url = result
            if status == "completed":
                response_data = {
                    "date": current_date,
                    "start_time": start_time,
                    "repository": repo_name,
                    "language": lan,
                    "reporting_url": result_url
                }
                yield json.dumps(response_data, ensure_ascii=False, indent=2) + '\n\n'
            else:
                yield json.dumps({"error": "SBOM generation failed"}, ensure_ascii=False, indent=2) + '\n\n'
        else:
            yield json.dumps({"error": "SBOM result not found"}, ensure_ascii=False, indent=2) + '\n\n'

    except Exception as e:
        print(f"Error in generate_sbom_output: {e}")
        yield json.dumps({"error": "Internal server error", "details": str(e)}, ensure_ascii=False, indent=2) + '\n\n'
        yield '\n\n'

@SCAController.route("/sbom")
def sbom():
    repo_url = request.args.get('repo_url')
    lan = request.args.get('lan')
    if not repo_url or not lan:
        return jsonify({"error": "Missing required parameters: repo_url and lan"}), 400

    if not (repo_url.startswith("https://") or repo_url.startswith("http://")):
        return jsonify({"error": "Invalid repo_url scheme"}), 400

    try:
        now = datetime.now(Config.SEOUL_TIME_ZONE)
        current_date = now.strftime("%Y-%m-%d")
        start_time = now.strftime("%H-%M-%S")

        repo_name = repo_url.rstrip('/').split("/")[-1]
        target_repo_path = f"{Config.TARGET_REPO_HOME_PATH}/{current_date}_{start_time}_{repo_name}"
        os.makedirs(target_repo_path, exist_ok=True)

        lan = normalizeLanguage(lan)
        if lan is None:
            return jsonify({"error": "Unsupported language parameter"}), 400

        Database.insert_sbom_result(
            current_date=current_date,
            start_time=start_time,
            end_time=None,
            repo_name=repo_name,
            language=lan,
            result_path=target_repo_path,
            result_url=None,
            status="in_progress"
        )

        def generate():
            yield from generate_sbom_output(repo_url, repo_name, lan, target_repo_path, start_time, current_date)

        return Response(
            stream_with_context(generate()),
            mimetype='text/plain',
            headers={'Content-Type': 'text/plain; charset=utf-8'}
        )

    except Exception as e:
        print(f"Unexpected error in /sbom route: {e}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@SCAController.route('/package-check', methods=['GET'])
def check_reputation():
    package_name = request.args.get("package_name")
    package_version = request.args.get("package_version")
    platform = request.args.get("platform", "pypi").lower()

    language = get_platform_to_language(platform)
    if language is None:
        return jsonify({"error": f"Not Found Platform to Language: {platform}"}), 400

    typoChecker = TypoSquattingChecker(language=language)

    if not package_name:
        return jsonify({"error": "package_name is required"}), 400

    package_name_lower = package_name.lower()
    if package_name_lower in typoChecker.packageList:
        return jsonify({
            "package_name": package_name,
            "message": "Matches TOP 8000 packages",
            "risk_level": "Green",
            "score": 0
        }), 200

    is_typosquatting, highest_similarity, similar_packages = typoChecker.check_typo_squatting(package_name)

    reputation = ReputationChecker.check_package_reputation(package_name, package_version, platform)

    if reputation:
        risk_level = reputation.get("risk_level")

        if risk_level.upper() in ["YELLOW", "RED"]:
            reputation.update({
                "status": "Warning",
                "message": "Typosquatting suspected" if is_typosquatting else "High risk package",
                "similar_packages": similar_packages,
                "risk_level": risk_level,
                "score": reputation['score']
            })
            return jsonify(reputation), 400
        else:
            return jsonify(reputation), 200

    return jsonify({
        "package_name": package_name,
        "status": "Suspicious",
        "message": "Package not found or metadata unavailable",
        "risk_level": "Black"
    }), 400
