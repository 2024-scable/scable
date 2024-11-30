import requests
import sys
from datetime import datetime, timezone
import json
from urllib.parse import unquote
import pandas as pd
from typo import TypoSquattingChecker
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import time
import collections

thread_local = threading.local()

def get_session():
    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()
    return thread_local.session

def load_settings():
    with open("settings.json", "r") as f:
        return json.load(f)

def load_famous_libraries_from_excel(file_paths):
    famous_libraries = set()
    for file_path in file_paths:
        df = pd.read_excel(file_path, engine='openpyxl')
        famous_libraries.update(df.iloc[:, 0].dropna().str.lower().tolist())
    return list(famous_libraries)

def load_components_from_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
    components = data.get("components", [])
    for component in components:
        platform = component.get("ecosystem", "").lower()
        component["ecosystem"] = platform
        group = component.get("group", "")
        name = component.get("name")
        version = component.get("version")
        if group:
            full_name = f"{group}/{name}".lower()
        else:
            full_name = name.lower()
        print(f"Loaded component - Platform: {platform}, Name: {full_name}, Version: {version if version else 'latest'}")
        component["full_name"] = full_name
    print(f"Total components loaded: {len(components)}")
    return data

@lru_cache(maxsize=None)
def get_npm_metadata(package_name):
    session = get_session()
    print(f"Fetching npm metadata for package: {package_name}")
    url = f"https://registry.npmjs.org/{package_name}"
    try:
        response = session.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            time_data = data.get('time', {})
            repository = data.get('repository', {})
            github_url = None
            if isinstance(repository, dict):
                github_url = repository.get('url')
            elif isinstance(repository, str):
                github_url = repository
            if not github_url:
                github_url = data.get('homepage')
            if github_url and github_url.startswith('git+'):
                github_url = github_url[4:]
            if github_url and github_url.endswith('#readme'):
                github_url = github_url.replace('#readme', '')
            versions_count = len(data.get('versions', {}))
            if time_data:
                try:
                    created_at = datetime.strptime(time_data['created'], "%Y-%m-%dT%H:%M:%S.%fZ")
                    modified_at = datetime.strptime(time_data['modified'], "%Y-%m-%dT%H:%M:%S.%fZ")
                    package_age = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days
                    last_modified_age = (datetime.now(timezone.utc) - modified_at.replace(tzinfo=timezone.utc)).days
                    print(f"npm metadata fetched for {package_name}: Age={package_age}, Last Modified={last_modified_age}, GitHub URL={github_url}, Versions={versions_count}")
                    return package_age, last_modified_age, github_url, versions_count
                except ValueError:
                    print(f"Error parsing dates for package: {package_name}")
    except requests.RequestException:
        pass
    print(f"Failed to fetch npm metadata for package: {package_name}")
    return None, None, None, None

@lru_cache(maxsize=None)
def get_pypi_metadata(package_name):
    session = get_session()
    print(f"Fetching PyPI metadata for package: {package_name}")
    url = f"https://pypi.org/pypi/{package_name}/json"
    try:
        response = session.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            info = data.get('info') or {}
            release_dates = data.get('releases', {})
            valid_releases = [v for v in release_dates.values() if v]
            versions_count = len(valid_releases)
            project_urls = info.get('project_urls') or {}
            github_url = project_urls.get('Source') or project_urls.get('Repository') or None
            if valid_releases:
                try:
                    first_release_date = min([datetime.strptime(v[0]['upload_time'], "%Y-%m-%dT%H:%M:%S") for v in valid_releases])
                    last_release_date = max([datetime.strptime(v[0]['upload_time'], "%Y-%m-%dT%H:%M:%S") for v in valid_releases])
                    package_age = (datetime.now(timezone.utc) - first_release_date.replace(tzinfo=timezone.utc)).days
                    last_modified_age = (datetime.now(timezone.utc) - last_release_date.replace(tzinfo=timezone.utc)).days
                    print(f"PyPI metadata fetched for {package_name}: Age={package_age}, Last Modified={last_modified_age}, GitHub URL={github_url}, Versions={versions_count}")
                    return package_age, last_modified_age, github_url, versions_count
                except ValueError:
                    print(f"Error parsing release dates for package: {package_name}")
    except requests.RequestException:
        pass
    print(f"Failed to fetch PyPI metadata for package: {package_name}")
    return None, None, None, None

