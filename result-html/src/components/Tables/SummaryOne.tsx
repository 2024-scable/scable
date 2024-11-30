// src/components/Tables/SummaryOne.tsx

import React, { useState, useEffect } from "react";
import { FaShieldAlt, FaFileAlt, FaDownload } from "react-icons/fa";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useParams } from "react-router-dom";
import DashboardVuln from "../../components/Charts/DashboardVuln";
import DashboardLicense from "../../components/Charts/DashboardLicense";
import DashboardLibrary from "../../components/Charts/DashboardLibrary";

// SBOM 데이터 타입 정의
interface SbomData {
    project: string;
    format: string;
    version: string;
    last_update: string;
    tool: string;
    id: string;
    openSourcePackages: number;
    privatePackages: number;
    thirdPartyPackages: number;
    // 추가 필드 필요 시 정의
}

const SummaryOne: React.FC = () => {
    const [sbomData, setSbomData] = useState<SbomData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { projectName } = useParams<{ projectName: string }>();

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchSbomData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 상대 경로로 sbom-summary.json 파일을 fetch
                const response = await fetch(`/${projectName}/sbom-summary.json`, { signal });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: SbomData = await response.json();
                setSbomData(data);
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error("Error fetching JSON:", error);
                    setError("데이터를 가져오는 중 오류가 발생했습니다.");
                }
            } finally {
                setLoading(false);
            }
        };

        if (projectName) {
            fetchSbomData();
        }

        return () => {
            controller.abort();
        };
    }, [projectName]);

    // 다운로드 파일 목록 정의
    const downloadFiles = [
        { name: "sbom-cyclonedx.json", label: "CycloneDX" },
        { name: "sbom-spdx.json", label: "SPDX" },
        { name: "sbom-swid.xml", label: "SWID" },
    ];

    // Zip 파일 생성 및 다운로드 함수
    const handleDownloadAll = async () => {
        if (!sbomData) {
            alert("다운로드할 데이터가 없습니다.");
            return;
        }

        setIsDownloading(true);
        try {
            const zip = new JSZip();

            // 각 파일을 fetch하여 Zip에 추가
            await Promise.all(
                downloadFiles.map(async (file) => {
                    const response = await fetch(`/${projectName}/${file.name}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${file.name}: ${response.statusText}`);
                    }
                    const blob = await response.blob();
                    zip.file(file.name, blob);
                })
            );

            // Zip 파일 생성 (Blob 형식)
            const content = await zip.generateAsync({ type: "blob" });

            // 다운로드
            saveAs(content, `${sbomData.project || "sbom"}-files.zip`);
            alert("파일이 성공적으로 다운로드되었습니다.");
        } catch (error: any) {
            console.error("Error creating zip:", error);
            alert("파일을 다운로드하는 중 오류가 발생했습니다.");
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    if (!sbomData) {
        return <div>No data available.</div>;
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-4 space-y-4">
            {/* Header Section */}
            <section className="w-full max-w-8xl bg-gradient-to-r from-blue-100 to-green-100 p-8 rounded-lg shadow-lg mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800">{sbomData.project || "N/A"}</h1>
                        <p className="text-sm text-gray-500 mt-1">Format {sbomData.format || "N/A"}</p>
                        <div className="flex space-x-8 mt-4">
                            <div className="flex flex-col">
                                <span className="text-gray-500 text-xs">Version</span>
                                <span className="text-lg font-semibold text-gray-800">{sbomData.version || "N/A"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500 text-xs">Last Updated</span>
                                <span className="text-lg font-semibold text-gray-800">{sbomData.last_update || "N/A"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500 text-xs">Created By</span>
                                <span className="text-lg font-semibold text-gray-800">{sbomData.tool || "N/A"}</span>
                            </div>
                        </div>
                    </div>
                    {/* Download All SBOM Files Button */}
                    <div className="flex items-center space-x-4">
                        <button
                            className={`flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 ${
                                isDownloading ? "bg-gray-400 cursor-not-allowed" : ""
                            }`}
                            onClick={handleDownloadAll}
                            aria-label="Download All SBOM Files"
                            title="Download all SBOM files as a ZIP archive"
                            disabled={isDownloading}
                        >
                            <FaDownload className="mr-1" /> {isDownloading ? "Downloading..." : "Download All"}
                        </button>
                    </div>
                </div>
                <div className="mt-4 text-gray-600">
                    <span className="text-gray-500 text-xs">SBOM ID:</span> <span className="text-lg">{sbomData.id || "N/A"}</span>
                </div>
            </section>

            {/* Main Content Section */}
            <section className="w-full max-w-8xl grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 gap-y-6">
                    {/* Vulnerability Summary */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
                        <div className="flex items-center space-x-2">
                            <FaShieldAlt className="text-red-500 text-2xl" />
                            <h2 className="text-xl font-semibold text-gray-800">Vulnerability Summary</h2>
                        </div>
                        <DashboardVuln />
                    </div>

                    {/* Package Sources */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
                        <div className="flex items-center mb-4 space-x-2">
                            <FaShieldAlt className="text-red-500 text-2xl" />
                            <h2 className="text-xl font-semibold text-gray-800">Malicious Components</h2>
                        </div>
                        <DashboardLibrary />
                    </div>

                    {/* License Summary */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                        <div className="flex items-center mb-4 space-x-2">
                            <FaFileAlt className="text-purple-500 text-2xl" />
                            <h2 className="text-xl font-semibold text-gray-800">License Summary</h2>
                        </div>
                        <DashboardLicense />
                    </div>
                </div>
            </section>
        </div>
    );

};

export default SummaryOne;
