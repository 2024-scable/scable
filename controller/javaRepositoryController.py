from flask import Blueprint, request
from config import Config
from controller.relayHandler import relayRequest
from engine.typosquattingCheck import TypoSquattingChecker

javaController = Blueprint("javaController", __name__)
checker = TypoSquattingChecker("python")

""" 
maven repository
https://repo1.maven.org/maven2/
"""
@javaController.route("/maven2/<path:path>", methods=Config.ALLOW_METHODS)
def mavenProxy(path):
    resourceUrl = Config.MAVEN_REPO_URL + path
    reqHeaders = dict(request.headers)
    reqHeaders["Host"] = "repo1.maven.org"

    libraryName = ""

    return relayRequest(resourceUrl, path, request.method, reqHeaders)

""" 
gradle repository
https://services.gradle.org/distributions/
"""
@javaController.route("/distributions/<path:path>", methods=Config.ALLOW_METHODS)
def gradleProxy(path):
    resourceUrl = Config.GRADLE_REPO_URL + path
    libraryName = ""
    
    if(checker.checkExactPackageName(libraryName)):
        print("[*] Normal Library")
        return relayRequest(resourceUrl, path, request.method)
    
    else:
        print("[*] Check TypoSquatting")
        result = checker.checkTyposquatting(libraryName)
        print(result)

def parsePackageName(resourceUrl):
    pass
