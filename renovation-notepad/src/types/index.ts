export interface CategoryConfig {
  id: string;
  label: string;
  color: string;
}

export interface TagConfig {
  id: string;
  label: string;
  icon: string;
}

// 向后兼容
export type RoomConfig = TagConfig;

export interface TagGroup {
  id: string;
  name: string;
  icon?: string;
  enableFilter: boolean;
  tags: TagConfig[];
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
  appName: string;
  logo: string | null;
  categories: CategoryConfig[];
  rooms?: RoomConfig[]; // 向后兼容
  tags?: TagConfig[]; // 向后兼容
  tagGroups: TagGroup[];
  statuses: StatusConfig[];
}

export interface Note {
  id: string;
  category: string;
  title: string;
  content: string;
  isPinned?: boolean;
  date: string;
  room?: string; // 向后兼容
  rooms?: string[]; // 向后兼容
  tag?: string; // 新命名，兼容room
  tags?: string[]; // 新命名，兼容rooms
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
