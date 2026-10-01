import React, { useState, useEffect } from 'react';
import { Task } from '../types/index.js';
import confetti from 'canvas-confetti';
import {
  Dices,
  X,
  RotateCcw,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
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
  const [isRolling, setIsRolling] = useState(false);
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(true);

  const getEligibleTasks = () => {
    if (onlyIncomplete) {
      const incomplete = tasks.filter((t) => !t.completed);
      return incomplete.length > 0 ? incomplete : tasks;
    }
    return tasks;
  };

  const rollTask = () => {
    const eligible = getEligibleTasks();
    if (eligible.length === 0) {
      setSelectedTask(null);
      return;
    }

    setIsRolling(true);

    let counter = 0;
    const totalFlips = Math.min(18, Math.max(8, eligible.length * 2));
    const intervalTime = 60;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * eligible.length);
      setDisplayedTitle(eligible[randomIndex].title);
      counter++;

      if (counter >= totalFlips) {
        clearInterval(interval);
        // Final pick
        const finalPick = eligible[Math.floor(Math.random() * eligible.length)];
        setSelectedTask(finalPick);
        setDisplayedTitle(finalPick.title);
        setIsRolling(false);

        // Fun small confetti celebration
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.55 },
          ticks: 200,
        });
      }
    }, intervalTime);
  };

  useEffect(() => {
    if (isOpen && tasks.length > 0) {
      rollTask();
    } else {
      setSelectedTask(null);
      setDisplayedTitle('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const eligibleTasks = getEligibleTasks();
  const incompleteCount = tasks.filter((t) => !t.completed).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
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
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
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
                Add some tasks to this list first, then come back to pick a random one!
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
                  }}
                  className="px-2.5 py-1 rounded-lg font-semibold transition text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 hover:bg-purple-200 dark:hover:bg-purple-900/60"
                >
                  {onlyIncomplete && incompleteCount > 0
                    ? `Active tasks only (${incompleteCount} left)`
                    : `All tasks (${tasks.length} total)`}
                </button>
              </div>

              {/* Chosen Task Card */}
              <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent border-2 border-purple-300 dark:border-purple-800/60 text-center overflow-hidden">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 mb-3 shadow-xs">
                  {isRolling ? 'Rolling dice...' : 'Your Next Task To Do 🎯'}
                </span>

                <div className="min-h-[72px] flex items-center justify-center">
                  <h3
                    className={`text-xl sm:text-2xl font-black text-zinc-900 dark:text-white transition-all duration-150 ${
                      isRolling ? 'scale-95 blur-[0.5px] opacity-70' : 'scale-100'
                    }`}
                  >
                    {displayedTitle || 'No task selected'}
                  </h3>
                </div>

                {selectedTask && !isRolling && (
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
                      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
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
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={isRolling || eligibleTasks.length === 0}
                  onClick={rollTask}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md shadow-purple-500/20 transition flex items-center gap-2"
                >
                  <RotateCcw className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
                  <span>{isRolling ? 'Spinning...' : 'Pick Another (Reroll)'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
