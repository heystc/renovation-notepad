import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = true,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm",
        padding && "p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
