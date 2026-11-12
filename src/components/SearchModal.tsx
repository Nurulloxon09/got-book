import React, { useState, useEffect, useMemo } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BookData, THEME_CONFIGS, ThemeMode } from '../types/reader';

interface SearchModalProps {
  open: boolean;
  book: BookData | null;
  theme: ThemeMode;
  initialQuery?: string;
  onJumpToResult: (chapterIndex: number, pageInChapter: number, query: string) => void;
  onClose: () => void;
}

interface SearchResult {
  chapterIndex: number;
  chapterTitle: string;
  pageInChapter: number;
  pageNumber: number;
  snippetBefore: string;
  match: string;
  snippetAfter: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  open,
  book,
  theme,
  initialQuery = '',
  onJumpToResult,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const currentTheme = THEME_CONFIGS[theme];

  // Sync initial query when opened with searchHighlightQuery
  useEffect(() => {
    if (open) {
      setInputValue(initialQuery);
      setDebouncedQuery(initialQuery);
    }
  }, [open, initialQuery]);

  // Debounce user keystrokes by 200ms to keep UI responsive
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Efficient memoized linear scan across all chapters & pages
  const results = useMemo<SearchResult[]>(() => {
    if (!book || debouncedQuery.trim().length < 2) return [];

    const resList: SearchResult[] = [];
    const q = debouncedQuery.toLowerCase();

    for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
      const ch = book.chapters[cIdx];
      for (let pIdx = 0; pIdx < ch.pages.length; pIdx++) {
        const pageObj = ch.pages[pIdx];
        const text = pageObj.text;
        const lower = text.toLowerCase();
        let pos = 0;

        while ((pos = lower.indexOf(q, pos)) !== -1) {
          const start = Math.max(0, pos - 45);
          const end = Math.min(text.length, pos + debouncedQuery.length + 45);

          resList.push({
            chapterIndex: cIdx,
            chapterTitle: ch.title,
            pageInChapter: pIdx,
            pageNumber: pageObj.pageNumber,
            snippetBefore: (start > 0 ? '…' : '') + text.substring(start, pos),
            match: text.substring(pos, pos + debouncedQuery.length),
            snippetAfter: text.substring(pos + debouncedQuery.length, end) + (end < text.length ? '…' : ''),
          });

          pos += debouncedQuery.length;
          if (resList.length >= 80) break;
        }
        if (resList.length >= 80) break;
      }
      if (resList.length >= 80) break;
    }

    return resList;
  }, [debouncedQuery, book]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/45 backdrop-blur-xs select-none"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-xl mx-4 rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[75vh]"
            style={{
              backgroundColor: currentTheme.popoverBg,
              borderColor: currentTheme.border,
              color: currentTheme.text,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search header */}
            <div className="p-3 border-b flex items-center space-x-2" style={{ borderColor: currentTheme.border }}>
              <SearchIcon className="w-4 h-4 opacity-50 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search inside book..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:opacity-40"
                style={{ color: currentTheme.text }}
              />
              {inputValue && (
                <button
                  onClick={() => {
                    setInputValue('');
                    setDebouncedQuery('');
                  }}
                  className="p-1 opacity-50 hover:opacity-100 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-xs opacity-60 hover:opacity-100 px-2 py-1 rounded bg-black/5 dark:bg-white/10 cursor-pointer"
              >
                Esc
              </button>
            </div>

            {/* Results summary */}
            <div className="px-4 py-2 text-[11px] opacity-60 border-b font-mono" style={{ borderColor: currentTheme.border }}>
              {inputValue.trim().length < 2
                ? 'Type at least 2 characters to search'
                : `${results.length} result${results.length === 1 ? '' : 's'} found`}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {results.map((res, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onJumpToResult(res.chapterIndex, res.pageInChapter, debouncedQuery);
                    onClose();
                  }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="pr-3 text-xs leading-relaxed flex-1">
                    <div className="flex items-center space-x-2 mb-0.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider opacity-60">
                        {res.chapterTitle}
                      </span>
                      <span className="text-[10px] opacity-40 font-mono">
                        Page {res.pageNumber}
                      </span>
                    </div>
                    <span className="opacity-80 font-serif">
                      {res.snippetBefore}
                      <span className="bg-amber-300/60 dark:bg-amber-500/50 font-semibold px-0.5 rounded text-neutral-900 dark:text-neutral-100">
                        {res.match}
                      </span>
                      {res.snippetAfter}
                    </span>
                  </div>
                </button>
              ))}

              {debouncedQuery.trim().length >= 2 && results.length === 0 && (
                <div className="text-center py-10 opacity-50 text-xs">
                  No matching passages found for "{debouncedQuery}"
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
