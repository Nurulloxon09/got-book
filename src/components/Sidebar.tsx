import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Trash2, 
  Bookmark as BookmarkIcon, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  Check
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
  activeHighlightId?: string | null;
  onSelectTab: (tab: 'toc' | 'notes' | 'bookmarks') => void;
  onNavigateToChapter: (chapterIndex: number, pageInChapter?: number) => void;
  onNavigateToHighlight: (item: HighlightItem) => void;
  onNavigateToBookmark: (item: Bookmark) => void;
  onUpdateHighlightNote: (id: string, note: string) => void;
  onDeleteHighlight: (id: string) => void;
  onDeleteBookmark: (id: string) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  activeTab,
  book,
  currentChapterIndex,
  currentPageInChapter,
  theme,
  highlights,
  bookmarks,
  activeHighlightId,
  onSelectTab,
  onNavigateToChapter,
  onNavigateToHighlight,
  onNavigateToBookmark,
  onUpdateHighlightNote,
  onDeleteHighlight,
  onDeleteBookmark,
  onClose,
}) => {
  const currentTheme = THEME_CONFIGS[theme];
  const [noteSearch, setNoteSearch] = useState('');
  const [tocSearch, setTocSearch] = useState('');
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNoteText, setDraftNoteText] = useState<string>('');

  // When a highlight is created or selected, ensure its chapter is expanded and open its inline note editor
  useEffect(() => {
    if (activeHighlightId) {
      const target = highlights.find((h) => h.id === activeHighlightId);
      if (target) {
        setCollapsedChapters((prev) => ({ ...prev, [target.chapterTitle]: false }));
        setEditingNoteId(target.id);
        setDraftNoteText(target.note || '');
      }
    }
  }, [activeHighlightId]);

  // Keep draftNoteText in sync if the note is being typed live in SelectionPopup
  useEffect(() => {
    if (editingNoteId) {
      const target = highlights.find((h) => h.id === editingNoteId);
      if (target && (target.note || '') !== draftNoteText) {
        setDraftNoteText(target.note || '');
      }
    }
  }, [highlights, editingNoteId]);

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

  // Calculate overall reading progress
  const currentChapter = book?.chapters[currentChapterIndex];
  const currentGlobalPage = (currentChapter?.startPage || 1) + currentPageInChapter;
  const totalBookPages = book?.totalPages || 892;
  const overallProgressPercent = Math.min(
    100,
    Math.max(1, Math.round((currentGlobalPage / totalBookPages) * 100))
  );

  const handleSaveInlineNote = (id: string) => {
    onUpdateHighlightNote(id, draftNoteText.trim());
    setEditingNoteId(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="fixed top-11 bottom-0 left-0 z-30 w-80 sm:w-88 border-r shadow-2xl flex flex-col select-none text-[13px]"
          style={{
            backgroundColor: currentTheme.sidebarBg,
            borderColor: currentTheme.sidebarBorder,
            color: currentTheme.text,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Sidebar Navigation"
        >
          {/* Sidebar Segmented Control Tabs */}
          <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: currentTheme.border }}>
            <div className="flex bg-black/5 dark:bg-white/10 p-0.5 rounded-lg space-x-0.5 flex-1 max-w-[245px]">
              <button
                onClick={() => onSelectTab('toc')}
                className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'toc'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm font-semibold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Contents
              </button>
              <button
                onClick={() => onSelectTab('notes')}
                className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'notes'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm font-semibold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Notes ({highlights.length})
              </button>
              <button
                onClick={() => onSelectTab('bookmarks')}
                className={`flex-1 py-1 px-2 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'bookmarks'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm font-semibold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Bookmarks ({bookmarks.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/15 transition opacity-60 hover:opacity-100 cursor-pointer"
              title="Close Sidebar (Esc)"
              aria-label="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab 1: Table of Contents */}
          {activeTab === 'toc' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Overall Book Progress Bar in TOC */}
              <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: currentTheme.border }}>
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums opacity-70 mb-1.5">
                  <span className="font-sans font-medium">Book Completion</span>
                  <span className="font-semibold">{overallProgressPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* TOC Search filter */}
              <div className="px-3 pt-2.5 pb-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-40" />
                  <input
                    type="text"
                    placeholder="Search chapters & POV..."
                    aria-label="Search chapters and POV"
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
                  const chPercent = Math.min(
                    100,
                    Math.max(1, Math.round((ch.startPage / totalBookPages) * 100))
                  );

                  return (
                    <button
                      key={ch.id}
                      onClick={() => onNavigateToChapter(originalIndex, 0)}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between group transition-colors cursor-pointer ${
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
                      <div className="text-right shrink-0 font-mono tabular-nums">
                        <span className="text-[10px] opacity-40 block">
                          p. {ch.startPage}
                        </span>
                        <span className="text-[10px] text-blue-500/80 block">
                          {chPercent}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Notes & Highlights */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Notes search */}
              <div className="px-3 pt-2.5 pb-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-40" />
                  <input
                    type="text"
                    placeholder="Search notes and highlights..."
                    aria-label="Search notes and highlights"
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
                    <p className="text-[11px] mt-1">Select any word or sentence on the page to instantly highlight and add notes</p>
                  </div>
                ) : (
                  Object.entries(notesByChapter).map(([chapterTitle, items]) => {
                    const isCollapsed = collapsedChapters[chapterTitle];
                    return (
                      <div key={chapterTitle} className="space-y-1.5">
                        <button
                          onClick={() => toggleChapterCollapse(chapterTitle)}
                          className="w-full flex items-center justify-between text-left py-1 px-1.5 font-semibold text-[11px] uppercase tracking-wider opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          <span className="truncate">{chapterTitle} ({items.length})</span>
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {!isCollapsed && (
                          <div className="space-y-2 pl-1">
                            {items.map((hl) => {
                              const colorObj = HIGHLIGHT_COLORS.find((c) => c.id === hl.color) || HIGHLIGHT_COLORS[0];
                              const isEditingThis = editingNoteId === hl.id;
                              const isNewlyActive = activeHighlightId === hl.id;

                              return (
                                <div
                                  key={hl.id}
                                  className={`p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border space-y-1.5 group relative transition-colors ${
                                    isNewlyActive
                                      ? 'border-blue-500/60 ring-1 ring-blue-500/30'
                                      : 'border-black/10 dark:border-white/10'
                                  }`}
                                >
                                  <div
                                    onClick={() => onNavigateToHighlight(hl)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center space-x-1.5 text-[10px] opacity-60 mb-1 pr-12">
                                      <span className="capitalize font-medium" style={{ color: colorObj.border }}>
                                        {hl.color === 'underline' ? 'Underlined' : colorObj.name}
                                      </span>
                                      <span>·</span>
                                      <span className="font-mono tabular-nums">Page {hl.pageNumber}</span>
                                    </div>
                                    <p className="font-serif text-[12px] line-clamp-3 leading-snug">
                                      “{hl.text}”
                                    </p>
                                  </div>

                                  {/* Instant Inline Note Editor or Saved Note Display */}
                                  {isEditingThis ? (
                                    <div className="pt-1.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                      <textarea
                                        rows={2}
                                        value={draftNoteText}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setDraftNoteText(val);
                                          onUpdateHighlightNote(hl.id, val);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSaveInlineNote(hl.id);
                                          }
                                        }}
                                        placeholder="Add a note for this highlight..."
                                        aria-label="Edit highlight note"
                                        className="w-full p-2 text-xs rounded-md bg-white/80 dark:bg-black/30 border border-black/15 dark:border-white/15 focus:outline-none focus:border-blue-500 resize-none font-sans"
                                        style={{ color: currentTheme.text }}
                                      />
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] opacity-50">Saves automatically</span>
                                        <button
                                          onClick={() => handleSaveInlineNote(hl.id)}
                                          className="px-2.5 py-0.5 rounded text-[10px] bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center space-x-1 cursor-pointer"
                                        >
                                          <Check className="w-2.5 h-2.5" />
                                          <span>Done</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : hl.note ? (
                                    <div
                                      onClick={() => {
                                        setEditingNoteId(hl.id);
                                        setDraftNoteText(hl.note || '');
                                      }}
                                      className="mt-1.5 text-[11px] bg-amber-500/10 text-amber-800 dark:text-amber-200 p-1.5 rounded flex items-start space-x-1.5 cursor-pointer hover:bg-amber-500/20 transition"
                                      title="Click to edit note"
                                    >
                                      <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
                                      <span className="font-sans">{hl.note}</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(hl.id);
                                        setDraftNoteText('');
                                      }}
                                      className="mt-1 text-[10px] opacity-55 hover:opacity-100 flex items-center space-x-1 cursor-pointer"
                                    >
                                      <MessageSquare className="w-2.5 h-2.5" />
                                      <span>+ Add note</span>
                                    </button>
                                  )}

                                  <div className="absolute top-2 right-2 flex items-center space-x-0.5">
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(hl.id);
                                        setDraftNoteText(hl.note || '');
                                      }}
                                      className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                                      title="Edit Note"
                                      aria-label={`Edit note on page ${hl.pageNumber}`}
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteHighlight(hl.id)}
                                      className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer text-red-500"
                                      title="Delete Highlight"
                                      aria-label={`Delete highlight on page ${hl.pageNumber}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
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
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {bookmarks.length === 0 ? (
                <div className="text-center py-12 px-4 opacity-50">
                  <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-40 stroke-1" />
                  <p className="font-medium text-xs">No bookmarks saved</p>
                  <p className="text-[11px] mt-1">Press Cmd+B or click the ribbon icon to bookmark pages</p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1 group relative transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                  >
                    <div
                      onClick={() => onNavigateToBookmark(bm)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] font-medium mb-1 pr-6">
                        <span className="font-semibold truncate max-w-[170px]">{bm.chapterTitle}</span>
                        <span className="text-[10px] font-mono tabular-nums opacity-50">Page {bm.pageNumber}</span>
                      </div>
                      <p className="font-serif text-[12px] opacity-75 line-clamp-2 leading-relaxed">
                        {bm.textSnippet || 'No snippet preview'}
                      </p>
                    </div>

                    <button
                      onClick={() => onDeleteBookmark(bm.id)}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer text-red-500"
                      title="Delete Bookmark"
                      aria-label={`Delete bookmark on page ${bm.pageNumber}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
