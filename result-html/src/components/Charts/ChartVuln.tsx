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

  const allVulns = useMemo(
    () => [...reachableVulns, ...cveOnlyVulns],
    [reachableVulns, cveOnlyVulns]
  );


  const severityLabels = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];


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


  const chartColors = useMemo(() => {
    if (uniqueReachableVulnsMap.size > 0) {
      return ['#FF4D4D', '#fdc5c3']; 
    } else {
      return ['#FF4D4D'];
    }
  }, [uniqueReachableVulnsMap.size]);


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
              console.log(`Bar clicked: ${category}`);
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

  const totalVulns = uniqueAllVulnsMap.size;
  const reachableCount = uniqueReachableVulnsMap.size;
  const reachablePercentage =
    totalVulns > 0 ? ((reachableCount / totalVulns) * 100).toFixed(1) : '0';

  const chartRef = useRef<ReactApexChart>(null);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
      }
    };
  }, []);

  return (
    <div className="space-y-3">
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
