import React, { useState, useMemo } from 'react';
import {
  Tag,
  Hash,
  X,
  Search,
  Check,
  Filter,
  Sparkles,
  ChevronRight,
  Folder,
} from 'lucide-react';
import { DEFAULT_SUGGESTED_TAGS } from '../types/index.js';

export interface TagInfo {
  name: string;
  total: number;
  active: number;
  completed: number;
}

interface TagSidebarFilterProps {
  tags: TagInfo[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  totalTasksCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const TagSidebarFilter: React.FC<TagSidebarFilterProps> = ({
  tags,
  selectedTags,
  onToggleTag,
  onClearTags,
  totalTasksCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase().trim();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  // Tags that are in suggested list but not yet in user tasks
  const suggestedUnusedTags = useMemo(() => {
    const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
    return DEFAULT_SUGGESTED_TAGS.filter((st) => !existingNames.has(st.toLowerCase()));
  }, [tags]);

  const content = (
    <aside
      aria-label="Tags and Labels Filter"
      className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Tags & Labels
            </h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Filter tasks by label
            </p>
          </div>
        </div>

        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={onClearTags}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer transition"
          >
            <span>Clear ({selectedTags.length})</span>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Active Tags Strip if any selected */}
      {selectedTags.length > 0 && (
        <div className="py-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            <span>Filtering by:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  title={`Remove ${tag} filter`}
                  className="hover:text-blue-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search Input for Tags (if more than 4 tags) */}
      {tags.length > 4 && (
        <div className="relative my-3">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* "All Tasks" / Reset Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onClearTags}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedTags.length === 0
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 opacity-70" />
            <span>All Tasks</span>
          </div>
          {totalTasksCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                selectedTags.length === 0
                  ? 'bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {totalTasksCount}
            </span>
          )}
        </button>
      </div>

      {/* Tag List */}
      <div className="flex-1 overflow-y-auto space-y-1 py-2 max-h-[360px] pr-1">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.name);
            return (
              <button
                key={tag.name}
                type="button"
                onClick={() => onToggleTag(tag.name)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 font-bold shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      tag.name.toLowerCase() === 'urgent'
                        ? 'bg-rose-500'
                        : tag.name.toLowerCase() === 'work'
                        ? 'bg-blue-500'
                        : tag.name.toLowerCase() === 'personal'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span className="truncate">#{tag.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isSelected
                        ? 'bg-blue-200/80 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {tag.active}
                  </span>
                  {isSelected && <Check className="w-3 h-3 stroke-[3] text-blue-600 dark:text-blue-400" />}
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-6 px-2 text-zinc-400 dark:text-zinc-500 text-xs">
            {searchQuery ? 'No tags match search' : 'No tags created yet'}
          </div>
        )}
      </div>

      {/* Suggested Quick Tags info / footer */}
      {suggestedUnusedTags.length > 0 && (
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 mt-auto">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Suggested Labels:
          </span>
          <div className="flex flex-wrap gap-1">
            {suggestedUnusedTags.slice(0, 3).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onToggleTag(st)}
                title={`Filter or assign #${st}`}
                className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 px-2 py-0.5 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
              >
                #{st}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop view */}
      <div className="hidden lg:block w-64 shrink-0">{content}</div>

      {/* Mobile Drawer view */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative ml-auto w-full max-w-xs h-full bg-white dark:bg-zinc-900 p-4 shadow-xl z-10 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="font-bold text-sm">Filter by Tag</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{content}</div>
          </div>
        </div>
      )}
    </>
  );
};
