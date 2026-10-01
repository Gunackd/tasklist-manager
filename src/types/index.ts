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
  totalTasks: number;
  completedTasks: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
}

export interface Task {
  _id: string;
  taskListId: string;
  userId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type FilterStatus = 'all' | 'active' | 'completed';
export type SortOption = 'order' | 'alphabetical' | 'newest' | 'oldest';
