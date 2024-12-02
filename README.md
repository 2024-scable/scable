<!--# SCABLE: Start Secure Software Supply Chain with Ease!-->

<h1 align="center" style="border-bottom: none">
    <div>
        <a style="color:#36f" href="https://github.com/2024-scable/scable">
            <img src="https://github.com/2024-scable/scable/blob/main/img/scable.png" width="250" />
        </a>
    </div>
    Start secure your software supply chain with ease! <br>
</h1>

SCABLE is an open-source solution that systematically and automatically analyzes software components, providing comprehensive support for open-source security and license management.

<!--프로젝트 대문 이미지-->
<div align="center">
    <img src="https://github.com/2024-scable/scable/blob/main/img/scable_mainpage.jpg" alt="SCABLE Main Image" width="1000" />
</div>

<!--프로젝트 버튼-->
<p align="center">
    <a href="https://docs.scable.kr/">More About SCABLE</a> • 
    <a href="https://dev-ujin.github.io">View Demo</a> • 
    <a href="https://github.com/2024-scable/scable/issues">Download Brochure</a> • 
    <a href="https://github.com/2024-scable/scable/issues">Report Bug</a>
</p>

---

# Table of Contents
- [[1] About the Project](#1-about-the-project)
  - [Why SCABLE?](#why-scable)
  - [Features](#features)
  - [Technologies](#technologies)
- [[2] Getting Started](#2-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [[3] API Reference](#3-api-reference)
- [[4] Usage Screenshots](#4-usage-screenshots)
- [[5] Acknowledgement](#5-acknowledgement)
- [[6] Contact](#6-contact)
- [[7] License](#7-license)

---

# [1] About the Project

## Why SCABLE?
SCABLE is designed to help organizations build a secure software supply chain by automating **software component analysis** and **license management**.
It leverages **CodeQL Taint Analysis** to efficiently identify real security threats and focuses on supply chain security management with features like:

### - Typosquatting detection
### - License compliance
### - Real-time CI/CD integration


## Features

### SCABLE provides six key functionalities:

- 🛠️ **Automated SBOM Generation**  
  Generate SBOMs in CycloneDX, SPDX, and SWID formats.

- 🛡️ **Identification of Real Threats**  
  Identify real security threats among vulnerabilities detected in SBOMs using advanced analysis.

- 🔍 **Open-Source License Analysis**  
  Ensure compliance by analyzing open-source licenses in your software.

- 🕵️ **Detection of Typosquatting & Malicious Packages**  
  Detect typosquatting attempts and analyze dependency reputation.

- 📊 **Dashboard Reporting**  
  Visualize SBOM analysis results in a user-friendly dashboard.

- ⚙️ **Seamless CI/CD Integration**  
  Integrate into CI/CD pipelines for automated security and compliance checks.



## Technologies
- **[CDXGEN](https://github.com/CycloneDX/cdxgen)**: CycloneDX SBOM generation (Apache-2.0 License).
- **[OSV-DEV](https://github.com/google/osv.dev)**: Vulnerability lookup based on OSV and NVD databases (Apache-2.0 License).
- **[CodeQL](https://codeql.github.com/)**: Taint Analysis for identifying vulnerable components (MIT License).
- **[OSORI DB](https://osori-db.github.io/)**: Open-source license information (ODC-By 1.0 License).
- **[React Tailwind Admin Template](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard)**: Reporting dashboard (MIT License).

---

# [2] Getting Started

## Prerequisites
### SCABLE requires three ports for smooth operation:
- **8282**: Initial setup and SBOM generation/analysis requests.
- **5173**: Dashboard for viewing analysis results.
- **8080**: Used for Jenkins integration (optional).

## Installation

### 1. Using Docker
```bash
git clone https://github.com/2024-scable/scable
docker compose up -d
```

### 2. Direct Installation on Linux
```bash
apt update && apt install -y curl
curl -s https://raw.githubusercontent.com/2024-scable/scable/main/setup.sh | bash
```


# [3] API Reference
## 1. /sbom
Generates SBOM (Software Bill of Materials) in three standard formats: CycloneDX, SWID, and SPDX.
Tracks "Reachable Components" affected by user input and visualizes the analysis results on the web page.

### HTTP Request
```
GET http://127.0.0.1:8282/sbom
```
### Request Patameters
| Parameter    | Type    | Required | Description                     |
|--------------|---------|----------|---------------------------------|
| `repo_url`   | string  | Yes      | URL of the repository to analyze |
| `lan`        | string  | Yes      | Fixed value: `python`           |

### Example Request
```
curl "http://127.0.0.1:8282/sbom?repo_url=https://github.com/example/python-example&lan=python"
```

### Example Response
```
{
  "date": "2024-12-02",
  "start_time": "16-14-28",
  "repository": "python-example",
  "language": "python",
  "reporting_url": "http://localhost:5173/2024-12-02_16-14-28_python-example"
}
```
## 2. /package-check
Evaluates the potential risk of a package by analyzing its age, days since the last modification, number of release versions, download count, GitHub stars, and typosquatting suspicion. Assigns a score and risk level to identify potentially malicious packages.

### HTTP Request
```
GET http://127.0.0.1:8282/package-check
```

### Request Patameters
| Parameter     | Type    | Required | Description                         |
|---------------|---------|----------|-------------------------------------|
| package_name  | string  | Yes      | The name of the PyPI package to check |

### Example Request
```
curl "http://scable.kr:8282/package-check?package_name=requests"
curl "http://scable.kr:8282/package-check?package_name=numppy"
```

### Example Response
```
#Example 1. Trusted Package
{
  "message": "Matches TOP 8000 PyPI packages",
  "package_name": "requests",
  "risk_level": "Green",
  "score": 0
}
#Example 2: Typosquatting Suspected
{
  "message": "Typosquatting suspected",
  "package_name": "numppy",
  "platform": "pypi",
  "reasons": {
    "Downloads < 300": "+20 points",
    "GitHub stars < 30": "+10 points",
    "Last modified > 2 years": "+10 points",
    "Versions count < 5": "+10 points"
  },
  "risk_level": "Red",
  "score": 50,
  "similar_packages": [
    [
      "numpy",
      90.9090909090909
    ]
  ],
  "status": "Warning",
  "version": null
}
```

# [4] Usage Screenshots
## SBOM DashBoard
![SCABLE Dashboard](https://github.com/2024-scable/scable/blob/main/img/scable_dashboard.jpg)

## Vulnerable Components
![SCABLE Vulnerabilities](https://github.com/2024-scable/scable/blob/main/img/scable_vulnerabilities.jpg)

## Additional Vulnerability Details
![SCABLE Vulnerabilities Detailed](https://github.com/2024-scable/scable/blob/main/img/scable_vulnerabilities.jpg)

## Malicious Package Reporting DashBoard
![SCABLE Dashboard Insights](https://github.com/2024-scable/scable/blob/main/img/scable_dashboard2.jpg)

## Package Details
![SCABLE Package Analysis](https://github.com/2024-scable/scable/blob/main/img/scable_package.jpg)

## License Analysis DashBoard
![SCABLE Advanced Dashboard](https://github.com/2024-scable/scable/blob/main/img/scable_dashboard3.jpg)

## License Details
![SCABLE License Analysis](https://github.com/2024-scable/scable/blob/main/img/scable_license.jpg)



# [5] Acknowledgement
***유사한 프로젝트의 레포지토리** 혹은 **블로그 포스트** 등 프로젝트 구현에 영감을 준 출처에 대해 링크를 나열하세요.*

- [Readme Template - Embedded Artistry](https://embeddedartistry.com/blog/2017/11/30/embedded-artistry-readme-template/)
- [How to write a kickass Readme - James.Scott](https://dev.to/scottydocs/how-to-write-a-kickass-readme-5af9)
- [Best-README-Template - othneildrew](https://github.com/othneildrew/Best-README-Template#prerequisites)
- [Img Shields](https://shields.io/)
- [Github Pages](https://pages.github.com/)



# [6] Contact
- 📧 2024scable@gmail.com


# [7] License
This project is licensed under the Apache License 2.0.
SCABLE integrates open-source technologies, including CDXGEN (Apache-2.0), OSV-DEV (Apache-2.0), CodeQL (MIT), OSORI DB (ODC-By 1.0), and React Tailwind Admin Template (MIT). For details, refer to the respective project licenses.

License information can be found in the [`LICENSE`][license-url] file.



<!--Url for Badges-->
[license-shield]: https://img.shields.io/github/license/dev-ujin/readme-template?labelColor=D8D8D8&color=04B4AE
[repository-size-shield]: https://img.shields.io/github/repo-size/dev-ujin/readme-template?labelColor=D8D8D8&color=BE81F7
[issue-closed-shield]: https://img.shields.io/github/issues-closed/dev-ujin/readme-template?labelColor=D8D8D8&color=FE9A2E

<!--Url for Buttons-->
[readme-eng-shield]: https://img.shields.io/badge/-readme%20in%20english-2E2E2E?style=for-the-badge
[view-demo-shield]: https://img.shields.io/badge/-%F0%9F%98%8E%20view%20demo-F3F781?style=for-the-badge
[view-demo-url]: https://dev-ujin.github.io
[report-bug-shield]: https://img.shields.io/badge/-%F0%9F%90%9E%20report%20bug-F5A9A9?style=for-the-badge
[report-bug-url]: https://github.com/2024-scable/scable/issues
[request-feature-shield]: https://img.shields.io/badge/-%E2%9C%A8%20request%20feature-A9D0F5?style=for-the-badge
[request-feature-url]: https://github.com/2024-scable/scable/issues

<!--URLS-->
[license-url]: LICENSE
[readme-eng-url]: ../README.md
