import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

// 인터페이스 정의
interface LicenseData {
    id: number;
    spdx_identifier: string;
    name: string;
    notification: string;
    disclosure: string;
    restriction: string;
    restrictionDetails: string;
    webpage: string;
    osi: string;
    spdx: string;
    gpl2: string;
    gpl3: string;
    riskScore: number | string;
    references: string[];
}

interface SBOMComponent {
    unique_id: number;
    group: string;
    name: string;
    ecosystem: string;
    version: string;
    scope: string;
    licenses: { license_name: string; license_url: string }[];
    license_urls: string;
    hashes: string;
    external_references: string;
    type: string;
    purl: string;
    bomref: string;
    vulnerabilities: Vulnerability[];
    dependencies: string;
}

interface Vulnerability {
    cve_id: string;
    severity: string;
    score: string;
    method: string;
    vector: string;
    cve_link: string;
}

// Restriction Table 컴포넌트
const RestrictionTable: React.FC = () => (
    <table className="w-full text-left mt-5 border-collapse border border-gray-600 text-sm">
        <thead className="bg-gray-800 text-white">
            <tr>
                <th className="px-2 py-1 border border-gray-600">Restriction Name</th>
                <th className="px-2 py-1 border border-gray-600">Description</th>
            </tr>
        </thead>
        <tbody className="bg-gray-100">
            {/* Restriction 항목들 */}
            <tr>
                <td className="px-2 py-1 border border-gray-600">Non-Commercial Use</td>
                <td className="px-2 py-1 border border-gray-600">상업적 사용 불가 (기업에서 제공하는 무료 소프트웨어 사용 불가)</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Internal Use Only</td>
                <td className="px-2 py-1 border border-gray-600">사내 사용만 가능</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">No Charge</td>
                <td className="px-2 py-1 border border-gray-600">자체 판매를 금지하거나 직접적 사용 비용 청구하지 않음</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">No Modification</td>
                <td className="px-2 py-1 border border-gray-600">수정 금지</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Platform Limitation</td>
                <td className="px-2 py-1 border border-gray-600">특정 플랫폼에서만 사용 가능</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Purpose Restriction</td>
                <td className="px-2 py-1 border border-gray-600">특정 목적 사용 제한</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Specification Restriction</td>
                <td className="px-2 py-1 border border-gray-600">특정 Specification 또는 standard와 관련되어 사용 제한</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Redistribution Restriction</td>
                <td className="px-2 py-1 border border-gray-600">재배포할 수 있는 Software의 하위 구성 요소(Source Code, Binary file 등) 제한</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Contract Required</td>
                <td className="px-2 py-1 border border-gray-600">별도의 계약이 필요한 경우</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Provide Installation Information Required</td>
                <td className="px-2 py-1 border border-gray-600">설치 정보 제공 의무가 존재하는 경우</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Patent Warning</td>
                <td className="px-2 py-1 border border-gray-600">특허 분쟁 가능성</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Network Triggered</td>
                <td className="px-2 py-1 border border-gray-600">네트워크 서버 형태로 이용하는 경우에도 의무사항 준수 필요</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">Semi-Copyleft</td>
                <td className="px-2 py-1 border border-gray-600">저작권자요구, 배포형태에 따라 다른 요구사항 요구하지만,코드 공개하면 해결되는 경우</td>
            </tr>
        </tbody>
    </table>
);

// Disclosure Table 컴포넌트
const DisclosureTable: React.FC = () => (
    <table className="w-full text-left mt-5 border-collapse border border-gray-600 text-sm">
        <thead className="bg-gray-800 text-white">
            <tr>
                <th className="px-2 py-1 border border-gray-600">공개 범위 분류</th>
                <th className="px-2 py-1 border border-gray-600">세부 설명 및 예제</th>
            </tr>
        </thead>
        <tbody className="bg-gray-100">
            {/* Disclosure 항목들 */}
            <tr>
                <td className="px-2 py-1 border border-gray-600">NONE</td>
                <td className="px-2 py-1 border border-gray-600">공개 의무 없음</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">ORIGINAL</td>
                <td className="px-2 py-1 border border-gray-600">원 오픈소스</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">FILE</td>
                <td className="px-2 py-1 border border-gray-600">파일 단위 소스 코드</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">MODULE</td>
                <td className="px-2 py-1 border border-gray-600">모듈 단위 소스 코드</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">LIBRARY</td>
                <td className="px-2 py-1 border border-gray-600">라이브러리 단위 소스 코드</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">DERIVATIVE WORK</td>
                <td className="px-2 py-1 border border-gray-600">실행 파일을 구성하는 부분의 소스 코드</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">DATA</td>
                <td className="px-2 py-1 border border-gray-600">데이터 자체</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">SOFTWARE USING THIS</td>
                <td className="px-2 py-1 border border-gray-600">해당 소프트웨어를 사용하는 모든 소프트웨어</td>
            </tr>
            <tr>
                <td className="px-2 py-1 border border-gray-600">UNSPECIFIED</td>
                <td className="px-2 py-1 border border-gray-600">소스 공개해야 하지만, 공개 범위 정확하지 않은 경우</td>
            </tr>
        </tbody>
    </table>
);

