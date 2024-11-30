// src/components/InfoPackage.tsx

import React, { useEffect, useState } from 'react';
import { FaShieldAlt, FaLink, FaHashtag, FaCodeBranch } from 'react-icons/fa';
import { useParams } from 'react-router-dom';

interface PackageCheck {
  full_name: string;
  Score: number;
  "Risk Level": string;
  "Typosquatting Suspected": string;
  "Warning Reasons": { [key: string]: string } | null;
}

interface ComponentData {
  package_check?: PackageCheck[];
  ecosystem?: string;
  licenses?: string;
  license_urls?: string;
  hashes?: string;
  dependencies?: string;
  external_references?: string | string[];
  full_name?: string;
  unique_id?: number;
}

interface RiskIndicator {
  color: string;
  icon: JSX.Element;
}

// Risk Level에 따른 색상과 아이콘 반환 함수
const getRiskIndicator = (riskLevel: string): RiskIndicator => {
  switch (riskLevel.toLowerCase()) {
    case 'critical':
    case 'high':
    case 'red':
      return {
        color: 'border-red-500',
        icon: <FaShieldAlt className="text-red-500 mr-2 text-xl" />,
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

// Risk Level을 텍스트로 변환하는 함수
const getRiskText = (riskLevel: string): string => {
  switch (riskLevel.toLowerCase()) {
    case 'red':
      return 'caution';
    case 'yellow':
      return 'warning';
    case 'green':
      return 'safe';
    default:
      return 'unknown';
  }
};

const getTyposquattingText = (suspected: string): string => {
  return suspected === 'O' ? 'Yes, typosquatting is suspected.' : 'No typosquatting suspected.';
};

const InfoPackage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [componentData, setComponentData] = useState<ComponentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { projectName } = useParams();


  useEffect(() => {
    if (!id) {
      setError("No unique_id provided in the URL.");
      setLoading(false);
      return;
    }

    fetch(`/${projectName}/sbom-detail.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const targetComponent = data.components.find(
          (component: ComponentData) => String(component.unique_id) === id
        );

        if (targetComponent) {
          setComponentData(targetComponent);
        } else {
          setError(`Component with unique_id "${id}" not found.`);
        }
        setLoading(false);
      })
      .catch((error) => {
        setError(`Error fetching JSON: ${error.message}`);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="text-center text-gray-700">로딩 중...</div>;
  }

  if (error || !componentData) {
    return <div className="text-center text-red-500">{error || '알 수 없는 오류가 발생했습니다.'}</div>;
  }

  const {
    package_check,
    ecosystem,
    licenses,
    license_urls,
    hashes,
    dependencies,
    external_references,
  } = componentData;

  const formattedHash = hashes && hashes.trim() !== '' ? hashes : 'No Hash Provided';

  const formattedDependencies =
    dependencies && dependencies.trim() !== '' && dependencies.toLowerCase() !== 'none'
      ? dependencies.split(',').map((dep) => dep.trim())
      : [];

  let referenceLinks: string[] = [];
  if (external_references) {
    if (Array.isArray(external_references)) {
      referenceLinks = external_references.map((ref) => ref.trim()).filter((ref) => ref !== '');
    } else if (typeof external_references === 'string') {
      referenceLinks = external_references
        .split(/[,;\n]+/)
        .map((ref) => ref.trim())
        .filter((ref) => ref !== '');
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Security Check Results Section */}
      {package_check && package_check.length > 0 && (
        <div
          className={`p-6 rounded-lg shadow-sm border ${getRiskIndicator(package_check[0]["Risk Level"]).color} bg-white`}
        >
          <div className="flex items-center mb-7">
            {getRiskIndicator(package_check[0]["Risk Level"]).icon}
            <h2 className="text-2xl font-bold text-gray-800">
              Malicious Component check:{" "}
              <span className={`font-semibold ${package_check[0]["Risk Level"].toLowerCase() === 'red'
                ? 'text-red-600'
                : package_check[0]["Risk Level"].toLowerCase() === 'yellow'
                ? 'text-yellow-600'
                : 'text-green-600'}`}>
                {getRiskText(package_check[0]["Risk Level"])} ({package_check[0].Score})
              </span>
            </h2>
          </div>
          {package_check.map((check, index) => (
            <div key={index}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
                {/* Typosquatting Suspected */}
                <div>
                  <p className="text-sm text-gray-600">Typosquatting Suspected </p>
                  <p className="text-xl text-gray-800 font-semibold">
                    &nbsp;{check["Typosquatting Suspected"]}
                  </p>
                </div>
                <div></div>
                <div></div>
              </div>
              {/* Warning Reasons */}
              <div>
                <p className="text-sm text-gray-600">Warning Reasons</p>
                {check["Warning Reasons"] && Object.keys(check["Warning Reasons"]).length > 0 ? (
                  <ul className="list-disc pl-5 mt-2 text-lg text-gray-800">
                    {Object.entries(check["Warning Reasons"]).map(([reason, points], idx) => (
                      <li key={idx}>
                        {reason}: <span className="font-medium">{points}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xl text-gray-800 font-medium font-semibold"> &nbsp; No Warning Reasons</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Package Information Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ecosystem */}
          <div className="flex items-start">
            <FaShieldAlt className="text-gray-700 mr-3 text-lg mt-1" />
            <div>
              <p className="text-sm text-gray-600">Ecosystem</p>
              <p className="text-base text-gray-800 font-medium">{ecosystem || 'No Ecosystem Information'}</p>
            </div>
          </div>

          {/* License */}
          <div className="flex items-start">
            <FaLink className="text-gray-700 mr-3 text-lg mt-1" />
            <div>
              <p className="text-sm text-gray-600">License</p>
              {licenses && license_urls ? (
                <a
                  href={license_urls}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-blue-600 font-medium hover:underline"
                >
                  {licenses}
                </a>
              ) : (
                <p className="text-base text-gray-800 font-medium">No License Information</p>
              )}
            </div>
          </div>

          {/* Hashes */}
          <div className="flex items-start">
            <FaHashtag className="text-gray-700 mr-3 text-lg mt-1" />
            <div>
              <p className="text-sm text-gray-600">Hashes</p>
              <p className="text-base text-gray-800 font-medium break-all">{formattedHash}</p>
            </div>
          </div>

          {/* External References */}
          <div className="flex items-start">
            <FaLink className="text-gray-700 mr-3 text-lg mt-1" />
            <div>
              <p className="text-sm text-gray-600">External References</p>
              <div className="space-y-1">
                {referenceLinks.length > 0 ? (
                  referenceLinks.map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-blue-600 font-medium hover:underline"
                    >
                      {ref}<br></br>
                    </a>
                  ))
                ) : (
                  <p className="text-base text-gray-800 font-medium">No External References</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dependencies Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-start">
          <FaCodeBranch className="text-gray-700 mr-3 text-lg mt-1" />
          <div>
            <p className="text-sm text-gray-600">Dependencies</p>
            {formattedDependencies.length > 0 ? (
              <ul className="list-disc pl-5 mt-2 text-base text-gray-800 grid grid-cols-2 gap-2">
                {formattedDependencies.map((dep, idx) => (
                  <li key={idx}>{dep}</li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-gray-800 font-medium mt-2">No Dependencies</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPackage;
