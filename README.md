<!--# SCABLE: Start Secure Software Supply Chain with Ease!-->

<h1 align="center" style="border-bottom: none">
    <div>
        <a style="color:#36f" href="https://github.com/2024-scable/scable">
            <img src="https://github.com/2024-scable/scable/blob/main/scable.png" width="250" />
        </a>
    </div>
    Start secure your software supply chain with ease! <br>
</h1>

SCABLE is an open-source solution that systematically and automatically analyzes software components, providing comprehensive support for open-source security and license management.

<!--프로젝트 대문 이미지-->
<div align="center">
    <img src="https://github.com/2024-scable/scable/blob/main/scable_main.jpg" alt="SCABLE Main Image" width="800" />
</div>

<!--프로젝트 버튼-->
<p align="center">
    <a href="https://github.com/2024-scable/scable"><img src="https://img.shields.io/badge/-Readme%20in%20English-2E2E2E?style=for-the-badge" alt="Readme in English"></a>
    <a href="https://dev-ujin.github.io"><img src="https://img.shields.io/badge/-%F0%9F%98%8E%20View%20Demo-F3F781?style=for-the-badge" alt="View Demo"></a>
    <a href="https://github.com/dev-ujin/readme-template/issues"><img src="https://img.shields.io/badge/-%F0%9F%90%9E%20Report%20Bug-F5A9A9?style=for-the-badge" alt="Report Bug"></a>
    <a href="https://github.com/dev-ujin/readme-template/issues"><img src="https://img.shields.io/badge/-%E2%9C%A8%20Request%20Feature-A9D0F5?style=for-the-badge" alt="Request Feature"></a>
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
- [[3] Usage](#3-usage)
- [[4] Contribution](#4-contribution)
- [[5] Acknowledgement](#5-acknowledgement)
- [[6] Contact](#6-contact)
- [[7] License](#7-license)

---

# [1] About the Project

### Why SCABLE?
- SCABLE is designed to help organizations build a secure software supply chain by automating software component analysis and license management.
- It leverages **CodeQL Taint Analysis** to identify real security threats efficiently and focuses on supply chain security management with features like **typosquatting detection**, **license compliance**, and **real-time CI/CD integration**.

### Features
SCABLE provides six key functionalities:
1. Automated SBOM generation in CycloneDX, SPDX, and SWID formats.
2. Identification of real threats among vulnerabilities detected in SBOMs.
3. Open-source license analysis for compliance.
4. Detection of typosquatting and suspicious malicious packages.
5. Dashboard reporting for SBOM analysis results.
6. Seamless CI/CD pipeline integration.

### Technologies
- **[CDXGEN](https://github.com/CycloneDX/cdxgen)**: CycloneDX SBOM generation (Apache-2.0 License).
- **[OSV-DEV](https://github.com/google/osv.dev)**: Vulnerability lookup based on OSV and NVD databases (Apache-2.0 License).
- **[CodeQL](https://codeql.github.com/)**: Taint Analysis for identifying vulnerable components (MIT License).
- **[OSORI DB](https://osori-db.github.io/)**: Open-source license information (ODC-By 1.0 License).
- **[React Tailwind Admin Template](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard)**: Reporting dashboard (MIT License).

---

# [2] Getting Started

### Prerequisites
SCABLE requires three ports for smooth operation:
- **8282**: Initial setup and SBOM generation/analysis requests.
- **5173**: Dashboard for viewing analysis results.
- **8080**: Used for Jenkins integration (optional).

### Installation

#### 1. Using Docker
```bash
git clone https://github.com/2024-scable/scable
docker compose up -d
```

#### 2. Direct Installation on Linux
```bash
apt update && apt install -y curl
curl -s https://raw.githubusercontent.com/2024-scable/scable/main/setup.sh | bash
```


# [3] Usage
***스크린샷, 코드** 등을 통해 **사용 방법**과 **사용 예제**를 보여주세요. 사용 예제별로 h2 헤더로 나누어 설명할 수 있습니다.*

![usage](img/usage.png)

```java
// 몇 개의 API 사용 예제를 코드와 함께 보여주세요.
```



# [4] Contribution
기여해주신 모든 분들께 대단히 감사드립니다.[`contributing guide`][contribution-url]를 참고해주세요.
이 프로젝트의 기여하신 분들을 소개합니다! 🙆‍♀️
*이모티콘 쓰는 것을 좋아한다면, 버그 수정에 🐞, 아이디어 제공에 💡, 새로운 기능 구현에 ✨를 사용할 수 있습니다.*
- 🐞 [dev-ujin](https://github.com/dev-ujin): 메인페이지 버그 수정



# [5] Acknowledgement
***유사한 프로젝트의 레포지토리** 혹은 **블로그 포스트** 등 프로젝트 구현에 영감을 준 출처에 대해 링크를 나열하세요.*

- [Readme Template - Embedded Artistry](https://embeddedartistry.com/blog/2017/11/30/embedded-artistry-readme-template/)
- [How to write a kickass Readme - James.Scott](https://dev.to/scottydocs/how-to-write-a-kickass-readme-5af9)
- [Best-README-Template - othneildrew](https://github.com/othneildrew/Best-README-Template#prerequisites)
- [Img Shields](https://shields.io/)
- [Github Pages](https://pages.github.com/)



# [6] Contact
- 📧 dev.ujin518@gmail.com
- 📋 [https://dev-ujin.github.io/contact](https://dev-ujin.github.io/contact)



# [7] License
MIT 라이센스
라이센스에 대한 정보는 [`LICENSE`][license-url]에 있습니다.



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
[license-url]: LICENSE.md
[contribution-url]: CONTRIBUTION.md
[readme-eng-url]: ../README.md
