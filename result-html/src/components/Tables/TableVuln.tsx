// src/components/Tables/TableVuln.tsx

import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';

interface Vulnerability {
  cve_id: string;
  severity: string;
  score: number | string;
  method: string;
  vector: string;
  cve_link: string;
  packageName: string;
  packageVersion: string;
}

interface SBOMDetail {
  unique_id: number;
  group?: string;
  name: string;
  version: string;
  ecosystem?: string;
  scope?: string;
  licenses?: string;
  license_urls?: string;
  hashes?: string;
  external_references?: string;
  type?: string;
  purl?: string;
  bomref?: string;
  vulnerabilities: Vulnerability[];
}

interface TableVulnProps {
  reachableVulns: Vulnerability[];
  cveOnlyVulns: Vulnerability[];
  sbomDetail: SBOMDetail[];
  selectedSeverity?: string | null;
  selectedReachability?: string | null;
}

const severityOrder: { [key: string]: number } = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
  unknown: 5,
};

const TableVuln: React.FC<TableVulnProps> = ({
  reachableVulns,
  cveOnlyVulns,
  sbomDetail,
  selectedSeverity,
  selectedReachability,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20; // 페이지당 항목 수를 20으로 설정
  const [groupMode, setGroupMode] = useState<'byPackage' | 'byCVE'>('byPackage');

  const { projectName } = useParams(); // 현재 URL에서 projectName 가져오기

  // 모든 취약점을 합치고 'reachable' 및 'component_id' 속성을 추가
  const allVulns = useMemo(() => {
    const vulns: (Vulnerability & { reachable: boolean; component_id: number | null })[] = [];

    const processVulns = (
      vulnList: Vulnerability[],
      isReachable: boolean
    ) => {
      vulnList.forEach((vuln) => {
        try {
          // 패키지 이름과 버전에 매칭되는 컴포넌트를 찾음
          const component = sbomDetail.find(
            (comp) =>
              comp.name === vuln.packageName &&
              comp.version === vuln.packageVersion
          );

          vulns.push({
            ...vuln,
            reachable: isReachable,
            component_id: component ? component.unique_id : null,
          });
        } catch (error) {
          console.error('Error processing vulnerability:', vuln, error);
        }
      });
    };

    processVulns(reachableVulns, true);
    processVulns(cveOnlyVulns, false);

    return vulns;
  }, [reachableVulns, cveOnlyVulns, sbomDetail]);

  // 검색어 및 필터에 따라 취약점을 필터링
  const filteredVulns = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return allVulns.filter((vuln) => {
      const packageNameMatch = vuln.packageName.toLowerCase().includes(term);
      const packageVersionMatch = vuln.packageVersion.toLowerCase().includes(term);
      const cveIdMatch = vuln.cve_id.toLowerCase().includes(term);
      const severityMatch = vuln.severity.toLowerCase().includes(term);
      const matchesSearchTerm =
        packageNameMatch || packageVersionMatch || cveIdMatch || severityMatch;

      const matchesSeverity = selectedSeverity
        ? vuln.severity.toLowerCase() === selectedSeverity.toLowerCase()
        : true;

      const matchesReachability = selectedReachability
        ? selectedReachability === 'reachable'
          ? vuln.reachable
          : !vuln.reachable
        : true;

      return matchesSearchTerm && matchesSeverity && matchesReachability;
    });
  }, [allVulns, searchTerm, selectedSeverity, selectedReachability]);

  // 그룹 모드에 따라 취약점을 그룹화
  const groupedVulns = useMemo(() => {
    if (groupMode === 'byPackage') {
      const packageGroups: {
        [key: string]: {
          packageName: string;
          packageVersion: string;
          component_id: number | null;
          reachable: boolean;
          highestSeverity: number;
          vulns: (Vulnerability & { reachable: boolean; component_id: number | null })[];
        };
      } = {};

      filteredVulns.forEach((vuln) => {
        try {
          const key = `${vuln.packageName}@${vuln.packageVersion}`;
          if (!packageGroups[key]) {
            packageGroups[key] = {
              packageName: vuln.packageName,
              packageVersion: vuln.packageVersion,
              component_id: vuln.component_id,
              reachable: false, // 초기값 설정
              highestSeverity: severityOrder[vuln.severity.toLowerCase()] || severityOrder['unknown'],
              vulns: [],
            };
          }
          packageGroups[key].vulns.push(vuln);

          // Reachable 상태 업데이트
          if (vuln.reachable) {
            packageGroups[key].reachable = true;
          }

          // 최고 심각도 업데이트
          const vulnSeverityValue = severityOrder[vuln.severity.toLowerCase()] || severityOrder['unknown'];
          if (vulnSeverityValue < packageGroups[key].highestSeverity) {
            packageGroups[key].highestSeverity = vulnSeverityValue;
          }
        } catch (error) {
          console.error('Error grouping vulnerability by package:', vuln, error);
        }
      });

      // 각 패키지 그룹 내의 취약점을 심각도 순으로 정렬
      Object.values(packageGroups).forEach((group) => {
        group.vulns.sort((a, b) => {
          const aSeverity = severityOrder[a.severity.toLowerCase()] || severityOrder['unknown'];
          const bSeverity = severityOrder[b.severity.toLowerCase()] || severityOrder['unknown'];
          return aSeverity - bSeverity;
        });
      });

      // 배열로 변환하고 패키지 그룹 정렬
      return Object.values(packageGroups).sort((a, b) => {
        // 1. Reachable 패키지를 우선
        if (a.reachable !== b.reachable) {
          return a.reachable ? -1 : 1;
        }

        // 2. 최고 심각도 순으로 정렬
        if (a.highestSeverity !== b.highestSeverity) {
          return a.highestSeverity - b.highestSeverity;
        }

        // 3. 패키지명으로 정렬
        const nameComparison = a.packageName.localeCompare(b.packageName);
        if (nameComparison !== 0) return nameComparison;

        // 4. 버전으로 정렬
        return a.packageVersion.localeCompare(b.packageVersion, undefined, {
          numeric: true,
        });
      });
    } else if (groupMode === 'byCVE') {
      const cveGroups: {
        [key: string]: {
          cve_id: string;
          cve_link: string;
          severity: string;
          score: number | string;
          vulns: (Vulnerability & { reachable: boolean; component_id: number | null })[];
          reachable: boolean;
          severityValue: number;
        };
      } = {};

      filteredVulns.forEach((vuln) => {
        try {
          const key = vuln.cve_id;
          if (!cveGroups[key]) {
            cveGroups[key] = {
              cve_id: vuln.cve_id,
              cve_link: vuln.cve_link,
              severity: vuln.severity,
              score: vuln.score,
              vulns: [],
              reachable: false, // 초기값 설정
              severityValue: severityOrder[vuln.severity.toLowerCase()] || severityOrder['unknown'],
            };
          }
          cveGroups[key].vulns.push(vuln);

          // Reachable 상태 업데이트
          if (vuln.reachable) {
            cveGroups[key].reachable = true;
          }

          // 최고 심각도 업데이트
          const vulnSeverityValue = severityOrder[vuln.severity.toLowerCase()] || severityOrder['unknown'];
          if (vulnSeverityValue < cveGroups[key].severityValue) {
            cveGroups[key].severityValue = vulnSeverityValue;
            cveGroups[key].severity = vuln.severity;
            cveGroups[key].score = vuln.score;
          }
        } catch (error) {
          console.error('Error grouping vulnerability by CVE:', vuln, error);
        }
      });

      // 각 CVE 그룹 내의 취약점을 패키지명 순으로 정렬
      Object.values(cveGroups).forEach((group) => {
        group.vulns.sort((a, b) => {
          const nameComparison = a.packageName.localeCompare(b.packageName);
          if (nameComparison !== 0) return nameComparison;
          return a.packageVersion.localeCompare(b.packageVersion, undefined, {
            numeric: true,
          });
        });
      });

      // 배열로 변환하고 CVE 그룹 정렬
      return Object.values(cveGroups).sort((a, b) => {
        // 1. Reachable CVE를 우선
        if (a.reachable !== b.reachable) {
          return a.reachable ? -1 : 1;
        }

        // 2. 심각도 순으로 정렬
        if (a.severityValue !== b.severityValue) {
          return a.severityValue - b.severityValue;
        }

        // 3. CVE ID로 정렬
        return a.cve_id.localeCompare(b.cve_id);
      });
    } else {
      return filteredVulns;
    }
  }, [filteredVulns, groupMode]);

  // 페이지네이션 로직
  const totalPages = useMemo(() => {
    return Math.ceil(groupedVulns.length / itemsPerPage);
  }, [groupedVulns.length, itemsPerPage]);

  const paginatedVulns = useMemo(() => {
    return groupedVulns.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [groupedVulns, currentPage, itemsPerPage]);

  return (
    <div className="mt-8 px-2 sm:px-4 lg:px-6">
      <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        Vulnerability Details
      </h3>

      {/* 그룹 모드 선택 버튼 */}
      <div className="mb-4 flex space-x-2">
        <button
          className={`px-4 py-2 rounded ${
            groupMode === 'byPackage' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setGroupMode('byPackage')}
        >
          Group by Package
        </button>
        <button
          className={`px-4 py-2 rounded ${
            groupMode === 'byCVE' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setGroupMode('byCVE')}
        >
          Group by CVE ID
        </button>
      </div>

      {/* 검색 입력 필드 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Package Name, CVE ID, or Severity..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {paginatedVulns.length > 0 ? (
        <>
          {/* 테이블 레이아웃 */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-700 rounded-lg overflow-hidden table-fixed">
              {groupMode === 'byPackage' ? (
                <>
                  {/* 패키지 그룹화 테이블 헤더 */}
                  <thead className="bg-gray-200 dark:bg-gray-600">
                    <tr>
                      <th className="py-1 px-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-12">
                        No.
                      </th>
                      <th className="py-1 px-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-16">
                        Reachable
                      </th>
                      <th className="py-2 px-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 w-32">
                        Package
                      </th>
                      <th className="py-2 px-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-20">
                        Version
                      </th>
                      <th className="py-2 px-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 w-40">
                        CVE ID
                      </th>
                      <th className="py-2 px-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-24">
                        Severity
                      </th>
                      <th className="py-2 px-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-16">
                        Score
                      </th>
                    </tr>
                  </thead>
                  {/* 테이블 바디 */}
                  <tbody>
                    {paginatedVulns.map((group, index) => {
                      const vulnCount = group.vulns.length;
                      return group.vulns.map((vuln, idx) => (
                        <tr
                          key={`${group.packageName}-${group.packageVersion}-${idx}`}
                          className={`border-b border-gray-200 dark:border-gray-600 ${
                            vuln.reachable
                              ? 'bg-red-50 dark:bg-red-900'
                              : 'bg-white-50 dark:bg-white-900'
                          } hover:bg-gray-100 dark:hover:bg-gray-700`}
                        >
                          {/* 번호 */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-center w-12"
                              rowSpan={vulnCount}
                            >
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </td>
                          ) : null}
                          {/* Reachable */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-center w-16"
                              rowSpan={vulnCount}
                            >
                              {group.reachable ? (
                                <FaCheckCircle
                                  className="text-green-500 inline"
                                  title="Reachable"
                                />
                              ) : (
                                <FaTimesCircle
                                  className="text-red-500 inline"
                                  title="Unreachable"
                                />
                              )}
                            </td>
                          ) : null}
                          {/* Package */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-left w-32"
                              rowSpan={vulnCount}
                            >
                              {group.component_id && projectName ? (
                                <Link
                                  to={`/${projectName}/components/${group.component_id}?tab=vulnerabilities`}
                                  className="text-blue-500 hover:underline"
                                >
                                  {group.packageName}
                                </Link>
                              ) : (
                                <span className="text-gray-500">{group.packageName}</span>
                              )}
                            </td>
                          ) : null}
                          {/* Version */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-center w-20"
                              rowSpan={vulnCount}
                            >
                              {group.packageVersion}
                            </td>
                          ) : null}
                          {/* CVE ID */}
                          <td className="py-2 px-2 text-left w-40">
                            <a
                              href={vuln.cve_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {vuln.cve_id}
                            </a>
                          </td>
                          {/* Severity */}
                          <td className="py-2 px-2 text-center w-24">
                            <span
                              className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full"
                              style={{
                                backgroundColor:
                                  vuln.severity.toLowerCase() === 'critical'
                                    ? '#f87171'
                                    : vuln.severity.toLowerCase() === 'high'
                                    ? '#fb923c'
                                    : vuln.severity.toLowerCase() === 'medium'
                                    ? '#fbbf24'
                                    : vuln.severity.toLowerCase() === 'low'
                                    ? '#a3e635'
                                    : '#9ca3af',
                                color: 'white',
                              }}
                            >
                              {vuln.severity.charAt(0).toUpperCase() +
                                vuln.severity.slice(1)}
                            </span>
                          </td>
                          {/* Score */}
                          <td className="py-2 px-2 text-center w-16">
                            {vuln.score}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </>
              ) : groupMode === 'byCVE' ? (
                <>
                  {/* CVE ID 그룹화 테이블 헤더 */}
                  <thead className="bg-gray-200 dark:bg-gray-600">
                    <tr>
                      <th className="py-1 px-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-12">
                        No.
                      </th>
                      <th className="py-1 px-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-16">
                        Reachable
                      </th>
                      <th className="py-2 px-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 w-40">
                        CVE ID
                      </th>
                      <th className="py-2 px-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-24">
                        Severity
                      </th>
                      <th className="py-2 px-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-16">
                        Score
                      </th>
                      <th className="py-2 px-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 w-32">
                        Package
                      </th>
                      <th className="py-2 px-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 w-20">
                        Version
                      </th>
                    </tr>
                  </thead>
                  {/* 테이블 바디 */}
                  <tbody>
                    {paginatedVulns.map((group, index) => {
                      const vulnCount = group.vulns.length;
                      return group.vulns.map((vuln, idx) => (
                        <tr
                          key={`${group.cve_id}-${idx}`}
                          className={`border-b border-gray-200 dark:border-gray-600 ${
                            vuln.reachable
                              ? 'bg-red-50 dark:bg-red-900'
                              : 'bg-white-50 dark:bg-white-900'
                          } hover:bg-gray-100 dark:hover:bg-gray-700`}
                        >
                          {/* 번호 */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-center w-12"
                              rowSpan={vulnCount}
                            >
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </td>
                          ) : null}
                          {/* Reachable */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-center w-16"
                              rowSpan={vulnCount}
                            >
                              {group.reachable ? (
                                <FaCheckCircle
                                  className="text-green-500 inline"
                                  title="Reachable"
                                />
                              ) : (
                                <FaTimesCircle
                                  className="text-red-500 inline"
                                  title="Unreachable"
                                />
                              )}
                            </td>
                          ) : null}
                          {/* CVE ID */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-left w-40"
                              rowSpan={vulnCount}
                            >
                              <a
                                href={group.cve_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {group.cve_id}
                              </a>
                            </td>
                          ) : null}
                          {/* Severity */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-center w-24"
                              rowSpan={vulnCount}
                            >
                              <span
                                className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full"
                                style={{
                                  backgroundColor:
                                    group.severity.toLowerCase() === 'critical'
                                      ? '#f87171'
                                      : group.severity.toLowerCase() === 'high'
                                      ? '#fb923c'
                                      : group.severity.toLowerCase() === 'medium'
                                      ? '#fbbf24'
                                      : group.severity.toLowerCase() === 'low'
                                      ? '#a3e635'
                                      : '#9ca3af',
                                  color: 'white',
                                }}
                              >
                                {group.severity.charAt(0).toUpperCase() +
                                  group.severity.slice(1)}
                              </span>
                            </td>
                          ) : null}
                          {/* Score */}
                          {idx === 0 ? (
                            <td
                              className="py-2 px-2 text-center w-16"
                              rowSpan={vulnCount}
                            >
                              {group.score}
                            </td>
                          ) : null}
                          {/* Package */}
                          <td className="py-2 px-2 text-left w-32">
                            {vuln.component_id && projectName ? (
                              <Link
                                to={`/${projectName}/components/${vuln.component_id}?tab=vulnerabilities`}
                                className="text-blue-500 hover:underline"
                              >
                                {vuln.packageName}
                              </Link>
                            ) : (
                              <span className="text-gray-500">{vuln.packageName}</span>
                            )}
                          </td>
                          {/* Version */}
                          <td className="py-2 px-2 text-center w-20">
                            {vuln.packageVersion}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </>
              ) : null}
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50" 
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-700 dark:text-gray-300">No vulnerabilities found.</p>
      )}
    </div>
  );
};

export default TableVuln;
