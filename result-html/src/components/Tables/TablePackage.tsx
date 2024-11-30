// src/components/Charts/TablePackage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const TablePackage = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOrder, setSortOrder] = useState({ severity: 'asc', typeColor: 'asc', name: 'asc' });
    const itemsPerPage = 50;
    const location = useLocation();
    const navigate = useNavigate();
    const { projectName } = useParams(); // 현재 URL에서 projectName 가져오기

    // 데이터 페치 및 초기 정렬
    useEffect(() => {
        fetch(`/${projectName}/sbom-detail.json`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((jsonData) => {
                if (Array.isArray(jsonData.components)) {
                    // 초기 정렬 적용
                    const sortedData = sortData(jsonData.components, 'severity', 'asc');
                    setData(sortedData);
                    setFilteredData(sortedData);
                } else {
                    console.error("Expected 'components' to be an array:", jsonData);
                }
            })
            .catch((error) => console.error("Error fetching SBOM data:", error));
    }, []);

    // 쿼리 파라미터에 따른 데이터 필터링
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const riskLevel = queryParams.get('risklevel');
        const score = queryParams.get('score');
        const ecosystem = queryParams.get('ecosystem');

        let filtered = data;

        if (riskLevel) {
            filtered = filtered.filter(item => {
                const itemRiskLevel = item.package_check && item.package_check[0]?.["Risk Level"];
                return itemRiskLevel?.toLowerCase() === riskLevel.toLowerCase();
            });
        }

        if (score) {
            filtered = filtered.filter(item => {
                const itemScore = item.package_check && item.package_check[0]?.Score;
                return itemScore === parseInt(score, 10);
            });
        }

        if (ecosystem) {
            filtered = filtered.filter(item => item.ecosystem?.toLowerCase() === ecosystem.toLowerCase());
        }

        setFilteredData(filtered);
    }, [location, data]);

    // 데이터 정렬 함수
    const sortData = (data, type, order) => {
        const sortedData = [...data].sort((a, b) => {
            if (type === 'name') {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                if (nameA < nameB) return order === 'asc' ? -1 : 1;
                if (nameA > nameB) return order === 'asc' ? 1 : -1;
                return 0;
            }
            if (type === 'severity') {
                const severityOrder = { critical: 1, high: 2, medium: 3, low: 4, none: 5 };
                const aSeverity = a.vulnerabilities && a.vulnerabilities.length > 0 ? severityOrder[a.vulnerabilities[0].severity.toLowerCase()] : severityOrder.none;
                const bSeverity = b.vulnerabilities && b.vulnerabilities.length > 0 ? severityOrder[b.vulnerabilities[0].severity.toLowerCase()] : severityOrder.none;
                return order === 'asc' ? aSeverity - bSeverity : bSeverity - aSeverity;
            }
            if (type === 'typeColor') {
                const getColorValue = (item) => {
                    if (item.package_check && item.package_check[0]) {
                        const riskLevel = item.package_check[0]["Risk Level"].toLowerCase();
                        switch (riskLevel) {
                            case 'red':
                                return 1;
                            case 'yellow':
                                return 2;
                            case 'green':
                                return 3;
                            default:
                                return 4;
                        }
                    }
                    return 4;
                };
                const aColor = getColorValue(a);
                const bColor = getColorValue(b);
                return order === 'asc' ? aColor - bColor : bColor - aColor;
            }
            return 0;
        });
        return sortedData;
    };

    // 정렬 이벤트 핸들러
    const handleSort = (type) => {
        const order = sortOrder[type] === 'asc' ? 'desc' : 'asc';
        const sortedData = sortData(filteredData, type, order);
        setFilteredData(sortedData);
        setSortOrder({ ...sortOrder, [type]: order });
    };

    // 검색 이벤트 핸들러
    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    // 필터 변경 핸들러
    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    // 페이지 변경 핸들러
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // 데이터 필터링 및 페이징 처리
    const filteredResults = filteredData.filter((item) => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const fullName = item.group ? `${item.group}/${item.name}` : item.name;

        if (filter === 'ALL') {
            return (
                fullName.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.licenses && item.licenses.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (item.ecosystem && item.ecosystem.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (item.type && item.type.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        switch (filter) {
            case 'NAME':
                return fullName.toLowerCase().includes(lowerCaseSearchTerm);
            case 'LICENSE':
                return item.licenses && item.licenses.toLowerCase().includes(lowerCaseSearchTerm);
            case 'ECOSYSTEM':
                return item.ecosystem && item.ecosystem.toLowerCase().includes(lowerCaseSearchTerm);
            case 'TYPE':
                return item.type && item.type.toLowerCase().includes(lowerCaseSearchTerm);
            case 'SEVERITY':
                return item.vulnerabilities && item.vulnerabilities.some(vuln => vuln.severity.toLowerCase().includes(lowerCaseSearchTerm));
            default:
                return true;
        }
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const visiblePageNumbers = 5;
    const startPage = Math.max(1, currentPage - Math.floor(visiblePageNumbers / 2));
    const endPage = Math.min(totalPages, startPage + visiblePageNumbers - 1);

    return (
        <div className="rounded-sm bg-white px-5 pt-6 pb-4  dark:bg-boxdark sm:px-7 xl:pb-1 text-base">
            <div className="mb-4 flex items-center gap-2">
                <select value={filter} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded text-sm">
                    <option value="ALL">ALL</option>
                    <option value="NAME">NAME</option>
                    <option value="LICENSE">LICENSE</option>
                    <option value="ECOSYSTEM">ECOSYSTEM</option>
                    <option value="TYPE">TYPE</option>
                    <option value="SEVERITY">SEVERITY</option>
                </select>
                <input
                    type="text"
                    placeholder={`Search by ${filter.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={handleSearch}
                    className="p-2 border border-gray-300 rounded flex-1 text-sm"
                />
            </div>

            <table className="min-w-full bg-white table-fixed text-sm">
                <thead>
                    <tr>
                        <th className="py-3 px-3 text-center w-12">No.</th>
                        <th className="py-3 px-3 text-left cursor-pointer w-36" onClick={() => handleSort('name')}>
                            Name
                            <span className="ml-2 text-xs">
                                {sortOrder.name === 'asc' ? '▲' : '▼'}
                            </span>
                        </th>
                        <th className="py-3 px-3 text-center w-20">Version</th>
                        <th className="py-3 px-3 text-center w-28">Ecosystem</th>
                        <th className="py-3 px-3 text-center w-24 cursor-pointer" onClick={() => handleSort('typeColor')}>
                            Type
                            <span className="ml-2 text-xs">
                                {sortOrder.typeColor === 'asc' ? '▲' : '▼'}
                            </span>
                        </th>
                        <th className="py-3 px-3 text-center w-28">License</th>
                        <th className="py-3 px-3 text-center w-24 cursor-pointer" onClick={() => handleSort('severity')}>
                            Vulnerability
                            <span className="ml-2 text-xs">
                                {sortOrder.severity === 'asc' ? '▲' : '▼'}
                            </span>
                        </th>
                        <th className="py-3 px-3 text-center w-24 cursor-pointer" onClick={() => handleSort('severity')}>
                            Severity
                            <span className="ml-2 text-xs">
                                {sortOrder.severity === 'asc' ? '▲' : '▼'}
                            </span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {currentData.map((item, index) => {
                        let typeColor = 'black';
                        if (item.package_check && item.package_check[0]) {
                            const riskLevel = item.package_check[0]["Risk Level"];
                            if (riskLevel.toLowerCase() === 'green') typeColor = 'green';
                            if (riskLevel.toLowerCase() === 'yellow') typeColor = '#FFCA28';
                            if (riskLevel.toLowerCase() === 'red') typeColor = 'red';
                        }

                        return (
                            <tr key={item.unique_id || item["bom-ref"] || index}>
                                <td className="py-3 px-3 text-center">{indexOfFirstItem + index + 1}</td>
                                <td className="py-3 px-3 text-left">
                                    <span
                                        className="text-blue-500 hover:underline cursor-pointer"
                                        onClick={() => {
                                            if (projectName) {
                                                navigate(`/${projectName}/components/${item.unique_id}`);
                                            } else {
                                                console.error('projectName is not defined in URL');
                                            }
                                        }}
                                    >
                                        {item.group ? `${item.group}/${item.name}` : item.name}
                                    </span>
                                </td>
                                <td className="py-3 px-3 text-center">{item.version}</td>
                                <td className="py-3 px-3 text-center">{item.ecosystem}</td>
                                <td className="py-3 px-3 text-center" style={{ color: typeColor }}>{item.type || 'N/A'}</td>
                                <td className="py-3 px-3 text-center">{item.licenses}</td>
                                <td className="py-3 px-3 text-center">
                                    {item.vulnerabilities ? item.vulnerabilities.map((vuln, i) => (
                                        <div key={i}>{vuln.cve_id}</div>
                                    )) : 'N/A'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                    {item.vulnerabilities ? item.vulnerabilities.map((vuln, i) => {
                                        let severityColor = 'black';
                                        switch (vuln.severity.toLowerCase()) {
                                            case 'critical':
                                                severityColor = 'red';
                                                break;
                                            case 'high':
                                                severityColor = 'orange';
                                                break;
                                            case 'medium':
                                                severityColor = '#FFCA28';
                                                break;
                                            case 'low':
                                                severityColor = 'green';
                                                break;
                                            default:
                                                severityColor = 'black';
                                        }
                                        return (
                                            <div key={i} style={{ color: severityColor }}>
                                                {vuln.severity}
                                            </div>
                                        );
                                    }) : 'N/A'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="flex justify-center mt-4 space-x-2 text-sm">
                <button onClick={() => handlePageChange(1)} className="px-3 py-1 border rounded" disabled={currentPage === 1}>«</button>
                <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} className="px-3 py-1 border rounded" disabled={currentPage === 1}>‹</button>
                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((pageNumber) => (
                    <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-3 py-1 border rounded ${pageNumber === currentPage ? 'underline font-bold' : ''}`}
                    >
                        {pageNumber}
                    </button>
                ))}
                <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} className="px-3 py-1 border rounded" disabled={currentPage === totalPages}>›</button>
                <button onClick={() => handlePageChange(totalPages)} className="px-3 py-1 border rounded" disabled={currentPage === totalPages}>»</button>
            </div>
        </div>
    );
};

export default TablePackage;
