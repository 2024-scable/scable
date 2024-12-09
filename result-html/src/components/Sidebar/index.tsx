// src/components/Sidebar/Sidebar.tsx

import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import Logo from '../../images/logo/logo.png';
import useProjects, { Project } from '../../hooks/useProjects';
import { FaCog } from 'react-icons/fa';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);

  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true'
  );

  const { groupedProjects, sortedProjectNames, loading, error } = useProjects();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target as Node) ||
        trigger.current.contains(target as Node)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!sidebarOpen || key !== 'Escape') return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

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
    setSidebarOpen(false); 
    navigate(`/${projectId}`);
  };

  if (loading) {
    return (
      <aside
        ref={sidebar}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-[#f4f4f4] transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static`}
        style={{ width: '15rem' }}
      >
        <div className="flex items-center justify-between px-6 py-5.5 lg:py-6.5">
          <NavLink to="/">
            <img src={Logo} alt="Logo" />
          </NavLink>

          <button
            ref={trigger}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
            className="block lg:hidden"
          >
            <svg
              className="fill-current"
              width="20"
              height="18"
              viewBox="0 0 20 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 8.175H2.987L9.362 1.688C9.7 1.35 9.7 0.825 9.362 0.488C9.025 0.15 8.5 0.15 8.162 0.488L0.4 8.363C0.0625 8.7 0.0625 9.225 0.4 9.563L8.162 17.438C8.312 17.588 8.537 17.7 8.762 17.7C8.988 17.7 9.175 17.625 9.362 17.475C9.7 17.138 9.7 16.613 9.362 16.275L3.025 9.863H19C19.45 9.863 19.825 9.488 19.825 9.038C19.825 8.55 19.45 8.175 19 8.175Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-700">로딩 중...</span>
        </div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside
        ref={sidebar}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-[#f4f4f4] transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static`}
        style={{ width: '15rem' }}
      >
        <div className="flex items-center justify-between px-6 py-5.5 lg:py-6.5">
          <NavLink to="/">
            <img src={Logo} alt="Logo" />
          </NavLink>

          <button
            ref={trigger}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
            className="block lg:hidden"
          >
            <svg
              className="fill-current"
              width="20"
              height="18"
              viewBox="0 0 20 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 8.175H2.987L9.362 1.688C9.7 1.35 9.7 0.825 9.362 0.488C9.025 0.15 8.5 0.15 8.162 0.488L0.4 8.363C0.0625 8.7 0.0625 9.225 0.4 9.563L8.162 17.438C8.312 17.588 8.537 17.7 8.762 17.7C8.988 17.7 9.175 17.625 9.362 17.475C9.7 17.138 9.7 16.613 9.362 16.275L3.025 9.863H19C19.45 9.863 19.825 9.488 19.825 9.038C19.825 8.55 19.45 8.175 19 8.175Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <span className="text-red-500">{error}</span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={sidebar}
      className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-[#f4f4f4] transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static`}
      style={{ width: '15rem' }}
    >
      <div className="flex items-center justify-between px-6 py-5.5 lg:py-6.5">
        <NavLink to="/">
          <img src={Logo} alt="Logo" />
        </NavLink>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <svg
            className="fill-current"
            width="20"
            height="18"
            viewBox="0 0 20 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 8.175H2.987L9.362 1.688C9.7 1.35 9.7 0.825 9.362 0.488C9.025 0.15 8.5 0.15 8.162 0.488L0.4 8.363C0.0625 8.7 0.0625 9.225 0.4 9.563L8.162 17.438C8.312 17.588 8.537 17.7 8.762 17.7C8.988 17.7 9.175 17.625 9.362 17.475C9.7 17.138 9.7 16.613 9.362 16.275L3.025 9.863H19C19.45 9.863 19.825 9.488 19.825 9.038C19.825 8.55 19.45 8.175 19 8.175Z"
              fill="currentColor"
            />
          </svg>
        </button>
        
      </div>
      

      <div className="flex flex-col overflow-y-auto px-4 lg:px-6">
        <nav className="mt-5 lg:mt-5">
          {sortedProjectNames.map((projectName, index) => {
            const projectGroup = groupedProjects[projectName];
            return (
              <div key={projectName} className="mb-4">
                <h3 className="mb-2 ml-4 flex items-center text-lg font-semibold text-gray-800">
                  <svg
                    className="mr-2 h-4 w-4 fill-current text-gray-600"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 13h2v-2H3v2zm0-4h2V7H3v2zm0 8h2v-2H3v2zm4 0h14v-2H7v2zm0-4h14v-2H7v2zm0-6v2h14V7H7z" />
                  </svg>
                  {projectName}
                </h3>

                <ul className="mb-6 flex flex-col gap-1.5">
                  {projectGroup.map((project) => (
                    <SidebarLinkGroup key={project.id}>
                      {(handleClick, open) => (
                        <>
                          <button
                            className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 ${
                              open ? 'bg-gray-100' : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleClick();
                            }}
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            <span className="text-sm text-gray-500">{project.createdAt}</span> 
                            <svg
                              className={`ml-auto h-4 w-4 transform transition-transform duration-200 ${
                                open ? 'rotate-180' : ''
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          <div className={`${!open && 'hidden'}`}>
                            <ul className="mt-1 flex flex-col gap-1.5 pl-6">
                              <li>
                                <NavLink
                                  to={`/${project.id}`}
                                  end
                                  className={({ isActive }) =>
                                    'flex items-center gap-2.5 rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800 ' +
                                    (isActive ? 'text-gray-800 font-semibold' : '')
                                  }
                                  onClick={() => handleViewClick(project.id)}
                                >
                                  Dashboard
                                </NavLink>
                              </li>
                              <li>
                                <NavLink
                                  to={`/${project.id}/vuln`}
                                  className={({ isActive }) =>
                                    'flex items-center gap-2.5 rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800 ' +
                                    (isActive ? 'text-gray-800 font-semibold' : '')
                                  }
                                  onClick={() => handleViewClick(project.id)}
                                >
                                  Vulnerability
                                </NavLink>
                              </li>
                              <li>
                                <NavLink
                                  to={`/${project.id}/components`}
                                  className={({ isActive }) =>
                                    'flex items-center gap-2.5 rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800 ' +
                                    (isActive ? 'text-gray-800 font-semibold' : '')
                                  }
                                  onClick={() => handleViewClick(project.id)}
                                >
                                  Components
                                </NavLink>
                              </li>
                              <li>
                                <NavLink
                                  to={`/${project.id}/license`}
                                  className={({ isActive }) =>
                                    'flex items-center gap-2.5 rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800 ' +
                                    (isActive ? 'text-gray-800 font-semibold' : '')
                                  }
                                  onClick={() => handleViewClick(project.id)}
                                >
                                  License
                                </NavLink>
                              </li>
                              <li>
                                <NavLink
                                  to={`/${project.id}/DependencyTree`}
                                  className={({ isActive }) =>
                                    'flex items-center gap-2.5 rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800 ' +
                                    (isActive ? 'text-gray-800 font-semibold' : '')
                                  }
                                  onClick={() => handleViewClick(project.id)}
                                >
                                  DependencyTree
                                </NavLink>
                              </li>
                              
                            </ul>
                          </div>
                        </>
                      )}
                    </SidebarLinkGroup>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-gray-200 p-4">
          <a
            href="http://127.0.0.1:8282/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-md px-4 py-2 text-base font-bold text-gray-600 hover:text-gray-800"
            aria-label="Settings 페이지로 이동"
          >
            <FaCog className="h-5 w-5 text-gray-600" />
            Settings
          </a>
        </div>
    </aside>
  );
};

export default Sidebar;
