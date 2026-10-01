import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TaskList } from '../types/index.js';
import { ProgressBar } from './ProgressBar.js';
import {
  MoreVertical,
  Edit2,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Dices,
} from 'lucide-react';

interface ListCardProps {
  list: TaskList;
  onEdit: (list: TaskList) => void;
  onDelete: (list: TaskList) => void;
}

export const ListCard: React.FC<ListCardProps> = ({ list, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const getBorderAccent = () => {
    switch (list.color) {
      case 'emerald':
        return 'border-t-emerald-500';
      case 'purple':
        return 'border-t-purple-500';
      case 'amber':
        return 'border-t-amber-500';
      case 'rose':
        return 'border-t-rose-500';
      case 'cyan':
        return 'border-t-cyan-500';
      default:
        return 'border-t-blue-500';
    }
  };

  return (
    <div
      className={`group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-t-4 ${getBorderAccent()} rounded-2xl p-5 shadow-xs hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col justify-between`}
    >
      <div>
        {/* Top Header & Actions Menu */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link
            to={`/list/${list._id}`}
            className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1"
          >
            {list.title}
          </Link>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-30 py-1 text-xs">
                  <Link
                    to={`/list/${list._id}?randomize=true`}
                    onClick={() => setMenuOpen(false)}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Pick Random Task
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(list);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Rename / Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(list);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete List
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[32px] mb-4">
          {list.description || 'No description provided.'}
        </p>

        {/* Progress Display */}
        <div className="mb-4">
          <ProgressBar
            progress={list.progress}
            completed={list.completedTasks}
            total={list.totalTasks}
            color={list.color}
            size="md"
          />
        </div>
      </div>

      {/* Card Footer: Open List Button */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(list.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>

        <Link
          to={`/list/${list._id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group-hover:translate-x-0.5"
        >
          <span>Open List</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
};
