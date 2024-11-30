// src/components/Charts/DashboardDependencyTree.tsx

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Split from 'react-split';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import coseBilkent from 'cytoscape-cose-bilkent';
import { FaSearch } from 'react-icons/fa';
import debounce from 'lodash.debounce';
import { useNavigate, useParams } from 'react-router-dom'; // 추가된 부분

// Cytoscape 플러그인 사용 설정
cytoscape.use(fcose);
cytoscape.use(coseBilkent);

// 타입 정의
interface VulnerabilityReference {
  url: string;
}

interface Vulnerability {
  id: string;
  description: string;
  references: VulnerabilityReference[];
  affects: { ref: string }[];
}

interface Dependency {
  ref: string;
  dependsOn?: string[];
}

interface ComponentData {
  unique_id: number;
  purl: string;
}

interface SBOMData {
  dependencies: Dependency[];
  vulnerabilities: Vulnerability[];
}

interface DependencyTree {
  id: string;
  label: string;
  version?: string;
  children?: DependencyTree[];
}

interface DependencyTreeViewProps {
  tree: DependencyTree;
  packageToIdMap: Map<string, number>; // 수정된 부분
}

interface NodeData {
  id: string;
  label: string;
  version?: string;
  vulnerabilities: Vulnerability[];
  importance: number;
}

interface SelectedNodeData {
  id: string;
  label: string;
  version?: string;
  vulnerabilities: Vulnerability[];
  dependencyTree: DependencyTree | null;
}

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

// DependencyTreeView 컴포넌트
const DependencyTreeView: React.FC<DependencyTreeViewProps> = ({ tree, packageToIdMap }) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const { projectName } = useParams();
  const navigate = useNavigate(); // 추가된 부분

  // unique_id 가져오기
  const uniqueId = packageToIdMap.get(tree.id); // 수정된 부분

  return (
    <div style={{ marginLeft: '10px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {tree.children && (
          <span style={{ marginRight: '5px' }}>
            {isOpen ? '▼' : '▶'}
          </span>
        )}
        {uniqueId ? (
          <span
            style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => navigate(`/${projectName}/components/${uniqueId}`)}
          >
            {tree.label}
            {tree.version && `@${tree.version}`}
          </span>
        ) : (
          <span>
            {tree.label}
            {tree.version && `@${tree.version}`}
          </span>
        )}
      </div>
      {isOpen && tree.children && (
        <div style={{ marginLeft: '15px' }}>
          {tree.children.map((child) => (
            <DependencyTreeView key={child.id} tree={child} packageToIdMap={packageToIdMap} /> // 수정된 부분
          ))}
        </div>
      )}
    </div>
  );
};

// Modal 컴포넌트
const Modal: React.FC<ModalProps> = ({ children, onClose }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}
  >
    <div
      style={{
        position: 'relative',
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80%',
        overflowY: 'auto',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '20px',
          background: 'none',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
        }}
      >
        &times;
      </button>
      {children}
    </div>
  </div>
);

