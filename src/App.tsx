import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopToolbar } from './components/TopToolbar';
import { AAPopover } from './components/AAPopover';
import { Sidebar } from './components/Sidebar';
import { SelectionPopup, SelectionState } from './components/SelectionPopup';
import { SearchModal } from './components/SearchModal';
import { ReadingArea } from './components/ReadingArea';
import { 
  BookData, 
  ReaderSettings, 
  HighlightItem, 
  Bookmark, 
  THEME_CONFIGS 
} from './types/reader';
import { 
  loadSettings, 
  saveSettings, 
  loadReadingPosition, 
  saveReadingPosition, 
  loadHighlights, 
  saveHighlights, 
  loadBookmarks, 
  saveBookmarks 
} from './utils/storage';

export default function App() {
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings & state
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);
  // Default to Chapter 1 (Prologue), starting page 5
  const [currentChapterIndex, setCurrentChapterIndex] = useState(1);
  const [pageInChapter, setPageInChapter] = useState(0);
  const [jumpHistory, setJumpHistory] = useState<number | null>(null);

  // Overlays & popovers
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'toc' | 'notes' | 'bookmarks'>('toc');
  const [aaOpen, setAaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHighlightQuery, setSearchHighlightQuery] = useState('');

  // Highlights, notes, bookmarks
  const [highlights, setHighlights] = useState<HighlightItem[]>(loadHighlights);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);
  const [selectionPopup, setSelectionPopup] = useState<SelectionState | null>(null);

  // Auto-hide toolbar timer (Apple Books 3s timeout)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Game of Thrones book data
  useEffect(() => {
    async function loadBook() {
      try {
        const res = await fetch('/books/game_of_thrones.json');
        if (res.ok) {
          const data: BookData = await res.json();
          setBook(data);

          // Restore last reading position
          const savedPos = loadReadingPosition();
          if (savedPos && savedPos.chapterIndex < data.chapters.length) {
            const ch = data.chapters[savedPos.chapterIndex];
            const maxPage = ch?.pages ? ch.pages.length - 1 : 0;
            setCurrentChapterIndex(savedPos.chapterIndex);
            setPageInChapter(Math.min(savedPos.pageInChapter || 0, maxPage));
          }
        }
      } catch (e) {
        console.error('Failed to load book json:', e);
      } finally {
        setLoading(false);
      }
    }
    loadBook();
  }, []);

  // Sync settings & persistence
  const updateSettings = (patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  // Current chapter and page
  const currentChapter = book?.chapters[currentChapterIndex] || null;
  const currentPageObj = currentChapter?.pages?.[pageInChapter];
  const actualGlobalPageNumber = currentPageObj?.pageNumber ?? ((currentChapter?.startPage || 1) + pageInChapter);

  // Save reading position whenever chapter or page changes
  useEffect(() => {
    if (book && book.chapters[currentChapterIndex]) {
      saveReadingPosition({
        chapterIndex: currentChapterIndex,
        pageInChapter,
        globalPage: actualGlobalPageNumber,
      });
    }
  }, [currentChapterIndex, pageInChapter, actualGlobalPageNumber, book]);

  // Toolbar auto-hide mechanism (3.5s of no mouse movement)
  const resetToolbarTimer = useCallback(() => {
    setToolbarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    
    if (!aaOpen && !searchOpen && !sidebarOpen) {
      hideTimerRef.current = setTimeout(() => {
        setToolbarVisible(false);
      }, 3500);
    }
  }, [aaOpen, searchOpen, sidebarOpen]);

  useEffect(() => {
    const handleMouseMove = () => resetToolbarTimer();
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetToolbarTimer]);

  // Total pages in current chapter
  const totalPagesInChapter = currentChapter?.pages?.length || 1;

  // Page turns: sequential, no skipping!
  const handlePrevPage = () => {
    if (pageInChapter > 0) {
      setPageInChapter((p) => p - 1);
    } else if (currentChapterIndex > 0) {
      const prevCh = book?.chapters[currentChapterIndex - 1];
      const prevTotal = prevCh?.pages?.length || 1;
      setCurrentChapterIndex((c) => c - 1);
      setPageInChapter(prevTotal - 1);
    }
  };

  const handleNextPage = () => {
    if (pageInChapter < totalPagesInChapter - 1) {
      setPageInChapter((p) => p + 1);
    } else if (book && currentChapterIndex < book.chapters.length - 1) {
      setCurrentChapterIndex((c) => c + 1);
      setPageInChapter(0);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Escape') {
          setSelectionPopup(null);
          setSearchOpen(false);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleBookmark();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        updateSettings({ fontSize: Math.min(32, settings.fontSize + 1) });
      } else if (e.key === '-') {
        e.preventDefault();
        updateSettings({ fontSize: Math.max(14, settings.fontSize - 1) });
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        const themes: ReaderSettings['theme'][] = ['sepia', 'white', 'gray', 'night'];
        const next = themes[(themes.indexOf(settings.theme) + 1) % themes.length];
        updateSettings({ theme: next });
      } else if (e.key === 'Escape') {
        setAaOpen(false);
        setSearchOpen(false);
        setSidebarOpen(false);
        setSelectionPopup(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings, pageInChapter, currentChapterIndex, totalPagesInChapter, book]);

  // Bookmarking
  const isBookmarked = bookmarks.some(
    (b) => b.chapterIndex === currentChapterIndex && b.pageNumber === actualGlobalPageNumber
  );

  const handleToggleBookmark = () => {
    if (!currentChapter) return;
    if (isBookmarked) {
      const updated = bookmarks.filter(
        (b) => !(b.chapterIndex === currentChapterIndex && b.pageNumber === actualGlobalPageNumber)
      );
      setBookmarks(updated);
      saveBookmarks(updated);
    } else {
      const snippet = currentPageObj?.paragraphs?.[0]?.slice(0, 80) || currentChapter.title;
      const newBm: Bookmark = {
        id: `bm-${Date.now()}`,
        chapterIndex: currentChapterIndex,
        chapterTitle: currentChapter.title,
        pageNumber: actualGlobalPageNumber,
        textSnippet: snippet,
        createdAt: Date.now(),
      };
      const updated = [newBm, ...bookmarks];
      setBookmarks(updated);
      saveBookmarks(updated);
    }
  };

  // Highlights and Notes
  const handleApplyHighlight = (color: HighlightItem['color'], note?: string) => {
    if (!selectionPopup || !currentChapter) return;

    if (selectionPopup.existingHighlightId) {
      const updated = highlights.map((h) => {
        if (h.id === selectionPopup.existingHighlightId) {
          return { ...h, color, note: note !== undefined ? note : h.note };
        }
        return h;
      });
      setHighlights(updated);
      saveHighlights(updated);
    } else {
      const newHl: HighlightItem = {
        id: `hl-${Date.now()}`,
        chapterIndex: currentChapterIndex,
        chapterTitle: currentChapter.title,
        pageNumber: actualGlobalPageNumber,
        paragraphIndex: selectionPopup.paragraphIndex,
        text: selectionPopup.text,
        color,
        note,
        createdAt: Date.now(),
      };
      const updated = [newHl, ...highlights];
      setHighlights(updated);
      saveHighlights(updated);
    }
    setSelectionPopup(null);
  };

  const handleRemoveHighlight = (id: string) => {
    const updated = highlights.filter((h) => h.id !== id);
    setHighlights(updated);
    saveHighlights(updated);
    setSelectionPopup(null);
  };

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    saveBookmarks(updated);
  };

  // Navigation handlers
  const handleNavigateToChapter = (chIdx: number, pInCh = 0) => {
    setJumpHistory(actualGlobalPageNumber);
    setCurrentChapterIndex(chIdx);
    setPageInChapter(pInCh);
  };

  const handleNavigateToHighlight = (hl: HighlightItem) => {
    setJumpHistory(actualGlobalPageNumber);
    setCurrentChapterIndex(hl.chapterIndex);
    const ch = book?.chapters[hl.chapterIndex];
    if (ch && ch.pages) {
      const pIdx = ch.pages.findIndex((p) => p.pageNumber === hl.pageNumber);
      setPageInChapter(pIdx !== -1 ? pIdx : 0);
    }
  };

  const handleNavigateToBookmark = (bm: Bookmark) => {
    setJumpHistory(actualGlobalPageNumber);
    setCurrentChapterIndex(bm.chapterIndex);
    const ch = book?.chapters[bm.chapterIndex];
    if (ch && ch.pages) {
      const pIdx = ch.pages.findIndex((p) => p.pageNumber === bm.pageNumber);
      setPageInChapter(pIdx !== -1 ? pIdx : 0);
    }
  };

  const handleJumpBack = () => {
    if (jumpHistory !== null && book) {
      // Find chapter containing jumpHistory page number
      for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
        const ch = book.chapters[cIdx];
        const pIdx = ch.pages.findIndex((p) => p.pageNumber === jumpHistory);
        if (pIdx !== -1) {
          setCurrentChapterIndex(cIdx);
          setPageInChapter(pIdx);
          break;
        }
      }
      setJumpHistory(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`File "${file.name}" received. You can read uploaded books with Apple Books typography.`);
  };

  const currentTheme = THEME_CONFIGS[settings.theme];

  if (loading) {
    return (
      <div 
        className="h-screen w-screen flex flex-col items-center justify-center font-serif text-sm select-none"
        style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
      >
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mb-4 opacity-50" />
        <p className="tracking-wide">Loading A Game of Thrones...</p>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden flex flex-col select-none"
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
      onClick={() => {
        if (aaOpen) setAaOpen(false);
        if (selectionPopup) setSelectionPopup(null);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Toolbar */}
      <TopToolbar
        visible={toolbarVisible}
        title={book?.title || 'A Game of Thrones'}
        author={book?.author || 'George R.R. Martin'}
        theme={settings.theme}
        sidebarOpen={sidebarOpen}
        activeSidebarTab={activeSidebarTab}
        isBookmarked={isBookmarked}
        aaOpen={aaOpen}
        searchOpen={searchOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onSelectSidebarTab={(tab) => {
          setActiveSidebarTab(tab);
          setSidebarOpen(true);
        }}
        onToggleBookmark={handleToggleBookmark}
        onToggleAA={() => setAaOpen((v) => !v)}
        onToggleSearch={() => setSearchOpen((v) => !v)}
        onOpenBookFile={() => fileInputRef.current?.click()}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        canPrev={currentChapterIndex > 0 || pageInChapter > 0}
        canNext={
          book
            ? currentChapterIndex < book.chapters.length - 1 || pageInChapter < totalPagesInChapter - 1
            : false
        }
      />

      {/* AA Popover */}
      <AAPopover
        open={aaOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        onClose={() => setAaOpen(false)}
      />

      {/* Slide-in Sidebar */}
      <Sidebar
        open={sidebarOpen}
        activeTab={activeSidebarTab}
        book={book}
        currentChapterIndex={currentChapterIndex}
        currentPageInChapter={pageInChapter}
        theme={settings.theme}
        highlights={highlights}
        bookmarks={bookmarks}
        onSelectTab={setActiveSidebarTab}
        onNavigateToChapter={handleNavigateToChapter}
        onNavigateToHighlight={handleNavigateToHighlight}
        onNavigateToBookmark={handleNavigateToBookmark}
        onDeleteHighlight={handleRemoveHighlight}
        onDeleteBookmark={handleDeleteBookmark}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Reading Area */}
      <ReadingArea
        chapter={currentChapter}
        pageInChapter={pageInChapter}
        settings={settings}
        highlights={highlights}
        jumpHistory={jumpHistory}
        searchHighlightQuery={searchHighlightQuery}
        onJumpBack={handleJumpBack}
        onPageTurnLeft={handlePrevPage}
        onPageTurnRight={handleNextPage}
        onOpenSelectionPopup={setSelectionPopup}
      />

      {/* Selection Tooltip */}
      <SelectionPopup
        selection={selectionPopup}
        onApplyHighlight={handleApplyHighlight}
        onRemoveHighlight={handleRemoveHighlight}
        onSearchBook={(q) => {
          setSearchHighlightQuery(q);
          setSearchOpen(true);
        }}
        onClose={() => setSelectionPopup(null)}
      />

      {/* Search Modal */}
      <SearchModal
        open={searchOpen}
        book={book}
        theme={settings.theme}
        initialQuery={searchHighlightQuery}
        onJumpToResult={(chIdx, pInCh, query) => {
          setJumpHistory(actualGlobalPageNumber);
          setCurrentChapterIndex(chIdx);
          setPageInChapter(pInCh);
          setSearchHighlightQuery(query);
        }}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
