import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskCategory, ALL_CATEGORIES } from '../types/index.js';
import {
  Check,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';

interface TaskItemProps {
  task: Task;
  index: number;
  totalTasks?: number;
  onToggle: (task: Task) => void;
  onUpdateTitle?: (taskId: string, newTitle: string) => Promise<void>;
  onUpdateCategory?: (taskId: string, newCategory: TaskCategory) => Promise<void>;
  onUpdateCategories?: (taskId: string, newCategories: TaskCategory[]) => Promise<void>;
  onUpdateTask?: (taskId: string, updates: { title?: string; categories?: TaskCategory[]; category?: TaskCategory }) => Promise<void>;
  onDelete: (taskId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  showListBadge?: boolean;
}

export const getCategoryActiveBadgeClass = (category: TaskCategory) => {
  switch (category) {
    case 'NS':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 shadow-2xs';
    case 'M':
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700 shadow-2xs';
    case 'A':
      return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700 shadow-2xs';
    case 'S':
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700 shadow-2xs';
  }
};

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  index,
  totalTasks = 1,
  onToggle,
  onUpdateTitle,
  onUpdateCategory,
  onUpdateCategories,
  onUpdateTask,
  onDelete,
  onMoveUp,
  onMoveDown,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  showListBadge = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const taskCategories = (Array.isArray(task.categories) && task.categories.length > 0)
    ? task.categories
    : [task.category || 'S'];

  const [editedCategories, setEditedCategories] = useState<TaskCategory[]>(taskCategories);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(task.title);
    const cats = (Array.isArray(task.categories) && task.categories.length > 0)
      ? task.categories
      : [task.category || 'S'];
    setEditedCategories(cats);
  }, [task.title, task.categories, task.category]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    if (!trimmedTitle) {
      setEditedTitle(task.title);
      setEditedCategories(taskCategories);
      setIsEditing(false);
      return;
    }

    const titleChanged = trimmedTitle !== task.title;
    const categoriesChanged =
      editedCategories.length !== taskCategories.length ||
      editedCategories.some(c => !taskCategories.includes(c));

    if (titleChanged || categoriesChanged) {
      const finalCats = editedCategories;
      if (onUpdateTask) {
        await onUpdateTask(task._id, {
          title: trimmedTitle,
          categories: finalCats,
          category: finalCats[0],
        });
      } else {
        if (titleChanged && onUpdateTitle) {
          await onUpdateTitle(task._id, trimmedTitle);
        }
        if (categoriesChanged && onUpdateCategories) {
          await onUpdateCategories(task._id, finalCats);
        }
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setEditedCategories(taskCategories);
      setIsEditing(false);
    }
  };

  const handleToggleCategory = async (cat: TaskCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    let next: TaskCategory[];
    if (taskCategories.includes(cat)) {
      next = taskCategories.filter(c => c !== cat);
    } else {
      next = [...taskCategories, cat];
    }

    if (onUpdateCategories) {
      await onUpdateCategories(task._id, next);
    } else if (onUpdateTask) {
      await onUpdateTask(task._id, { categories: next, category: next[0] });
    }
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group flex items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ${
        isDragging
          ? 'opacity-40 border-dashed border-blue-500 scale-[0.99]'
          : task.completed
          ? 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/50'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Drag Grip Handle */}
      {draggable && (
        <span
          className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded transition shrink-0"
          title="Drag to reorder task"
        >
          <GripVertical className="w-4 h-4" />
        </span>
      )}

      {/* Reorder Buttons (Move Up / Down) */}
      {(onMoveUp || onMoveDown) && (
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
      )}

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
        <Check
          className={`w-3.5 h-3.5 stroke-[3] ${
            task.completed ? 'opacity-100' : 'opacity-0 hover:opacity-100'
          }`}
        />
      </button>

      {/* Visible Multi-Category Buttons (Enable / Disable per category) */}
      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Task categories">
          {ALL_CATEGORIES.map((cat) => {
            const isEnabled = taskCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isEnabled}
                aria-label={`Category ${cat}: ${isEnabled ? 'Enabled (click to disable)' : 'Disabled (click to enable)'}`}
                onClick={(e) => handleToggleCategory(cat, e)}
                title={`Category ${cat}: ${isEnabled ? 'Enabled (Click to disable)' : 'Disabled (Click to enable)'}`}
                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold font-mono border transition-all cursor-pointer select-none ${
                  isEnabled
                    ? getCategoryActiveBadgeClass(cat)
                    : 'bg-zinc-100/50 dark:bg-zinc-800/30 text-zinc-400 dark:text-zinc-600 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-60 hover:opacity-100'
                }`}
              >
                {isEnabled ? `[${cat}]` : cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Title & Editable input */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {/* Category enable/disable toggles in edit mode */}
            <div className="flex items-center gap-1 shrink-0 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <span className="text-[10px] uppercase font-bold text-zinc-400 px-1">Tags:</span>
              {ALL_CATEGORIES.map((cat) => {
                const isEnabled = editedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (isEnabled) {
                        setEditedCategories(editedCategories.filter((c) => c !== cat));
                      } else {
                        setEditedCategories([...editedCategories, cat]);
                      }
                    }}
                    className={`px-1.5 py-0.5 text-xs font-mono font-bold rounded border transition-all ${
                      isEnabled
                        ? getCategoryActiveBadgeClass(cat)
                        : 'text-zinc-400 dark:text-zinc-500 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {isEnabled ? `[${cat}]` : cat}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 w-full flex-1">
              <input
                ref={inputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-[140px] px-2.5 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-blue-500 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSave}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shrink-0"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedTitle(task.title);
                  setEditedCategories(taskCategories);
                  setIsEditing(false);
                }}
                className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition shrink-0"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 truncate">
            <span
              onDoubleClick={() => setIsEditing(true)}
              onClick={() => onToggle(task)}
              className={`block text-sm cursor-pointer select-none truncate transition-colors ${
                task.completed
                  ? 'line-through text-zinc-400 dark:text-zinc-500'
                  : 'text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {task.title}
            </span>

            {showListBadge && task.taskListTitle && (
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700/60 shrink-0">
                {task.taskListTitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          title="Edit task name & categories"
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(task._id)}
          title="Delete task"
          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
