# config.py

from datetime import timezone, timedelta
import sqlite3
import json
import os
import threading
from filelock import FileLock
import subprocess
from controller.relayHandler import thread_local

class Config:
    SETTINGS_FILE_NAME = "settings.json"
    SETTINGS_LOCK_FILE = "settings.json.lock"

    DEFAULT_SETTINGS = {
        "GITHUB_API_TOKEN": "",
        "SLACK_WEBHOOK_URL": "",
        "SLACK_TOKEN": "",
        "USER_TAG": "",
        "SLACK_CHANNEL_ID": "",
        "JENKINS_URL": "",
        "JENKINS_USER": "",
        "JENKINS_API_TOKEN": "",
        "BLOCK_REPUTATION_THRESHOLD": ["RED"],
        "SKIP_REPUTATION_PACKAGES": []
    }

    SERVER_HOST = "0.0.0.0"
    SERVER_PORT = 8282
    IS_DEBUG = True
    ALLOW_METHODS = ["GET", "POST", "PUT", "HEAD", "OPTIONS", "PATCH"]
    SEOUL_TIME_ZONE = timezone(timedelta(hours=9))

    MAVEN_REPO_URL = "https://repo1.maven.org/maven2/"
    GRADLE_REPO_URL = "https://services.gradle.org/distributions/"
    JITPACK_REPO_URL = "https://jitpack.io/"
    CONFLUENT_REPO_URL = "https://packages.confluent.io/maven/"
    PYPI_REPO_URL = "https://pypi.org/"
    PYG_REPO_URL = "https://data.pyg.org/"
    CONDA_REPO_URL = "https://conda.anaconda.org/conda-forge/"
    NPM_REPO_URL = "https://registry.npmjs.org/"
    NODE_REPO_URL = "https://nodejs.org/dist/"

    TARGET_REPO_HOME_PATH = "/home/scable/target-repo"
    SBOM_MAIN_SHELL_SCRIPT_PATH = "script/shell-script/main.sh"
    PYPI_FAMOUS_PACKAGE_EXCEL_PATH = "script/package-check/top_8000_pypi_packages.xlsx"
    NPM_FAMOUS_PACKAGE_EXCEL_PATH = "script/package-check/top_10000_npm_packages.xlsx"
    MAVEN_FAMOUS_PACKAGE_EXCEL_PATH = "script/package-check/top_200_maven_packages.xlsx"

    _settings_lock = threading.Lock()

    @staticmethod
    def load_settings():
        lock = FileLock(Config.SETTINGS_LOCK_FILE)
        with lock:
            if not os.path.exists(Config.SETTINGS_FILE_NAME):
                print(f"{Config.SETTINGS_FILE_NAME} not found. Initializing with default settings.")
                Config.save_settings(Config.DEFAULT_SETTINGS)
                return Config.DEFAULT_SETTINGS

            try:
                with open(Config.SETTINGS_FILE_NAME, "r") as f:
                    settings = json.load(f)
                    print(f"{Config.SETTINGS_FILE_NAME} loaded successfully.")
                    return settings
            except (FileNotFoundError, json.JSONDecodeError) as e:
                print(f"{Config.SETTINGS_FILE_NAME} is corrupted or invalid: {e}. Initializing with default settings.")
                Config.save_settings(Config.DEFAULT_SETTINGS)
                return Config.DEFAULT_SETTINGS

    @staticmethod
    def save_settings(settings):
        lock = FileLock(Config.SETTINGS_LOCK_FILE)
        with lock:
            try:
                print(f"Saving settings: {settings}")
                with open(Config.SETTINGS_FILE_NAME, "w") as f:
                    json.dump(settings, f, indent=4)
                print(f"{Config.SETTINGS_FILE_NAME} saved successfully.")
            except Exception as e:
                print(f"Error saving settings: {str(e)}")

    @staticmethod
    def get_setting(key, default=None):
        settings = Config.load_settings()
        return settings.get(key, default)

    @staticmethod
    def validate_settings():
        settings = Config.load_settings()
        if not settings.get("GITHUB_API_TOKEN"):
            raise ValueError(
                "GitHub API Token is mandatory. Please provide 'GITHUB_API_TOKEN' in the settings file."
            )


class Database:
    DATABASE_PATH = "scable-log.db"
    LOG_TABLE_NAME = "log"

    INSERT_SBOM_RESULT_SQL = (
        f'INSERT INTO "{LOG_TABLE_NAME}" '
        f"(date, start_time, end_time, repo_name, language, result_path, result_url, status) "
        f"VALUES (?, ?, ?, ?, ?, ?, ?, ?);"
    )

    UPDATE_SBOM_RESULT_SQL = (
        f'UPDATE "{LOG_TABLE_NAME}" '
        f'SET status = ?, result_url = ? '
        f'WHERE date = ? AND start_time = ? AND repo_name = ?;'
    )

    @staticmethod
    def get_database_connect():
        try:
            conn = sqlite3.connect(Database.DATABASE_PATH, check_same_thread=True)
            print(f"Connected to database at {Database.DATABASE_PATH}.")
            return conn
        except sqlite3.Error as e:
            print(f"Database connection error: {e}")
            raise

    @staticmethod
    def insert_sbom_result(current_date, start_time, end_time, repo_name, language, result_path, result_url, status="in_progress"):
        try:
            conn = Database.get_database_connect()
            cur = conn.cursor()
            cur.execute(
                Database.INSERT_SBOM_RESULT_SQL,
                (current_date, start_time, end_time, repo_name, language, result_path, result_url, status),
            )
            conn.commit()
            print(f"Inserted SBOM result for repository '{repo_name}' on {current_date} at {start_time}.")
        except sqlite3.Error as e:
            print(f"Error inserting SBOM result: {e}")
            raise
        finally:
            if conn:
                conn.close()
                print("Database connection closed.")

    @staticmethod
    def update_sbom_result(current_date, start_time, repo_name, status, result_url):
        try:
            conn = Database.get_database_connect()
            cur = conn.cursor()
            cur.execute(
                Database.UPDATE_SBOM_RESULT_SQL,
                (status, result_url, current_date, start_time, repo_name),
            )
            conn.commit()
            print(f"Updated SBOM result for repository '{repo_name}' on {current_date} at {start_time} to status '{status}'.")
        except sqlite3.Error as e:
            print(f"Error updating SBOM result: {e}")
            raise
        finally:
            if conn:
                conn.close()
                print("Database connection closed.")

def teardown_session(exception=None):
    if hasattr(thread_local, "session"):
        thread_local.session.close()
        print("Session closed.")

def start_npm_dev():
    try:
        result = subprocess.run(
            ["pgrep", "-f", "npm run dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        if result.returncode != 0:
            stdout_log = '/home/scable/result-html/npm_stdout.log'
            stderr_log = '/home/scable/result-html/npm_stderr.log'
            with open(stdout_log, 'a') as stdout_file, open(stderr_log, 'a') as stderr_file:
                subprocess.Popen(
                    ["npm", "run", "dev"],
                    stdout=stdout_file,
                    stderr=stderr_file,
                    stdin=subprocess.DEVNULL,
                    cwd="/home/scable/result-html/",
                    start_new_session=True
                )
            print("[DEBUG] npm run dev started.")
        else:
            print("[DEBUG] npm run dev is already running.")
    except Exception as e:
        print(f"[ERROR] Failed to start npm run dev: {e}")
