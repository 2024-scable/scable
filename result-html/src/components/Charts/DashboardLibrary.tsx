// src/components/Charts/DashboardLibrary.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom"; 
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
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

const DashboardLibrary: React.FC = () => {
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
    if (projectName) {
        const url = `/${projectName}/components?ecosystem=${encodeURIComponent(
            ecosystem
        )}&risklevel=${encodeURIComponent(riskLevel.toLowerCase())}`;
        navigate(url); // 프로젝트 이름 포함 URL로 이동
    } else {
        console.error('프로젝트 이름이 URL에 정의되지 않았습니다.');
    }
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
    <div className="p-6 min-h-screen">
      {/* 전체 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 mb-8">
        {/* 전체 라이브러리 수 */}
        <SummaryCard
          title="Total Libraries"
          count={totalLibraries}
          bgColor="bg-blue-100 dark:bg-blue-800"
          textColor="text-blue-600 dark:text-blue-300"
          fontSize="text-base" // 폰트 크기 조정
        />
        {/* 위험도 별 카운트 */}
        <SummaryCard
          title="Warning (Red)"
          count={totalRiskCounts.Red}
          bgColor="bg-red-100 dark:bg-red-800"
          textColor="text-red-600 dark:text-red-300"
          fontSize="text-base" // 폰트 크기 조정
        />
        <SummaryCard
          title="Caution (Yellow)"
          count={totalRiskCounts.Yellow}
          bgColor="bg-yellow-100 dark:bg-yellow-800"
          textColor="text-yellow-600 dark:text-yellow-300"
          fontSize="text-base" // 폰트 크기 조정
        />
        <SummaryCard
          title="Safety (Green)"
          count={totalRiskCounts.Green}
          bgColor="bg-green-100 dark:bg-green-800"
          textColor="text-green-600 dark:text-green-300"
          fontSize="text-base" // 폰트 크기 조정
        />
        <SummaryCard
          title="N/A"
          count={totalRiskCounts["N/A"]}
          bgColor="bg-gray-100 dark:bg-gray-800"
          textColor="text-gray-600 dark:text-gray-300"
          fontSize="text-base" // 폰트 크기 조정
        />
      </div>

      {/* 에코시스템별 위험도 통계 표 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 overflow-x-auto mb-8">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
          Malicious Component Inspection Results
        </h2>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
       
          <thead className="bg-blue-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Ecosystem
              </th>
              <th className="px-6 py-3 text-center text-sm font-medium text-red-600 uppercase tracking-wider">Red</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-yellow-600 uppercase tracking-wider">Yellow</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-green-600 uppercase tracking-wider">Green</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-600 uppercase tracking-wider">N/A</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {ecosystems.map((ecosystem, index) => {
              const counts = getEcosystemRiskCounts(ecosystem);
              const total = counts.Red + counts.Yellow + counts.Green + counts["N/A"];
              return (
                <tr key={index} className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-200">
                    {ecosystem.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-600 dark:text-red-300" onClick={() => handleChartClick(ecosystem, "Red")}>
                    {counts.Red}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-yellow-600 dark:text-yellow-300" onClick={() => handleChartClick(ecosystem, "Yellow")}>
                    {counts.Yellow}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600 dark:text-green-300" onClick={() => handleChartClick(ecosystem, "Green")}>
                    {counts.Green}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-300" onClick={() => handleChartClick(ecosystem, "N/A")}>
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

      {/* 에코시스템별 위험도 분포 차트 */}
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
    </div>
  );
};

// 요약 카드 컴포넌트
interface SummaryCardProps {
  title: string;
  count: number;
  bgColor: string;
  textColor: string;
  fontSize: string; // 폰트 크기 추가
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, count, bgColor, textColor, fontSize }) => {
  return (
    <div className={`${bgColor} rounded-lg shadow p-4 text-center`}>
      <h3 className={`text-sm font-medium ${textColor} ${fontSize}`}>{title}</h3>
      <p className={`text-lg font-semibold ${textColor} ${fontSize}`}>{count}</p>
    </div>
  );
};

export default DashboardLibrary;
