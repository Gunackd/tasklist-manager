import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { TaskList, Task, FilterStatus } from '../types/index.js';
import { Navbar } from '../components/Navbar.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { TaskItem } from '../components/TaskItem.js';
import { BulkInputModal } from '../components/BulkInputModal.js';
import { EditListModal } from '../components/EditListModal.js';
import { ConfirmModal } from '../components/ConfirmModal.js';
import { RandomTaskModal } from '../components/RandomTaskModal.js';
import {
  ArrowLeft,
  Plus,
  Layers,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  RefreshCw,
  Sparkles,
  ListFilter,
  CheckSquare,
  Dices,
} from 'lucide-react';

export const ListDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [list, setList] = useState<TaskList | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [randomModalOpen, setRandomModalOpen] = useState(false);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<string | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);

  const fetchListDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getListById(id);
      setList(data);
      setTasks(data.tasks || []);
      if (searchParams.get('randomize') === 'true') {
        setRandomModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load task list details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListDetails();
  }, [id]);

  // Compute live progress
  const progressStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [tasks]);

  // Add individual task
  const handleCreateSingleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newTaskTitle.trim()) return;

    try {
      setIsAddingTask(true);
      const created = await api.createTask(id, newTaskTitle.trim());
      setTasks((prev) => [...prev, created]);
      setNewTaskTitle('');
    } catch (err: any) {
      alert(err.message || 'Failed to create task.');
    } finally {
      setIsAddingTask(false);
    }
  };

  // Add bulk tasks
  const handleBulkAdd = async (taskTitles: string[]) => {
    if (!id) return;
    const res = await api.bulkAddTasks(id, taskTitles);
    setTasks((prev) => [...prev, ...res.tasks]);
  };

  // Toggle task completion
  const handleToggleTask = async (task: Task) => {
    const nextCompleted = !task.completed;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, completed: nextCompleted } : t))
    );

    // If reaching 100% completion, trigger celebratory confetti!
    const remainingIncomplete = tasks.filter(
      (t) => t._id !== task._id && !t.completed
    ).length;
    if (nextCompleted && remainingIncomplete === 0 && tasks.length > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    try {
      await api.updateTask(task._id, { completed: nextCompleted });
    } catch (err: any) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, completed: task.completed } : t))
      );
    }
  };

  // Inline update title
  const handleUpdateTitle = async (taskId: string, newTitle: string) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, title: newTitle } : t))
    );
    try {
      await api.updateTask(taskId, { title: newTitle });
    } catch (err: any) {
      console.error('Failed to update title:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!deleteTaskTarget) return;
    const targetId = deleteTaskTarget;
    setTasks((prev) => prev.filter((t) => t._id !== targetId));
    try {
      await api.deleteTask(targetId);
    } catch (err: any) {
      fetchListDetails();
    } finally {
      setDeleteTaskTarget(null);
    }
  };

  // Reorder task up/down
  const handleMoveTask = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length || !id) return;

    const newTasks = [...tasks];
    const [moved] = newTasks.splice(index, 1);
    newTasks.splice(targetIndex, 0, moved);

    // Update order property
    const reorderedWithIndices = newTasks.map((t, idx) => ({ ...t, order: idx }));
    setTasks(reorderedWithIndices);

    try {
      await api.reorderTasks(
        id,
        reorderedWithIndices.map((t) => t._id)
      );
    } catch (err) {
      console.error('Failed to save task order:', err);
    }
  };

  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);

  const handleDropTask = (dropIndex: number) => {
    if (draggedTaskIndex === null || draggedTaskIndex === dropIndex || !id) return;
    const newTasks = [...tasks];
    const [moved] = newTasks.splice(draggedTaskIndex, 1);
    newTasks.splice(dropIndex, 0, moved);

    const reorderedWithIndices = newTasks.map((t, idx) => ({ ...t, order: idx }));
    setTasks(reorderedWithIndices);
    setDraggedTaskIndex(null);

    api.reorderTasks(
      id,
      reorderedWithIndices.map((t) => t._id)
    ).catch((err) => console.error('Failed to save task order:', err));
  };

  // Clear completed tasks
  const handleClearCompleted = async () => {
    if (!id) return;
    try {
      const res = await api.clearCompletedTasks(id);
      setTasks(res.tasks);
      setConfirmClearCompleted(false);
    } catch (err: any) {
      alert(err.message || 'Failed to clear completed tasks.');
    }
  };

  // Delete whole list
  const handleDeleteList = async () => {
    if (!id) return;
    try {
      await api.deleteList(id);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      alert(err.message || 'Failed to delete list.');
    }
  };

  // Update whole list info
  const handleUpdateListInfo = async (
    listId: string,
    data: { title: string; description: string; color: string }
  ) => {
    const updated = await api.updateList(listId, data);
    setList((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  // Filter & Search tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (filter === 'active') return !t.completed;
        if (filter === 'completed') return t.completed;
        return true;
      })
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        return t.title.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [tasks, filter, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading task list...</p>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
            Unable to Open Task List
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            {error || 'This task list may have been deleted or belongs to another user.'}
          </p>
          <Link
            to="/dashboard"
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* List Header Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {list.title}
                </h1>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  title="Edit title & color"
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              {list.description && (
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
                  {list.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRandomModalOpen(true)}
                disabled={tasks.length === 0}
                title="Pick a random task to focus on"
                className="px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/80 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Dices className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Random Task</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteList(true)}
                title="Delete this task list"
                className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition text-xs flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete List</span>
              </button>
            </div>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Progress: {progressStats.completed} / {progressStats.total} completed
              </span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                {progressStats.percentage}%
              </span>
            </div>
            <ProgressBar
              progress={progressStats.percentage}
              showLabel={false}
              size="lg"
              color={list.color}
            />
          </div>
        </div>

        {/* Action Controls & Input Section */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs mb-6 space-y-4">
          {/* Quick Single Task Input Form */}
          <form onSubmit={handleCreateSingleTask} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What needs to be done? (e.g. Implement Redux store)"
                className="w-full px-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={!newTaskTitle.trim() || isAddingTask}
              className="px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-sm shadow-blue-500/20 transition flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Task</span>
            </button>
          </form>

          {/* Action Bar: Bulk Paste, Randomize & Clear completed */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition flex items-center gap-2 border border-blue-200 dark:border-blue-900/50"
              >
                <Layers className="w-4 h-4" />
                <span>Paste Multiple Tasks (Bulk Input)</span>
              </button>

              <button
                type="button"
                onClick={() => setRandomModalOpen(true)}
                disabled={tasks.length === 0}
                className="px-3.5 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-xl transition flex items-center gap-2 border border-purple-200 dark:border-purple-900/50 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Dices className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Randomize (Pick 1 Task)</span>
              </button>
            </div>

            {progressStats.completed > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearCompleted(true)}
                className="text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition"
              >
                Clear completed ({progressStats.completed})
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* Tabs: [All] [Active] [Completed] */}
          <div className="inline-flex p-1 bg-zinc-200/80 dark:bg-zinc-800/80 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                filter === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                filter === 'active'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Active ({progressStats.total - progressStats.completed})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                filter === 'completed'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Completed ({progressStats.completed})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
            />
          </div>
        </div>

        {/* Task Items List */}
        <div className="space-y-2">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task, index) => (
              <TaskItem
                key={task._id}
                task={task}
                index={index}
                totalTasks={filteredTasks.length}
                onToggle={handleToggleTask}
                onUpdateTitle={handleUpdateTitle}
                onDelete={(taskId) => setDeleteTaskTarget(taskId)}
                onMoveUp={index > 0 ? () => handleMoveTask(index, 'up') : undefined}
                onMoveDown={
                  index < tasks.length - 1 ? () => handleMoveTask(index, 'down') : undefined
                }
                draggable={filter === 'all' && !searchQuery}
                onDragStart={() => setDraggedTaskIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropTask(index)}
                onDragEnd={() => setDraggedTaskIndex(null)}
                isDragging={draggedTaskIndex === index}
              />
            ))
          ) : (
            <div className="text-center py-12 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <CheckSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {searchQuery
                  ? 'No tasks matched your search query'
                  : filter === 'completed'
                  ? 'No completed tasks yet'
                  : filter === 'active'
                  ? 'All tasks are completed! Awesome job 🎉'
                  : 'This list is empty'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {searchQuery
                  ? 'Try a different search word or clear the filter.'
                  : 'Add single tasks above or paste a batch using bulk input.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bulk Input Modal */}
      <BulkInputModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onAdd={handleBulkAdd}
        listTitle={list.title}
      />

      {/* Random Task Picker Modal */}
      <RandomTaskModal
        isOpen={randomModalOpen}
        onClose={() => setRandomModalOpen(false)}
        tasks={tasks}
        listTitle={list.title}
        onToggleTask={handleToggleTask}
      />

      {/* Edit List Modal */}
      <EditListModal
        isOpen={editModalOpen}
        list={list}
        onClose={() => setEditModalOpen(false)}
        onUpdate={handleUpdateListInfo}
      />

      {/* Confirm Task Deletion */}
      <ConfirmModal
        isOpen={!!deleteTaskTarget}
        title="Delete Task?"
        message="Are you sure you want to remove this task? This action cannot be undone."
        onConfirm={handleDeleteTask}
        onClose={() => setDeleteTaskTarget(null)}
      />

      {/* Confirm Clear Completed Tasks */}
      <ConfirmModal
        isOpen={confirmClearCompleted}
        title="Clear Completed Tasks?"
        message={`Are you sure you want to permanently delete all ${progressStats.completed} completed tasks from this list?`}
        onConfirm={handleClearCompleted}
        onClose={() => setConfirmClearCompleted(false)}
      />

      {/* Confirm List Deletion */}
      <ConfirmModal
        isOpen={confirmDeleteList}
        title="Delete Task List?"
        message={`Are you sure you want to delete "${list.title}" and all ${tasks.length} tasks?`}
        onConfirm={handleDeleteList}
        onClose={() => setConfirmDeleteList(false)}
      />
    </div>
  );
};
