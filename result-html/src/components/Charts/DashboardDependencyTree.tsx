// src/components/Charts/DashboardDependencyTree.tsx

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Split from 'react-split';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import {
  FaSearch,
  FaChevronDown,
  FaChevronRight,
  FaBoxOpen,
  FaExclamationTriangle,
  FaProjectDiagram,
} from 'react-icons/fa';
import debounce from 'lodash.debounce';
import { useNavigate, useParams } from 'react-router-dom';
// cose-bilkent 레이아웃 플러그인 사용
import coseBilkent from 'cytoscape-cose-bilkent';
cytoscape.use(coseBilkent);

// 타입 정의
interface Vulnerability {
  cve_id: string;
  severity: string;
  score: string;
  method: string;
  vector: string;
  cve_link: string;
}

interface Dependency {
  ref: string;
  unique_id: number | null;
  color: string; // 'Red', 'Orange', 'Gray'
  cve: Vulnerability[];
  dependsOn: string[];
}

interface DependencyJSON {
  dependencies: Dependency[];
}

interface DependencyTree {
  id: string;
  label: string;
  version?: string;
  children?: DependencyTree[];
}

interface DependencyTreeViewProps {
  tree: DependencyTree;
  packageToIdMap: Map<string, number | null>;
  searchTerm: string;
  depth: number; // 뎁스 표시를 위한 prop
}

interface SelectedNodeData {
  id: string;
  label: string;
  version?: string;
  vulnerabilities: Vulnerability[];
  dependencyTree: DependencyTree | null;
  unique_id: number | null; // unique_id 추가
}

// 패키지 이름 추출 함수 (필요없어도 유지)
const extract_name_from_ref = (ref: string): string => {
  const decoded_ref = decodeURIComponent(ref);
  const pattern = /^pkg:[^/]+\/(?:@([^/]+)\/)?([^@]+)@.+$/;
  const match = decoded_ref.match(pattern);
  if (match) {
    const namespace = match[1];
    const name = match[2];
    return namespace ? `@${namespace}/${name}` : name;
  } else {
    console.warn(`경고: ref 형식이 올바르지 않습니다 - ${ref}`);
    // Fallback: extract after last '/' and before '@'
    try {
      const name_part = ref.split('/').pop()?.split('@')[0];
      return name_part || ref;
    } catch (e) {
      console.error(`에러: ref에서 name 추출 실패 - ${ref}\n${e}`);
      return ref;
    }
  }
};

// Utility 함수: purl 파싱
const parsePurl = (purl: string) => {
  const decoded_purl = decodeURIComponent(purl);
  const pattern = /^pkg:[^/]+\/(?:@([^/]+)\/)?([^@]+)@([^?]+)(?:\?.+)?(?:#.+)?$/;
  const match = decoded_purl.match(pattern);
  if (!match) {
    console.warn(`경고: purl 형식이 올바르지 않습니다 - ${purl}`);
    return {
      namespace: null,
      name: purl.split('/').pop()?.split('@')[0],
      version: purl.split('@').pop(),
    };
  }
  const namespace = match[1] || null;
  const name = match[2];
  const version = match[3];
  return { namespace, name, version };
};

// 스타일 정의 (인라인 스타일 객체)
const inlineStyles = {
  sidebar: {
    padding: '10px', // 패딩을 줄임
    overflowY: 'auto' as const,
    backgroundColor: '#ecf0f1',
    fontSize: '0.9rem', // 사이드바 전체의 기본 글씨 크기 설정
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '10px', // 패딩을 줄임
    borderRadius: '6px',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '10px', // 마진을 줄임
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px', // 마진을 줄임
  },
  cardHeaderIcon: {
    marginRight: '8px', // 마진을 줄임
    color: '#3498db',
    fontSize: '1rem', // 아이콘 크기 줄임
  },
  cardTitle: {
    fontSize: '1rem', // 글씨 크기 줄임 (기존 1.2rem에서 1rem으로)
    fontWeight: 600,
    color: '#2c3e50',
  },
  packageDetail: {
    marginBottom: '8px', // 마진을 줄임
  },
  packageDetailStrong: {
    color: '#34495e',
    fontSize: '0.95rem', // 글씨 크기 줄임
  },
  vulnerabilityList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  vulnerabilityItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 0', // 패딩을 줄임
    borderBottom: '1px solid #bdc3c7',
  },
  vulnerabilityItemLast: {
    borderBottom: 'none',
  },
  vulnerabilityIcon: {
    marginRight: '8px', // 마진을 줄임
    color: '#e74c3c',
    fontSize: '0.9rem', // 아이콘 크기 줄임
  },
  vulnerabilityButton: {
    background: 'none',
    border: 'none',
    color: '#2980b9',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '0.85rem', // 글씨 크기 줄임
    padding: 0,
  },
  vulnerabilityButtonHover: {
    color: '#1abc9c',
  },
  dependencyTreeHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px', // 마진을 줄임
  },
  dependencyTreeHeaderIcon: {
    marginRight: '8px', // 마진을 줄임
    color: '#27ae60',
    fontSize: '1rem', // 아이콘 크기 줄임
  },
  dependencyTreePlaceholder: {
    color: '#7f8c8d',
    fontStyle: 'italic' as const,
    fontSize: '0.85rem', // 글씨 크기 줄임
  },
  controlLabel: {
    display: 'flex',
    alignItems: 'center',
    marginRight: '15px', // 마진을 줄임
    color: '#ecf0f1',
    fontWeight: 500,
    fontSize: '0.9rem', // 글씨 크기 줄임
  },
  controlSlider: {
    marginLeft: '8px', // 마진을 줄임
    cursor: 'pointer',
  },
  treeNode: (depth: number) => ({
    marginLeft: `${depth * 15}px`, // 인덴트 마진을 줄임
    display: 'flex',
    alignItems: 'flex-start',
    cursor: 'pointer',
    userSelect: 'none',
  }),
  treePrefix: {
    marginRight: '4px', // 마진을 줄임
    color: '#7f8c8d',
  },
};

