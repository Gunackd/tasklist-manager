import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { TaskList } from '../types/index.js';

interface EditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: { title: string; description: string; color: string }) => Promise<void>;
  list: TaskList | null;
}

const COLOR_OPTIONS = [
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', ring: 'ring-purple-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', ring: 'ring-amber-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', ring: 'ring-rose-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-500' },
];

export const EditListModal: React.FC<EditListModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  list,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (list) {
      setTitle(list.title);
      setDescription(list.description || '');
      setColor(list.color || 'blue');
    }
  }, [list]);

  if (!isOpen || !list) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for your task list.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onUpdate(list._id, {
        title: title.trim(),
        description: description.trim(),
        color,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update task list.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Edit Task List
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Rename or change theme details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/40">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              List Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
              Color Theme
            </label>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  aria-label={c.label}
                  className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${
                    color === c.id
                      ? `scale-110 ring-4 ${c.ring} ring-offset-2 dark:ring-offset-zinc-900 shadow-sm`
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-blue-500/20 transition flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
