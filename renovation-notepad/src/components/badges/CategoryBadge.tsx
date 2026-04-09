import React from 'react';
import type { CategoryConfig } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CategoryBadgeProps {
  category: string;
  categories: CategoryConfig[];
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, categories }) => {
  const config = categories.find(c => c.id === category) || categories[0];
  return (
    <span className={cn("flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.color)}>
      {config.label}
    </span>
  );
};

export default CategoryBadge;
