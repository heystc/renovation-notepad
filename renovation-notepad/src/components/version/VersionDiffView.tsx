import React from 'react';

interface VersionDiffViewProps {
  diff: string;
}

export const VersionDiffView: React.FC<VersionDiffViewProps> = ({ diff }) => {
  // 简单解析git diff，高亮新增和删除
  const renderLine = (line: string, index: number) => {
    if (line.startsWith('+')) {
      return (
        <div key={index} className="bg-green-50 text-green-800 pl-2">
          {line}
        </div>
      );
    }
    if (line.startsWith('-')) {
      return (
        <div key={index} className="bg-red-50 text-red-800 pl-2">
          {line}
        </div>
      );
    }
    if (line.startsWith('@')) {
      return (
        <div key={index} className="bg-gray-100 text-gray-500 pl-2 font-mono text-sm">
          {line}
        </div>
      );
    }
    return (
      <div key={index} className="pl-2">
        {line}
      </div>
    );
  };

  const lines = diff.split('\n');

  return (
    <div className="mt-4 border rounded-lg overflow-x-auto">
      <pre className="text-xs p-2 overflow-x-auto font-mono">
        {lines.map(renderLine)}
      </pre>
    </div>
  );
};

export default VersionDiffView;
