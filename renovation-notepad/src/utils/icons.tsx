import React from 'react';
import * as Icons from 'lucide-react';
import {
  AlertCircle, Clock, CheckCircle2
} from 'lucide-react';

// 动态获取图标组件 - 支持所有 lucide-react 图标
export const getRoomIcon = (iconName: string): React.ReactNode => {
  // 将 kebab-case 转为 PascalCase
  const pascalName = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const IconComp = (Icons as any)[pascalName];
  if (IconComp) {
    return <IconComp className="w-4 h-4" />;
  }
  // 降级到 Home 如果找不到
  return <Icons.Home className="w-4 h-4" />;
};

export const getStatusIcon = (iconName: string): React.ReactNode => {
  switch (iconName) {
    case 'alert': return <AlertCircle className="w-4 h-4" />;
    case 'clock': return <Clock className="w-4 h-4" />;
    case 'check': return <CheckCircle2 className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};
