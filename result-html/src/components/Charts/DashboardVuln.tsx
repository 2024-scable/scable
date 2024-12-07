import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChartVuln from './ChartVuln';
import TableVuln from '../Tables/TableVuln';

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

interface SBOMDetail {
  unique_id: number;
  name: string;
  version: string;
  vulnerabilities: Vulnerability[];
}

interface ReachableItem {
  "sink-function": string;
  "reachable-library": string;
  "library-function": string;
  "path": string;
  "line": string;
}

interface VulnSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
  total: number;
}

const DashboardVuln: React.FC = () => {
  const [vulnData, setVulnData] = useState<any | null>(null);
  const [sbomDetail, setSbomDetail] = useState<SBOMDetail[]>([]);
  const [reachableData, setReachableData] = useState<ReachableItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { projectName } = useParams(); 

  const queryParams = new URLSearchParams(location.search);
  const severityParam = queryParams.get('severity');
  const reachabilityParam = queryParams.get('reachability');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/${projectName}/sbom-summary.json`);
        if (!response.ok) throw new Error('Failed to fetch sbom-summary.json');
        const data = await response.json();
        setVulnData(data);

        const sbomResponse = await fetch(`/${projectName}/sbom-detail.json`);
        if (!sbomResponse.ok) throw new Error('Failed to fetch sbom-detail.json');
        const sbomData = await sbomResponse.json();

        setSbomDetail(sbomData.components || []);

        const reachableResponse = await fetch(`/${projectName}/reachable.json`);
        if (!reachableResponse.ok) throw new Error('Failed to fetch reachable.json');
        const reachableJson = await reachableResponse.json();
        setReachableData(reachableJson);

      } catch (error) {
        console.error('Data fetching error:', error);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!vulnData || !vulnData["vuln_sum"] || !sbomDetail.length || !reachableData) return <div>Data not available</div>;

  const vulnSummary: VulnSummary = vulnData["vuln_sum"];

  const normalizePackageName = (name?: string): string => {
    return name ? name.toLowerCase().replace(/[\s\-_.]+/g, '') : '';
  };

  const reachablePackages = new Set(
    reachableData
      .map(item => normalizePackageName(item["reachable-library"]))
      .filter(name => name !== '')
  );

  const vulnSet = new Set<string>();
  const reachableVulns: Vulnerability[] = [];
  const cveOnlyVulns: Vulnerability[] = [];

  if (Array.isArray(sbomDetail)) {
    sbomDetail.forEach(pkg => {
      if (!pkg.name) {
        console.warn('Package name is missing:', pkg);
        return;
      }
      if (pkg.vulnerabilities && pkg.vulnerabilities.length > 0) {
        pkg.vulnerabilities.forEach(vuln => {
          const vulnKey = `${vuln.cve_id}-${pkg.name}`;
          if (!vulnSet.has(vulnKey)) {
            vulnSet.add(vulnKey);

            const pkgNameNormalized = normalizePackageName(pkg.name);

            if (reachablePackages.has(pkgNameNormalized)) {
              reachableVulns.push({ ...vuln, packageName: pkg.name, packageVersion: pkg.version });
            } else {
              cveOnlyVulns.push({ ...vuln, packageName: pkg.name, packageVersion: pkg.version });
            }
          }
        });
      }
    });
  } else {
    console.error('sbomDetail is not an array:', sbomDetail);
  }

  const handleSeverityFilter = (severity: string | null, reachability: string | null) => {
    const params = new URLSearchParams();
    if (severity) params.set('severity', severity);
    if (reachability) params.set('reachability', reachability);
    if (projectName) {
      navigate(`/${projectName}/vuln?${params.toString()}`);
    } else {
      console.error('projectName is not defined in URL');
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-4">
        <ChartVuln
          vulnSummary={vulnSummary}
          reachableVulns={reachableVulns}
          cveOnlyVulns={cveOnlyVulns}
          onBarClick={(severity) => handleSeverityFilter(severity, reachabilityParam)}
        />
      </div>
      
    </div>
  );
};

export default DashboardVuln;
