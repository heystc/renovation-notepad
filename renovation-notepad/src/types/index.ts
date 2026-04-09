export interface CategoryConfig {
  id: string;
  label: string;
  color: string;
}

export interface RoomConfig {
  id: string;
  label: string;
  icon: string;
}

export interface StatusConfig {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface Settings {
  version: string;
  lastModified: string;
  categories: CategoryConfig[];
  rooms: RoomConfig[];
  statuses: StatusConfig[];
}

export interface Note {
  id: string;
  category: string;
  title: string;
  content: string;
  isPinned?: boolean;
  date: string;
  room?: string;
  rooms?: string[];
  progress?: string;
  budget?: number;
  actualCost?: number;
  creator?: string;
  createdAt?: string;
  updater?: string;
  updatedAt?: string;
}

export interface User {
  username: string;
  isAdmin: boolean;
}

export interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  room?: string;
  budgeted: number;
  actual: number;
  status: 'planned' | 'paid';
  date: string;
}

export type ViewMode = 'notes' | 'budget';
