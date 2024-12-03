import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProjects from '../hooks/useProjects';

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const { groupedProjects, sortedProjectNames, loading, error } = useProjects();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const handleProjectToggle = (projectName: string) => {
    const newExpandedProjects = new Set(expandedProjects);
    if (newExpandedProjects.has(projectName)) {
      newExpandedProjects.delete(projectName);
    } else {
      newExpandedProjects.add(projectName);
    }
    setExpandedProjects(newExpandedProjects);
  };

  const handleViewClick = (projectId: string) => {
    navigate(`/${projectId}`); // 리포팅 페이지로 리다이렉트
  };

  if (loading) {
    return <div className="p-4 text-center">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  const hasProjects = sortedProjectNames.length > 0;

  const formatTime = (time: string) => {
    // '-'를 ':'로 교체하여 반환
    return time.replace(/-/g, ':');
  };
  

  return (
    <div className="p-1 max-w-7xl mx-auto">
      {/* mainpage.jpg 이미지 표시 */}
      <div className="mb-20 mt-10 flex justify-start">
        <img
          src="/Mainpage.jpg"
          alt="Main Page"
          className="w-full max-w-4xl h-auto object-contain ml-40"
        />
      </div>

      {/* 프로젝트 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-[#DCEAF7]">
                <th className="py-2 px-4 font-medium text-gray-700">No.</th>
                <th className="py-2 px-4 font-medium text-gray-700">프로젝트 명</th>
                <th className="py-2 px-4 font-medium text-gray-700">생성 일자</th>
                <th className="py-2 px-4 font-medium text-gray-700">생성 시간</th>
                <th className="py-2 px-4 font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody>
              {hasProjects ? (
                sortedProjectNames.map((projectName, index) => {
                  const projectGroup = groupedProjects[projectName];
                  return (
                    <React.Fragment key={projectName}>
                      {/* 상위 프로젝트 행 */}
                      <tr className={`border-b bg-white`}>
                        <td className="py-2 px-4">
                          <span className="text-gray-700 font-medium">{`${index + 1}.`}</span>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center">
                            <button
                              className="mr-2 focus:outline-none"
                              onClick={() => handleProjectToggle(projectName)}
                              aria-label={expandedProjects.has(projectName) ? 'Collapse' : 'Expand'}
                            >
                              {expandedProjects.has(projectName) ? (
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 14l-5-5h10z" />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M10 17l5-5-5-5v10z" />
                                </svg>
                              )}
                            </button>
                            <span className="text-lg font-semibold text-blue-600">
                              {projectName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4"></td>
                        <td className="py-2 px-4"></td>
                        <td className="py-2 px-4"></td>
                      </tr>

                      {/* 하위 프로젝트 행 */}
                      {expandedProjects.has(projectName) &&
                        projectGroup.map((project, subIndex) => (
                          <tr
                            key={project.id}
                            className={`border-b bg-white`}
                          >
                            <td className="py-2 px-4">
                              <span className="text-gray-700 font-medium">{`${index + 1}.${
                                subIndex + 1
                              }.`}</span>
                            </td>
                            <td className="py-2 px-4 pl-4">
                              <span
                                className="text-base text-gray-800 cursor-pointer hover:underline"
                                onClick={() => handleViewClick(project.id)}
                              >
                                {project.name}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <div className="text-gray-700">{project.date}</div>
                            </td>
                            <td className="py-2 px-4">
                              <div className="text-gray-700">
                                {formatTime(project.time)}
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  className="text-gray-500 hover:text-blue-600"
                                  onClick={() => handleViewClick(project.id)}
                                  aria-label="View Project"
                                >
                                  {/* 보기 아이콘 */}
                                  <svg
                                    className="w-5 h-5"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M12 5c-7.633 0-12 7-12 7s4.367 7 12 7 12-7 12-7-4.367-7-12-7zm0 12c-4.97 0-8.941-4.043-10-5 1.059-.957 5.03-5 10-5 4.971 0 8.941 4.043 10 5-1.059.957-5.03 5-10 5z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 px-4 text-center text-gray-500">
                    표시할 프로젝트가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
