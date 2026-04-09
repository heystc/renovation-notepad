import React from 'react';
import type { StatusConfig } from '../../types';
import { getStatusIcon } from '../../utils/icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProgressBadgeProps {
  status: string;
  statuses: StatusConfig[];
}

export const ProgressBadge: React.FC<ProgressBadgeProps> = ({ status, statuses }) => {
  const config = statuses.find(s => s.id === status) || statuses[0];
  return (
    <span className={cn("flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium", config.color)}>
      {getStatusIcon(config.icon)}
      {config.label}
    </span>
  );
};

export default ProgressBadge;