@lru_cache(maxsize=None)
def get_pypi_downloads(package_name):
    session = get_session()
    url = f"https://pypistats.org/api/packages/{package_name}/recent?period=week"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = session.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            downloads = data.get("data", {}).get("last_week", 0)
            print(f"[DEBUG] Package: {package_name}, Downloads Last Week: {downloads}")
            return downloads
        elif response.status_code == 404:
            print(f"Package not found on PyPI Stats: {package_name}.")
        else:
            print(f"Failed to fetch download data from PyPI Stats. Status code: {response.status_code}")
    except requests.RequestException:
        print(f"Failed to fetch download data for package: {package_name}")
    return None

@lru_cache(maxsize=None)
def get_npm_downloads(package_name):
    session = get_session()
    url = f"https://api.npmjs.org/downloads/point/last-week/{package_name}"
    try:
        response = session.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            downloads = data.get('downloads', 0)
            print(f"Package: {package_name}, Downloads Last Week: {downloads}")
            return downloads
        elif response.status_code == 404:
            print(f"Package not found on npm: {package_name}.")
        else:
            print(f"Failed to fetch download data from npm. Status code: {response.status_code}")
    except requests.RequestException:
        pass
    return None

@lru_cache(maxsize=None)
def get_github_stars(github_url, api_token):
    session = get_session()
    time.sleep(1)
    
    if not github_url:
        print("No GitHub URL provided.")
        return 0  

    print(f"Fetching GitHub stars for URL: {github_url}")
    github_url = github_url.rstrip(".git")
    if github_url.startswith("git+"):
        github_url = github_url[4:]
    if github_url.startswith("https://github.com/"):
        parts = github_url.replace("https://github.com/", "").split('/')
        if len(parts) >= 2:
            owner = parts[0]
            repo = parts[1]
            api_url = f"https://api.github.com/repos/{owner}/{repo}"
        else:
            print(f"Invalid GitHub repository URL: {github_url}")
            return 0  
    else:
        print(f"Invalid GitHub URL: {github_url}")
        return 0  

    headers = {'Authorization': f'token {api_token}'}
    try:
        response = session.get(api_url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict):
                stargazers_count = data.get('stargazers_count', 0)
                print(f"GitHub stars fetched: Stars={stargazers_count}")
                return stargazers_count
            else:
                print(f"Unexpected data type received from GitHub API: {type(data)}")
                return 0
        else:
            print(f"Failed to fetch GitHub stars for URL: {github_url}. Status code: {response.status_code}")
            return 0
    except requests.RequestException as e:
        print(f"RequestException while fetching GitHub stars for URL: {github_url}, error: {e}")
        return 0


@lru_cache(maxsize=None)
def get_github_metadata(repo_name, api_token):
    session = get_session()
    time.sleep(1)
    print(f"Fetching GitHub metadata for repository: {repo_name}")
    url = f"https://api.github.com/repos/{repo_name}"
    headers = {'Authorization': f'token {api_token}'}
    try:
        response = session.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            stargazers_count = data.get('stargazers_count', 0)
            created_at = datetime.strptime(data.get('created_at'), "%Y-%m-%dT%H:%M:%SZ")
            package_age = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days
            updated_at = datetime.strptime(data.get('updated_at'), "%Y-%m-%dT%H:%M:%SZ")
            last_modified_age = (datetime.now(timezone.utc) - updated_at.replace(tzinfo=timezone.utc)).days
            releases_url = f"https://api.github.com/repos/{repo_name}/releases"
            releases_response = session.get(releases_url, headers=headers, timeout=10)
            versions_count = 0
            if releases_response.status_code == 200:
                releases_data = releases_response.json()
                versions_count = len(releases_data)
            print(f"GitHub metadata fetched for {repo_name}: Age={package_age}, Last Modified={last_modified_age}, Versions={versions_count}, Stars={stargazers_count}")
            return package_age, last_modified_age, versions_count, stargazers_count
    except requests.RequestException:
        pass
    print(f"Failed to fetch GitHub metadata for repository: {repo_name}")
    return None, None, None, None

