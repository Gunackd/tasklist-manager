import { User, TaskList, Task } from '../types/index.js';

const TOKEN_KEY = 'taskmanager_jwt_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
      // Clear token if unauthorized
      setStoredToken(null);
    }
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  async register(data: { name: string; email: string; password: string }) {
    return request<{ token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }) {
    return request<{ token: string; user: User; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async demoLogin() {
    return request<{ token: string; user: User; message: string }>('/api/auth/demo', {
      method: 'POST',
    });
  },

  async googleAuth(data: { email: string; name?: string; avatarUrl?: string }) {
    return request<{ token: string; user: User; message: string }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async forgotPassword(email: string) {
    return request<{ message: string; resetToken?: string; demoLink?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(data: { token: string; newPassword: string }) {
    return request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe() {
    return request<{ user: User }>('/api/auth/me');
  },

  async updateProfile(data: { name?: string; avatarUrl?: string }) {
    return request<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getHealth() {
    return request<{ status: string; database: { isMongo: boolean; type: string; totalUsers: number; totalLists: number; totalTasks: number } }>('/api/health');
  },

  // Task Lists
  async getLists() {
    return request<TaskList[]>('/api/lists');
  },

  async createList(data: { title: string; description?: string; color?: string }) {
    return request<TaskList>('/api/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getListById(id: string) {
    return request<TaskList & { tasks: Task[] }>(`/api/lists/${id}`);
  },

  async updateList(id: string, data: { title?: string; description?: string; color?: string }) {
    return request<TaskList>(`/api/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async reorderLists(listIds: string[]) {
    return request<{ message: string }>('/api/lists/reorder', {
      method: 'PUT',
      body: JSON.stringify({ listIds }),
    });
  },

  async deleteList(id: string) {
    return request<{ message: string }>(`/api/lists/${id}`, {
      method: 'DELETE',
    });
  },

  // Tasks
  async getTasks(listId: string) {
    return request<Task[]>(`/api/lists/${listId}/tasks`);
  },

  async createTask(listId: string, title: string) {
    return request<Task>(`/api/lists/${listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  async bulkAddTasks(listId: string, tasks: string[]) {
    return request<{ message: string; tasks: Task[] }>(`/api/lists/${listId}/tasks/bulk`, {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    });
  },

  async updateTask(id: string, updates: Partial<{ title: string; completed: boolean; order: number }>) {
    return request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async reorderTasks(listId: string, taskIds: string[]) {
    return request<{ message: string; tasks: Task[] }>(`/api/lists/${listId}/tasks/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ taskIds }),
    });
  },

  async deleteTask(id: string) {
    return request<{ message: string }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async clearCompletedTasks(listId: string) {
    return request<{ message: string; tasks: Task[] }>(`/api/lists/${listId}/tasks/completed`, {
      method: 'DELETE',
    });
  },
};
