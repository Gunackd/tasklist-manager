export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface TaskList {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  color?: string;
  order?: number;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
  lastCompletedTask?: {
    _id: string;
    title: string;
    completedAt?: string | null;
  } | null;
}

export type TaskCategory = 'S' | 'NS' | 'M' | 'A';
export const ALL_CATEGORIES: TaskCategory[] = ['S', 'NS', 'M', 'A'];

export interface Task {
  _id: string;
  taskListId: string;
  userId: string;
  title: string;
  tags?: string[];
  categories: TaskCategory[];
  category?: TaskCategory;
  completed: boolean;
  inProgress?: boolean;
  order: number;
  completedAt?: string | null;
  taskListTitle?: string;
  taskListColor?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_SUGGESTED_TAGS = ['Work', 'Personal', 'Urgent', 'Health', 'Finance', 'Study'];

export type FilterStatus = 'all' | 'active' | 'completed';
export type SortOption = 'order' | 'alphabetical' | 'newest' | 'oldest';
