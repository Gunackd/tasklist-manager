import React, { useState, useEffect } from 'react';
import { X, GitMerge, ArrowDown, ArrowUpDown, AlertTriangle, Check, Layers } from 'lucide-react';
import { TaskList } from '../types/index.js';

interface MergeListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: TaskList[];
  initialTargetListId?: string;
  initialSourceListId?: string;
  onMerge: (targetListId: string, sourceListId: string) => Promise<void>;
}

const getListColorDot = (color?: string) => {
  switch (color) {
    case 'emerald':
      return 'bg-emerald-500';
    case 'purple':
      return 'bg-purple-500';
    case 'amber':
      return 'bg-amber-500';
    case 'rose':
      return 'bg-rose-500';
    case 'cyan':
      return 'bg-cyan-500';
    default:
      return 'bg-blue-500';
  }
};

export const MergeListsModal: React.FC<MergeListsModalProps> = ({
  isOpen,
  onClose,
  lists,
  initialTargetListId,
  initialSourceListId,
  onMerge,
}) => {
  const [targetListId, setTargetListId] = useState<string>('');
  const [sourceListId, setSourceListId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset selections when modal opens or lists change
  useEffect(() => {
    if (isOpen && lists.length >= 2) {
      setError(null);
      let target = initialTargetListId;
      let source = initialSourceListId;

      // If target provided, ensure it exists in lists
      if (!target || !lists.some((l) => l._id === target)) {
        target = lists[0]._id;
      }

      // If source provided and distinct, ensure it exists
      if (!source || source === target || !lists.some((l) => l._id === source)) {
        const otherList = lists.find((l) => l._id !== target);
        source = otherList ? otherList._id : '';
      }

      setTargetListId(target);
      setSourceListId(source);
    }
  }, [isOpen, initialTargetListId, initialSourceListId, lists]);

  if (!isOpen) return null;

  const targetList = lists.find((l) => l._id === targetListId);
  const sourceList = lists.find((l) => l._id === sourceListId);

  const targetTaskCount = targetList ? targetList.totalTasks ?? 0 : 0;
  const sourceTaskCount = sourceList ? sourceList.totalTasks ?? 0 : 0;
  const combinedTotal = targetTaskCount + sourceTaskCount;

  const handleSwap = () => {
    setError(null);
    setTargetListId(sourceListId);
    setSourceListId(targetListId);
  };

  const handleTargetChange = (newTargetId: string) => {
    setError(null);
    setTargetListId(newTargetId);
    if (newTargetId === sourceListId) {
      // Pick another list as source
      const alternate = lists.find((l) => l._id !== newTargetId);
      setSourceListId(alternate ? alternate._id : '');
    }
  };

  const handleSourceChange = (newSourceId: string) => {
    setError(null);
    setSourceListId(newSourceId);
    if (newSourceId === targetListId) {
      // Pick another list as target
      const alternate = lists.find((l) => l._id !== newSourceId);
      setTargetListId(alternate ? alternate._id : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetListId || !sourceListId) {
      setError('Please select both a destination list and a source list.');
      return;
    }
    if (targetListId === sourceListId) {
      setError('Destination list and source list must be different.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onMerge(targetListId, sourceListId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to merge task lists.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 id="merge-modal-title" className="text-lg font-bold text-zinc-900 dark:text-white">
                Merge Task Lists
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Combine tasks from two lists into one unified list
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {lists.length < 2 ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You need at least two task lists to perform a merge.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* List Selection Grid */}
            <div className="space-y-4">
              {/* Destination List (Kept) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Destination List (Kept & Receives Tasks)
                  </label>
                  {targetList && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Currently {targetTaskCount} {targetTaskCount === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={targetListId}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition font-medium"
                  >
                    {lists.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.title} ({l.totalTasks || 0} tasks)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Button Divider */}
              <div className="flex items-center justify-center -my-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={isSubmitting}
                  title="Swap destination and source lists"
                  className="px-3 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center gap-1.5 transition shadow-2xs hover:scale-105"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Swap Direction</span>
                </button>
              </div>

              {/* Source List (Merged & Deleted) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    Source List (Transfers Tasks & Will Be Deleted)
                  </label>
                  {sourceList && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Currently {sourceTaskCount} {sourceTaskCount === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={sourceListId}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition font-medium"
                  >
                    {lists.map((l) => (
                      <option key={l._id} value={l._id} disabled={l._id === targetListId}>
                        {l.title} ({l.totalTasks || 0} tasks){l._id === targetListId ? ' - already selected as destination' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Merge Calculation & Preview Card */}
            {targetList && sourceList && (
              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold">Merge Outcome Preview:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {targetTaskCount} + {sourceTaskCount} = {combinedTotal} total tasks
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getListColorDot(targetList.color)}`} />
                    <span className="font-semibold text-zinc-900 dark:text-white truncate">
                      {targetList.title}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      will contain all {combinedTotal} tasks.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getListColorDot(sourceList.color)}`} />
                    <span className="font-semibold text-zinc-900 dark:text-white truncate">
                      {sourceList.title}
                    </span>
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      will be deleted.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    All tasks from <strong className="font-semibold">{sourceList.title}</strong> will be moved into <strong className="font-semibold">{targetList.title}</strong>. This list removal cannot be undone.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !targetListId || !sourceListId || targetListId === sourceListId}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Merging Lists...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-4 h-4" />
                    <span>Confirm & Merge</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
