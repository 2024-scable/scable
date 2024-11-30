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
  const [sbomDetail, setSbomDetail] = useState<SBOMDetail[]>([]); // 초기값을 빈 배열로 설정
  const [reachableData, setReachableData] = useState<ReachableItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { projectName } = useParams(); // 현재 URL에서 projectName 가져오기

  // URL의 'severity' 및 'reachability' 쿼리 파라미터 읽기
  const queryParams = new URLSearchParams(location.search);
  const severityParam = queryParams.get('severity');
  const reachabilityParam = queryParams.get('reachability');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // sbom-summary.json 로드
        const response = await fetch(`/${projectName}/sbom-summary.json`);
        if (!response.ok) throw new Error('Failed to fetch sbom-summary.json');
        const data = await response.json();
        setVulnData(data);

        // sbom-detail.json 로드
        const sbomResponse = await fetch(`/${projectName}/sbom-detail.json`);
        if (!sbomResponse.ok) throw new Error('Failed to fetch sbom-detail.json');
        const sbomData = await sbomResponse.json();

        // 'components' 배열을 상태로 설정
        setSbomDetail(sbomData.components || []); // components가 없을 경우 빈 배열로 설정

        // reachable.json 로드
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

  // 패키지 이름 정규화 함수 (undefined 처리 추가)
  const normalizePackageName = (name?: string): string => {
    return name ? name.toLowerCase().replace(/[\s\-_.]+/g, '') : '';
  };

  // Reachable 패키지 이름 목록 생성 (패키지 이름 정규화)
  const reachablePackages = new Set(
    reachableData
      .map(item => normalizePackageName(item["reachable-library"]))
      .filter(name => name !== '')
  );

  // 중복 제거를 위한 Set 생성
  const vulnSet = new Set<string>();

  // Reachable하고 CVE가 있는 취약점 목록
  const reachableVulns: Vulnerability[] = [];
  // CVE만 있고 Reachable하지 않은 취약점 목록
  const cveOnlyVulns: Vulnerability[] = [];

  // sbomDetail이 배열인지 확인
  if (Array.isArray(sbomDetail)) {
    sbomDetail.forEach(pkg => {
      if (!pkg.name) {
        console.warn('Package name is missing:', pkg);
        return; // 패키지 이름이 없으면 건너뜁니다.
      }
      if (pkg.vulnerabilities && pkg.vulnerabilities.length > 0) {
        pkg.vulnerabilities.forEach(vuln => {
          // 취약점의 고유 키 생성 (CVE ID + 패키지 이름)
          const vulnKey = `${vuln.cve_id}-${pkg.name}`;
          if (!vulnSet.has(vulnKey)) {
            vulnSet.add(vulnKey);

            // 패키지 이름을 정규화하여 비교
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

  // 필터 핸들러 함수
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
      {/* ChartVuln 컴포넌트를 감싸는 부모 div에 테두리 클래스 추가 */}
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