// 재사용 가능한 Card 컴포넌트
const Card: React.FC<{ title: string; icon: JSX.Element }> = ({ title, icon, children }) => (
  <div style={inlineStyles.card}>
    <div style={inlineStyles.cardHeader}>
      <span style={inlineStyles.cardHeaderIcon}>{icon}</span>
      <h3 style={inlineStyles.cardTitle}>{title}</h3>
    </div>
    {children}
  </div>
);

// Vulnerability List Item 컴포넌트
const VulnerabilityItem: React.FC<{ vul: Vulnerability; onClick: () => void }> = ({ vul, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <li
      style={{
        ...inlineStyles.vulnerabilityItem,
        // 마지막 아이템 여부 확인 (필요 시 적용)
        ...(vul.cve_id === '마지막 CVE ID' ? inlineStyles.vulnerabilityItemLast : {}),
      }}
    >
      <FaExclamationTriangle style={inlineStyles.vulnerabilityIcon} />
      <button
        onClick={onClick}
        style={{
          ...inlineStyles.vulnerabilityButton,
          color: isHovered ? inlineStyles.vulnerabilityButtonHover.color : inlineStyles.vulnerabilityButton.color,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={`CVE ${vul.cve_id}`}
      >
        {vul.cve_id}
      </button>
    </li>
  );
};

// DependencyTreeView 컴포넌트
const DependencyTreeView: React.FC<DependencyTreeViewProps> = ({ tree, packageToIdMap, searchTerm, depth }) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const navigate = useNavigate();
  const { projectName } = useParams<{ projectName: string }>();

  // unique_id 가져오기
  const uniqueId = packageToIdMap.get(tree.id);

  // 검색어가 노드 라벨에 포함되는지 확인
  const isMatch = tree.label.toLowerCase().includes(searchTerm.toLowerCase());

  const handleNavigate = () => {
    if (uniqueId !== undefined && uniqueId !== null) {
      navigate(`/${projectName}/components/${uniqueId}`);
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <div style={inlineStyles.treeNode(depth)}>
        {tree.children && tree.children.length > 0 ? (
          <span
            style={inlineStyles.treePrefix}
            onClick={toggleOpen}
            aria-expanded={isOpen}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') toggleOpen();
            }}
          >
            {isOpen ? <FaChevronDown /> : <FaChevronRight />}
          </span>
        ) : (
          <span style={inlineStyles.treePrefix}>&bull;</span>
        )}
        <span
          style={{
            color: isMatch ? '#3498db' : '#2980b9',
            textDecoration: isMatch ? 'underline' : 'none',
            fontWeight: isMatch ? 'bold' : 'normal',
            fontSize: '0.8rem', // 글씨 크기 줄임
          }}
          onClick={handleNavigate}
          aria-label={`Package ${tree.label}`}
        >
          {tree.label}
        </span>
      </div>
      {isOpen && tree.children && tree.children.length > 0 && (
        <div>
          {tree.children.map((child) => (
            <DependencyTreeView
              key={child.id}
              tree={child}
              packageToIdMap={packageToIdMap}
              searchTerm={searchTerm}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// DashboardDependencyTree 컴포넌트
const DashboardDependencyTree: React.FC = () => {
  const [elements, setElements] = useState<ElementDefinition[]>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<SelectedNodeData | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(14);
  const [nodeSpacing, setNodeSpacing] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const cyRef = useRef<Core | null>(null);
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();

  // dependency.json 데이터를 저장할 상태
  const [dependencyData, setDependencyData] = useState<Dependency[]>([]);

  // 패키지 purl과 unique_id 매핑
  const packageToIdMap = useMemo(() => {
    const map = new Map<string, number | null>();
    if (dependencyData) {
      dependencyData.forEach((dep) => {
        map.set(dep.ref, dep.unique_id);
      });
    }
    return map;
  }, [dependencyData]);

  // 데이터 포맷팅 함수 (중복 제거 및 전체 purl 사용)
  const formatData = useCallback((dependencies: Dependency[]): ElementDefinition[] => {
    const nodesMap = new Map<string, Dependency>();
    const edges: ElementDefinition[] = [];

    dependencies.forEach((dep) => {
      nodesMap.set(dep.ref, dep); // 중복된 ref는 덮어쓰기
    });

    const nodes: ElementDefinition[] = [];

    nodesMap.forEach((dep, ref) => {
      // 클래스 할당
      let nodeClass = '';
      if (dep.color === 'Red') {
        nodeClass = 'reachable';
      } else if (dep.color === 'Orange') {
        nodeClass = 'cve';
      } else {
        nodeClass = ''; // Gray는 기본 스타일을 사용
      }

      // 패키지 이름 추출 (전체 purl 사용)
      const purl = ref; // 전체 purl 사용
      // const name = extract_name_from_ref(ref); // 기존 코드 주석 처리

      // 노드 데이터 생성
      nodes.push({
        data: {
          id: ref,
          label: purl, // 전체 purl을 라벨로 설정
          version: parsePurl(ref).version,
          vulnerabilities: dep.cve,
          dependencyTree: null, // 추후 업데이트
        },
        classes: nodeClass,
      });

      // 엣지 데이터 생성
      dep.dependsOn.forEach((child_ref) => {
        if (!nodesMap.has(child_ref)) {
          console.warn(`타겟 노드가 존재하지 않습니다: ${child_ref}. 엣지를 추가하지 않습니다.`);
          return;
        }
        edges.push({
          data: {
            source: ref,
            target: child_ref,
          },
        });
      });
    });

    return [...nodes, ...edges];
  }, []);

  // dependency.json 로드 함수
  const loadDependencyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/${projectName}/dependency.json`); // dependency.json 파일 로드
      if (!response.ok) {
        throw new Error('dependency.json 파일을 로드하는 중 오류가 발생했습니다.');
      }

      const data: DependencyJSON = await response.json();
      console.log('Loaded dependency.json:', data); // 데이터 확인

      // 데이터 유효성 검증 및 기본 값 할당
      const validatedData = data.dependencies.map((dep) => ({
        ...dep,
        color: dep.color || 'Gray', // 기본 색상 할당
        cve: dep.cve || [],
        dependsOn: dep.dependsOn || [],
      }));

      setDependencyData(validatedData);

      const formattedElements = formatData(validatedData);
      console.log('Formatted Elements:', formattedElements); // 포맷팅된 요소 확인
      setElements(formattedElements);
    } catch (error) {
      console.error('dependency.json 로딩 오류:', error);
      alert(`dependency.json 파일을 로드하는 중 오류가 발생했습니다: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [formatData, projectName]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        await loadDependencyData();
      } catch (error) {
        console.error('데이터 초기화 오류:', error);
        alert(`데이터 초기화 중 오류가 발생했습니다: ${(error as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [loadDependencyData]);

  // 레이아웃 옵션 계산 함수
  const calculateLayoutOptions = useCallback(
    (numNodes: number) => ({
      name: 'cose-bilkent',
      animate: false, // 애니메이션 비활성화
      padding: 10,
      nodeRepulsion: 8000 + numNodes * nodeSpacing, // 노드 반발력 증가
      idealEdgeLength: 100 + numNodes * (nodeSpacing / 100), // 엣지 길이 증가
      edgeElasticity: 0.1,
      nestingFactor: 0.1,
      gravity: 1.2,
      numIter: 1000,
      nodeDimensionsIncludeLabels: true,
      fit: true, // 레이아웃 완료 후 그래프를 컨테이너에 맞춤
    }),
    [nodeSpacing]
  );

  // 종속성 트리 구축 함수
  const buildDependencyTree = useCallback(
    (
      currentNode: cytoscape.NodeSingular,
      visitedNodes: Set<string> = new Set()
    ): DependencyTree | null => {
      if (visitedNodes.has(currentNode.id())) {
        return null;
      }
      visitedNodes.add(currentNode.id());

      const outgoingEdges = currentNode.connectedEdges(`edge[source = "${currentNode.id()}"]`);
      const children: DependencyTree[] = [];

      outgoingEdges.forEach((edge) => {
        const targetNode = edge.target();
        const childTree = buildDependencyTree(targetNode, visitedNodes);
        if (childTree) {
          children.push(childTree);
        }
      });

      return {
        id: currentNode.id(),
        label: currentNode.data('label'),
        version: currentNode.data('version'),
        children: children.length > 0 ? children : undefined,
      };
    },
    []
  );

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (node: cytoscape.NodeSingular) => {
      const uniqueId = packageToIdMap.get(node.id()) || null; // unique_id 가져오기
      console.log(`Node clicked: ${node.id()}, unique_id: ${uniqueId}`); // 디버깅 로그 추가

      setSelectedNodeData({
        id: node.id(),
        label: node.data('label'),
        version: node.data('version'),
        vulnerabilities: node.data('vulnerabilities'),
        dependencyTree: buildDependencyTree(node),
        unique_id: uniqueId, // unique_id 저장
      });

      if (cyRef.current) {
        cyRef.current.batch(() => {
          // 모든 노드의 'highlighted' 클래스 제거
          cyRef.current.nodes().removeClass('highlighted');
          cyRef.current.edges().removeClass('highlightedEdge');

          // 선택된 노드에 'highlighted' 클래스 추가
          node.addClass('highlighted');

          const connectedNodes = cyRef.current.collection();
          const connectedEdges = cyRef.current.collection();

          const traverseUpstream = (currentNode: cytoscape.NodeSingular) => {
            const incomingEdges = currentNode.connectedEdges(`edge[target = "${currentNode.id()}"]`);
            incomingEdges.forEach((edge) => {
              connectedEdges.merge(edge);
              const sourceNode = edge.source();
              if (!connectedNodes.contains(sourceNode)) {
                connectedNodes.merge(sourceNode);
                traverseUpstream(sourceNode);
              }
            });
          };

          const traverseDownstream = (currentNode: cytoscape.NodeSingular) => {
            const outgoingEdges = currentNode.connectedEdges(`edge[source = "${currentNode.id()}"]`);
            outgoingEdges.forEach((edge) => {
              connectedEdges.merge(edge);
              const targetNode = edge.target();
              if (!connectedNodes.contains(targetNode)) {
                connectedNodes.merge(targetNode);
                traverseDownstream(targetNode);
              }
            });
          };

          traverseUpstream(node);
          traverseDownstream(node);

          // 연결된 노드와 엣지에 'highlighted' 클래스 추가
          connectedNodes.addClass('highlighted');
          connectedEdges.addClass('highlightedEdge');
        });
      }
    },
    [buildDependencyTree, packageToIdMap]
  );

  // 검색 핸들러 최적화 (디바운스 적용)
  const handleSearch = useMemo(
    () =>
      debounce((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
      }, 300),
    []
  );

  useEffect(() => {
    return () => {
      handleSearch.cancel(); // 컴포넌트 언마운트 시 디바운스 취소
    };
  }, [handleSearch]);

  // 필터 적용: 모든 Dependency 표시, 검색어에 맞는 노드만 표시
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.batch(() => {
        // 모든 노드와 엣지를 표시
        cyRef.current.nodes().show();
        cyRef.current.edges().show();

        // 검색어 필터링
        if (searchTerm) {
          cyRef.current.nodes().forEach((node) => {
            if (!node.data('label').toLowerCase().includes(searchTerm.toLowerCase())) {
              node.hide();
            }
          });
        }

        // 연결된 엣지만 표시
        cyRef.current.edges().forEach((edge) => {
          if (edge.source().hidden() || edge.target().hidden()) {
            edge.hide();
          } else {
            edge.show();
          }
        });

        const visibleNodesCount = cyRef.current.nodes(':visible').length;
        const layoutOptions = calculateLayoutOptions(visibleNodesCount);

        try {
          cyRef.current.layout(layoutOptions).run();
          cyRef.current.fit(); // 그래프를 화면에 맞춤
        } catch (layoutError) {
          console.error('레이아웃 실행 오류:', layoutError);
        }
      });
    }
  }, [searchTerm, calculateLayoutOptions]);

  // 취약점 클릭 핸들러 (리다이렉션)
  const handleCveClick = useCallback(
    (vul: Vulnerability) => {
      if (selectedNodeData && selectedNodeData.unique_id !== null) {
        console.log(
          `Navigating to /${projectName}/components/${selectedNodeData.unique_id}?tab=vulnerabilities#${vul.cve_id}`
        ); // 디버깅 로그 추가
        navigate(`/${projectName}/components/${selectedNodeData.unique_id}?tab=vulnerabilities#${vul.cve_id}`);
      } else {
        alert('해당 노드의 고유 ID를 찾을 수 없습니다.');
      }
    },
    [navigate, projectName, selectedNodeData]
  );

  // 레이아웃 옵션 메모이제이션
  const layoutOptions = useMemo(() => calculateLayoutOptions(elements.length), [elements.length, nodeSpacing]);

  // 노드 검색 결과 목록
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return elements
      .filter((el) => el.data && el.data.id && el.data.id.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((el) => el.data.id);
  }, [searchTerm, elements]);

  // 검색 결과에서 노드 선택 핸들러
  const handleSelectSearchResult = (nodeId: string) => {
    const node = cyRef.current?.getElementById(nodeId);
    if (node && node.isNode()) {
      node.select();
      cyRef.current?.animate({
        fit: {
          eles: node,
          padding: 50,
        },
        duration: 1000,
      });
      handleNodeClick(node);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
      {/* 헤더 */}
      <div
        style={{
          padding: '10px 20px',
          backgroundColor: '#2c3e50',
          color: '#ecf0f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        {/* 검색 바 및 노드 간 거리 컨트롤 */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: '600px', marginRight: '20px' }}>
          {/* 검색 바 */}
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, marginRight: '20px' }}>
            <FaSearch style={{ marginRight: '10px' }} />
            <input
              type="text"
              placeholder="패키지 검색..."
              onChange={handleSearch}
              aria-label="패키지 검색"
              style={{
                flex: 1,
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #bdc3c7',
                outline: 'none',
                fontSize: '1rem',
              }}
            />
          </div>
          {/* 노드 간 거리 컨트롤 */}
          <label style={inlineStyles.controlLabel}>
            노드 간 거리:
            <input
              type="range"
              min="20"
              max="150"
              value={nodeSpacing}
              onChange={(e) => setNodeSpacing(Number(e.target.value))}
              style={inlineStyles.controlSlider}
            />
          </label>
          {/* 검색 결과 드롭다운 */}
          {searchTerm && searchResults.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: '45px',
                left: '0',
                right: '0',
                backgroundColor: '#fff',
                color : '#888885',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                listStyle: 'none',
                padding: '5px 0',
                margin: 0,
                zIndex: 100,
              }}
            >
              {searchResults.slice(0, 200).map((nodeId) => (
                <li
                  key={nodeId}
                  onClick={() => handleSelectSearchResult(nodeId)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ecf0f1')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                >
                  {nodeId}
                </li>
              ))}
              
            </ul>
          )}
        </div>
      </div>



      {/* 메인 컨텐츠 */}
      <div style={{ flex: 1, display: 'flex' }}>
        <Split
          sizes={[20, 80]} // 사이드바를 15%로 조정
          minSize={200}
          gutterSize={10}
          direction="horizontal"
          cursor="col-resize"
          style={{ display: 'flex', width: '100%', height: '100%' }}
        >
          {/* 사이드바 */}
          <div style={inlineStyles.sidebar}>
            {selectedNodeData ? (
              <div>

                {/* 패키지 상세 정보 카드 */}
                <Card title="패키지 상세 정보" icon={<FaBoxOpen />}>
                  <div style={inlineStyles.packageDetail}>
                    <p>
                      <strong style={inlineStyles.packageDetailStrong}>이름:</strong> {selectedNodeData.label}
                    </p>
                  </div>
                </Card>

                {/* 취약점 목록 카드 */}
                {selectedNodeData.vulnerabilities.length > 0 && (
                  <Card title="취약점 목록" icon={<FaExclamationTriangle />}>
                    <ul style={inlineStyles.vulnerabilityList}>
                      {selectedNodeData.vulnerabilities.map((vul) => (
                        <VulnerabilityItem key={vul.cve_id} vul={vul} onClick={() => handleCveClick(vul)} />
                      ))}
                    </ul>
                  </Card>
                )}

                {/* 종속성 트리 카드 */}
                <Card title="종속성 트리" icon={<FaProjectDiagram />}>
                  {selectedNodeData.dependencyTree ? (
                    <DependencyTreeView
                      tree={selectedNodeData.dependencyTree}
                      packageToIdMap={packageToIdMap}
                      searchTerm={searchTerm}
                      depth={0} // 초기 뎁스 설정
                    />
                  ) : (
                    <p style={inlineStyles.dependencyTreePlaceholder}>종속성 트리가 없습니다.</p>
                  )}
                </Card>
              </div>
            ) : (
              <div style={inlineStyles.card}>
                <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>노드를 클릭하여 상세 정보를 확인하세요.</p>
              </div>
            )}
          </div>

          {/* 콘텐츠 영역 */}
          <div style={{ padding: '10px', overflow: 'hidden', backgroundColor: '#fff' }}>
            {/* Cytoscape 그래프 */}
            <div style={{ width: '100%', height: '100%' }}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <p>데이터를 로드 중입니다...</p>
                </div>
              ) : elements.length > 0 ? (
                <CytoscapeComponent
                  elements={elements}
                  style={{ width: '100%', height: '100%' }}
                  layout={layoutOptions}
                  cy={(cy) => {
                    cyRef.current = cy;
                    cy.on('tap', 'node', (evt) => handleNodeClick(evt.target));
                  }}
                  stylesheet={[
                    {
                      selector: 'node',
                      style: {
                        'background-color': '#a6a69f', // 기본 색상 변경 (선택 가능)
                        label: 'data(label)', // 전체 purl 표시
                        color: '#ffffff',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        shape: 'roundrectangle',
                        padding: '10px',
                        'border-width': 2,
                        'border-color': '#91918c',
                        'font-size': `${fontSize}px`, // 동적으로 글씨 크기 설정
                        'text-wrap': 'wrap',
                        'text-max-width': '300px',
                        'text-opacity': 1,
                        width: '200px',
                        height: '60px',
                      },
                    },
                    {
                      selector: '.reachable',
                      style: {
                        'background-color': '#e74c3c', // 빨간색
                        'border-width': 2,
                        'border-color': '#c0392b',
                        'font-size': `${fontSize + 2}px`,
                      },
                    },
                    {
                      selector: '.cve',
                      style: {
                        'background-color': '#f39c12', // 주황색
                        'border-width': 2,
                        'border-color': '#e67e22',
                        'font-size': `${fontSize + 2}px`,
                      },
                    },
                    {
                      selector: '.highlighted',
                      style: {
                        'background-color': '#f2ce02', // 노란색
                        'border-width': 3,
                        'border-color': '#f1c40f',
                      },
                    },
                    {
                      selector: 'edge',
                      style: {
                        'line-color': '#bdc3c7',
                        'target-arrow-color': '#bdc3c7',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        width: 2,
                      },
                    },
                    {
                      selector: '.highlightedEdge',
                      style: {
                        'line-color': '#f1c40f',
                        'target-arrow-color': '#f1c40f',
                        width: 3,
                      },
                    },
                  ]}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <p>SBOM 데이터를 로드하지 못했습니다.</p>
                </div>
              )}
            </div>
          </div>
        </Split>
      </div>
    </div>
  );
};

// DependencyTreeView 컴포넌트 외부에 선언된 컴포넌트는 중복 선언을 피하기 위해 아래로 이동
export default DashboardDependencyTree;