// LicenseDetail 컴포넌트
const LicenseDetail: React.FC = () => {
    const { licensename, projectName } = useParams<{ licensename: string; projectName: string }>();
    const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
    const [packageList, setPackageList] = useState<SBOMComponent[]>([]);
    const [isPackageListOpen, setIsPackageListOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(12);
   
    const bgColors = ["bg-green-100", "bg-yellow-100", "bg-yellow-200", "bg-orange-100", "bg-red-100"];
    const textColors = ["text-green-600", "text-yellow-600", "text-yellow-700", "text-orange-700", "text-red-700"];

    useEffect(() => {
        const fetchLicenseData = async () => {
            try {
                const response = await fetch("/license_list_with_risk_scores.xlsx");
                const arrayBuffer = await response.arrayBuffer();

                const workbook = XLSX.read(arrayBuffer, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                const foundData = data.find((row: any) => row[1] === licensename);

                if (foundData) {
                    const license: LicenseData = {
                        id: foundData[0],
                        spdx_identifier: foundData[1],
                        name: foundData[2],
                        notification: foundData[3],
                        disclosure: foundData[4],
                        restriction: foundData[5],
                        restrictionDetails: foundData[6],
                        webpage: foundData[7],
                        osi: foundData[8],
                        spdx: foundData[9],
                        gpl2: foundData[10],
                        gpl3: foundData[11],
                        riskScore: foundData[12] || "N/A",
                        references: foundData.slice(13),
                    };
                    setLicenseData(license);
                } else {
                    setLicenseData(null);
                }
            } catch (error) {
                console.error("Error fetching license data:", error);
            }
                
        };

        const fetchPackageData = async () => {
            try {
                const response = await fetch(`/${projectName}/sbom-detail.json`);
                const jsonData = await response.json();

                const packagesUsingLicense: SBOMComponent[] = jsonData.components.filter(
                    (pkg: SBOMComponent) =>
                        Array.isArray(pkg.licenses) &&
                        pkg.licenses.some(
                            (lic) =>
                                lic.license_name?.toLowerCase().trim() === licensename?.toLowerCase().trim()
                        )
                );

                setPackageList(packagesUsingLicense);
            } catch (error) {
                console.error("Error fetching package data:", error);
            }
        };

        fetchLicenseData();
        fetchPackageData();
        
    }, [licensename, projectName]);

    const getRiskStyle = (score: number | string) => {
        if (typeof score === "number" && score >= 1 && score <= 5) {
            return `${bgColors[score - 1]} ${textColors[score - 1]}`;
        }
        return "bg-gray-100 text-gray-500";
    };

    // Restriction 스타일 함수
    const getRestrictionStyle = (restriction: string) => {
        if (restriction === 'Y') return 'text-yellow-600 bg-yellow-100';
        if (restriction === 'R') return 'text-red-600 bg-red-100';
        return 'text-gray-600 bg-gray-100'; // 기본 색상
    };

    // "Show More" 버튼 핸들러
    const handleShowMore = () => {
        setVisibleCount((prevCount) => prevCount + 12);
    };

    // "View All" 버튼 핸들러
    const handleViewAll = () => {
        setVisibleCount(packageList.length);
    };

    // 라이선스 데이터가 없을 경우
    if (!licenseData) {
        return (
            <div className="p-8 bg-gray-50 min-h-screen flex flex-col items-center">
                <div className="bg-white rounded-3xl shadow-lg max-w-5xl w-full p-8">
                    <h1 className="text-3xl font-extrabold mb-6 text-gray-800">License Details</h1>
                    <p className="text-gray-500">License not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen flex flex-col items-center">
            <div className="bg-white rounded-3xl shadow-lg max-w-5xl w-full p-8">
                <h1 className="text-3xl font-extrabold mb-6 text-gray-800">License Details</h1>

                {/* 라이선스 기본 정보 */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-700">{licenseData.name}</h2>
                        <span className="text-xs font-medium text-gray-500">SPDX Identifier: {licenseData.spdx_identifier || 'N/A'}</span>
                        {licenseData.webpage && (
                            <p className="text-xs font-medium text-gray-500 mt-2">
                                Webpage:
                                <a href={licenseData.webpage} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline ml-1">
                                    {licenseData.webpage}
                                </a>
                            </p>
                        )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskStyle(licenseData.riskScore)}`}>
                        Risk Score: {licenseData.riskScore}
                    </span>
                </div>

                {/* Approval & Compatibility 섹션 */}
                <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-2 text-gray-600">Approval & Compatibility</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <p>
                            <strong>OSI Approved&nbsp;</strong> 
                            {licenseData.osi === 'O' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✅ Approved
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    ❌ Not Approved
                                </span>
                            )}
                        </p>
                        <p>
                            <strong>SPDX Supported&nbsp;</strong> 
                            {licenseData.spdx === 'O' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✅ Approved
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    ❌ Not Approved
                                </span>
                            )}
                        </p>
                        <p>
                            <strong>GPL v2.0 Compatibility&nbsp;</strong> 
                            {licenseData.gpl2 === 'O' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✅ Approved
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    ❌ Not Approved
                                </span>
                            )}
                        </p>
                        <p>
                            <strong>GPL v3.0 Compatibility&nbsp;</strong> 
                            {licenseData.gpl3 === 'O' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✅ Approved
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    ❌ Not Approved
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <hr className="my-10 border-t border-gray-300" />

                {/* 라이선스 세부 정보 섹션 */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {/* Restriction Section */}
                    <div className={`p-4 rounded-lg shadow-md flex flex-col items-center ${getRestrictionStyle(licenseData.restriction)}`}>
                        <div className="text-3xl text-blue-600">🚨</div>
                        <h3 className="text-lg font-bold">Restriction</h3>
                        <p className="text-xs text-center">
                            {(licenseData.restrictionDetails || 'N/A').split(',').map((item, index) => (
                                <span key={index}>
                                    {item.trim()}
                                    <br />
                                </span>
                            ))}
                        </p>
                    </div>
                    {/* Disclosure Section */}
                    <div className="p-4 bg-white rounded-lg shadow-md flex flex-col items-center">
                        <div className="text-3xl text-yellow-600">⚠️</div>
                        <h3 className="text-lg font-bold">Disclosure</h3>
                        <p className="text-xs text-gray-600">
                            {licenseData.disclosure || 'N/A'}
                        </p>
                    </div>
                    {/* Notification Section */}
                    <div className="p-4 bg-white rounded-lg shadow-md flex flex-col items-center">
                        <div className="text-3xl text-green-600">🔔</div>
                        <h3 className="text-lg font-bold">Notification</h3>
                        <p className="text-xs text-gray-600">
                            {licenseData.notification || 'N/A'}
                        </p>
                    </div>
                </div>

                {/* 패키지 목록 섹션 */}
                <div className="mt-10">
                    <h2 className="text-xl font-semibold mb-4 cursor-pointer" onClick={() => setIsPackageListOpen(!isPackageListOpen)}>
                        Packages Using {licensename}
                        <span className="ml-2 text-blue-500">
                            {isPackageListOpen ? "(Hide)" : "(Show)"}
                        </span>
                    </h2>
                    {isPackageListOpen && (
                        packageList.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                                {packageList
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .slice(0, visibleCount)
                                    .map((pkg) => (
                                        <div key={pkg.unique_id} className="text-gray-700">
                                            <Link to={`/${projectName}/components/${pkg.unique_id}`} className="text-blue-500 hover:underline">
                                                {pkg.group ? `${pkg.group}/` : ''}{pkg.name}@{pkg.version}
                                            </Link>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No packages found for this license.</p>
                        )
                    )}
                    
                    {isPackageListOpen && packageList.length > visibleCount && (
                        <div className="flex space-x-4 mt-4">
                            <button onClick={handleShowMore} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                Show More
                            </button>
                            <button onClick={handleViewAll} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                                View All
                            </button>
                        </div>
                    )}
                </div>

                {/* Restriction 및 Disclosure 테이블 */}
                <div className="mt-10">
                    <h2 className="text-xl font-semibold mb-4">Restriction Descriptions</h2>
                    <RestrictionTable />
                </div>

                <div className="mt-10">
                    <h2 className="text-xl font-semibold mb-4">Disclosure Descriptions</h2>
                    <DisclosureTable />
                </div>
            </div>
        </div>
    );
};

export default LicenseDetail;
