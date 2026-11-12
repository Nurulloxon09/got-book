import React from 'react';
import { 
  Sidebar as SidebarIcon, 
  List, 
  FileText, 
  Bookmark as BookmarkIcon, 
  Search, 
  Upload,
  ChevronLeft,
  ChevronRight,
  Flame
} from 'lucide-react';
import { THEME_CONFIGS, ThemeMode } from '../types/reader';

interface ToolbarProps {
  visible: boolean;
  title: string;
  author: string;
  theme: ThemeMode;
  sidebarOpen: boolean;
  activeSidebarTab: 'toc' | 'notes' | 'bookmarks';
  isBookmarked: boolean;
  aaOpen: boolean;
  searchOpen: boolean;
  streakDays: number;
  bionicActive: boolean;
  focusModeActive: boolean;
  onToggleSidebar: () => void;
  onSelectSidebarTab: (tab: 'toc' | 'notes' | 'bookmarks') => void;
  onToggleBookmark: () => void;
  onToggleAA: () => void;
  onToggleSearch: () => void;
  onOpenReadingGoals: () => void;
  onOpenBookFile: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export const TopToolbar: React.FC<ToolbarProps> = ({
  visible,
  title,
  author,
  theme,
  sidebarOpen,
  activeSidebarTab,
  isBookmarked,
  aaOpen,
  searchOpen,
  streakDays,
  bionicActive,
  focusModeActive,
  onToggleSidebar,
  onSelectSidebarTab,
  onToggleBookmark,
  onToggleAA,
  onToggleSearch,
  onOpenReadingGoals,
  onOpenBookFile,
  onPrevPage,
  onNextPage,
  canPrev,
  canNext,
}) => {
  const currentTheme = THEME_CONFIGS[theme];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 h-11 transition-all duration-300 ease-in-out border-b backdrop-blur-md flex items-center justify-between px-3.5 select-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      style={{
        backgroundColor: currentTheme.toolbarBg,
        borderColor: currentTheme.toolbarBorder,
        color: currentTheme.text,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Book Reader Toolbar"
    >
      {/* Left zone: Sidebar & navigation buttons */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer ${
            sidebarOpen ? 'bg-black/10 dark:bg-white/15' : ''
          }`}
          title="Toggle Sidebar (Cmd+S)"
          aria-label="Toggle Sidebar"
        >
          <SidebarIcon className="w-4 h-4 stroke-[1.5]" />
        </button>

        <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

        <button
          onClick={() => {
            if (!sidebarOpen) onToggleSidebar();
            onSelectSidebarTab('toc');
          }}
          className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer ${
            sidebarOpen && activeSidebarTab === 'toc' ? 'bg-black/10 dark:bg-white/15' : ''
          }`}
          title="Table of Contents"
          aria-label="Table of Contents"
        >
          <List className="w-4 h-4 stroke-[1.5]" />
        </button>

        <button
          onClick={() => {
            if (!sidebarOpen) onToggleSidebar();
            onSelectSidebarTab('notes');
          }}
          className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer ${
            sidebarOpen && activeSidebarTab === 'notes' ? 'bg-black/10 dark:bg-white/15' : ''
          }`}
          title="Notes & Highlights"
          aria-label="Notes & Highlights"
        >
          <FileText className="w-4 h-4 stroke-[1.5]" />
        </button>

        <button
          onClick={() => {
            if (!sidebarOpen) onToggleSidebar();
            onSelectSidebarTab('bookmarks');
          }}
          className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer ${
            sidebarOpen && activeSidebarTab === 'bookmarks' ? 'bg-black/10 dark:bg-white/15' : ''
          }`}
          title="Bookmarks list"
          aria-label="Bookmarks list"
        >
          <BookmarkIcon className="w-4 h-4 stroke-[1.5]" />
        </button>

        {/* Quick Prev / Next page buttons */}
        <div className="hidden sm:flex items-center space-x-0.5 ml-1.5">
          <button
            onClick={onPrevPage}
            disabled={!canPrev}
            aria-label="Previous Page"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              canPrev ? 'hover:bg-black/5 dark:hover:bg-white/10' : 'opacity-30 cursor-not-allowed'
            }`}
            title="Previous page (Left arrow)"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2]" />
          </button>
          <button
            onClick={onNextPage}
            disabled={!canNext}
            aria-label="Next Page"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              canNext ? 'hover:bg-black/5 dark:hover:bg-white/10' : 'opacity-30 cursor-not-allowed'
            }`}
            title="Next page (Right arrow)"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Center zone: Book Title */}
      <div className="flex-1 text-center truncate px-3 pointer-events-none">
        <span 
          className="text-[12px] font-medium tracking-tight opacity-75"
          style={{ color: currentTheme.text }}
        >
          {title} {author ? `— ${author}` : ''}
        </span>
      </div>

      {/* Right zone: Reading Goals, Open, AA, Search, Bookmark */}
      <div className="flex items-center space-x-1 shrink-0">
        {/* Reading Goals & Insights Button */}
        <button
          onClick={onOpenReadingGoals}
          className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[11px] font-medium flex items-center space-x-1 cursor-pointer whitespace-nowrap"
          title="Reading Goals & Insights (G)"
          aria-label="Reading Goals and Insights"
        >
          <Flame className="w-3.5 h-3.5 stroke-[1.7] text-orange-500" />
          <span className="font-mono tabular-nums text-[11px]">{streakDays}d</span>
        </button>

        <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

        <button
          onClick={onOpenBookFile}
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[11px] font-medium flex items-center space-x-1 cursor-pointer whitespace-nowrap"
          title="Open EPUB or TXT file"
          aria-label="Open EPUB or TXT file"
        >
          <Upload className="w-3.5 h-3.5 stroke-[1.5]" />
          <span className="hidden md:inline">Open</span>
        </button>

        {/* AA font & focus settings button */}
        <button
          onClick={onToggleAA}
          className={`px-2 py-1 rounded-md text-[13px] font-serif font-semibold tracking-tighter hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center relative cursor-pointer ${
            aaOpen || bionicActive || focusModeActive ? 'bg-black/10 dark:bg-white/15' : ''
          }`}
          title="Typography, Theme, Bionic Reading & Focus Mode"
          aria-label="Appearance and Font Settings"
        >
          <span className="text-[11px]">A</span>
          <span className="text-[14px] -ml-0.5">A</span>
        </button>

        {/* Search */}
        <button
          onClick={onToggleSearch}
          className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer ${
            searchOpen ? 'bg-black/10 dark:bg-white/15' : ''
          }`}
          title="Search inside book (Cmd+F)"
          aria-label="Search inside book"
        >
          <Search className="w-4 h-4 stroke-[1.5]" />
        </button>

        {/* Bookmark toggle */}
        <button
          onClick={onToggleBookmark}
          className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer ${
            isBookmarked ? 'text-amber-500 fill-amber-500' : ''
          }`}
          title={isBookmarked ? 'Remove bookmark (Cmd+B)' : 'Bookmark page (Cmd+B)'}
          aria-label="Bookmark page"
        >
          <BookmarkIcon className={`w-4 h-4 stroke-[1.5] ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </header>
  );
};
