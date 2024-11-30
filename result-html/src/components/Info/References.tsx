// src/components/References.tsx

import React from 'react';
import { FaLink } from 'react-icons/fa';

interface ReferencesProps {
  references: string[];
}

const References: React.FC<ReferencesProps> = ({ references }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-10">
      <h3 className="text-2xl font-semibold mb-4 text-indigo-700 flex items-center">
        <FaLink className="text-indigo-700 mr-2" />
        References
      </h3>
      <ul className="list-disc pl-5 space-y-2 text-gray-700">
        {references.map((ref, index) => (
          <li key={index} className="flex items-center">
            <FaLink className="text-blue-600 mr-2" />
            <a href={ref} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-words">
              {ref}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default References;
