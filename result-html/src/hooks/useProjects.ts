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
        const parsedProjects: Project[] = data.directories.map((dir) => {
          const parts = dir.split('_');
          if (parts.length < 3) { // 최소 3개 부분: date, time, projectName
            console.warn(`Invalid directory format: ${dir}`);
            return null;
          }
          const date = parts[0];
          const timeFull = parts[1];
          const projectName = parts.slice(2).join('_'); // 프로젝트명이 언더스코어를 포함할 수 있음

          const createdAt = `${date} ${timeFull}`; // 'YYYY-MM-DD HH:MM:SS'

          return {
            id: dir,
            name: projectName,
            createdAt,
            date,      // 추가
            time: timeFull, // 추가
            status: 'Active', // 상태는 필요에 따라 설정
          };
        }).filter((proj): proj is Project => proj !== null);

        setProjects(parsedProjects);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching directories:', err);
        setError('프로젝트 데이터를 불러오는 데 실패했습니다.');
        setLoading(false);
      }
    };

    fetchDirectories();
  }, []);

  // 프로젝트 데이터를 이름별로 그룹화
  const groupedProjects = projects.reduce(
    (result: { [key: string]: Project[] }, project) => {
      if (!result[project.name]) {
        result[project.name] = [];
      }
      result[project.name].push(project);
      return result;
    },
    {}
  );

  // 프로젝트 이름 배열 (생성일자 기준으로 정렬, 최신이 위로)
  const sortedProjectNames = Object.keys(groupedProjects).sort((a, b) => {
    const latestA = new Date(groupedProjects[a][0].createdAt).getTime();
    const latestB = new Date(groupedProjects[b][0].createdAt).getTime();
    return latestB - latestA;
  });

  return { projects, groupedProjects, sortedProjectNames, loading, error };
};

export default useProjects;
