import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types/index.js';
import { Check, Trash2, Edit2, ChevronUp, ChevronDown, CheckCircle2, Circle } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  index: number;
  totalTasks: number;
  onToggle: (task: Task) => void;
  onUpdateTitle: (taskId: string, newTitle: string) => Promise<void>;
  onDelete: (taskId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  index,
  totalTasks,
  onToggle,
  onUpdateTitle,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      setEditedTitle(task.title);
      setIsEditing(false);
      return;
    }
    if (editedTitle.trim() !== task.title) {
      await onUpdateTitle(task._id, editedTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border transition-all duration-200 ${
        task.completed
          ? 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/50'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Reorder Buttons */}
      <div className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-100 transition shrink-0">
        <button
          type="button"
          disabled={!onMoveUp}
          onClick={onMoveUp}
          title="Move up"
          className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={!onMoveDown}
          onClick={onMoveDown}
          title="Move down"
          className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Index number badge */}
      <span className="w-5 text-center text-xs font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
        {index + 1}.
      </span>

      {/* Checkbox button */}
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
          task.completed
            ? 'bg-emerald-500 text-white shadow-xs'
            : 'border-2 border-zinc-300 dark:border-zinc-600 hover:border-blue-500 text-transparent hover:text-blue-500'
        }`}
      >
        <Check className={`w-3.5 h-3.5 stroke-[3] ${task.completed ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`} />
      </button>

      {/* Title & Editable input */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              className="w-full px-2.5 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-blue-500 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
            <button
              onClick={handleSaveTitle}
              className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        ) : (
          <span
            onDoubleClick={() => setIsEditing(true)}
            onClick={() => onToggle(task)}
            className={`block text-sm cursor-pointer select-none transition-all truncate ${
              task.completed
                ? 'line-through text-zinc-400 dark:text-zinc-500'
                : 'text-zinc-800 dark:text-zinc-200 font-medium'
            }`}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition shrink-0">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          title="Edit title"
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(task._id)}
          title="Delete task"
          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
