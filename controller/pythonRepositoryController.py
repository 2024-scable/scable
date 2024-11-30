from flask import Blueprint, request, jsonify
from config import Config
from controller.relayHandler import relayRequest
from engine.typosquattingCheck import TypoSquattingChecker
from engine.reputationCheck import ReputationChecker
import threading

pythonController = Blueprint("pythonController", __name__)

def getPackageName(path):
    slicePath = path.strip("/").split("/")
    return slicePath[-1].lower()

def handle_reputation_check(libraryName, package_version, platform, config, relay_args):
    typoChecker = TypoSquattingChecker(language="python")
    try:
        if libraryName in config.get("SKIP_REPUTATION_PACKAGES", []):
            relayRequest(*relay_args)
            return

        if typoChecker.checkExactPackageName(libraryName):
            relayRequest(*relay_args)
            return

        is_typosquatting, highest_similarity, similar_packages = typoChecker.check_typo_squatting(libraryName)
        typosquatting_status = "Suspected" if is_typosquatting else "Not suspected"

        reputation = ReputationChecker.check_package_reputation(libraryName, package_version, platform)
        if reputation:
            reputation.update({
                "typosquatting_status": typosquatting_status,
                "similar_packages": similar_packages,
                "risk_level": reputation.get("risk_level", "Unknown"),
                "score": reputation.get("score", 0)
            })

            if reputation["risk_level"].upper() in config.get("BLOCK_REPUTATION_THRESHOLD", []):
                print(f"Blocking package '{libraryName}' due to reputation risk.")
                return

        relayRequest(*relay_args)
    except Exception as e:
        print(f"Error in reputation check thread: {e}")

@pythonController.route("/package-check/pypi/<path:path>", methods=Config.ALLOW_METHODS)
def pypiProxy(path):
    resourceUrl = Config.PYPI_REPO_URL + path
    reqHeader = dict(request.headers)
    reqHeader["Host"] = "pypi.org"

    try:
        config = Config().settings

        libraryName = getPackageName(path)

        package_version = request.args.get("package_version", "")
        platform = "pypi"  

        relay_args = (resourceUrl, path, request.method, reqHeader)

        reputation_thread = threading.Thread(
            target=handle_reputation_check,
            args=(libraryName, package_version, platform, config, relay_args)
        )
        reputation_thread.start()

        return jsonify({"message": "Request is being processed."}), 202  

    except Exception as e:
        return jsonify({"error": "Internal Server Error", "message": str(e)}), 500
