from config import Config
from datetime import datetime, timezone
import threading, requests

thread_local = threading.local()
class ReputationChecker:
    def get_session():
        if not hasattr(thread_local, "session"):
            thread_local.session = requests.Session()
        return thread_local.session
    
    def check_package_reputation(package_name, package_version=None, platform='pypi'):
        session = ReputationChecker.get_session()

        url = f"https://pypi.org/pypi/{package_name}/json"
        try:
            response = session.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                info = data.get('info', {})
                release_dates = data.get('releases', {})
                valid_releases = [v for v in release_dates.values() if v]
                projectUrl = info.get('project_urls', None)

                if package_version:
                    version_info = release_dates.get(package_version)
                else:
                    version_info = release_dates.get(info.get("version"))

                if version_info:
                    created_at = min([datetime.strptime(v[0]['upload_time'], "%Y-%m-%dT%H:%M:%S") for v in valid_releases])
                    last_modified_at = max([datetime.strptime(v[0]['upload_time'], "%Y-%m-%dT%H:%M:%S") for v in valid_releases])
                    package_age = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days
                    last_modified_age = (datetime.now(timezone.utc) - last_modified_at.replace(tzinfo=timezone.utc)).days
                    downloads = ReputationChecker.get_pypi_downloads(package_name)
                    github_url = projectUrl.get('Source',"") if projectUrl != None else ""
                    stargazers_count = ReputationChecker.get_github_stars(github_url) if github_url else 0
                    score, reasons = ReputationChecker.calculate_score('pypi', package_age, last_modified_age, len(release_dates), downloads, stargazers_count)
                    risk_level = ReputationChecker.determine_risk_level(score)
                    return {
                        "package_name": package_name,
                        "version": package_version,
                        "platform": platform,
                        "score": score,
                        "risk_level": risk_level,
                        **({"reasons": reasons} if risk_level != "Green" else {})
                    }
        except requests.RequestException:
            print(f"Failed to fetch metadata for package: {package_name}")
        return None
    

    def get_pypi_downloads(package_name):
        session = ReputationChecker.get_session()
        url = f"https://pypistats.org/api/packages/{package_name}/recent?period=week"
        try:
            response = session.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                downloads = data.get("data", {}).get("last_week", 0)
                return downloads
            else:
                print(f"Failed to fetch recent download data for package: {package_name}, status code: {response.status_code}")
        except requests.RequestException:
            print(f"Failed to fetch download data for package: {package_name}")
        return 0


    def get_github_stars(github_url):
        session = ReputationChecker.get_session()
        github_url = github_url.rstrip(".git")
        if github_url.startswith("https://github.com/"):
            api_url = github_url.replace("https://github.com/", "https://api.github.com/repos/")
        else:
            return 0
        headers = {'Authorization': f'token {Config.GITHUB_API_TOKEN}'}
        try:
            response = session.get(api_url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get('stargazers_count', 0)
        except requests.RequestException:
            return 0

    def calculate_score(platform, package_age, last_modified_age, versions_count, downloads, stargazers_count):
        score = 0
        reasons = {}
        if package_age is not None:
            if package_age <= 30:
                score += 10
                reasons["Package age <= 30 days"] = "+10 points"
            elif 30 < package_age <= 180:
                score += 5
                reasons["Package age between 30 and 180 days"] = "+5 points"
        if last_modified_age is not None:
            if last_modified_age > 730:
                score += 10
                reasons["Last modified > 2 years"] = "+10 points"
            elif 365 <= last_modified_age <= 730:
                score += 5
                reasons["Last modified between 1 and 2 years"] = "+5 points"
        if versions_count is not None:
            if versions_count < 5:
                score += 10
                reasons["Versions count < 5"] = "+10 points"
            elif 5 <= versions_count <= 10:
                score += 5
                reasons["Versions count between 5 and 10"] = "+5 points"
        if downloads is not None:
            if downloads < 300:
                score += 20
                reasons["Downloads < 300"] = "+20 points"
            elif 300 <= downloads < 500:
                score += 10
                reasons["Downloads between 300 and 500"] = "+10 points"
        if stargazers_count is not None:
            if stargazers_count < 30:
                score += 10
                reasons["GitHub stars < 30"] = "+10 points"
            elif 30 <= stargazers_count < 70:
                score += 5
                reasons["GitHub stars between 30 and 70"] = "+5 points"
        return score, reasons
    
    def determine_risk_level(score):
        if score <= 25:
            return "Green"
        elif 25 < score < 50:
            return "Yellow"
        else:
            return "Red"