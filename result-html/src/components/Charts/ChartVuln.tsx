import React, { useMemo, useRef, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface Vulnerability {
  cve_id: string;
  severity: string;
  score: number;
  method: string;
  vector: string;
  cve_link: string;
  packageName?: string;
  packageVersion?: string;
}

interface VulnSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
  total: number;
}

interface ChartVulnProps {
  vulnSummary: VulnSummary;
  reachableVulns: Vulnerability[];
  cveOnlyVulns: Vulnerability[];
  onBarClick: (severity: string | null) => void;
}

const ChartVuln: React.FC<ChartVulnProps> = ({
  vulnSummary,
  reachableVulns,
  cveOnlyVulns,
  onBarClick,
}) => {
  // 모든 취약점 리스트
  const allVulns = useMemo(
    () => [...reachableVulns, ...cveOnlyVulns],
    [reachableVulns, cveOnlyVulns]
  );

  // 심각도 레이블 및 색상
  const severityLabels = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];

  // 고유한 취약점들로 맵 생성
  const uniqueReachableVulnsMap = useMemo(() => {
    const map = new Map<string, Vulnerability>();
    reachableVulns.forEach((vuln) => {
      map.set(vuln.cve_id, vuln);
    });
    return map;
  }, [reachableVulns]);

  const uniqueCveOnlyVulnsMap = useMemo(() => {
    const map = new Map<string, Vulnerability>();
    cveOnlyVulns.forEach((vuln) => {
      map.set(vuln.cve_id, vuln);
    });
    return map;
  }, [cveOnlyVulns]);

  const uniqueAllVulnsMap = useMemo(() => {
    const map = new Map<string, Vulnerability>();
    allVulns.forEach((vuln) => {
      map.set(vuln.cve_id, vuln);
    });
    return map;
  }, [allVulns]);

  // 고유한 패키지 수 계산
  const uniquePackagesSet = useMemo(() => {
    const set = new Set<string>();
    allVulns.forEach((vuln) => {
      if (vuln.packageName && vuln.packageVersion) {
        set.add(`${vuln.packageName}@${vuln.packageVersion}`);
      }
    });
    return set;
  }, [allVulns]);

  const totalPackages = uniquePackagesSet.size;

  // 도달 가능한 패키지 수 계산
  const uniqueReachablePackagesSet = useMemo(() => {
    const set = new Set<string>();
    reachableVulns.forEach((vuln) => {
      if (vuln.packageName && vuln.packageVersion) {
        set.add(`${vuln.packageName}@${vuln.packageVersion}`);
      }
    });
    return set;
  }, [reachableVulns]);

  const reachablePackages = uniqueReachablePackagesSet.size;

  const reachablePackagePercentage =
    totalPackages > 0 ? ((reachablePackages / totalPackages) * 100).toFixed(1) : '0';

  // Reachable 및 Unreachable 취약점의 심각도별 개수 계산 (고유한 CVE 기준)
  const severityCounts = useMemo(() => {
    const counts: {
      Reachable: { [key: string]: number };
      Unreachable: { [key: string]: number };
    } = {
      Reachable: { Critical: 0, High: 0, Medium: 0, Low: 0, Unknown: 0 },
      Unreachable: { Critical: 0, High: 0, Medium: 0, Low: 0, Unknown: 0 },
    };

    uniqueReachableVulnsMap.forEach((vuln) => {
      const severity =
        vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1).toLowerCase();
      if (severityLabels.includes(severity)) {
        counts.Reachable[severity]++;
      } else {
        counts.Reachable.Unknown++;
      }
    });

    uniqueCveOnlyVulnsMap.forEach((vuln) => {
      const severity =
        vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1).toLowerCase();
      if (severityLabels.includes(severity)) {
        counts.Unreachable[severity]++;
      } else {
        counts.Unreachable.Unknown++;
      }
    });

    return counts;
  }, [uniqueReachableVulnsMap, uniqueCveOnlyVulnsMap, severityLabels]);

  // 시리즈 데이터 설정 (Reachable이 있는 경우와 없는 경우에 따라 다르게 설정)
  const series = useMemo(() => {
    if (uniqueReachableVulnsMap.size > 0) {
      return [
        {
          name: 'Reachable',
          data: severityLabels.map((severity) => severityCounts.Reachable[severity]),
        },
        {
          name: 'Unreachable',
          data: severityLabels.map((severity) => severityCounts.Unreachable[severity]),
        },
      ];
    } else {
      return [
        {
          name: 'Unreachable',
          data: severityLabels.map((severity) => severityCounts.Unreachable[severity]),
        },
      ];
    }
  }, [uniqueReachableVulnsMap.size, severityLabels, severityCounts]);

  // 차트 색상 설정 (Reachable과 Unreachable에 따라 다르게 설정)
  const chartColors = useMemo(() => {
    if (uniqueReachableVulnsMap.size > 0) {
      return ['#FF4D4D', '#fdc5c3']; // Reachable - 빨강, Unreachable - 연한 빨강
    } else {
      return ['#FF4D4D']; // Unreachable만 표시할 경우 빨강
    }
  }, [uniqueReachableVulnsMap.size]);

  // 차트 옵션 설정
  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        stacked: false,
        toolbar: { show: false },
        animations: {
          enabled: true,
        },
        events: {
          dataPointSelection: function (event, chartContext, config) {
            const category = config.w.config.xaxis.categories[config.dataPointIndex];
            if (category) {
              const severityParam = category.toLowerCase();
              onBarClick(severityParam);
              console.log(`Bar clicked: ${category}`); // 디버깅용 로그
            }
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '50%',
        },
      },
      colors: chartColors,
      dataLabels: {
        enabled: true,
      },
      xaxis: {
        categories: severityLabels,
        title: { text: 'Severity' },
      },
      yaxis: {
        title: { text: 'Count' },
        min: 0,
        forceNiceScale: true,
      },
      legend: {
        position: 'top',
        horizontalAlign: 'center',
      },
      tooltip: {
        y: {
          formatter: (val: number) => val.toString(),
        },
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            plotOptions: {
              bar: {
                columnWidth: '70%',
              },
            },
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
    }),
    [chartColors, severityLabels, onBarClick]
  );

  // 총 취약점 수 계산 (고유한 CVE 기준)
  const totalVulns = uniqueAllVulnsMap.size;
  const reachableCount = uniqueReachableVulnsMap.size;
  const reachablePercentage =
    totalVulns > 0 ? ((reachableCount / totalVulns) * 100).toFixed(1) : '0';

  // Ref를 사용하여 차트 인스턴스 관리
  const chartRef = useRef<ReactApexChart>(null);

  useEffect(() => {
    // 컴포넌트 언마운트 시 차트 인스턴스 정리
    return () => {
      if (chartRef.current) {
        // 필요 시 차트 인스턴스 정리
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* 취약점 정보 강조 */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg flex items-center justify-between">
        <div>
          <ul className="text-gray-600 dark:text-gray-300">
            <li>
              <span className="font-semibold">Total CVEs:</span> {totalVulns}
            </li>
            <li>
              <span className="font-semibold">Total Packages:</span> {totalPackages}
            </li>
            <li>
              <span className="font-semibold">Reachable Packages:</span> {reachablePackages} (
              {reachablePackagePercentage}%)
            </li>
          </ul>
        </div>
        <div className="flex flex-col items-center">
          {reachableCount > 0 ? (
            <>
              <div className="text-5xl font-bold text-[#FF4D4D] mt-3">
                {reachableCount} / {totalVulns}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-3">
                총 취약점 중{' '}
                <span className="font-semibold">{reachablePercentage}%</span>가 Reachable합니다.
              </p>
            </>
          ) : (
            <p className="text-gray-600 dark:text-gray-300">
              총 취약점 중 reachable한 취약점이 존재하지 않습니다.
            </p>
          )}
        </div>
      </div>

      {/* 심각도별 Reachable/Unreachable 취약점 분포 차트 */}
      {totalVulns > 0 ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-300">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Vulnerability Severity Distribution
          </h2>
          <ReactApexChart
            ref={chartRef}
            options={options}
            series={series}
            type="bar"
            height={350}
          />
        </div>
      ) : (
        <p className="text-center text-gray-700 dark:text-gray-300">취약점이 없습니다.</p>
      )}
    </div>
  );
};

export default ChartVuln;
