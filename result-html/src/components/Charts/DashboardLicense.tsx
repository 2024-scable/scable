import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const DashboardLicense: React.FC = () => {
    const [licenseData, setLicenseData] = useState<any | null>(null);
    const [licenseRiskData, setLicenseRiskData] = useState<{ [key: string]: number | string }>({});
    const navigate = useNavigate();
    const { projectName } = useParams();


    useEffect(() => {
        fetch(`/${projectName}/sbom-summary.json`)
            .then((response) => {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json();
            })
            .then((data) => setLicenseData(data.license_sum))
            .catch((error) => console.error("Failed to fetch license data:", error));

        const fetchRiskScores = async () => {
            const response = await fetch("/license_list_with_risk_scores.xlsx");
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const riskScores: { [key: string]: number | string } = {};
            data.forEach((row: any) => {
                const licenseName = row[1];
                const riskScore = row[12];
                if (licenseName) {
                    riskScores[licenseName] = riskScore !== undefined ? riskScore : "N/A";
                }
            });
            setLicenseRiskData(riskScores);
        };

        fetchRiskScores();
    }, []);

    if (!licenseData) return <div>Loading License Data...</div>;

    const sortedLicenseCounts = Object.entries(licenseData)
        .filter(([key]) => key !== "usedlicense")
        .map(([key, value]) => ({ name: key, value: value as number, riskScore: licenseRiskData[key] }))
        .sort((a, b) => {
            const riskA = typeof a.riskScore === "number" ? a.riskScore : 0;
            const riskB = typeof b.riskScore === "number" ? b.riskScore : 0;
            return riskB - riskA;
        });

    const top7Licenses = Object.entries(licenseData)
        .filter(([key]) => key !== "usedlicense")
        .map(([key, value]) => ({ name: key, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

    const otherLicensesValue = sortedLicenseCounts.slice(7).reduce((acc, curr) => acc + curr.value, 0);
    const totalLicenseCount = licenseData["usedlicense"];
    const licenseCounts = otherLicensesValue > 0 ? [...top7Licenses, { name: "Others", value: otherLicensesValue }] : top7Licenses;

    const COLORS = [
        "#accefb", "#acdbfb", "#ace8fb", "#acf5fb", "#acfbf1", "#acfbe6", "#acfbd7", "#acfbc3"
    ];

    const getGradientDotColor = (level: number, position: number) => {
        const colors = ["bg-green-300", "bg-yellow-300", "bg-yellow-500", "bg-orange-500", "bg-red-500"];
        return position < level ? colors[position] : "bg-gray-300 dark:bg-gray-600";
    };

    const getRiskLevel = (score: any) => {
        if (typeof score === "number") {
            if (score === 5) return "High";
            if (score >= 3) return "Medium";
            if (score >= 1) return "Low";
        }
        return "N/A";
    };

    const handleLicenseClick = (licenseName: string) => {
        if (projectName) {
            navigate(`/${projectName}/license/${licenseName}`);
        } else {
            console.error('프로젝트 이름이 URL에 없습니다.');
        }
    };

    return (
        <div className="p-4 bg-white rounded-xl dark:bg-gray-900">
            <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Used Licenses: {totalLicenseCount}</div>
            </div>
            <div className="text-center font-semibold text-gray-700 dark:text-gray-300 mb-4">Top 7 Licenses</div>
            <ResponsiveContainer width="95%" height={300}>
                <BarChart data={licenseCounts} layout="vertical" barSize={15} margin={{ left: -30, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Bar dataKey="value" fill="#8884d8">
                        {licenseCounts.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div className="mt-8 overflow-x-auto">
                <div className="text-center font-semibold text-gray-700 dark:text-gray-300 mb-4">All Licenses including Top 7</div>
                <table className="w-full text-left border-collapse table-auto">
                    <thead>
                        <tr className="border-b bg-[#d2e3fe] dark:bg-gray-800">
                            <th className="px-4 py-2 font-semibold text-sm text-center text-gray-700 dark:text-gray-300">License Type</th>
                            <th className="px-4 py-2 font-semibold text-sm text-center text-gray-700 dark:text-gray-300">Usage Count</th>
                            <th className="px-4 py-2 font-semibold text-sm text-center text-gray-700 dark:text-gray-300">Risk Level</th>
                            <th className="px-4 py-2 font-semibold text-sm text-center text-gray-700 dark:text-gray-300">License Type</th>
                            <th className="px-4 py-2 font-semibold text-sm text-center text-gray-700 dark:text-gray-300">Usage Count</th>
                            <th className="px-4 py-2 font-semibold text-sm text-center text-gray-700 dark:text-gray-300">Risk Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLicenseCounts.reduce((rows, license, index) => {
                            if (index % 2 === 0) {
                                rows.push([license]);
                            } else {
                                rows[rows.length - 1].push(license);
                            }
                            return rows;
                        }, [] as Array<any[]>).map((pair, rowIndex) => (
                            <tr key={`row-${rowIndex}`} className="border-b hover:bg-[#dddddd] dark:hover:bg-gray-800">
                                {pair.map((license, i) => (
                                    <React.Fragment key={i}>
                                        <td
                                            onClick={() => handleLicenseClick(license.name)}
                                            className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-200 cursor-pointer hover:underline"
                                        >
                                            {license.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-200">{license.value.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-left">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, j) => (
                                                    <span
                                                        key={j}
                                                        className={`inline-block w-3 h-3 mx-1 rounded-full ${getGradientDotColor(licenseRiskData[license.name] as number, j)}`}
                                                    ></span>
                                                ))}
                                                <span className="ml-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    {getRiskLevel(licenseRiskData[license.name])}
                                                </span>
                                            </div>
                                        </td>
                                    </React.Fragment>
                                ))}
                                {pair.length === 1 && (
                                    <>
                                        <td className="px-4 py-3 text-left"></td>
                                        <td className="px-4 py-3 text-left"></td>
                                        <td className="px-4 py-3 text-left"></td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardLicense;
