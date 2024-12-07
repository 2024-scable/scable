// src/components/Charts/ChartLibrary.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaSpinner } from "react-icons/fa"; 


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
  [ecosystem: string]: any; 
}

const ChartLibrary: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { projectName } = useParams();

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


  const totalRiskCounts: RiskLevelCounts = useMemo(() => {
    return data?.RiskLevelCounts || { Red: 0, Yellow: 0, Green: 0, "N/A": 0 };
  }, [data]);

  const totalLibraries = useMemo(() => {
    return Object.values(totalRiskCounts).reduce((a, b) => a + b, 0);
  }, [totalRiskCounts]);

 
  const ecosystems: string[] = useMemo(() => {
    if (!data) return [];
    return Object.keys(data)
      .filter((key) => key.endsWith("_ScoreGroups"))
      .map((key) => key.replace("_ScoreGroups", ""));
  }, [data]);


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

  const handleChartClick = (ecosystem: string, riskLevel: string) => {
    const url = `/${projectName}/components?ecosystem=${encodeURIComponent(
      ecosystem
    )}&risklevel=${encodeURIComponent(riskLevel.toLowerCase())}`;
    navigate(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-800">
        <FaSpinner className="animate-spin text-4xl text-indigo-500" />
      </div>
    );
  }

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
      
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 mb-4">
        <SummaryCard
          title="Total Libraries"
          count={totalLibraries}
          bgColor="bg-blue-50 dark:bg-blue-700"
          textColor="text-blue-600 dark:text-blue-300"
        />
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
              // if (total === 0) return null;
              return (
                <tr
                  key={index}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-gray-200">
                    {ecosystem.toUpperCase()}
                  </td>
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

      
    </div>
  );
};

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
