from flask import Blueprint, request, jsonify
from config import Config
from controller.relayHandler import relayRequest
from engine.typosquattingCheck import TypoSquattingChecker
from engine.reputationCheck import ReputationChecker
import sys

pythonController = Blueprint("pythonController", __name__)
typoChecker = TypoSquattingChecker("python")

@pythonController.route("/package-check/pypi/<path:path>", methods=Config.ALLOW_METHODS)
def pypiProxy(path):
    settings = Config.load_settings()
    skip_packages = settings.get("SKIP_REPUTATION_PACKAGES", [])
    block_reputation_threshold = settings.get("BLOCK_REPUTATION_THRESHOLD", [])

    resourceUrl = Config.PYPI_REPO_URL + path
    reqHeader = dict(request.headers)
    reqHeader["Host"] = "pypi.org"

    libraryName = getPackageName(path)

    print("SKIP_REPUTATION_PACKAGES:", skip_packages)
    print(f"Checking package: {libraryName}")

    if libraryName in skip_packages:
        print(f"[*] Skipping reputation check for package: {libraryName}")
        return relayRequest(resourceUrl, path, request.method, reqHeader)

    if typoChecker.checkExactPackageName(libraryName):
        print("[*] Normal (Famous) Library")
        return relayRequest(resourceUrl, path, request.method, reqHeader)

    else:
        print("[*] Non-Famous Library")
        is_typosquatting, highest_similarity, similar_packages = typoChecker.check_typo_squatting(libraryName)
        typosquatting_status = "Suspected" if is_typosquatting else "Not suspected"

        reputation = ReputationChecker.check_package_reputation(libraryName, platform="pypi")
        if reputation:
            reputation.update({
                "typosquatting_status": typosquatting_status,
                "similar_packages": similar_packages,
                "risk_level": reputation.get("risk_level", "Unknown"),
                "score": reputation.get("score", 0)
            })

            print(reputation)

            if reputation["risk_level"].upper() in block_reputation_threshold:
                return jsonify(reputation), 400

        return relayRequest(resourceUrl, path, request.method, reqHeader)

def getPackageName(path):
    slicePath = path.strip("/").split("/")
    return slicePath[-1].lower()
