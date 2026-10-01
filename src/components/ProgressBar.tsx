import React from 'react';

interface ProgressBarProps {
  progress: number;
  total?: number;
  completed?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  total,
  completed,
  size = 'md',
  showLabel = true,
  color = 'blue',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, isNaN(progress) ? 0 : progress));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const getColorClass = () => {
    if (clampedProgress === 100) return 'bg-emerald-500 shadow-emerald-500/20';
    if (color === 'emerald') return 'bg-emerald-500 shadow-emerald-500/20';
    if (color === 'purple') return 'bg-purple-500 shadow-purple-500/20';
    if (color === 'amber') return 'bg-amber-500 shadow-amber-500/20';
    if (color === 'rose') return 'bg-rose-500 shadow-rose-500/20';
    return 'bg-blue-600 shadow-blue-500/20';
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-medium mb-1.5 text-zinc-600 dark:text-zinc-400">
          <span>
            {completed !== undefined && total !== undefined
              ? `${completed} / ${total} completed`
              : 'Progress'}
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {clampedProgress}%
          </span>
        </div>
      )}
      <div
        className={`w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden ${heightClasses[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${getColorClass()}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};
