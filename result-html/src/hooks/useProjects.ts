// src/hooks/useProjects.ts

import { useState, useEffect } from 'react';

export interface Project {
  id: string;
  name: string;
  createdAt: string; // 'YYYY-MM-DD HH:MM:SS' 형식
  date: string;      // 'YYYY-MM-DD'
  time: string;      // 'HH:MM:SS'
  status: 'Active' | 'Inactive' | 'Archived' | 'Pending';
}

interface DirectoryData {
  directories: string[];
}

const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDirectories = async () => {
      try {
        const response = await fetch('/public_directories.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: DirectoryData = await response.json();

        if (!data.directories || data.directories.length === 0) {
          console.warn('No directories found.');
          setProjects([]); // 빈 배열로 설정
          setLoading(false);
          return;
        }

        const parsedProjects: Project[] = data.directories.map((dir) => {
          const parts = dir.split('_');
          if (parts.length < 3) {
            console.warn(`Invalid directory format: ${dir}`);
            return null;
          }
          const date = parts[0];
          const timeFull = parts[1].replace(/-/g, ':'); // 시간 포맷 정리
          const projectName = parts.slice(2).join('_');

          return {
            id: dir,
            name: projectName,
            createdAt: `${date} ${timeFull}`,
            date,
            time: timeFull,
            status: 'Active',
          };
        }).filter((proj): proj is Project => proj !== null);

        setProjects(parsedProjects);
      } catch (err) {
        console.error('Error fetching directories:', err);
        setError(null); // 에러 메시지 비활성화
      } finally {
        setLoading(false);
      }
    };

    fetchDirectories();
  }, []);

  const groupedProjects = projects.reduce((result, project) => {
    if (!result[project.name]) {
      result[project.name] = [];
    }
    result[project.name].push(project);
    return result;
  }, {} as { [key: string]: Project[] });

  const sortedProjectNames = Object.keys(groupedProjects).sort((a, b) => {
    const latestA = new Date(groupedProjects[a][0].createdAt).getTime();
    const latestB = new Date(groupedProjects[b][0].createdAt).getTime();
    return latestB - latestA;
  });

  return { projects, groupedProjects, sortedProjectNames, loading, error };
};

export default useProjects;


