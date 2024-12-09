// src/components/Charts/TablePackage.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';


interface Vulnerability {
    cve_id: string;
    severity: string;
    score: string;
    method: string;
    vector: string;
    cve_link: string;
}

interface PackageCheck {
    "Risk Level": string;
    Score?: number;
}

interface License {
    license_name: string;
    license_url?: string;
}

interface SBOMComponent {
    unique_id: number;
    group?: string;
    name: string;
    version: string;
    ecosystem: string;
    type?: string;
    licenses?: License[];
    vulnerabilities?: Vulnerability[];
    package_check?: PackageCheck[];
    "bom-ref"?: string;
}

type SortOrder = 'asc' | 'desc';

interface SortState {
    sortedBy: keyof SortableColumns | null; 
    order: SortOrder; 
}

type SortableColumns = 'name' | 'cve' | 'severity' | 'typeColor';

const TablePackage: React.FC = () => {
    const [data, setData] = useState<SBOMComponent[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filter, setFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [sortState, setSortState] = useState<SortState>({
        sortedBy: null,
        order: 'asc',
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const itemsPerPage = 50;
    const location = useLocation();
    const navigate = useNavigate();
    const { projectName } = useParams<{ projectName: string }>();

    // 데이터 페치
    useEffect(() => {
        if (!projectName) {
            console.error("프로젝트 이름이 URL에 없습니다.");
            setError("프로젝트 이름이 URL에 없습니다.");
            setLoading(false);
            return;
        }

        const fetchSBOMData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/${projectName}/sbom-detail.json`);
                if (!response.ok) throw new Error("Network response was not ok");
                const jsonData = await response.json();

                if (Array.isArray(jsonData.components)) {
                    setData(jsonData.components);
                    setError(null);
                } else {
                    console.error("Expected 'components' to be an array:", jsonData);
                    setError("데이터 형식 오류: 'components'는 배열이어야 합니다.");
                }
            } catch (error: any) {
                console.error("Error fetching SBOM data:", error);
                setError(error.message || "데이터 페칭 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchSBOMData();
    }, [projectName, location.search]); // location.search 추가

    const filteredData = useMemo(() => {
        let tempData = [...data];

        const queryParams = new URLSearchParams(location.search);
        const riskLevel = queryParams.get('risklevel')?.toLowerCase();
        const score = queryParams.get('score');
        const ecosystem = queryParams.get('ecosystem')?.toLowerCase();

        console.log(`Filtering with ecosystem=${ecosystem}, risklevel=${riskLevel}, score=${score}`);

        if (riskLevel) {
            tempData = tempData.filter(item => {
                const itemRiskLevel = item.package_check?.[0]?.["Risk Level"]?.toLowerCase();
                if (riskLevel === 'n/a') {
                    return itemRiskLevel === 'n/a' || itemRiskLevel === 'unknown';
                }
                return itemRiskLevel === riskLevel;
            });
        }

        if (score) {
            const parsedScore = parseInt(score, 10);
            if (!isNaN(parsedScore)) {
                tempData = tempData.filter(item => {
                    const itemScore = item.package_check?.[0]?.Score;
                    return itemScore === parsedScore;
                });
            }
        }

        if (ecosystem) {
            tempData = tempData.filter(item => item.ecosystem?.toLowerCase() === ecosystem);
        }


        return tempData;
    }, [location.search, data]);

    const searchedData = useMemo(() => {
        if (!searchTerm) return filteredData;

        const result = filteredData.filter(item => {
            const fullName = item.group ? `${item.group}/${item.name}` : item.name;
            const lowerCaseSearchTerm = searchTerm.toLowerCase();

            switch (filter) {
                case 'NAME':
                    return fullName.toLowerCase().includes(lowerCaseSearchTerm);
                case 'LICENSE':
                    return item.licenses?.some(lic => lic.license_name.toLowerCase().includes(lowerCaseSearchTerm)) || false;
                case 'ECOSYSTEM':
                    return item.ecosystem?.toLowerCase().includes(lowerCaseSearchTerm) || false;
                case 'TYPE':
                    return item.type?.toLowerCase().includes(lowerCaseSearchTerm) || false;
                case 'SEVERITY':
                    return item.vulnerabilities?.some(vuln => vuln.severity.toLowerCase().includes(lowerCaseSearchTerm)) || false;
                case 'ALL':
                default:
                    return (
                        fullName.toLowerCase().includes(lowerCaseSearchTerm) ||
                        item.licenses?.some(lic => lic.license_name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                        item.ecosystem?.toLowerCase().includes(lowerCaseSearchTerm) ||
                        item.type?.toLowerCase().includes(lowerCaseSearchTerm)
                    );
            }
        });

        console.log(`Searched Data:`, result);
        return result;
    }, [filteredData, searchTerm, filter]);

    const sortedData = useMemo(() => {
        if (sortState.sortedBy) {
            return [...searchedData].sort((a, b) => {
                let compare = 0;
                switch (sortState.sortedBy) {
                    case 'name':
                        compare = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                        break;
                    case 'cve':
                        const aCve = a.vulnerabilities ? a.vulnerabilities.length : 0;
                        const bCve = b.vulnerabilities ? b.vulnerabilities.length : 0;
                        compare = aCve - bCve;
                        break;
                    case 'severity':
                        const severityRank: { [key: string]: number } = {
                            critical: 1,
                            high: 2,
                            medium: 3,
                            low: 4,
                            none: 5,
                        };
                        const aMaxSeverity = a.vulnerabilities && a.vulnerabilities.length > 0
                            ? Math.min(...a.vulnerabilities.map(vuln => severityRank[vuln.severity.toLowerCase()] || severityRank['none']))
                            : severityRank['none'];
                        const bMaxSeverity = b.vulnerabilities && b.vulnerabilities.length > 0
                            ? Math.min(...b.vulnerabilities.map(vuln => severityRank[vuln.severity.toLowerCase()] || severityRank['none']))
                            : severityRank['none'];
                        console.log(`Comparing severity: ${a.name} (${aMaxSeverity}) vs ${b.name} (${bMaxSeverity})`);
                        compare = aMaxSeverity - bMaxSeverity;
                        break;
                    case 'typeColor':
                        const getColorValue = (item: SBOMComponent): number => {
                            const riskLevel = item.package_check?.[0]?.["Risk Level"]?.toLowerCase();
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
                        };
                        const aColor = getColorValue(a);
                        const bColor = getColorValue(b);
                        compare = aColor - bColor;
                        break;
                    default:
                        break;
                }

                return sortState.order === 'asc' ? compare : -compare;
            });
        }

        const severityRank: { [key: string]: number } = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4,
            none: 5,
        };

        const sorted = [...searchedData].sort((a, b) => {
            const aMaxSeverity = a.vulnerabilities && a.vulnerabilities.length > 0
                ? Math.min(...a.vulnerabilities.map(vuln => severityRank[vuln.severity.toLowerCase()] || severityRank['none']))
                : severityRank['none'];
            const bMaxSeverity = b.vulnerabilities && b.vulnerabilities.length > 0
                ? Math.min(...b.vulnerabilities.map(vuln => severityRank[vuln.severity.toLowerCase()] || severityRank['none']))
                : severityRank['none'];
            console.log(`Default sort - Comparing severity: ${a.name} (${aMaxSeverity}) vs ${b.name} (${bMaxSeverity})`);
            if (aMaxSeverity !== bMaxSeverity) return aMaxSeverity - bMaxSeverity;

            const aHasVuln = a.vulnerabilities ? a.vulnerabilities.length : 0;
            const bHasVuln = b.vulnerabilities ? b.vulnerabilities.length : 0;
            if (aHasVuln !== bHasVuln) return bHasVuln - aHasVuln;

            const nameCompare = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            if (nameCompare !== 0) return nameCompare;

            const getColorValue = (item: SBOMComponent): number => {
                const riskLevel = item.package_check?.[0]?.["Risk Level"]?.toLowerCase();
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
            };
            const aColor = getColorValue(a);
            const bColor = getColorValue(b);
            return aColor - bColor;
        });

        return sorted;
    }, [searchedData, sortState]);

    const paginatedData = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return sortedData.slice(indexOfFirstItem, indexOfLastItem);
    }, [sortedData, currentPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(sortedData.length / itemsPerPage);
    }, [sortedData.length]);

    const getPageNumbers = (): number[] => {
        const visiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
        let endPage = startPage + visiblePages - 1;

        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - visiblePages + 1);
        }

        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    const getRiskLevelColor = (riskLevel?: string): string => {
        switch (riskLevel?.toLowerCase()) {
            case 'red':
                return 'text-red-600';
            case 'yellow':
                return 'text-yellow-500';
            case 'green':
                return 'text-green-600';
            case 'unknown':
                return 'text-gray-500';
            default:
                return 'text-gray-500';
        }
    };

    const getSeverityColor = (severity?: string): string => {
        switch (severity?.toLowerCase()) {
            case 'critical':
                return 'text-red-600';
            case 'high':
                return 'text-orange-500';
            case 'medium':
                return 'text-yellow-500';
            case 'low':
                return 'text-green-600';
            default:
                return 'text-gray-500';
        }
    };

    const handleSort = (type: keyof SortableColumns) => {
        setSortState(prev => ({
            sortedBy: type,
            order: prev.sortedBy === type && prev.order === 'asc' ? 'desc' : 'asc',
        }));
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value.toLowerCase());
        setCurrentPage(1);
    };

    const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter(event.target.value);
        setSearchTerm('');
        setCurrentPage(1); 
    };

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    return (
        <div className="rounded-sm bg-white px-5 pt-6 pb-4 dark:bg-boxdark sm:px-7 xl:pb-1 text-base">
            {loading ? (
                <div className="flex justify-center items-center h-full">
                    <p>Loading...</p>
                </div>
            ) : error ? (
                <div className="flex justify-center items-center h-full">
                    <p className="text-red-500">{error}</p>
                </div>
            ) : (
                <>
                    <div className="mb-4 flex flex-col md:flex-row items-center gap-2">
                        <select
                            value={filter}
                            onChange={handleFilterChange}
                            className="p-2 border border-gray-300 rounded text-sm"
                        >
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

                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white table-fixed text-sm">
                            <thead>
                                <tr className="border-b bg-[#d2e3fe] dark:bg-gray-800">
                                    <th className="py-3 px-3 text-center w-12">No.</th>
                                    <th
                                        className="py-3 px-3 text-left cursor-pointer w-36"
                                        onClick={() => handleSort('name')}
                                    >
                                        Name
                                        <span className="ml-2 text-xs">
                                            {sortState.sortedBy === 'name' ? (sortState.order === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </th>
                                    <th className="py-3 px-3 text-center w-20">Version</th>
                                    <th className="py-3 px-3 text-center w-28">Ecosystem</th>
                                    <th
                                        className="py-3 px-3 text-center w-24 cursor-pointer"
                                        onClick={() => handleSort('typeColor')}
                                    >
                                        Type
                                        <span className="ml-2 text-xs">
                                            {sortState.sortedBy === 'typeColor' ? (sortState.order === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </th>
                                    <th className="py-3 px-3 text-center w-28">License</th>
                                    <th
                                        className="py-3 px-3 text-center w-24 cursor-pointer"
                                        onClick={() => handleSort('cve')}
                                    >
                                        Vulnerability
                                        <span className="ml-2 text-xs">
                                            {sortState.sortedBy === 'cve' ? (sortState.order === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </th>
                                    <th
                                        className="py-3 px-3 text-center w-24 cursor-pointer"
                                        onClick={() => handleSort('severity')}
                                    >
                                        Severity
                                        <span className="ml-2 text-xs">
                                            {sortState.sortedBy === 'severity' ? (sortState.order === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((item, index) => {
                                        const riskLevel = item.package_check?.[0]?.["Risk Level"];
                                        return (
                                            <tr key={item.unique_id || item["bom-ref"] || index} className="border-b hover:bg-[#dddddd] dark:hover:bg-gray-800">
                                                <td className="py-3 px-3 text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
                                                <td className="py-3 px-3 text-center" style={{ color: getRiskLevelColor(riskLevel) }}>
                                                    {item.type || 'N/A'}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {item.licenses && item.licenses.length > 0 ? (
                                                        item.licenses.map((lic, i) => (
                                                            lic.license_name.toLowerCase() === 'n/a' || !lic.license_url ? (
                                                                <div key={i} className="text-gray-500">
                                                                    {lic.license_name}
                                                                </div>
                                                            ) : (
                                                                <div key={i}>
                                                                    <a href={lic.license_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                                        {lic.license_name}
                                                                    </a>
                                                                </div>
                                                            )
                                                        ))
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {item.vulnerabilities && item.vulnerabilities.length > 0 ? (
                                                        [...item.vulnerabilities].sort((a, b) => {
                                                            const severityOrder: { [key: string]: number } = {
                                                                critical: 1,
                                                                high: 2,
                                                                medium: 3,
                                                                low: 4,
                                                                none: 5,
                                                            };
                                                            const aSeverity = severityOrder[a.severity.toLowerCase()] || severityOrder['none'];
                                                            const bSeverity = severityOrder[b.severity.toLowerCase()] || severityOrder['none'];
                                                            return aSeverity - bSeverity;
                                                        }).map((vuln, i) => (
                                                            <div key={i}>{vuln.cve_id}</div>
                                                        ))
                                                    ) : (
                                                        ''
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {item.vulnerabilities && item.vulnerabilities.length > 0 ? (
                                                        [...item.vulnerabilities].sort((a, b) => {
                                                            const severityOrder: { [key: string]: number } = {
                                                                critical: 1,
                                                                high: 2,
                                                                medium: 3,
                                                                low: 4,
                                                                none: 5,
                                                            };
                                                            const aSeverity = severityOrder[a.severity.toLowerCase()] || severityOrder['none'];
                                                            const bSeverity = severityOrder[b.severity.toLowerCase()] || severityOrder['none'];
                                                            return aSeverity - bSeverity;
                                                        }).map((vuln, i) => (
                                                            <div key={i} className={getSeverityColor(vuln.severity)}>
                                                                {vuln.severity}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        ''
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-4 text-center text-gray-500">
                                            No data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center mt-4 space-x-2 text-sm">
                            <button
                                onClick={() => handlePageChange(1)}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                                disabled={currentPage === 1}
                            >
                                «
                            </button>
                            <button
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                                disabled={currentPage === 1}
                            >
                                ‹
                            </button>
                            {getPageNumbers().map(pageNumber => (
                                <button
                                    key={pageNumber}
                                    onClick={() => handlePageChange(pageNumber)}
                                    className={`px-3 py-1 border rounded ${pageNumber === currentPage ? 'underline font-bold' : ''}`}
                                >
                                    {pageNumber}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                                disabled={currentPage === totalPages}
                            >
                                ›
                            </button>
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                className="px-3 py-1 border rounded disabled:opacity-50"
                                disabled={currentPage === totalPages}
                            >
                                »
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );

};

export default TablePackage;
