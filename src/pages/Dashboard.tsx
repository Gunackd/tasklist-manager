import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { TaskList, Task, TaskCategory, ALL_CATEGORIES } from '../types/index.js';
import { Navbar } from '../components/Navbar.js';
import { ListCard } from '../components/ListCard.js';
import { TaskItem, getCategoryActiveBadgeClass } from '../components/TaskItem.js';
import { CreateListModal } from '../components/CreateListModal.js';
import { EditListModal } from '../components/EditListModal.js';
import { ConfirmModal } from '../components/ConfirmModal.js';
import { RandomTaskModal } from '../components/RandomTaskModal.js';
import {
  Plus,
  Search,
  ListTodo,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
  Dices,
  RotateCcw,
  Check,
  Clock,
  X,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<TaskList[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<TaskCategory[]>([]);
  const [categoryTasks, setCategoryTasks] = useState<Task[]>([]);
  const [isLoadingCategoryTasks, setIsLoadingCategoryTasks] = useState(false);
  const categoryCacheRef = useRef<Record<string, Task[]>>({});

  // Randomized task pick across all lists
  const [pickedRandomTask, setPickedRandomTask] = useState<Task | null>(null);
  const [randomModalOpen, setRandomModalOpen] = useState(false);

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

  const fetchCategoryTasks = async (cats: TaskCategory[], force = false) => {
    if (cats.length === 0) {
      setCategoryTasks([]);
      return;
    }
    const cacheKey = cats.slice().sort().join(',');
    if (!force && categoryCacheRef.current[cacheKey]) {
      setCategoryTasks(categoryCacheRef.current[cacheKey]);
      return;
    }
    try {
      setIsLoadingCategoryTasks(true);
      const tasks = await api.getAllTasks(cats);
      // Do not add completed tasks in the task category filter
      const activeTasks = tasks.filter((t) => !t.completed);
      categoryCacheRef.current[cacheKey] = activeTasks;
      setCategoryTasks(activeTasks);
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
    if (selectedCategories.length > 0) {
      fetchCategoryTasks(selectedCategories);
    } else {
      setCategoryTasks([]);
      setPickedRandomTask(null);
    }
  }, [selectedCategories]);

  const toggleCategory = (cat: TaskCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  const clearCategoryFilter = () => {
    setSelectedCategories([]);
    setPickedRandomTask(null);
  };

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
    if (selectedCategories.length > 0) {
      fetchCategoryTasks(selectedCategories, true);
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
    // Don't add/keep completed tasks in the task category filter
    setCategoryTasks((prev) => {
      let updated: Task[];
      if (nextCompleted) {
        // Task completed -> immediately remove from category filter tasks
        updated = prev.filter((t) => t._id !== task._id);
      } else {
        updated = prev.map((t) => (t._id === task._id ? { ...t, completed: false } : t));
      }
      const cacheKey = selectedCategories.slice().sort().join(',');
      if (cacheKey) {
        categoryCacheRef.current[cacheKey] = updated;
      }
      return updated;
    });

    if (pickedRandomTask && pickedRandomTask._id === task._id) {
      if (nextCompleted) {
        setPickedRandomTask(null);
      } else {
        setPickedRandomTask((prev) => (prev ? { ...prev, completed: false } : null));
      }
    }

    try {
      await api.updateTask(task._id, { completed: nextCompleted });
      // Refresh list progress quietly
      api.getLists().then(setLists).catch(() => {});
    } catch (err) {
      // Revert if error
      fetchCategoryTasks(selectedCategories, true);
    }
  };

  const handleToggleCategoryProgress = async (task: Task) => {
    const nextInProgress = !task.inProgress;
    setCategoryTasks((prev) => {
      const updated = prev.map((t) =>
        t._id === task._id ? { ...t, inProgress: nextInProgress, completed: false } : t
      );
      const cacheKey = selectedCategories.slice().sort().join(',');
      if (cacheKey) {
        categoryCacheRef.current[cacheKey] = updated;
      }
      return updated;
    });

    if (pickedRandomTask && pickedRandomTask._id === task._id) {
      setPickedRandomTask((prev) =>
        prev ? { ...prev, inProgress: nextInProgress, completed: false } : null
      );
    }

    try {
      await api.updateTask(task._id, {
        inProgress: nextInProgress,
        ...(nextInProgress ? { completed: false } : {}),
      });
      api.getLists().then(setLists).catch(() => {});
    } catch (err) {
      console.error('Failed to update progress status:', err);
    }
  };

  const handleUpdateCategoryTask = async (
    taskId: string,
    updates: { title?: string; categories?: TaskCategory[]; category?: TaskCategory }
  ) => {
    setCategoryTasks((prev) => {
      const updated = prev.map((t) => (t._id === taskId ? { ...t, ...updates } : t));
      const filtered =
        selectedCategories.length > 0 && updates.categories
          ? updated.filter((t) =>
              t._id === taskId
                ? updates.categories!.some((c) => selectedCategories.includes(c))
                : true
            )
          : updated;
      const cacheKey = selectedCategories.slice().sort().join(',');
      if (cacheKey) {
        categoryCacheRef.current[cacheKey] = filtered;
      }
      return filtered;
    });

    if (pickedRandomTask && pickedRandomTask._id === taskId) {
      setPickedRandomTask((prev) => (prev ? { ...prev, ...updates } : null));
    }

    try {
      await api.updateTask(taskId, updates);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteCategoryTask = async (taskId: string) => {
    setCategoryTasks((prev) => {
      const filtered = prev.filter((t) => t._id !== taskId);
      const cacheKey = selectedCategories.slice().sort().join(',');
      if (cacheKey) {
        categoryCacheRef.current[cacheKey] = filtered;
      }
      return filtered;
    });

    if (pickedRandomTask && pickedRandomTask._id === taskId) {
      setPickedRandomTask(null);
    }

    try {
      await api.deleteTask(taskId);
      api.getLists().then(setLists).catch(() => {});
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Group category tasks by list (only uncompleted tasks)
  const groupedCategoryTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    categoryTasks
      .filter((t) => !t.completed)
      .forEach((t) => {
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

  // Flattened all tasks from the filtered list across all task lists
  const allFilteredTasks = useMemo(() => {
    return filteredGroupedTasks.flatMap((g) => g.tasks);
  }, [filteredGroupedTasks]);

  // Randomize one task across all task lists in the filtered list
  const handleRandomizeTaskAcrossLists = () => {
    if (allFilteredTasks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allFilteredTasks.length);
    const chosen = allFilteredTasks[randomIndex];
    setPickedRandomTask(chosen);
    setRandomModalOpen(true);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleRerollTask = () => {
    if (allFilteredTasks.length === 0) return;
    let pool = allFilteredTasks;
    if (pickedRandomTask && pool.length > 1) {
      pool = pool.filter((t) => t._id !== pickedRandomTask._id);
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    setPickedRandomTask(pool[randomIndex]);
  };

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

        {/* Section Header, Global Category Multi-Select Filter & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {selectedCategories.length === 0
                  ? 'Your Task Lists'
                  : `Filtered Tasks: ${selectedCategories.map((c) => `[${c}]`).join(' ')}`}
              </h2>
              {selectedCategories.length === 0 && filteredLists.length > 1 && !searchQuery && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hidden sm:inline-block">
                  Drag or use ‹ › arrows to reorder
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedCategories.length === 0
                ? `${filteredLists.length} ${filteredLists.length === 1 ? 'list' : 'lists'} available`
                : `Showing uncompleted tasks matching ${selectedCategories.map((c) => `[${c}]`).join(' or ')} from every task list (completed tasks excluded)`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Multiple Choice Category Selection Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-xs">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Categories:</span>
              </span>

              {/* All Option */}
              <button
                type="button"
                onClick={clearCategoryFilter}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  selectedCategories.length === 0
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                All
              </button>

              {/* Multiple Choice Category Buttons */}
              {ALL_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={isSelected}
                    title={`Filter by Category ${cat} (${isSelected ? 'Active - click to remove' : 'Click to add to filter'})`}
                    className={`px-2.5 py-1 text-xs font-bold font-mono rounded-xl border transition-all flex items-center gap-1 cursor-pointer select-none ${
                      isSelected
                        ? getCategoryActiveBadgeClass(cat)
                        : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <span>[{cat}]</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  selectedCategories.length === 0
                    ? 'Search task lists...'
                    : 'Search in filtered tasks...'
                }
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Global Category View vs Normal Lists Grid */}
        {selectedCategories.length > 0 ? (
          /* Global Category View with Randomize One Task Across All Lists */
          <div className="space-y-6">
            {/* Filter Status Bar with Randomize Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Filtered Categories:
                </span>
                <div className="flex items-center gap-1.5">
                  {selectedCategories.map((cat) => (
                    <span
                      key={cat}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono border ${getCategoryActiveBadgeClass(cat)}`}
                    >
                      [{cat}]
                    </span>
                  ))}
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  • {allFilteredTasks.length} active {allFilteredTasks.length === 1 ? 'task' : 'tasks'} (completed tasks excluded) across{' '}
                  {filteredGroupedTasks.length} {filteredGroupedTasks.length === 1 ? 'list' : 'lists'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* 🎲 Randomize One Task Across All Lists */}
                <button
                  type="button"
                  onClick={handleRandomizeTaskAcrossLists}
                  disabled={allFilteredTasks.length === 0}
                  title="Randomly pick ONE task from all task lists matching the selected categories"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-purple-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Dices className="w-4 h-4 stroke-[2.5]" />
                  <span>🎲 Randomize One Task</span>
                </button>

                <button
                  type="button"
                  onClick={clearCategoryFilter}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
                >
                  ← Clear Filter
                </button>
              </div>
            </div>

            {/* Showcase Card for the Selected Random Task Across All Lists */}
            {pickedRandomTask && (
              <div className="p-5 sm:p-6 rounded-3xl bg-purple-50/80 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-800 shadow-md">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-purple-600 text-white flex items-center gap-1.5 shadow-2xs">
                      <Dices className="w-4 h-4" />
                      <span>Randomized Task Result</span>
                    </span>
                    {pickedRandomTask.taskListTitle && (
                      <Link
                        to={`/list/${pickedRandomTask.taskListId}`}
                        className="text-xs font-semibold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 bg-purple-100/60 dark:bg-purple-900/60 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800"
                      >
                        <span>📁 List: {pickedRandomTask.taskListTitle}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleRerollTask}
                      disabled={allFilteredTasks.length <= 1}
                      title="Pick another random task across all lists"
                      className="px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-zinc-900 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reroll Another</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickedRandomTask(null)}
                      title="Dismiss random result"
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/60 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-purple-200/70 dark:border-purple-800/60">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Completed Checkbox button */}
                    <button
                      type="button"
                      onClick={() => handleToggleCategoryTask(pickedRandomTask)}
                      aria-label={pickedRandomTask.completed ? 'Mark incomplete' : 'Mark complete'}
                      title={pickedRandomTask.completed ? 'Completed (Click to mark incomplete)' : 'Mark as complete'}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer ${
                        pickedRandomTask.completed
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'border-2 border-zinc-400 dark:border-zinc-500 hover:border-emerald-500 text-transparent hover:text-emerald-500'
                      }`}
                    >
                      <Check className={`w-4 h-4 stroke-[3] ${pickedRandomTask.completed ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`} />
                    </button>

                    {/* Progress button */}
                    <button
                      type="button"
                      onClick={() => handleToggleCategoryProgress(pickedRandomTask)}
                      aria-label={pickedRandomTask.inProgress ? 'In progress (click to clear)' : 'Mark as in progress'}
                      title={pickedRandomTask.inProgress ? 'In Progress: Currently working on this (click to clear)' : 'Mark as In Progress'}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer ${
                        pickedRandomTask.inProgress && !pickedRandomTask.completed
                          ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-500/30'
                          : 'border-2 border-zinc-400 dark:border-zinc-500 hover:border-amber-500 text-transparent hover:text-amber-500'
                      }`}
                    >
                      <Clock className={`w-4 h-4 stroke-[2.5] ${pickedRandomTask.inProgress && !pickedRandomTask.completed ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`} />
                    </button>

                    <div className="min-w-0">
                      <p
                        className={`text-lg sm:text-xl font-bold truncate ${
                          pickedRandomTask.completed
                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        {pickedRandomTask.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase">Tags:</span>
                        {(Array.isArray(pickedRandomTask.categories) && pickedRandomTask.categories.length > 0
                          ? pickedRandomTask.categories
                          : [pickedRandomTask.category || 'S']
                        ).map((cat) => (
                          <span
                            key={cat}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${getCategoryActiveBadgeClass(cat)}`}
                          >
                            [{cat}]
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRandomModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-zinc-900 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Full Focus View</span>
                    </button>
                    <Link
                      to={`/list/${pickedRandomTask.taskListId}`}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <span>Go to List</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {isLoadingCategoryTasks ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs text-zinc-400">
                  Loading tasks with categories {selectedCategories.map((c) => `[${c}]`).join(' ')}...
                </p>
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
                          onToggleProgress={handleToggleCategoryProgress}
                          onUpdateTitle={async (taskId, title) => handleUpdateCategoryTask(taskId, { title })}
                          onUpdateCategory={async (taskId, cat) => handleUpdateCategoryTask(taskId, { categories: [cat], category: cat })}
                          onUpdateCategories={async (taskId, cats) => handleUpdateCategoryTask(taskId, { categories: cats, category: cats[0] })}
                          onUpdateTask={handleUpdateCategoryTask}
                          onDelete={handleDeleteCategoryTask}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State for Category Filter */
              <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                  <ListTodo className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  No active tasks found with categories {selectedCategories.map((c) => `[${c}]`).join(' ')}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No active tasks matched your search query in this category filter.'
                    : 'None of your active uncompleted tasks currently have these categories. (Completed tasks are excluded from the category filter).'}
                </p>
                <button
                  type="button"
                  onClick={clearCategoryFilter}
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

      {/* Random Task Focus Modal (for picked task across all lists) */}
      <RandomTaskModal
        isOpen={randomModalOpen}
        onClose={() => setRandomModalOpen(false)}
        tasks={allFilteredTasks}
        listTitle={`All Lists (Categories: ${selectedCategories.map((c) => `[${c}]`).join(' ')})`}
        onToggleTask={handleToggleCategoryTask}
      />

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