def calculate_score(platform, package_age, last_modified_age, versions_count, downloads, stargazers_count):
    score = 0
    reasons = {}
    if platform in ['pypi', 'npm']:
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
    elif platform in ['github', 'maven']:
        if package_age is not None:
            if package_age <= 30:
                score += 10
                reasons["Package age <= 1 month"] = "+10 points"
            elif 30 < package_age <= 180:
                score += 5
                reasons["Package age between 1 and 6 months"] = "+5 points"
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
        if stargazers_count is not None:
            if stargazers_count < 30:
                score += 10
                reasons["GitHub stars < 30"] = "+10 points"
            elif 30 <= stargazers_count < 70:
                score += 5
                reasons["GitHub stars between 30 and 70"] = "+5 points"
    return score, reasons

def process_component(component, api_token, typo_checker, famous_libraries, none_counts, none_counts_lock):
    risk_level = 'N/A'  # 위험 수준 초기화
    platform_lower = component.get("ecosystem", "").lower()
    full_name = component.get("full_name")
    version = component.get("version")
    print(f"Analyzing component: Platform={platform_lower}, Name={full_name}, Version={version if version else 'latest'}")

    # 1. 유명 패키지 검사
    if full_name in famous_libraries:
        print(f"Package {full_name} is a famous library. Setting Risk Level to Green with 0 points.")
        package_check_entry = {
            "full_name": full_name,
            "Score": 0,
            "Risk Level": "Green",
            "Typosquatting Suspected": "N/A",
            "Warning Reasons": {}
        }
        component["package_check"] = [package_check_entry]
        return component, 'Green'

    # 2. 타이포스쿼팅 검사
    if typo_checker.checkExactPackageName(full_name):
        typosquatting_status = "X"
        risk_level = "Green"
        score = 0
        reasons = {}
        none_flags = {}
    else:
        similar_packages = typo_checker.checkTyposquatting(full_name)
        typosquatting_status = "; ".join([f"{pkg} ({score}%)" for pkg, score in similar_packages]) if similar_packages else "X"

        package_age = None
        last_modified_age = None
        versions_count = None
        stargazers_count = None
        downloads = None

        github_url = None
        none_flags = {}

        if platform_lower == 'pypi':
            package_age, last_modified_age, github_url, versions_count = get_pypi_metadata(full_name)
            if package_age is None:
                with none_counts_lock:
                    none_counts['package_age'] += 1
                none_flags['package_age'] = "Can't check the information."
            if last_modified_age is None:
                with none_counts_lock:
                    none_counts['last_modified_age'] += 1
                none_flags['last_modified_age'] = "Can't check the information."
            if versions_count is None:
                with none_counts_lock:
                    none_counts['versions_count'] += 1
                none_flags['versions_count'] = "Can't check the information."
            downloads = get_pypi_downloads(full_name)
            if downloads is None:
                with none_counts_lock:
                    none_counts['downloads'] += 1
                none_flags['downloads'] = "Can't check the information."
            if github_url:
                stargazers_count = get_github_stars(github_url, api_token)
                if stargazers_count is None:
                    with none_counts_lock:
                        none_counts['stargazers_count'] += 1
                    none_flags['stargazers_count'] = "Can't check the information."
            else:
                stargazers_count = 0
                with none_counts_lock:
                    none_counts['stargazers_count'] += 1
                none_flags['stargazers_count'] = "GitHub URL not available"
        elif platform_lower == 'npm':
            package_age, last_modified_age, github_url, versions_count = get_npm_metadata(full_name)
            if package_age is None:
                with none_counts_lock:
                    none_counts['package_age'] += 1
                none_flags['package_age'] = "Can't check the information."
            if last_modified_age is None:
                with none_counts_lock:
                    none_counts['last_modified_age'] += 1
                none_flags['last_modified_age'] = "Can't check the information."
            if versions_count is None:
                with none_counts_lock:
                    none_counts['versions_count'] += 1
                none_flags['versions_count'] = "Can't check the information."
            downloads = get_npm_downloads(full_name)
            if downloads is None:
                with none_counts_lock:
                    none_counts['downloads'] += 1
                none_flags['downloads'] = "Can't check the information."
            if github_url:
                stargazers_count = get_github_stars(github_url, api_token)
                if stargazers_count is None:
                    with none_counts_lock:
                        none_counts['stargazers_count'] += 1
                    none_flags['stargazers_count'] = "Can't check the information."
            else:
                with none_counts_lock:
                    none_counts['stargazers_count'] += 1
                stargazers_count = 0
                none_flags['stargazers_count'] = "GitHub URL not available"
        elif platform_lower == 'github':
            package_age, last_modified_age, versions_count, stargazers_count = get_github_metadata(full_name, api_token)
            if package_age is None:
                with none_counts_lock:
                    none_counts['package_age'] += 1
                none_flags['package_age'] = "Can't check the information."
            if last_modified_age is None:
                with none_counts_lock:
                    none_counts['last_modified_age'] += 1
                none_flags['last_modified_age'] = "Can't check the information."
            if versions_count is None:
                with none_counts_lock:
                    none_counts['versions_count'] += 1
                none_flags['versions_count'] = "Can't check the information."
            if stargazers_count is None:
                with none_counts_lock:
                    none_counts['stargazers_count'] += 1
                none_flags['stargazers_count'] = "Can't check the information."
        elif platform_lower == 'maven':
            pass

        score, reasons = calculate_score(platform_lower, package_age, last_modified_age, versions_count, downloads, stargazers_count)

        if platform_lower in ['github', 'maven']:
            if score <= 15:
                risk_level = "Green"
            elif 16 <= score <= 30:
                risk_level = "Yellow"
            elif score > 30:
                risk_level = "Red"
        elif platform_lower in ['pypi', 'npm']:
            if score <= 25:
                risk_level = "Green"
            elif 25 < score < 50:
                risk_level = "Yellow"
            elif score >= 50:
                risk_level = "Red"
        else:
            risk_level = "N/A"  

    if risk_level == "Green":
        warning_reasons = {}
    else:
        warning_reasons = reasons

    package_check_entry = {
        "full_name": full_name,
        "Score": score if platform_lower in ['pypi', 'npm', 'github', 'maven'] else 0,  # FIX
        "Risk Level": risk_level if platform_lower in ['pypi', 'npm', 'github', 'maven'] else "N/A",
        "Typosquatting Suspected": typosquatting_status,
        "Warning Reasons": warning_reasons
    }

    if none_flags:
        package_check_entry["None_Flags"] = none_flags

    component["package_check"] = [package_check_entry]

    if platform_lower in ['pypi', 'npm', 'github', 'maven']:
        return component, risk_level
    return component, 'N/A'

