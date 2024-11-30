import os
from flask import Blueprint, jsonify, render_template

jenkinsController = Blueprint('jenkinsController', __name__)

@jenkinsController.route('/jenkins', methods=['GET'])
def get_jenkins_password():
    password_file_path = '/var/lib/jenkins/secrets/initialAdminPassword'

    if not os.path.exists(password_file_path):
        return jsonify({"error": "Password file not found"}), 404

    try:
        with open(password_file_path, 'r') as file:
            password = file.read().strip()
    except Exception as e:
        return jsonify({"error": "Could not read the password file", "details": str(e)}), 500

    return render_template('jenkins.html', password=password)
