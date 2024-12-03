import os
import subprocess
import json
from flask import Flask, render_template, jsonify, Response
from config import Config, teardown_session, start_npm_dev
from controller.javaRepositoryController import javaController
from controller.pythonRepositoryController import pythonController
from controller.settingsController import settingsController
from controller.SCAController import SCAController
from controller.jenkinsController import jenkinsController
from controller.relayHandler import thread_local

app = Flask(__name__)

app.register_blueprint(javaController)
app.register_blueprint(pythonController)
app.register_blueprint(settingsController)
app.register_blueprint(SCAController)
app.register_blueprint(jenkinsController)

@app.route("/", methods=Config.ALLOW_METHODS)
def apidocs():
    return render_template("api-docs.html")

@app.route("/healthy", methods=["GET"])
def healthy():
    file_path = os.path.join(os.path.dirname(__file__), "data", "api-docs.json")
    with open(file_path, "r") as json_file:
        json_data = json_file.read()
    return Response(json_data, content_type="application/json")

@app.teardown_appcontext
def teardown(exception=None):
    teardown_session(exception)

if __name__ == "__main__":
    start_npm_dev()
    print(f"[DEBUG] Server Configure: Host={Config.SERVER_HOST}, Port={Config.SERVER_PORT}, Debug={Config.IS_DEBUG}")
    app.run(
        host=Config.SERVER_HOST,
        port=Config.SERVER_PORT,
        debug=Config.IS_DEBUG,
        threaded=True,
        use_reloader=False
    )
