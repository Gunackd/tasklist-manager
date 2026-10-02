import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { TaskList, Task, TaskCategory } from '../types/index.js';
import { Navbar } from '../components/Navbar.js';
import { ListCard } from '../components/ListCard.js';
import { TaskItem } from '../components/TaskItem.js';
import { CreateListModal } from '../components/CreateListModal.js';
import { EditListModal } from '../components/EditListModal.js';
import { ConfirmModal } from '../components/ConfirmModal.js';
import {
  Plus,
  Search,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  FolderPlus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<TaskList[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'S' | 'NS' | 'M'>('all');
  const [categoryTasks, setCategoryTasks] = useState<Task[]>([]);
  const [isLoadingCategoryTasks, setIsLoadingCategoryTasks] = useState(false);
  const categoryCacheRef = useRef<Record<string, Task[]>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [deletingList, setDeletingList] = useState<TaskList | null>(null);

  const fetchLists = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      setError(null);
      const data = await api.getLists();
      setLists(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load task lists.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchCategoryTasks = async (cat: 'S' | 'NS' | 'M', force = false) => {
    if (!force && categoryCacheRef.current[cat]) {
      setCategoryTasks(categoryCacheRef.current[cat]);
      return;
    }
    try {
      setIsLoadingCategoryTasks(true);
      const tasks = await api.getAllTasks(cat);
      categoryCacheRef.current[cat] = tasks;
      setCategoryTasks(tasks);
    } catch (err: any) {
      console.error('Failed to load category tasks:', err);
    } finally {
      setIsLoadingCategoryTasks(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    if (categoryFilter !== 'all') {
      fetchCategoryTasks(categoryFilter);
    }
  }, [categoryFilter]);

  const handleCreateList = async (data: { title: string; description: string; color: string }) => {
    const newList = await api.createList(data);
    setLists((prev) => [newList, ...prev]);
  };

  const handleUpdateList = async (id: string, data: { title: string; description: string; color: string }) => {
    const updated = await api.updateList(id, data);
    setLists((prev) =>
      prev.map((l) => (l._id === id ? { ...l, ...updated } : l))
    );
  };

  const handleDeleteList = async () => {
    if (!deletingList) return;
    await api.deleteList(deletingList._id);
    setLists((prev) => prev.filter((l) => l._id !== deletingList._id));
    setDeletingList(null);
    // Invalidate category cache if list was removed
    categoryCacheRef.current = {};
    if (categoryFilter !== 'all') {
      fetchCategoryTasks(categoryFilter, true);
    }
  };

  // Reorder task lists
  const [draggedListIndex, setDraggedListIndex] = useState<number | null>(null);

  const handleReorderLists = async (reordered: TaskList[]) => {
    setLists(reordered);
    try {
      await api.reorderLists(reordered.map((l) => l._id));
    } catch (err: any) {
      console.error('Failed to save list order:', err);
    }
  };

  const handleMoveList = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= lists.length) return;
    const newLists = [...lists];
    const [moved] = newLists.splice(fromIndex, 1);
    newLists.splice(toIndex, 0, moved);
    handleReorderLists(newLists);
  };

  const handleDragStart = (index: number) => {
    setDraggedListIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedListIndex === null || draggedListIndex === dropIndex) return;
    handleMoveList(draggedListIndex, dropIndex);
    setDraggedListIndex(null);
  };

  // Category view task actions
  const handleToggleCategoryTask = async (task: Task) => {
    const nextCompleted = !task.completed;
    setCategoryTasks((prev) => {
      const updated = prev.map((t) => (t._id === task._id ? { ...t, completed: nextCompleted } : t));
      if (categoryFilter !== 'all') {
        categoryCacheRef.current[categoryFilter] = updated;
      }
      return updated;
    });

    try {
      await api.updateTask(task._id, { completed: nextCompleted });
      // Refresh list progress quietly
      api.getLists().then(setLists).catch(() => {});
    } catch (err) {
      setCategoryTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, completed: task.completed } : t))
      );
    }
  };

  const handleUpdateCategoryTask = async (
    taskId: string,
    updates: { title?: string; category?: TaskCategory }
  ) => {
    setCategoryTasks((prev) => {
      const updated = prev.map((t) => (t._id === taskId ? { ...t, ...updates } : t));
      const filtered =
        categoryFilter !== 'all' && updates.category && updates.category !== categoryFilter
          ? updated.filter((t) => t._id !== taskId)
          : updated;
      if (categoryFilter !== 'all') {
        categoryCacheRef.current[categoryFilter] = filtered;
      }
      return filtered;
    });

    try {
      await api.updateTask(taskId, updates);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteCategoryTask = async (taskId: string) => {
    setCategoryTasks((prev) => {
      const filtered = prev.filter((t) => t._id !== taskId);
      if (categoryFilter !== 'all') {
        categoryCacheRef.current[categoryFilter] = filtered;
      }
      return filtered;
    });

    try {
      await api.deleteTask(taskId);
      api.getLists().then(setLists).catch(() => {});
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Group category tasks by list
  const groupedCategoryTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    categoryTasks.forEach((t) => {
      const listId = t.taskListId;
      if (!map.has(listId)) {
        map.set(listId, []);
      }
      map.get(listId)!.push(t);
    });

    const groups: { listId: string; listTitle: string; listColor?: string; tasks: Task[] }[] = [];

    // Follow list order
    lists.forEach((l) => {
      const tasksInList = map.get(l._id);
      if (tasksInList && tasksInList.length > 0) {
        groups.push({
          listId: l._id,
          listTitle: l.title,
          listColor: l.color,
          tasks: tasksInList,
        });
        map.delete(l._id);
      }
    });

    // Any remaining
    map.forEach((tasksInList, listId) => {
      if (tasksInList.length > 0) {
        groups.push({
          listId,
          listTitle: tasksInList[0].taskListTitle || 'Task List',
          listColor: tasksInList[0].taskListColor || 'blue',
          tasks: tasksInList,
        });
      }
    });

    return groups;
  }, [categoryTasks, lists]);

  const filteredGroupedTasks = useMemo(() => {
    if (!searchQuery.trim()) return groupedCategoryTasks;
    const q = searchQuery.toLowerCase();
    return groupedCategoryTasks
      .map((g) => ({
        ...g,
        tasks: g.tasks.filter(
          (t) => t.title.toLowerCase().includes(q) || g.listTitle.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.tasks.length > 0);
  }, [groupedCategoryTasks, searchQuery]);

  // Compute overall stats
  const stats = useMemo(() => {
    const totalLists = lists.length;
    let totalTasks = 0;
    let totalCompleted = 0;

    lists.forEach((list) => {
      totalTasks += list.totalTasks || 0;
      totalCompleted += list.completedTasks || 0;
    });

    const overallProgress =
      totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return {
      totalLists,
      totalTasks,
      totalCompleted,
      overallProgress,
    };
  }, [lists]);

  // Filtered lists for regular dashboard
  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists;
    const query = searchQuery.toLowerCase();
    return lists.filter(
      (l) =>
        l.title.toLowerCase().includes(query) ||
        (l.description && l.description.toLowerCase().includes(query))
    );
  }, [lists, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Navbar onOpenCreateModal={() => setCreateModalOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Hello, {user?.name || 'Friend'} 👋
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your task lists, track completion progress, and sync across all devices
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchLists(true)}
              disabled={isRefreshing}
              title="Refresh task lists"
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-2xs"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Task List</span>
            </button>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Lists
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <FolderPlus className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalLists}</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Tasks
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <ListTodo className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalTasks}</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Completed
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalCompleted}</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Progress
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.overallProgress}%</p>
          </div>
        </div>

        {/* Section Header, Global Category Filter & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {categoryFilter === 'all' ? 'Your Task Lists' : `Category: [${categoryFilter}] Tasks`}
              </h2>
              {categoryFilter === 'all' && filteredLists.length > 1 && !searchQuery && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hidden sm:inline-block">
                  Drag or use ‹ › arrows to reorder
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {categoryFilter === 'all'
                ? `${filteredLists.length} ${filteredLists.length === 1 ? 'list' : 'lists'} available`
                : `Showing all [${categoryFilter}] tasks across all your lists`}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
            {/* Global Category Filter Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 shadow-xs shrink-0">
              <label htmlFor="dashboard-category-filter" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                Category:
              </label>
              <select
                id="dashboard-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'S' | 'NS' | 'M')}
                className="text-xs font-bold font-mono bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
              >
                <option value="all">All ▼</option>
                <option value="S">S</option>
                <option value="NS">NS</option>
                <option value="M">M</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={categoryFilter === 'all' ? 'Search task lists...' : `Search in category [${categoryFilter}]...`}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Global Category View vs Normal Lists Grid */}
        {categoryFilter !== 'all' ? (
          /* Global Category View */
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  Category:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono border ${
                    categoryFilter === 'S'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                      : categoryFilter === 'NS'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                  }`}
                >
                  [{categoryFilter}]
                </span>
                <span className="text-xs text-zinc-400">
                  ({categoryTasks.length} {categoryTasks.length === 1 ? 'task' : 'tasks'} found)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← Clear category filter
              </button>
            </div>

            {isLoadingCategoryTasks ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs text-zinc-400">Loading tasks with category [{categoryFilter}]...</p>
              </div>
            ) : filteredGroupedTasks.length > 0 ? (
              <div className="space-y-6">
                {filteredGroupedTasks.map((group) => (
                  <div
                    key={group.listId}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs"
                  >
                    {/* List Group Header */}
                    <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link
                          to={`/list/${group.listId}`}
                          className="text-base font-bold text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition truncate"
                        >
                          {group.listTitle}
                        </Link>
                        <span className="text-xs text-zinc-400 font-medium">
                          ({group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'})
                        </span>
                      </div>
                      <Link
                        to={`/list/${group.listId}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 shrink-0"
                      >
                        <span>Open List</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Tasks inside this List */}
                    <div className="space-y-2">
                      {group.tasks.map((task, idx) => (
                        <TaskItem
                          key={task._id}
                          task={task}
                          index={idx}
                          totalTasks={group.tasks.length}
                          onToggle={handleToggleCategoryTask}
                          onUpdateTitle={async (taskId, title) => handleUpdateCategoryTask(taskId, { title })}
                          onUpdateCategory={async (taskId, cat) => handleUpdateCategoryTask(taskId, { category: cat })}
                          onUpdateTask={handleUpdateCategoryTask}
                          onDelete={handleDeleteCategoryTask}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State for Category */
              <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                  <ListTodo className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  No tasks found with category [{categoryFilter}]
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No tasks matched your search query in this category.'
                    : `None of your tasks are currently categorized as "${categoryFilter}". You can assign categories to tasks inside your lists.`}
                </p>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ← Return to all task lists
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Normal Dashboard Lists Grid */
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-48 rounded-2xl bg-zinc-200 dark:bg-zinc-800/50 animate-pulse border border-zinc-200 dark:border-zinc-800"
                  />
                ))}
              </div>
            ) : filteredLists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLists.map((list, index) => (
                  <ListCard
                    key={list._id}
                    list={list}
                    index={index}
                    totalLists={filteredLists.length}
                    onEdit={(l) => setEditingList(l)}
                    onDelete={(l) => setDeletingList(l)}
                    onMoveLeft={!searchQuery && index > 0 ? () => handleMoveList(index, index - 1) : undefined}
                    onMoveRight={!searchQuery && index < filteredLists.length - 1 ? () => handleMoveList(index, index + 1) : undefined}
                    draggable={!searchQuery && filteredLists.length > 1}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => setDraggedListIndex(null)}
                    isDragging={draggedListIndex === index}
                  />
                ))}

                {/* Quick Create Card */}
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center group transition bg-white/40 dark:bg-zinc-900/30 hover:bg-blue-50/20 min-h-[190px]"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-600 group-hover:text-white text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors mb-2">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Create New List
                  </span>
                  <span className="text-xs text-zinc-400 mt-1">
                    Add another dedicated workspace
                  </span>
                </button>
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <ListTodo className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {searchQuery ? 'No task lists match your search' : 'No task lists yet'}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try a different search keyword or clear the filter.'
                    : 'Create your first task list to start tracking items, roadmaps, and daily goals!'}
                </p>
                <div className="mt-6">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Clear search
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition"
                    >
                      Create First List
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create List Modal */}
      <CreateListModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateList}
      />

      {/* Edit List Modal */}
      <EditListModal
        isOpen={!!editingList}
        list={editingList}
        onClose={() => setEditingList(null)}
        onUpdate={handleUpdateList}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingList}
        title="Delete Task List?"
        message={`Are you sure you want to permanently delete "${deletingList?.title}" and all of its tasks? This action cannot be undone.`}
        onConfirm={handleDeleteList}
        onClose={() => setDeletingList(null)}
      />
    </div>
  );
};
