import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopToolbar } from './components/TopToolbar';
import { AAPopover } from './components/AAPopover';
import { Sidebar } from './components/Sidebar';
import { SelectionPopup, SelectionState } from './components/SelectionPopup';
import { SearchModal } from './components/SearchModal';
import { ReadingArea } from './components/ReadingArea';
import { ReadingGoalsModal } from './components/ReadingGoalsModal';
import { 
  BookData, 
  ReaderSettings, 
  HighlightItem, 
  Bookmark, 
  THEME_CONFIGS,
  ReadingGoalsData
} from './types/reader';
import { 
  loadSettings, 
  saveSettings, 
  loadReadingPosition, 
  saveReadingPosition, 
  loadHighlights, 
  saveHighlights, 
  loadBookmarks, 
  saveBookmarks,
  loadReadingGoals,
  saveReadingGoals,
  getTodayDateString
} from './utils/storage';
import { parseBookFile } from './utils/epubParser';
import { recordPageVisit } from './utils/features';

export default function App() {
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileParsing, setFileParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Settings & state
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);
  // Default to Chapter 1 (Prologue), starting page 5
  const [currentChapterIndex, setCurrentChapterIndex] = useState(1);
  const [pageInChapter, setPageInChapter] = useState(0);

  // Jump history stack
  const [jumpHistory, setJumpHistory] = useState<number[]>([]);

  // Overlays & popovers
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'toc' | 'notes' | 'bookmarks'>('toc');
  const [aaOpen, setAaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHighlightQuery, setSearchHighlightQuery] = useState('');
  const [readingGoalsOpen, setReadingGoalsOpen] = useState(false);

  // Highlights, notes, bookmarks, reading goals
  const [highlights, setHighlights] = useState<HighlightItem[]>(loadHighlights);
  const [preferredColor, setPreferredColor] = useState<HighlightItem['color']>('yellow');
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);
  const [readingGoals, setReadingGoals] = useState<ReadingGoalsData>(loadReadingGoals);
  const [selectionPopup, setSelectionPopup] = useState<(SelectionState & { pageContext?: string }) | null>(null);

  // Auto-hide toolbar timer
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync dark mode class to document element for Tailwind v4
  useEffect(() => {
    const isDark = settings.theme === 'night' || settings.theme === 'gray';
    document.documentElement.classList.toggle('dark', isDark);
  }, [settings.theme]);

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
  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // Current chapter and page
  const currentChapter = book?.chapters[currentChapterIndex] || null;
  const currentPageObj = currentChapter?.pages?.[pageInChapter];
  const actualGlobalPageNumber = currentPageObj?.pageNumber ?? ((currentChapter?.startPage || 1) + pageInChapter);
  const totalPagesInChapter = currentChapter?.pages?.length || 1;
  const pagesLeftInChapter = Math.max(0, totalPagesInChapter - 1 - pageInChapter);

  // Push to jump history stack helper
  const pushJumpHistory = useCallback((page: number) => {
    setJumpHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === page) return prev;
      return [...prev, page].slice(-10);
    });
  }, []);

  // Save reading position & record page visit in Reading Goals whenever chapter or page changes
  useEffect(() => {
    if (book && book.chapters[currentChapterIndex]) {
      saveReadingPosition({
        chapterIndex: currentChapterIndex,
        pageInChapter,
        globalPage: actualGlobalPageNumber,
      });

      setReadingGoals((prev) => {
        const updated = recordPageVisit(prev, actualGlobalPageNumber, getTodayDateString(), 0.4);
        saveReadingGoals(updated);
        return updated;
      });
    }
  }, [currentChapterIndex, pageInChapter, actualGlobalPageNumber, book]);

  // Active reading session timer (increments reading minutes every 60s)
  useEffect(() => {
    const timer = setInterval(() => {
      setReadingGoals((prev) => {
        const updated = recordPageVisit(prev, actualGlobalPageNumber, getTodayDateString(), 1);
        saveReadingGoals(updated);
        return updated;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [actualGlobalPageNumber]);

  const handleUpdateReadingGoals = useCallback((patch: Partial<ReadingGoalsData>) => {
    setReadingGoals((prev) => {
      const next = { ...prev, ...patch };
      saveReadingGoals(next);
      return next;
    });
  }, []);

  const handleLogReadingMinutes = useCallback(
    (minutesToAdd: number) => {
      setReadingGoals((prev) => {
        const updated = recordPageVisit(prev, actualGlobalPageNumber, getTodayDateString(), minutesToAdd);
        saveReadingGoals(updated);
        return updated;
      });
    },
    [actualGlobalPageNumber]
  );

  // Toolbar auto-hide mechanism
  const resetToolbarTimer = useCallback(() => {
    setToolbarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    if (!aaOpen && !searchOpen && !sidebarOpen && !readingGoalsOpen) {
      hideTimerRef.current = setTimeout(() => {
        setToolbarVisible(false);
      }, 3500);
    }
  }, [aaOpen, searchOpen, sidebarOpen, readingGoalsOpen]);

  useEffect(() => {
    const handleMouseMove = () => resetToolbarTimer();
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetToolbarTimer]);

  // Page turns: sequential, no skipping!
  const handlePrevPage = useCallback(() => {
    if (pageInChapter > 0) {
      setPageInChapter((p) => p - 1);
    } else if (currentChapterIndex > 0) {
      const prevCh = book?.chapters[currentChapterIndex - 1];
      const prevTotal = prevCh?.pages?.length || 1;
      setCurrentChapterIndex((c) => c - 1);
      setPageInChapter(prevTotal - 1);
    }
  }, [pageInChapter, currentChapterIndex, book]);

  const handleNextPage = useCallback(() => {
    if (pageInChapter < totalPagesInChapter - 1) {
      setPageInChapter((p) => p + 1);
    } else if (book && currentChapterIndex < book.chapters.length - 1) {
      setCurrentChapterIndex((c) => c + 1);
      setPageInChapter(0);
    }
  }, [pageInChapter, totalPagesInChapter, book, currentChapterIndex]);

  // Bookmarking
  const isBookmarked = bookmarks.some(
    (b) => b.chapterIndex === currentChapterIndex && b.pageNumber === actualGlobalPageNumber
  );

  const handleToggleBookmark = useCallback(() => {
    if (!currentChapter) return;
    setBookmarks((prevBookmarks) => {
      const alreadyBookmarked = prevBookmarks.some(
        (b) => b.chapterIndex === currentChapterIndex && b.pageNumber === actualGlobalPageNumber
      );

      let updated: Bookmark[];
      if (alreadyBookmarked) {
        updated = prevBookmarks.filter(
          (b) => !(b.chapterIndex === currentChapterIndex && b.pageNumber === actualGlobalPageNumber)
        );
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
        updated = [newBm, ...prevBookmarks];
      }
      saveBookmarks(updated);
      return updated;
    });
  }, [currentChapter, currentChapterIndex, actualGlobalPageNumber, currentPageObj]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Escape') {
          setSelectionPopup(null);
          setSearchOpen(false);
          setReadingGoalsOpen(false);
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
      } else if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setReadingGoalsOpen((prev) => !prev);
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
        setReadingGoalsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    settings,
    handlePrevPage,
    handleNextPage,
    handleToggleBookmark,
    updateSettings,
  ]);

  // Instant Highlight + Note when selecting any word or sentence with left mouse button
  const handleInstantHighlightSelection = useCallback(
    (payload: SelectionState & { pageContext?: string }) => {
      if (!currentChapter) return;

      if (payload.existingHighlightId) {
        setActiveHighlightId(payload.existingHighlightId);
        setSelectionPopup(payload);
        return;
      }

      const newId = `hl-${Date.now()}`;
      const newHl: HighlightItem = {
        id: newId,
        chapterIndex: currentChapterIndex,
        chapterTitle: currentChapter.title,
        pageNumber: actualGlobalPageNumber,
        paragraphIndex: payload.paragraphIndex,
        text: payload.text,
        color: preferredColor,
        createdAt: Date.now(),
      };

      setHighlights((prev) => {
        const updated = [newHl, ...prev];
        saveHighlights(updated);
        return updated;
      });

      setActiveHighlightId(newId);
      setSelectionPopup({
        ...payload,
        existingHighlightId: newId,
        currentColor: preferredColor,
      });
    },
    [currentChapter, currentChapterIndex, actualGlobalPageNumber, preferredColor]
  );

  // Change color of currently active highlight in popup
  const handleChangePopupColor = useCallback(
    (color: HighlightItem['color']) => {
      setPreferredColor(color);
      if (!selectionPopup?.existingHighlightId) return;
      const targetId = selectionPopup.existingHighlightId;

      setHighlights((prev) => {
        const updated = prev.map((h) => (h.id === targetId ? { ...h, color } : h));
        saveHighlights(updated);
        return updated;
      });
      setSelectionPopup((prev) => (prev ? { ...prev, currentColor: color } : null));
    },
    [selectionPopup?.existingHighlightId]
  );

  // Live auto-save note as user types in SelectionPopup
  const handleUpdatePopupNoteLive = useCallback(
    (note: string) => {
      if (!selectionPopup?.existingHighlightId) return;
      const targetId = selectionPopup.existingHighlightId;
      const cleaned = note.trim() ? note : undefined;

      setHighlights((prev) => {
        const updated = prev.map((h) => (h.id === targetId ? { ...h, note: cleaned } : h));
        saveHighlights(updated);
        return updated;
      });
      setSelectionPopup((prev) => (prev ? { ...prev, existingNote: note } : null));
    },
    [selectionPopup?.existingHighlightId]
  );

  const handleUpdateHighlightNote = useCallback((id: string, note: string) => {
    const cleaned = note.trim() ? note : undefined;
    setHighlights((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, note: cleaned } : h));
      saveHighlights(updated);
      return updated;
    });
    setSelectionPopup((prev) =>
      prev && prev.existingHighlightId === id ? { ...prev, existingNote: note } : prev
    );
  }, []);

  const handleRemoveHighlight = (id: string) => {
    const updated = highlights.filter((h) => h.id !== id);
    setHighlights(updated);
    saveHighlights(updated);
    if (activeHighlightId === id) setActiveHighlightId(null);
    setSelectionPopup(null);
  };

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    saveBookmarks(updated);
  };

  // Navigation handlers
  const handleNavigateToChapter = (chIdx: number, pInCh = 0) => {
    pushJumpHistory(actualGlobalPageNumber);
    setCurrentChapterIndex(chIdx);
    setPageInChapter(pInCh);
  };

  const handleNavigateToHighlight = (hl: HighlightItem) => {
    pushJumpHistory(actualGlobalPageNumber);
    setCurrentChapterIndex(hl.chapterIndex);
    const ch = book?.chapters[hl.chapterIndex];
    if (ch && ch.pages) {
      const pIdx = ch.pages.findIndex((p) => p.pageNumber === hl.pageNumber);
      setPageInChapter(pIdx !== -1 ? pIdx : 0);
    }
  };

  const handleNavigateToBookmark = (bm: Bookmark) => {
    pushJumpHistory(actualGlobalPageNumber);
    setCurrentChapterIndex(bm.chapterIndex);
    const ch = book?.chapters[bm.chapterIndex];
    if (ch && ch.pages) {
      const pIdx = ch.pages.findIndex((p) => p.pageNumber === bm.pageNumber);
      setPageInChapter(pIdx !== -1 ? pIdx : 0);
    }
  };

  const handleJumpBack = () => {
    if (jumpHistory.length === 0 || !book) return;
    const targetPage = jumpHistory[jumpHistory.length - 1];
    setJumpHistory((prev) => prev.slice(0, -1));

    for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
      const ch = book.chapters[cIdx];
      const pIdx = ch.pages.findIndex((p) => p.pageNumber === targetPage);
      if (pIdx !== -1) {
        setCurrentChapterIndex(cIdx);
        setPageInChapter(pIdx);
        break;
      }
    }
  };

  // Functional EPUB & TXT file upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileParsing(true);
    setParseError(null);

    try {
      const parsedBook = await parseBookFile(file);
      setBook(parsedBook);
      setCurrentChapterIndex(0);
      setPageInChapter(0);
      setJumpHistory([]);
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to parse book file';
      setParseError(`Could not load "${file.name}": ${msg}`);
    } finally {
      setFileParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentTheme = THEME_CONFIGS[settings.theme];

  if (loading || fileParsing) {
    return (
      <div 
        className="h-screen w-screen flex flex-col items-center justify-center font-serif text-sm select-none"
        style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
      >
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mb-4 opacity-50" />
        <p className="tracking-wide">
          {fileParsing ? 'Parsing and paginating your book...' : 'Loading A Game of Thrones...'}
        </p>
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
      onMouseDown={() => {
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

      {/* Non-blocking error toast if file upload fails */}
      {parseError && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-600 text-white text-xs shadow-lg flex items-center space-x-2">
          <span>{parseError}</span>
          <button
            onClick={() => setParseError(null)}
            className="opacity-80 hover:opacity-100 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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
        streakDays={readingGoals.streakDays}
        bionicActive={settings.bionicReading}
        focusModeActive={settings.focusMode}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onSelectSidebarTab={(tab) => {
          setActiveSidebarTab(tab);
          setSidebarOpen(true);
        }}
        onToggleBookmark={handleToggleBookmark}
        onToggleAA={() => setAaOpen((v) => !v)}
        onToggleSearch={() => setSearchOpen((v) => !v)}
        onOpenReadingGoals={() => setReadingGoalsOpen(true)}
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

      {/* AA Popover (with Bionic Reading & Focus Mode controls) */}
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
        activeHighlightId={activeHighlightId}
        onSelectTab={setActiveSidebarTab}
        onNavigateToChapter={handleNavigateToChapter}
        onNavigateToHighlight={handleNavigateToHighlight}
        onNavigateToBookmark={handleNavigateToBookmark}
        onUpdateHighlightNote={handleUpdateHighlightNote}
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
        bookTotalPages={book?.totalPages || 892}
        searchHighlightQuery={searchHighlightQuery}
        readingSpeedWpm={readingGoals.readingSpeedWpm}
        onJumpBack={handleJumpBack}
        onPageTurnLeft={handlePrevPage}
        onPageTurnRight={handleNextPage}
        onOpenReadingGoals={() => setReadingGoalsOpen(true)}
        onExitFocusMode={() => updateSettings({ focusMode: false })}
        onInstantHighlightSelection={handleInstantHighlightSelection}
      />

      {/* Selection Tooltip (Instant highlight & live auto-saving note on left-mouse selection) */}
      <SelectionPopup
        selection={selectionPopup}
        chapterTitle={currentChapter?.title || 'A Game of Thrones'}
        pageContext={currentPageObj?.text || ''}
        onChangeColor={handleChangePopupColor}
        onUpdateNoteLive={handleUpdatePopupNoteLive}
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
          pushJumpHistory(actualGlobalPageNumber);
          setCurrentChapterIndex(chIdx);
          setPageInChapter(pInCh);
          setSearchHighlightQuery(query);
        }}
        onClose={() => setSearchOpen(false)}
      />

      {/* Reading Goals & Insights Modal */}
      <ReadingGoalsModal
        open={readingGoalsOpen}
        theme={settings.theme}
        goals={readingGoals}
        currentChapterTitle={currentChapter?.title || 'Prologue'}
        pagesLeftInChapter={pagesLeftInChapter}
        currentGlobalPage={actualGlobalPageNumber}
        bookTotalPages={book?.totalPages || 892}
        highlightsCount={highlights.length}
        bookmarksCount={bookmarks.length}
        onUpdateGoals={handleUpdateReadingGoals}
        onLogReadingMinutes={handleLogReadingMinutes}
        onClose={() => setReadingGoalsOpen(false)}
      />
    </div>
  );
}