def analyze_json_file(file_path, summary_output_file, famous_libraries, typo_checker, api_token):
    print(f"Starting analysis for JSON file: {file_path}")
    data = load_components_from_json(file_path)
    components = data.get("components", [])

    updated_components = []
    risk_level_counts = {'Red': 0, 'Yellow': 0, 'Green': 0, 'N/A': 0}
    platform_lock = threading.Lock()

    none_counts = collections.defaultdict(int)
    none_counts_lock = threading.Lock()

    with ThreadPoolExecutor(max_workers=20) as executor:
        future_to_component = {
            executor.submit(process_component, component, api_token, typo_checker, famous_libraries, none_counts, none_counts_lock): component
            for component in components
        }

        for future in as_completed(future_to_component):
            component, risk_level = future.result()
            updated_components.append(component)
            with platform_lock:
                if risk_level in risk_level_counts:
                    risk_level_counts[risk_level] += 1
                else:
                    risk_level_counts['N/A'] += 1

    data['components'] = updated_components

    risk_level_order = {'Red': 1, 'Yellow': 2, 'Green': 3, 'N/A': 4}
    data['components'].sort(key=lambda x: (
        risk_level_order.get(x["package_check"][0].get('Risk Level', 'N/A'), 5),
        -x["package_check"][0].get('Score', 0) if isinstance(x["package_check"][0].get('Score', None), int) else float('-inf')
    ))

    with open(file_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=4)
    print(f"Analysis results saved back to JSON file: {file_path}")

    for component in updated_components:
        pkg_check = component.get("package_check", [{}])[0]
        component["Risk Level"] = pkg_check.get("Risk Level", "N/A")
        component["Score"] = pkg_check.get("Score", 0)

    results_df = pd.DataFrame(updated_components)
    
    if 'Risk Level' not in results_df.columns:
        print("[ERROR] 'Risk Level' column is missing in the DataFrame. Adding 'Risk Level' with default 'N/A'.")
        results_df['Risk Level'] = 'N/A'  

    if 'ecosystem' not in results_df.columns:
        print("[ERROR] 'ecosystem' column is missing in the DataFrame. Adding 'ecosystem' with default 'unknown'.")
        results_df['ecosystem'] = 'unknown'  

    if 'Score' not in results_df.columns:
        print("[ERROR] 'Score' column is missing in the DataFrame. Adding 'Score' with default 0.")
        results_df['Score'] = 0  

    summary = {}

    summary['RiskLevelCounts'] = risk_level_counts

    for risk_level in ['Red', 'Yellow', 'Green', 'N/A']:
        if 'Risk Level' in results_df.columns and 'ecosystem' in results_df.columns:
            summary[f"{risk_level}_PlatformCounts"] = results_df[results_df['Risk Level'] == risk_level]['ecosystem'].value_counts().to_dict()
        else:
            summary[f"{risk_level}_PlatformCounts"] = {}

    score_ranges = {
        'npm': {
            'Green': [0, 5, 10, 15, 20, 25],
            'Yellow': [30, 35, 40, 45],
            'Red': [50, 55, 60]
        },
        'pypi': {
            'Green': [0, 5, 10, 15, 20, 25],
            'Yellow': [30, 35, 40, 45],
            'Red': [50, 55, 60]
        },
        'github': {
            'Green': [0, 5, 10, 15],
            'Yellow': [20, 25, 30],
            'Red': [35, 40]
        },
        'maven': {
            'Green': [0, 5, 10, 15],
            'Yellow': [20, 25, 30],
            'Red': [35, 40]
        }
    }

    for platform in ['npm', 'pypi', 'github', 'maven']:
        platform_df = results_df[results_df['ecosystem'] == platform]
        score_groups = {}
        for risk_level in ['Red', 'Yellow', 'Green']:
            risk_level_df = platform_df[platform_df['Risk Level'] == risk_level]
            scores = score_ranges.get(platform, {}).get(risk_level, [])
            group_counts = {}
            for score in scores:
                if 'Score' in risk_level_df.columns:
                    count = risk_level_df[risk_level_df['Score'] == score].shape[0]
                else:
                    count = 0
                group_counts[str(score)] = count
            score_groups[risk_level] = group_counts
        summary[f"{platform}_ScoreGroups"] = score_groups

    summary['Other_Ecosystems_NA_Count'] = risk_level_counts.get('N/A', 0)

    summary['None_Count'] = dict(none_counts)

    with open(summary_output_file, 'w', encoding='utf-8') as summary_file:
        json.dump(summary, summary_file, indent=4)
    print(f"Summary results saved to JSON file: {summary_output_file}")

