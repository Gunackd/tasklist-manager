import React, { useState, useId } from 'react';
import { parseBulkTasks } from '../utils/parser.js';
import { X, Layers, Sparkles, Check, AlertCircle } from 'lucide-react';

interface BulkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tasks: string[]) => Promise<void>;
  listTitle: string;
}

const PRESET_TEMPLATES = [
  {
    name: 'Frontend Stack',
    text: `1. React\n2. JavaScript\n3. Tailwind CSS\n4. Redux Toolkit\n5. Next.js\n6. TypeScript`,
  },
  {
    name: 'Backend Stack',
    text: `Node.js\nExpress.js\nMongoDB Atlas\nREST API Design\nJWT Authentication\nDocker`,
  },
  {
    name: 'Product Sprint',
    text: `✓ User Authentication & Sign-in Flow\n✓ Database Modeling & Schemas\n○ Bulk Task Paste Interface\n○ Search & Filter Bar\n○ Light & Dark Theme Support\n○ Responsive Mobile Navigation`,
  },
];

export const BulkInputModal: React.FC<BulkInputModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  listTitle,
}) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaId = useId();

  if (!isOpen) return null;

  const detectedTasks = parseBulkTasks(text);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (detectedTasks.length === 0) {
      setError('Please enter or paste at least one task line.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAdd(detectedTasks);
      setText('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add bulk tasks.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (presetText: string) => {
    setText(presetText);
    setError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Add Multiple Tasks
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Adding to <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{listTitle}"</span>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor={textareaId}
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Paste your tasks below:
              </label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                One task per line (numbers & bullets are auto-cleaned)
              </span>
            </div>

            <textarea
              id={textareaId}
              rows={7}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              placeholder={`React\nMongoDB\nNode.js\nExpress.js\nRedux\nNext.js`}
              className="w-full p-3.5 text-sm font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              autoFocus
            />
          </div>

          {/* Quick preset templates */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Or try sample list:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_TEMPLATES.map((tmpl) => (
                <button
                  type="button"
                  key={tmpl.name}
                  onClick={() => handleApplyPreset(tmpl.text)}
                  className="px-2.5 py-1 text-xs rounded-lg font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  + {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Detection Box */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Detected Preview:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold">
                {detectedTasks.length} {detectedTasks.length === 1 ? 'task' : 'tasks'} detected
              </span>
            </div>

            {detectedTasks.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">
                Type or paste text above to see clean task previews...
              </p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {detectedTasks.slice(0, 10).map((taskTitle, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 py-0.5"
                  >
                    <span className="w-4 text-zinc-400 text-right font-mono">{idx + 1}.</span>
                    <span className="truncate">{taskTitle}</span>
                  </div>
                ))}
                {detectedTasks.length > 10 && (
                  <p className="text-xs text-zinc-400 italic pt-1">
                    ...and {detectedTasks.length - 10} more tasks
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
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
              disabled={detectedTasks.length === 0 || isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-blue-500/20 transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${detectedTasks.length > 0 ? `${detectedTasks.length} ` : ''}Tasks`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