const DashboardDependencyTree: React.FC = () => {
  const [elements, setElements] = useState<ElementDefinition[]>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<SelectedNodeData | null>(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showVulnerableOnly, setShowVulnerableOnly] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [nodeSpacing, setNodeSpacing] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const cyRef = useRef<Core | null>(null);
  const { projectName } = useParams();


  // 추가된 부분: sbom-detail.json 데이터를 저장할 상태
  const [componentData, setComponentData] = useState<ComponentData[]>([]);

  // 패키지 이름과 버전을 unique_id에 매핑
  const packageToIdMap = useMemo(() => {
    const map = new Map<string, number>();
    if (componentData) {
      componentData.forEach((component) => {
        const key = component.purl; // purl을 키로 사용
        map.set(key, component.unique_id);
      });
    }
    return map;
  }, [componentData]);

  // 데이터 포맷팅 함수 (이 부분을 loadSBOMData보다 위로 이동)
  const formatData = useCallback((dependencies: Dependency[], vulnerabilities: Vulnerability[]): ElementDefinition[] => {
    const nodes: ElementDefinition[] = [];
    const edges: ElementDefinition[] = [];

    const refToVulnerabilities: Map<string, Vulnerability[]> = new Map();
    vulnerabilities.forEach((vul) => {
      vul.affects.forEach((affect) => {
        const ref = affect.ref;
        if (!refToVulnerabilities.has(ref)) {
          refToVulnerabilities.set(ref, []);
        }
        refToVulnerabilities.get(ref)?.push(vul);
      });
    });

    dependencies.forEach((dep) => {
      const id = dep.ref;
      const refWithoutPrefix = dep.ref.replace('pkg:npm/', '');
      const atSymbolIndex = refWithoutPrefix.lastIndexOf('@');
      let packageName: string;
      let version: string;

      if (atSymbolIndex > 0) {
        packageName = refWithoutPrefix.substring(0, atSymbolIndex);
        version = refWithoutPrefix.substring(atSymbolIndex + 1);
      } else {
        packageName = refWithoutPrefix;
        version = '';
      }

      const vulns = refToVulnerabilities.get(dep.ref) || [];
      const isVulnerable = vulns.length > 0;

      const nodeData: NodeData = {
        id,
        label: packageName,
        version,
        vulnerabilities: vulns,
        importance: vulns.length + 1,
      };

      nodes.push({
        data: nodeData,
        classes: isVulnerable ? 'vulnerable' : '',
      });
    });

    dependencies.forEach((dep) => {
      dep.dependsOn?.forEach((childRef) => {
        const targetExists = dependencies.some(d => d.ref === childRef);
        if (targetExists) {
          edges.push({ data: { source: dep.ref, target: childRef } });
        } else {
          console.warn(`타겟 노드가 존재하지 않습니다: ${childRef}. 엣지를 추가하지 않습니다.`);
        }
      });
    });

    return [...nodes, ...edges];
  }, []);

  // sbom-cyclonedx.json 및 sbom-detail.json 로드 함수
  const loadSBOMData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cyclonedxResponse, detailResponse] = await Promise.all([
        fetch(`/${projectName}/sbom-cyclonedx.json`),
        fetch(`/${projectName}/sbom-detail.json`),
      ]);

      if (!cyclonedxResponse.ok || !detailResponse.ok) {
        throw new Error('SBOM 데이터를 로드하는 중 오류가 발생했습니다.');
      }

      const [cyclonedxData, detailData] = await Promise.all([
        cyclonedxResponse.json(),
        detailResponse.json(),
      ]);

      if (!cyclonedxData.dependencies || !cyclonedxData.vulnerabilities) {
        throw new Error('필수 데이터가 누락되었습니다.');
      }

      const formattedElements = formatData(cyclonedxData.dependencies, cyclonedxData.vulnerabilities);
      setElements(formattedElements);
      setComponentData(detailData.components); // 추가된 부분
    } catch (error) {
      console.error('SBOM 데이터 로딩 오류:', error);
      alert(`SBOM 데이터를 로딩하는 중 오류가 발생했습니다: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [formatData]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadSBOMData();
  }, [loadSBOMData]);

  // 레이아웃 옵션 계산 함수
  const calculateLayoutOptions = useCallback(
    (numNodes: number) => ({
      name: 'cose-bilkent',
      animate: false, // 애니메이션 비활성화
      padding: 10,
      nodeRepulsion: 8000 + numNodes * nodeSpacing,
      idealEdgeLength: 50 + numNodes * (nodeSpacing / 100),
      edgeElasticity: 0.1,
      nestingFactor: 0.1,
      gravity: 1.2,
      numIter: 1000,
      nodeDimensionsIncludeLabels: true,
    }),
    [nodeSpacing]
  );

  // 종속성 트리 구축 함수
  const buildDependencyTree = useCallback(
    (currentNode: cytoscape.NodeSingular, visitedNodes: Set<string> = new Set()): DependencyTree | null => {
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
      setSelectedNodeData({
        id: node.id(),
        label: node.data('label'),
        version: node.data('version'),
        vulnerabilities: node.data('vulnerabilities'),
        dependencyTree: buildDependencyTree(node),
      });

      if (cyRef.current) {
        cyRef.current.batch(() => { // 배치 처리로 성능 최적화
          cyRef.current.nodes().removeClass('highlightedNode');
          cyRef.current.edges().removeClass('highlightedEdge');
          node.addClass('highlightedNode');

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

          connectedNodes.addClass('highlightedNode');
          connectedEdges.addClass('highlightedEdge');
        });
      }
    },
    [buildDependencyTree]
  );

  // 검색 핸들러 최적화 (디바운스 적용)
  const handleSearch = useMemo(() => debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, 300), []);

  useEffect(() => {
    return () => {
      handleSearch.cancel(); // 컴포넌트 언마운트 시 디바운스 취소
    };
  }, [handleSearch]);

  // 필터 적용
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.batch(() => { // batch로 성능 최적화
        cyRef.current.nodes().show();
        cyRef.current.edges().show();

        if (searchTerm) {
          cyRef.current.nodes().forEach((node) => {
            if (!node.data('label').toLowerCase().includes(searchTerm.toLowerCase())) {
              node.hide();
            }
          });
        }

        if (showVulnerableOnly) {
          cyRef.current.nodes().forEach((node) => {
            if (!node.hasClass('vulnerable')) {
              node.hide();
            }
          });
        }

        cyRef.current.edges().forEach((edge) => {
          if (edge.source().hidden() || edge.target().hidden()) {
            edge.hide();
          } else {
            edge.show();
          }
        });

        const visibleNodesCount = cyRef.current.nodes(':visible').length;
        const layoutOptions = calculateLayoutOptions(visibleNodesCount);

        cyRef.current.layout(layoutOptions).run();
      });
    }
  }, [searchTerm, showVulnerableOnly, elements, nodeSpacing, calculateLayoutOptions]);

  // 취약점 클릭 핸들러
  const handleCveClick = useCallback((vul: Vulnerability) => {
    setSelectedVulnerability(vul);
  }, []);

  // 취약한 노드 깜빡임 효과
  useEffect(() => {
    if (cyRef.current) {
      const vulnerableNodes = cyRef.current.nodes('.vulnerable');
      let isHighlighted = false;
      const intervalId = setInterval(() => {
        isHighlighted = !isHighlighted;
        if (isHighlighted) {
          vulnerableNodes.addClass('blinking');
        } else {
          vulnerableNodes.removeClass('blinking');
        }
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [elements]);

  // 레이아웃 옵션 메모이제이션
  const layoutOptions = useMemo(() => calculateLayoutOptions(elements.length), [elements.length, nodeSpacing]);

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.layout(layoutOptions).run();
    }
  }, [layoutOptions]);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div
        style={{
          padding: '10px 20px',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1>SBOM 종속성 시각화</h1>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FaSearch style={{ marginRight: '5px' }} />
          <input
            type="text"
            placeholder="패키지 검색..."
            onChange={handleSearch}
            aria-label="패키지 검색"
            style={{ marginRight: '10px', padding: '5px' }}
          />
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={showVulnerableOnly}
              onChange={(e) => setShowVulnerableOnly(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            취약한 패키지만 보기
          </label>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <div
        style={{
          padding: '10px 20px',
          backgroundColor: '#eaeaea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <label style={{ marginRight: '20px' }}>
          글씨 크기:
          <input
            type="range"
            min="10"
            max="30"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{ marginLeft: '10px' }}
          />
        </label>
        <label>
          노드 간 거리:
          <input
            type="range"
            min="50"
            max="200"
            value={nodeSpacing}
            onChange={(e) => setNodeSpacing(Number(e.target.value))}
            style={{ marginLeft: '10px' }}
          />
        </label>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ flex: 1, display: 'flex' }}>
        <Split
          sizes={[30, 70]} // 사이드바 30%, 콘텐츠 70%
          minSize={200} // 최소 크기
          gutterSize={10} // 가드(분할선) 크기
          direction="horizontal" // 수평 분할
          cursor="col-resize" // 커서 스타일
          style={{ display: 'flex', width: '100%', height: '100%' }}
        >
          {/* 사이드바 */}
          <div style={{ padding: '10px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
            {selectedNodeData ? (
              <div>
                <h2>패키지 상세 정보</h2>
                <p>
                  <strong>이름:</strong> {selectedNodeData.label}
                </p>
                {selectedNodeData.version && (
                  <p>
                    <strong>버전:</strong> {selectedNodeData.version}
                  </p>
                )}
                {selectedNodeData.vulnerabilities && selectedNodeData.vulnerabilities.length > 0 && (
                  <div>
                    <h3>취약점 목록</h3>
                    <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {selectedNodeData.vulnerabilities.map((vul) => (
                        <li key={vul.id}>
                          <button
                            onClick={() => handleCveClick(vul)}
                            style={{
                              background: '#e74c3c',
                              color: '#fff',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {vul.id}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <h3>종속성 트리</h3>
                {selectedNodeData.dependencyTree ? (
                  <DependencyTreeView tree={selectedNodeData.dependencyTree} packageToIdMap={packageToIdMap} />
                ) : (
                  <p>종속된 라이브러리가 없습니다.</p>
                )}
              </div>
            ) : (
              <p>노드를 클릭하여 상세 정보를 확인하세요.</p>
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
              ) : (
                elements.length > 0 ? (
                  <CytoscapeComponent
                    elements={elements}
                    style={{ width: '100%', height: '100%' }}
                    cy={(cy) => {
                      cyRef.current = cy;
                      cy.on('tap', 'node', (evt) => handleNodeClick(evt.target));
                    }}
                    stylesheet={[
                      {
                        selector: 'node',
                        style: {
                          'background-color': '#1ABC9C',
                          label: 'data(label)',
                          color: '#000000',
                          'text-valign': 'center',
                          'text-halign': 'center',
                          shape: 'roundrectangle',
                          padding: '10px',
                          'border-width': 1,
                          'border-color': '#16A085',
                          'font-size': `${fontSize}px`,
                          'text-wrap': 'wrap',
                          'text-max-width': '150px',
                          'text-opacity': 1,
                          width: '150px',
                          height: '40px',
                        },
                      },
                      {
                        selector: 'edge',
                        style: {
                          width: 1,
                          'line-color': '#BDC3C7',
                          'target-arrow-color': '#BDC3C7',
                          'target-arrow-shape': 'triangle',
                          'curve-style': 'bezier',
                        },
                      },
                      {
                        selector: '.vulnerable',
                        style: {
                          'background-color': '#E74C3C',
                          'border-width': 2,
                          'border-color': '#C0392B',
                          'font-size': `${fontSize + 2}px`,
                        },
                      },
                      {
                        selector: '.highlightedNode',
                        style: {
                          'background-color': '#F1C40F',
                          'border-width': 2,
                          'border-color': '#F39C12',
                        },
                      },
                      {
                        selector: '.highlightedEdge',
                        style: {
                          'line-color': '#F39C12',
                          'target-arrow-color': '#F39C12',
                          'width': 2,
                        },
                      },
                      {
                        selector: '.blinking',
                        style: {
                          'background-color': '#FF0000',
                          'border-color': '#FF0000',
                          'border-width': 4,
                        },
                      },
                    ]}
                  />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <p>SBOM 데이터를 로드하지 못했습니다.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </Split>
      </div>

      {/* 모달 컴포넌트 */}
      {selectedVulnerability && (
        <Modal onClose={() => setSelectedVulnerability(null)}>
          <h2>{selectedVulnerability.id}</h2>
          <p>
            <strong>설명:</strong> {selectedVulnerability.description}
          </p>
          {selectedVulnerability.references && (
            <div>
              <h3>참고 자료</h3>
              <ul>
                {selectedVulnerability.references.map((ref, index) => (
                  <li key={index}>
                    <a href={ref.url} target="_blank" rel="noopener noreferrer">
                      {ref.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default DashboardDependencyTree;
