// src/pages/PackageDetail.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  FaStar,
  FaRegStar,
  FaSpinner,
  FaBox,
  FaShieldAlt,
  FaCodeBranch,
  FaHashtag,
} from 'react-icons/fa';
import Tooltip from '@mui/material/Tooltip';
import InfoPackage from '../../src/components/Info/InfoPackage';
import InfoVuln from '../../src/components/Info/InfoVuln';
import References from '../../src/components/Info/References';

interface License {
  license_name: string;
  license_url?: string;
}

interface Vulnerability {
  cve_id: string;
  severity: string;
  score: number;
  method: string;
  vector: string;
  cve_link: string;
}

interface PackageCheck {
  Score: number;
  'Risk Level': string;
  'Typosquatting Suspected': string;
  'Warning Reasons': { [key: string]: number };
}

interface Reachable {
  'Sink-Function': string;
  'Reachable-Package': string;
  'Reachable-Library': string;
  File: string;
  Line: string;
}

interface PackageDetailProps {
  unique_id: number;
  group?: string;
  name: string;
  version: string;
  licenses: License[];
  hashes: string;
  external_references: string[];
  type: string;
  ecosystem: string;
  bom_ref: string;
  vulnerabilities: Vulnerability[];
  dependencies: string;
  package_check?: PackageCheck[];
}

const PackageDetail: React.FC = () => {
  const { id, projectName } = useParams<{ id: string; projectName: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [packageData, setPackageData] = useState<PackageDetailProps | null>(null);
  const [reachableData, setReachableData] = useState<Reachable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tab = queryParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/${projectName}/sbom-detail.json`);
        if (!response.ok) {
          throw new Error(`데이터 로딩 실패: ${response.statusText}`);
        }
        const data = await response.json();
        const component = data.components.find(
          (comp: { unique_id: number }) => comp.unique_id === Number(id)
        );
        if (component) {
          setPackageData(component);
        } else {
          setError('패키지를 찾을 수 없습니다.');
        }

        const reachableResponse = await fetch(`/${projectName}/reachable.json`);
        if (!reachableResponse.ok) {
          console.warn('reachable.json 파일을 불러오는 데 실패했습니다.');
        } else {
          const reachableJson = await reachableResponse.json();
          setReachableData(reachableJson);
        }
      } catch (err: any) {
        setError(err.message || '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, projectName]);

  useEffect(() => {
    const favoritePackages: string[] = JSON.parse(localStorage.getItem('favoritePackages') || '[]');
    if (favoritePackages.includes(id || '')) {
      setIsFavorite(true);
    }
  }, [id]);

  const handleFavoriteClick = () => {
    const favoritePackages: string[] = JSON.parse(localStorage.getItem('favoritePackages') || '[]');
    let updatedFavorites: string[];

    if (isFavorite) {
      updatedFavorites = favoritePackages.filter((packageId: string) => packageId !== id);
    } else {
      updatedFavorites = [...favoritePackages, id || ''];
    }

    localStorage.setItem('favoritePackages', JSON.stringify(updatedFavorites));
    setIsFavorite(!isFavorite);
  };

  const setActiveTabAndUpdateURL = (tab: string) => {
    setActiveTab(tab);
    navigate(`?tab=${tab}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <FaSpinner className="animate-spin text-4xl text-indigo-500" />
      </div>
    );
  }

  if (error || !packageData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <p className="text-red-500 text-lg">{error || '데이터를 불러올 수 없습니다.'}</p>
      </div>
    );
  }

  const title = packageData.group ? `${packageData.group}/${packageData.name}` : packageData.name;

  const externalReferencesArray = Array.isArray(packageData.external_references)
    ? packageData.external_references
    : packageData.external_references
        ? packageData.external_references.split(',').map((ref: string) => ref.trim()).filter(Boolean)
        : [];

  const vulnerabilityLinks = packageData.vulnerabilities
    ? packageData.vulnerabilities.map((vuln) => vuln.cve_link).filter(Boolean)
    : [];

  const allReferences = Array.from(new Set([...externalReferencesArray, ...vulnerabilityLinks]));

  return (
    <div className="p-8 bg-white min-h-screen font-sans text-gray-900 w-full">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-indigo-800 flex items-center">
            <FaBox className="text-indigo-600 mr-2" />
            {title}
          </h2>
          <button
            onClick={handleFavoriteClick}
            className="text-yellow-500 text-2xl focus:outline-none transition transform hover:scale-110"
            aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            {isFavorite ? <FaStar /> : <FaRegStar />}
          </button>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <span className="flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
            <FaShieldAlt className="mr-1" />
            {packageData.type}
          </span>
          <span className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <FaCodeBranch className="mr-1" />
            {packageData.ecosystem}
          </span>
          <span className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            <FaHashtag className="mr-1" />
            {packageData.version}
          </span>
        </div>
      </div>

      <nav className="flex space-x-4 border-b border-gray-300 mb-1" role="tablist">
        {[
          { name: 'Basic Information', key: 'info' },
          { name: 'Vulnerabilities', key: 'vulnerabilities' },
          { name: 'References', key: 'references' },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTabAndUpdateURL(tab.key)}
            className={`px-4 py-2 font-medium transition-colors duration-200 flex items-center ${
              activeTab === tab.key
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </nav>

      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {activeTab === 'info' && packageData && (
          <InfoPackage
            package_check={packageData.package_check}
            ecosystem={packageData.ecosystem}
            licenses={packageData.licenses}
            hashes={packageData.hashes}
            dependencies={packageData.dependencies}
            bom_ref={packageData.bom_ref}
          />
        )}

        {activeTab === 'vulnerabilities' && packageData && (
          <InfoVuln
            vulnerabilities={packageData.vulnerabilities}
            fullName={packageData.name}
            packageCheck={packageData.package_check}
            reachableData={reachableData}
          />
        )}

        {activeTab === 'references' && <References references={allReferences} />}
      </div>
    </div>
  );
};

export default PackageDetail;
