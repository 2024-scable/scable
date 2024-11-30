// src/components/Charts/ChartLibrary.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaSpinner } from "react-icons/fa"; // 로딩 스피너 아이콘 추가

// 타입 정의
interface RiskLevelCounts {
  Red: number;
  Yellow: number;
  Green: number;
  "N/A": number;
}

interface ScoreGroup {
  [key: string]: number;
}

interface DashboardData {
  RiskLevelCounts: RiskLevelCounts;
  [ecosystem: string]: any; // 예: "npm_ScoreGroups"
}

const ChartLibrary: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { projectName } = useParams(); // 현재 URL에서 프로젝트 이름 가져오기

  // 데이터 페칭 함수
  const fetchData = async () => {
    try {
      const response = await fetch(`/${projectName}/packagecheck-summary.json`);
      if (!response.ok) {
        throw new Error(`데이터 로딩 실패: ${response.statusText}`);
      }
      const jsonData: DashboardData = await response.json();
      setData(jsonData);
    } catch (err: any) {
      setError(err.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 전체 위험도 및 에코시스템별 데이터 계산
  const totalRiskCounts: RiskLevelCounts = useMemo(() => {
    return data?.RiskLevelCounts || { Red: 0, Yellow: 0, Green: 0, "N/A": 0 };
  }, [data]);

  const totalLibraries = useMemo(() => {
    return Object.values(totalRiskCounts).reduce((a, b) => a + b, 0);
  }, [totalRiskCounts]);

  // 사용된 에코시스템 목록 동적으로 생성
  const ecosystems: string[] = useMemo(() => {
    if (!data) return [];
    return Object.keys(data)
      .filter((key) => key.endsWith("_ScoreGroups"))
      .map((key) => key.replace("_ScoreGroups", ""));
  }, [data]);

  // 에코시스템별 위험도 카운트 계산
  const getEcosystemRiskCounts = (ecosystem: string): RiskLevelCounts => {
    const scoreGroups: { [key: string]: ScoreGroup } = data?.[`${ecosystem}_ScoreGroups`];
    if (!scoreGroups) return { Red: 0, Yellow: 0, Green: 0, "N/A": 0 };

    const riskLevels: Array<keyof RiskLevelCounts> = ["Red", "Yellow", "Green", "N/A"];
    const counts: RiskLevelCounts = {
      Red: 0,
      Yellow: 0,
      Green: 0,
      "N/A": 0,
    };

    riskLevels.forEach((level) => {
      const group = scoreGroups[level];
      counts[level] = group
        ? Object.values(group).reduce((a: number, b: number) => a + b, 0)
        : 0;
    });

    return counts;
  };

  // 위험도 색상 매핑
  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case "Red":
        return "#E74C3C";
      case "Yellow":
        return "#F1C40F";
      case "Green":
        return "#2ECC71";
      default:
        return "#95A5A6";
    }
  };

  // 차트 클릭 시 리다이렉트
  const handleChartClick = (ecosystem: string, riskLevel: string) => {
    const url = `/${projectName}/components?ecosystem=${encodeURIComponent(
      ecosystem
    )}&risklevel=${encodeURIComponent(riskLevel.toLowerCase())}`;
    navigate(url);
  };

  // 로딩 상태 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-800">
        <FaSpinner className="animate-spin text-4xl text-indigo-500" />
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-800">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="shadow border border-gray-300 p-6 mb-4 bg-white dark:bg-gray-900">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
        Malicious Component Inspection Results
      </h2>
      
      {/* 전체 요약 카드 */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 mb-4">
        {/* 전체 라이브러리 수 */}
        <SummaryCard
          title="Total Libraries"
          count={totalLibraries}
          bgColor="bg-blue-50 dark:bg-blue-700"
          textColor="text-blue-600 dark:text-blue-300"
        />
        {/* 위험도 별 카운트 */}
        <SummaryCard
          title="Warning (Red)"
          count={totalRiskCounts.Red}
          bgColor="bg-red-50 dark:bg-red-700"
          textColor="text-red-600 dark:text-red-300"
        />
        <SummaryCard
          title="Caution (Yellow)"
          count={totalRiskCounts.Yellow}
          bgColor="bg-yellow-50 dark:bg-yellow-700"
          textColor="text-yellow-600 dark:text-yellow-300"
        />
        <SummaryCard
          title="Safety (Green)"
          count={totalRiskCounts.Green}
          bgColor="bg-green-50 dark:bg-green-700"
          textColor="text-green-600 dark:text-green-300"
        />
        <SummaryCard
          title="N/A"
          count={totalRiskCounts["N/A"]}
          bgColor="bg-gray-50 dark:bg-gray-700"
          textColor="text-gray-600 dark:text-gray-300"
        />
      </div>

      {/* 에코시스템별 위험도 통계 표 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 overflow-x-auto border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-blue-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Ecosystem
              </th>
              <th scope="col" className="px-6 py-3 text-center text-sm font-medium text-red-600 uppercase tracking-wider">
                Red
              </th>
              <th scope="col" className="px-6 py-3 text-center text-sm font-medium text-yellow-600 uppercase tracking-wider">
                Yellow
              </th>
              <th scope="col" className="px-6 py-3 text-center text-sm font-medium text-green-600 uppercase tracking-wider">
                Green
              </th>
              <th scope="col" className="px-6 py-3 text-center text-sm font-medium text-gray-600 uppercase tracking-wider">
                N/A
              </th>
              <th scope="col" className="px-6 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {ecosystems.map((ecosystem, index) => {
              const counts = getEcosystemRiskCounts(ecosystem);
              const total = counts.Red + counts.Yellow + counts.Green + counts["N/A"];
              // PYPI와 MAVEN의 Total이 0인 경우 해당 행을 렌더링하지 않도록 필터링 (선택 사항)
              // if (total === 0) return null;
              return (
                <tr
                  key={index}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  {/* 에코시스템 이름 */}
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-200">
                    {ecosystem.toUpperCase()}
                  </td>
                  {/* 위험도 카운트 */}
                  <td
                    className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-600 dark:text-red-300"
                    onClick={() => handleChartClick(ecosystem, "Red")}
                  >
                    {counts.Red}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-yellow-300"
                    onClick={() => handleChartClick(ecosystem, "Yellow")}
                  >
                    {counts.Yellow}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600 dark:text-green-300"
                    onClick={() => handleChartClick(ecosystem, "Green")}
                  >
                    {counts.Green}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-300"
                    onClick={() => handleChartClick(ecosystem, "N/A")}
                  >
                    {counts["N/A"]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900 dark:text-gray-200">
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* *** 불필요한 차트 섹션 제거 *** */}
      {/* 에코시스템별 위험도 분포 차트 제거 */}
      {/*
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {ecosystems.map((ecosystem, index) => {
          const counts = getEcosystemRiskCounts(ecosystem);
          const pieData = [
            { name: "Red", value: counts.Red, color: "#E74C3C" },
            { name: "Yellow", value: counts.Yellow, color: "#F1C40F" },
            { name: "Green", value: counts.Green, color: "#2ECC71" },
          ];

          // 위험도 값이 모두 0인 경우 차트를 표시하지 않음
          const totalRisk = counts.Red + counts.Yellow + counts.Green;
          if (totalRisk === 0) return null;

          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <h3 className="text-center text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                {ecosystem.toUpperCase()} Risk Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    onClick={(data, index) =>
                      handleChartClick(ecosystem, data.name)
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    payload={pieData.map((item) => ({
                      value: item.name,
                      type: "square",
                      id: item.name,
                      color: item.color,
                    }))}
                  />
                  <Tooltip formatter={(value: number) => `${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
      */}
    </div>
  );
};

// 요약 카드 컴포넌트
interface SummaryCardProps {
  title: string;
  count: number;
  bgColor: string;
  textColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, count, bgColor, textColor }) => {
  return (
    <div className={`${bgColor} rounded-lg shadow-sm p-3 text-center border border-gray-200 dark:border-gray-700`}>
      <h3 className={`text-xs font-medium ${textColor}`}>{title}</h3>
      <p className={`text-sm font-medium ${textColor}`}>{count}</p>
    </div>
  );
};

export default ChartLibrary;
