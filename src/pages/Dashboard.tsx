import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { TaskList } from '../types/index.js';
import { Navbar } from '../components/Navbar.js';
import { ListCard } from '../components/ListCard.js';
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
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<TaskList[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    fetchLists();
  }, []);

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

  // Filtered lists
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
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition shadow-xs"
              title="Refresh lists"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New List</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
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
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
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

        {/* Section Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Your Task Lists</h2>
              {filteredLists.length > 1 && !searchQuery && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hidden sm:inline-block">
                  Drag or use ‹ › arrows to reorder
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {filteredLists.length} {filteredLists.length === 1 ? 'list' : 'lists'} available
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search task lists..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
            />
          </div>
        </div>

        {/* Lists Grid */}
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
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create First List</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateListModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateList}
      />

      <EditListModal
        isOpen={!!editingList}
        list={editingList}
        onClose={() => setEditingList(null)}
        onUpdate={handleUpdateList}
      />

      <ConfirmModal
        isOpen={!!deletingList}
        title="Delete Task List?"
        message={`Are you sure you want to permanently delete "${deletingList?.title}" and all its tasks? This action cannot be undone.`}
        onConfirm={handleDeleteList}
        onClose={() => setDeletingList(null)}
      />
    </div>
  );
};
