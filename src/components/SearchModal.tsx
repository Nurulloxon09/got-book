import React, { useState } from 'react';
import { Search as SearchIcon, X, ChevronRight } from 'lucide-react';
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
  const [query, setQuery] = useState(initialQuery);
  const currentTheme = THEME_CONFIGS[theme];

  if (!open || !book) return null;

  // Search through all pages in book
  const results: SearchResult[] = [];
  if (query.trim().length >= 2) {
    const q = query.toLowerCase();
    for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
      const ch = book.chapters[cIdx];
      for (let pIdx = 0; pIdx < ch.pages.length; pIdx++) {
        const pageObj = ch.pages[pIdx];
        const text = pageObj.text;
        const lower = text.toLowerCase();
        let pos = 0;
        while ((pos = lower.indexOf(q, pos)) !== -1) {
          const start = Math.max(0, pos - 45);
          const end = Math.min(text.length, pos + query.length + 45);
          results.push({
            chapterIndex: cIdx,
            chapterTitle: ch.title,
            pageInChapter: pIdx,
            pageNumber: pageObj.pageNumber,
            snippetBefore: (start > 0 ? '…' : '') + text.substring(start, pos),
            match: text.substring(pos, pos + query.length),
            snippetAfter: text.substring(pos + query.length, end) + (end < text.length ? '…' : ''),
          });
          pos += query.length;
          if (results.length >= 80) break;
        }
        if (results.length >= 80) break;
      }
      if (results.length >= 80) break;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: currentTheme.popoverBg,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="p-3 border-b flex items-center space-x-2" style={{ borderColor: currentTheme.border }}>
          <SearchIcon className="w-4 h-4 opacity-50" />
          <input
            autoFocus
            type="text"
            placeholder="Search inside book..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:opacity-40"
            style={{ color: currentTheme.text }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 opacity-50 hover:opacity-100 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs opacity-60 hover:opacity-100 px-2 py-1 rounded bg-black/5 dark:bg-white/10"
          >
            Esc
          </button>
        </div>

        {/* Results summary */}
        <div className="px-4 py-2 text-[11px] opacity-60 border-b font-mono" style={{ borderColor: currentTheme.border }}>
          {query.trim().length < 2
            ? 'Type at least 2 characters to search'
            : `${results.length} result${results.length === 1 ? '' : 's'} found`}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {results.map((res, idx) => (
            <button
              key={idx}
              onClick={() => {
                onJumpToResult(res.chapterIndex, res.pageInChapter, query);
                onClose();
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center justify-between group"
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
              <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-80 transition flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
