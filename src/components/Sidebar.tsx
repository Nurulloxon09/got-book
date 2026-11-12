import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Trash2, 
  Bookmark as BookmarkIcon, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';
import { 
  BookData, 
  HighlightItem, 
  Bookmark, 
  THEME_CONFIGS, 
  ThemeMode,
  HIGHLIGHT_COLORS
} from '../types/reader';

interface SidebarProps {
  open: boolean;
  activeTab: 'toc' | 'notes' | 'bookmarks';
  book: BookData | null;
  currentChapterIndex: number;
  currentPageInChapter: number;
  theme: ThemeMode;
  highlights: HighlightItem[];
  bookmarks: Bookmark[];
  onSelectTab: (tab: 'toc' | 'notes' | 'bookmarks') => void;
  onNavigateToChapter: (chapterIndex: number, pageInChapter?: number) => void;
  onNavigateToHighlight: (item: HighlightItem) => void;
  onNavigateToBookmark: (item: Bookmark) => void;
  onDeleteHighlight: (id: string) => void;
  onDeleteBookmark: (id: string) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  activeTab,
  book,
  currentChapterIndex,
  theme,
  highlights,
  bookmarks,
  onSelectTab,
  onNavigateToChapter,
  onNavigateToHighlight,
  onNavigateToBookmark,
  onDeleteHighlight,
  onDeleteBookmark,
  onClose,
}) => {
  const currentTheme = THEME_CONFIGS[theme];
  const [noteSearch, setNoteSearch] = useState('');
  const [tocSearch, setTocSearch] = useState('');
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  if (!open) return null;

  const toggleChapterCollapse = (chId: string) => {
    setCollapsedChapters((prev) => ({ ...prev, [chId]: !prev[chId] }));
  };

  // Group highlights by chapter
  const filteredNotes = highlights.filter((h) => {
    if (!noteSearch) return true;
    const q = noteSearch.toLowerCase();
    return (
      h.text.toLowerCase().includes(q) ||
      (h.note && h.note.toLowerCase().includes(q)) ||
      h.chapterTitle.toLowerCase().includes(q)
    );
  });

  const notesByChapter = filteredNotes.reduce<Record<string, HighlightItem[]>>((acc, item) => {
    const key = item.chapterTitle || 'Unknown Chapter';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const filteredChapters = (book?.chapters || []).filter((ch) => {
    if (!tocSearch) return true;
    const q = tocSearch.toLowerCase();
    return ch.title.toLowerCase().includes(q) || ch.pov.toLowerCase().includes(q);
  });

  return (
    <aside
      className="fixed top-11 bottom-0 left-0 z-30 w-80 sm:w-88 border-r shadow-lg transition-transform duration-300 flex flex-col select-none text-[13px]"
      style={{
        backgroundColor: currentTheme.sidebarBg,
        borderColor: currentTheme.sidebarBorder,
        color: currentTheme.text,
      }}
      aria-label="Sidebar Navigation"
    >
      {/* Sidebar Segmented Control Tabs */}
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: currentTheme.border }}>
        <div className="flex bg-black/5 dark:bg-white/10 p-0.5 rounded-lg space-x-0.5 flex-1 max-w-[240px]">
          <button
            onClick={() => onSelectTab('toc')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition ${
              activeTab === 'toc'
                ? 'bg-white dark:bg-neutral-800 shadow-sm font-semibold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Contents
          </button>
          <button
            onClick={() => onSelectTab('notes')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition ${
              activeTab === 'notes'
                ? 'bg-white dark:bg-neutral-800 shadow-sm font-semibold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Notes ({highlights.length})
          </button>
          <button
            onClick={() => onSelectTab('bookmarks')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition ${
              activeTab === 'bookmarks'
                ? 'bg-white dark:bg-neutral-800 shadow-sm font-semibold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Bookmarks ({bookmarks.length})
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/15 transition opacity-60 hover:opacity-100"
          title="Close Sidebar (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: Table of Contents */}
      {activeTab === 'toc' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TOC Search filter */}
          <div className="px-3 pt-2.5 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-40" />
              <input
                type="text"
                placeholder="Search chapters & POV..."
                value={tocSearch}
                onChange={(e) => setTocSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-black/5 dark:bg-white/10 border border-transparent focus:border-blue-500 focus:outline-none text-[12px]"
                style={{ color: currentTheme.text }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {filteredChapters.map((ch) => {
              const originalIndex = book?.chapters.findIndex((c) => c.id === ch.id) ?? -1;
              const isActive = originalIndex === currentChapterIndex;

              return (
                <button
                  key={ch.id}
                  onClick={() => onNavigateToChapter(originalIndex, 0)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between group transition-colors ${
                    isActive
                      ? 'bg-black/10 dark:bg-white/15 font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="truncate flex-1 pr-2">
                    <span className="text-[11px] tracking-wide uppercase opacity-55 block font-mono">
                      {ch.pov}
                    </span>
                    <span className="truncate text-[13px]">{ch.title}</span>
                  </div>
                  <span className="text-[11px] opacity-40 font-mono">
                    p. {ch.startPage}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Notes & Highlights (Apple Books chapter-grouped layout) */}
      {activeTab === 'notes' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Notes search */}
          <div className="px-3 pt-2.5 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-40" />
              <input
                type="text"
                placeholder="Search notes and highlights..."
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-black/5 dark:bg-white/10 border border-transparent focus:border-blue-500 focus:outline-none text-[12px]"
                style={{ color: currentTheme.text }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
            {Object.keys(notesByChapter).length === 0 ? (
              <div className="text-center py-12 px-4 opacity-50">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-1" />
                <p className="font-medium text-xs">No notes or highlights yet</p>
                <p className="text-[11px] mt-1">Select text on any page to highlight or add notes</p>
              </div>
            ) : (
              Object.entries(notesByChapter).map(([chapterTitle, items]) => {
                const isCollapsed = collapsedChapters[chapterTitle];
                return (
                  <div key={chapterTitle} className="space-y-1.5">
                    {/* Collapsible chapter heading in small caps */}
                    <button
                      onClick={() => toggleChapterCollapse(chapterTitle)}
                      className="w-full flex items-center justify-between text-left py-1 px-1 opacity-70 hover:opacity-100 transition"
                    >
                      <span className="text-[11px] font-semibold tracking-wider uppercase font-mono truncate">
                        {chapterTitle}
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {!isCollapsed && (
                      <div className="space-y-2">
                        {items.map((item) => {
                          const colorObj = HIGHLIGHT_COLORS.find((c) => c.id === item.color) || HIGHLIGHT_COLORS[0];
                          const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          });

                          return (
                            <div
                              key={item.id}
                              onClick={() => onNavigateToHighlight(item)}
                              className="group p-2.5 rounded-lg border transition cursor-pointer relative"
                              style={{
                                backgroundColor: currentTheme.cardBg,
                                borderColor: currentTheme.border,
                              }}
                            >
                              {/* Header info */}
                              <div className="flex items-center justify-between text-[11px] opacity-60 mb-1.5">
                                <span>{dateStr}</span>
                                <span>Page {item.pageNumber}</span>
                              </div>

                              {/* Highlighted quote with left colored bar */}
                              <div className="flex items-start space-x-2">
                                <div
                                  className="w-[3px] self-stretch rounded-full flex-shrink-0"
                                  style={{ backgroundColor: colorObj.accent }}
                                />
                                <blockquote className="text-[12px] italic leading-snug line-clamp-3 opacity-90 font-serif">
                                  “{item.text}”
                                </blockquote>
                              </div>

                              {/* Note text if present */}
                              {item.note && (
                                <div className="mt-2 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-start space-x-1.5 text-[12px]">
                                  <MessageSquare className="w-3 h-3 mt-0.5 opacity-50 flex-shrink-0" />
                                  <p className="font-normal opacity-95">{item.note}</p>
                                </div>
                              )}

                              {/* Delete button on hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteHighlight(item.id);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition"
                                title="Delete highlight and note"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12 px-4 opacity-50">
              <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-1" />
              <p className="font-medium text-xs">No bookmarks saved</p>
              <p className="text-[11px] mt-1">Press Cmd+B or click the bookmark icon on the toolbar</p>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                onClick={() => onNavigateToBookmark(bm)}
                className="group p-2.5 rounded-lg border transition cursor-pointer relative"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.border,
                }}
              >
                <div className="flex items-center justify-between text-[11px] opacity-60 mb-1">
                  <span className="font-medium truncate pr-2">{bm.chapterTitle}</span>
                  <span className="font-mono">Page {bm.pageNumber}</span>
                </div>
                <p className="text-[12px] opacity-80 line-clamp-2 italic font-serif">
                  {bm.textSnippet}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBookmark(bm.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
};