def main():
    if len(sys.argv) != 5:
        print("Usage: python3 malicious-package-check.py <repo_name> <target_repo_path> <start_time> <date>")
        sys.exit(1)

    repo_name = sys.argv[1]
    target_repo_path = sys.argv[2]
    start_time = sys.argv[3]
    date = sys.argv[4]

    json_file_path = f"{target_repo_path}/sbom-detail.json"
    summary_json_path = f"{target_repo_path}/packagecheck-summary.json"

    settings = load_settings()
    api_token = settings.get("GITHUB_API_TOKEN", "")
    if not api_token:
        print("[ERROR] GitHub API Token is missing in settings.json.")
        sys.exit(1)

    famous_libraries = load_famous_libraries_from_excel([
        '/home/scable/script/package-check/top_10000_npm_packages.xlsx',
        '/home/scable/script/package-check/top_8000_pypi_packages.xlsx',
        '/home/scable/script/package-check/top_200_maven_packages.xlsx',
        '/home/scable/script/package-check/top_400_github_projects.xlsx'
    ])
    
    typo_checker = TypoSquattingChecker(famous_libraries)
    
    analyze_json_file(
        file_path=json_file_path,
        summary_output_file=summary_json_path,
        famous_libraries=famous_libraries,
        typo_checker=typo_checker,
        api_token=api_token
    )

if __name__ == "__main__":
    main()

