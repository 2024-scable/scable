// src/components/Info/InfoVuln.tsx

import React from 'react';
import {
  FaShieldAlt,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
} from 'react-icons/fa';

interface Vulnerability {
  cve_id: string;
  severity: string;
  score: number;
  method: string;
  vector: string;
  cve_link: string;
  description: string;
  updated: string;
  published: string;
  packageName?: string;
  packageVersion?: string;
}

interface PackageCheck {
  full_name: string;
  Score: number;
  'Risk Level': string;
  'Typosquatting Suspected': string;
  'Warning Reasons': { [key: string]: number };
}

interface Reachable {
  'sink-function': string;
  'reachable-library': string;
  'library-function': string;
  path: string;
  line: string;
}

interface InfoVulnProps {
  vulnerabilities: Vulnerability[];
  fullName: string;
  packageCheck?: PackageCheck[];
  reachableData?: Reachable[];
}

interface RiskIndicator {
  color: string;
  icon: JSX.Element;
}

const getRiskIndicator = (riskLevel?: string): RiskIndicator => {
  switch (riskLevel?.toLowerCase() || '') {
    case 'critical':
    case 'red':
      return {
        color: 'border-red-500',
        icon: <FaShieldAlt className="text-red-500 mr-2 text-xl" />,
      };
    case 'high':
    case 'orange':
      return {
        color: 'border-orange-500',
        icon: <FaShieldAlt className="text-orange-500 mr-2 text-xl" />,
      };
    case 'medium':
    case 'yellow':
      return {
        color: 'border-yellow-500',
        icon: <FaShieldAlt className="text-yellow-500 mr-2 text-xl" />,
      };
    case 'low':
    case 'green':
      return {
        color: 'border-green-500',
        icon: <FaShieldAlt className="text-green-500 mr-2 text-xl" />,
      };
    default:
      return {
        color: 'border-gray-200',
        icon: <FaShieldAlt className="text-gray-700 mr-2 text-xl" />,
      };
  }
};

const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[\s\-_.]+/g, '');
};

const InfoVuln: React.FC<InfoVulnProps> = ({
  vulnerabilities,
  fullName,
  packageCheck = [],
  reachableData = [],
}) => {
  const packageInfo = packageCheck.find(
    (pkg) => pkg.full_name === fullName
  );

  const riskIndicator = packageInfo
    ? getRiskIndicator(packageInfo['Risk Level'])
    : getRiskIndicator('');

  // 현재 패키지의 이름을 정규화
  const normalizedPackageName = normalizeString(fullName);

  // reachableData를 필터링하여 현재 패키지와 관련된 항목만 남김
  const filteredReachableData = reachableData.filter((reachable) => {
    const reachableLibrary = reachable['reachable-library'];
    if (reachableLibrary) {
      const normalizedReachableLibrary = normalizeString(reachableLibrary);
      return normalizedReachableLibrary === normalizedPackageName;
    }
    return false;
  });

  return (
    <div className="p-8 space-y-8">
      {/* Reachable Details 섹션 */}
      {filteredReachableData && filteredReachableData.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-red-500 mb-2">Reachable Details</h2>
          <div className="space-y-4">
            {filteredReachableData.map((reachable, index) => (
              <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Sink Function:</strong> {reachable['sink-function']}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Library Function:</strong> {reachable['library-function']}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Path:</strong> {reachable['path']}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Line:</strong> {reachable['line']}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CVE 목록 섹션 */}
      {vulnerabilities.length ? (
        <div>
          <h2 className="text-2xl font-bold text-red-500 mb-2">Vulnerabilities</h2>
          <div className="space-y-4">
            {vulnerabilities.map((vuln, index) => (
              <div
                key={index}
                className="p-6 rounded-lg shadow-lg transition-shadow duration-200 border border-gray-200 bg-white hover:shadow-xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <a
                    href={vuln.cve_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-bold text-red-600 hover:underline flex items-center"
                  >
                    {vuln.cve_id}
                    <FaExternalLinkAlt className="ml-1" />
                  </a>
                </div>

                <p className="text-base text-gray-700 mb-4">{vuln.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase bg-gray-100 text-gray-500 px-2 py-1 rounded">
                      Severity
                    </p>
                    <p
                      className={`text-base font-medium mt-1 px-2 py-1 rounded ${
                        vuln.severity.toLowerCase() === 'critical'
                          ? 'bg-red-100 text-red-600'
                          : vuln.severity.toLowerCase() === 'high'
                          ? 'bg-orange-100 text-orange-600'
                          : vuln.severity.toLowerCase() === 'medium'
                          ? 'bg-[#faf3db] text-yellow-500'
                          : vuln.severity.toLowerCase() === 'unknown'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {vuln.severity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Score
                    </p>
                    <p className="text-base text-gray-800 font-medium mt-1 px-2 py-1 rounded">
                      {vuln.score !== undefined && vuln.score !== null ? (
                        vuln.score
                      ) : (
                        <span className="text-gray-600">N/A</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase bg-gray-100 text-gray-500 px-2 py-1 rounded">
                      Attack Vector
                    </p>
                    <p className="text-base text-gray-800 font-medium mt-1 px-2 py-1 rounded">
                      {vuln.vector || <span className="text-gray-600">N/A</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase bg-gray-100 text-gray-500 px-2 py-1 rounded">
                      Method
                    </p>
                    <p className="text-base text-gray-800 font-medium mt-1 px-2 py-1 rounded">
                      {vuln.method || <span className="text-gray-600">N/A</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-base text-gray-800">No vulnerabilities found.</p>
      )}
    </div>
  );
};

export default InfoVuln;
