// src/components/Breadcrumb.tsx

import React from 'react';
import { Link, useParams } from 'react-router-dom';

interface BreadcrumbProps {
  pageName: string;
}

interface RouteParams {
  projectName: string;
}

const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  const { projectName } = useParams<RouteParams>();

  // projectName이 없을 경우 기본 루트('/')로 설정하거나 다른 처리를 할 수 있습니다.
  const dashboardPath = projectName ? `/${projectName}` : '/';

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-title-md2 font-semibold text-black dark:text-white">
        {pageName}
      </h2>

      <nav>
        <ol className="flex items-center gap-2">
          <li>
            <Link className="font-medium" to={dashboardPath}>
              Dashboard /
            </Link>
          </li>
          <li className="font-medium text-primary">{pageName}</li>
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;
