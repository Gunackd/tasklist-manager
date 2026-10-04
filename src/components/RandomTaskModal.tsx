import React, { useState, useEffect } from 'react';
import { Task } from '../types/index.js';
import {
  Dices,
  X,
  RotateCcw,
  CheckCircle2,
  Circle,
  Sparkles,
  Filter,
} from 'lucide-react';

interface RandomTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  listTitle: string;
  onToggleTask: (task: Task) => void;
}

export const RandomTaskModal: React.FC<RandomTaskModalProps> = ({
  isOpen,
  onClose,
  tasks,
  listTitle,
  onToggleTask,
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [onlyIncomplete, setOnlyIncomplete] = useState(true);

  const getEligibleTasks = (filterIncomplete: boolean) => {
    if (filterIncomplete) {
      const incomplete = tasks.filter((t) => !t.completed);
      return incomplete.length > 0 ? incomplete : tasks;
    }
    return tasks;
  };

  const pickRandomTask = (filterIncomplete: boolean = onlyIncomplete) => {
    const eligible = getEligibleTasks(filterIncomplete);
    if (eligible.length === 0) {
      setSelectedTask(null);
      return;
    }
    const randomIndex = Math.floor(Math.random() * eligible.length);
    setSelectedTask(eligible[randomIndex]);
  };

  useEffect(() => {
    if (isOpen && tasks.length > 0) {
      pickRandomTask(onlyIncomplete);
    } else {
      setSelectedTask(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const eligibleTasks = getEligibleTasks(onlyIncomplete);
  const incompleteCount = tasks.filter((t) => !t.completed).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Random Task Picker</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                From <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{listTitle}"</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <Dices className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                No Tasks in this List
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                Add some tasks to this list first, then pick a random one to focus on!
              </p>
            </div>
          ) : (
            <>
              {/* Filter toggle */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-zinc-400" />
                  Target pool:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !onlyIncomplete;
                    setOnlyIncomplete(nextVal);
                    pickRandomTask(nextVal);
                  }}
                  className="px-2.5 py-1 rounded-lg font-semibold transition-colors text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 hover:bg-purple-200 dark:hover:bg-purple-900/60"
                >
                  {onlyIncomplete && incompleteCount > 0
                    ? `Active tasks only (${incompleteCount} left)`
                    : `All tasks (${tasks.length} total)`}
                </button>
              </div>

              {/* Chosen Task Card */}
              <div className="p-6 sm:p-8 rounded-2xl bg-purple-500/5 border-2 border-purple-200 dark:border-purple-800/60 text-center">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 mb-3">
                  Your Picked Task 🎯
                </span>

                <div className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                  {selectedTask && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {selectedTask.taskListTitle && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          📁 {selectedTask.taskListTitle}
                        </span>
                      )}
                      {(Array.isArray(selectedTask.categories) && selectedTask.categories.length > 0
                        ? selectedTask.categories
                        : [selectedTask.category || 'S']
                      ).map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 rounded-md text-xs font-mono font-bold border bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                        >
                          [{cat}]
                        </span>
                      ))}
                    </div>
                  )}
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">
                    {selectedTask?.title || 'No task selected'}
                  </h3>
                </div>

                {selectedTask && (
                  <div className="mt-4 pt-4 border-t border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleTask(selectedTask);
                        setSelectedTask({
                          ...selectedTask,
                          completed: !selectedTask.completed,
                        });
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        selectedTask.completed
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-emerald-500'
                      }`}
                    >
                      {selectedTask.completed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Completed! (Click to uncomplete)</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-zinc-400" />
                          <span>Mark as Done</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={eligibleTasks.length === 0}
                  onClick={() => pickRandomTask(onlyIncomplete)}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Pick Another (Reroll)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
