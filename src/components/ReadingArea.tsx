import React, { useMemo } from 'react';
import { 
  BookChapter, 
  ReaderSettings, 
  THEME_CONFIGS, 
  HighlightItem,
  HIGHLIGHT_COLORS
} from '../types/reader';

interface ReadingAreaProps {
  chapter: BookChapter | null;
  pageInChapter: number;
  settings: ReaderSettings;
  highlights: HighlightItem[];
  jumpHistory: number[];
  bookTotalPages?: number;
  searchHighlightQuery?: string;
  onJumpBack: () => void;
  onPageTurnLeft: () => void;
  onPageTurnRight: () => void;
  onOpenSelectionPopup: (coords: { 
    x: number; 
    y: number; 
    text: string; 
    paragraphIndex: number; 
    existingHighlightId?: string; 
    currentColor?: string;
    pageContext?: string;
  }) => void;
}

export const ReadingArea: React.FC<ReadingAreaProps> = ({
  chapter,
  pageInChapter,
  settings,
  highlights,
  jumpHistory,
  bookTotalPages = 892,
  searchHighlightQuery,
  onJumpBack,
  onPageTurnLeft,
  onPageTurnRight,
  onOpenSelectionPopup,
}) => {
  const currentTheme = THEME_CONFIGS[settings.theme];

  // Font class selection
  const fontClass = useMemo(() => {
    switch (settings.fontFamily) {
      case 'Charter': return 'font-charter';
      case 'Georgia': return 'font-georgia';
      case 'Palatino': return 'font-palatino';
      case 'system-ui': return 'font-system';
      case 'Literata':
      default: return 'font-literata';
    }
  }, [settings.fontFamily]);

  // Current page object from chapter.pages
  const currentPageObj = chapter?.pages?.[pageInChapter] || null;
  const currentParagraphs = useMemo(() => {
    if (!currentPageObj) return [];
    return currentPageObj.paragraphs.map((text, idx) => ({
      globalIndex: idx,
      text,
    }));
  }, [currentPageObj]);

  const totalPagesInChapter = chapter?.pages?.length || 1;
  const actualGlobalPageNumber = currentPageObj?.pageNumber ?? ((chapter?.startPage || 1) + pageInChapter);
  const pagesLeftInChapter = Math.max(0, totalPagesInChapter - 1 - pageInChapter);

  // Global reading progress percentage
  const globalProgressPercent = Math.min(
    100,
    Math.max(1, Math.round((actualGlobalPageNumber / Math.max(1, bookTotalPages)) * 100))
  );

  // Handle text selection in reading area with paragraph detection
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const selectedText = sel.toString().trim();
    if (selectedText.length < 2) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Determine the paragraph index by finding closest [data-para-idx]
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    const paraEl = (node as HTMLElement | null)?.closest('[data-para-idx]');
    const detectedParaIndex = paraEl ? parseInt(paraEl.getAttribute('data-para-idx') || '0', 10) : 0;

    // Check if this selection overlaps an existing highlight on this page
    const match = highlights.find(
      (h) =>
        h.chapterTitle === chapter?.title &&
        (h.pageNumber === actualGlobalPageNumber || !h.pageNumber) &&
        h.text.includes(selectedText)
    );

    // Provide page context for AI
    const pageContext = currentPageObj?.text || selectedText;

    onOpenSelectionPopup({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: selectedText,
      paragraphIndex: detectedParaIndex,
      existingHighlightId: match?.id,
      currentColor: match?.color,
      pageContext,
    });
  };

  // Highlights on current chapter & page
  const pageHighlights = useMemo(() => {
    if (!chapter) return [];
    return highlights.filter(
      (h) => h.chapterTitle === chapter.title && (h.pageNumber === actualGlobalPageNumber || !h.pageNumber)
    );
  }, [chapter, highlights, actualGlobalPageNumber]);

  // Render paragraph with highlights and notes marker
  const renderParagraph = (para: { globalIndex: number; text: string }, isFirst: boolean) => {
    let content: React.ReactNode = para.text;

    // Strict paragraph matching: match if paragraphIndex matches or fallback for legacy highlights
    const matchingHighlights = pageHighlights.filter((h) => {
      if (typeof h.paragraphIndex === 'number' && h.paragraphIndex > 0) {
        return h.paragraphIndex === para.globalIndex && para.text.includes(h.text);
      }
      if (h.paragraphIndex === 0) {
        // If 0, only match paragraph 0 or if only one paragraph contains the text
        const otherMatches = currentParagraphs.filter((p) => p.globalIndex !== 0 && p.text.includes(h.text));
        if (otherMatches.length === 0) {
          return para.text.includes(h.text);
        }
        return para.globalIndex === 0 && para.text.includes(h.text);
      }
      return para.text.includes(h.text);
    });

    const hasNote = matchingHighlights.some((h) => !!h.note);

    if (matchingHighlights.length > 0) {
      let parts: { text: string; highlight?: HighlightItem }[] = [{ text: para.text }];

      for (const hl of matchingHighlights) {
        const nextParts: { text: string; highlight?: HighlightItem }[] = [];
        for (const part of parts) {
          if (part.highlight) {
            nextParts.push(part);
            continue;
          }
          const idx = part.text.indexOf(hl.text);
          if (idx !== -1) {
            if (idx > 0) nextParts.push({ text: part.text.substring(0, idx) });
            nextParts.push({ text: hl.text, highlight: hl });
            if (idx + hl.text.length < part.text.length) {
              nextParts.push({ text: part.text.substring(idx + hl.text.length) });
            }
          } else {
            nextParts.push(part);
          }
        }
        parts = nextParts;
      }

      content = parts.map((part, i) => {
        if (!part.highlight) return <span key={i}>{part.text}</span>;
        const colorObj = HIGHLIGHT_COLORS.find((c) => c.id === part.highlight!.color) || HIGHLIGHT_COLORS[0];
        
        if (part.highlight.color === 'underline') {
          return (
            <span
              key={i}
              className="underline decoration-blue-500 underline-offset-4 decoration-2"
              title={part.highlight.note ? `Note: ${part.highlight.note}` : undefined}
            >
              {part.text}
            </span>
          );
        }

        return (
          <mark
            key={i}
            className="rounded px-0.5 transition-colors"
            style={{
              backgroundColor: colorObj.bg,
              color: 'inherit',
            }}
            title={part.highlight.note ? `Note: ${part.highlight.note}` : undefined}
          >
            {part.text}
          </mark>
        );
      });
    }

    return (
      <div 
        key={para.globalIndex} 
        data-para-idx={para.globalIndex}
        className="relative group mb-3 last:mb-0"
      >
        <p
          className={`book-paragraph ${isFirst && pageInChapter === 0 ? 'book-paragraph-first book-first-letter' : ''}`}
          style={{
            textAlign: settings.justified ? 'justify' : 'left',
          }}
        >
          {content}
        </p>

        {/* Small square marker in right margin if this paragraph has a note (safely placed without clipping) */}
        {hasNote && (
          <div
            className="absolute -right-4 sm:-right-5 top-1.5 w-2.5 h-2.5 rounded-[2px] bg-amber-400 dark:bg-amber-500 shadow-xs pointer-events-none"
            title="Note attached"
          />
        )}
      </div>
    );
  };

  const lastJumpPage = jumpHistory.length > 0 ? jumpHistory[jumpHistory.length - 1] : null;

  return (
    <main
      className="relative flex-1 w-full h-full flex flex-col justify-between overflow-hidden select-text pt-13 pb-7"
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
      onMouseUp={handleMouseUp}
    >
      {/* Click zones on left & right edges for turning pages */}
      <div
        className="absolute top-12 bottom-10 left-0 w-16 sm:w-28 z-20 cursor-w-resize select-none"
        onClick={onPageTurnLeft}
        title="Previous Page (Click or Left Arrow)"
      />
      <div
        className="absolute top-12 bottom-10 right-0 w-16 sm:w-28 z-20 cursor-e-resize select-none"
        onClick={onPageTurnRight}
        title="Next Page (Click or Right Arrow)"
      />

      {/* Centered reading column (Apple Books max 62-68ch, large margins) */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-y-auto px-4"
        style={{
          paddingLeft: `${settings.marginPercent}%`,
          paddingRight: `${settings.marginPercent}%`,
        }}
      >
        <article
          className={`w-full max-w-[68ch] mx-auto ${fontClass} book-body-text transition-all duration-150 select-text my-auto py-4`}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineSpacing,
          }}
        >
          {/* Chapter Heading on first page of chapter */}
          {pageInChapter === 0 && chapter ? (
            <header className="mb-6 text-center select-none">
              <span className="text-[12px] uppercase font-mono tracking-widest opacity-50 block mb-1">
                {chapter.pov}
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                {chapter.title}
              </h1>
            </header>
          ) : (
            /* Persistent chapter indicator on subsequent pages */
            chapter && (
              <header className="mb-4 text-center select-none opacity-40 hover:opacity-75 transition-opacity">
                <span className="text-[11px] font-serif uppercase tracking-widest block font-medium">
                  {chapter.title}
                </span>
              </header>
            )
          )}

          {/* Book Content Paragraphs */}
          <div className="space-y-0">
            {currentParagraphs.map((para, idx) =>
              renderParagraph(para, idx === 0)
            )}
          </div>
        </article>
      </div>

      {/* Footer line: Apple Books 3 parts (Back to page N | Page N of Total · % | N pages left in this chapter) */}
      <footer
        className="h-8 px-6 sm:px-12 flex items-center justify-between text-[11px] font-mono select-none opacity-70 z-30 transition-opacity"
        style={{ color: currentTheme.secondaryText }}
      >
        {/* Left: Back to page N (if jumped from note/search) */}
        <div className="min-w-[120px]">
          {lastJumpPage !== null ? (
            <button
              onClick={onJumpBack}
              className="hover:underline flex items-center space-x-1 font-sans text-blue-500 font-medium cursor-pointer"
            >
              <span>← Back to page {lastJumpPage}</span>
            </button>
          ) : (
            <span className="opacity-0">placeholder</span>
          )}
        </div>

        {/* Center: Global Page Progress with total pages and % */}
        <div className="font-sans font-medium tracking-wide text-center">
          Page {actualGlobalPageNumber} of {bookTotalPages} · {globalProgressPercent}%
        </div>

        {/* Right: N pages left in this chapter */}
        <div className="font-sans min-w-[120px] text-right">
          {pagesLeftInChapter === 0
            ? 'End of chapter'
            : `${pagesLeftInChapter} page${pagesLeftInChapter === 1 ? '' : 's'} left in chapter`}
        </div>
      </footer>

      {/* 2px thin theme-aware bottom reading progress bar */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black/5 dark:bg-white/5 select-none pointer-events-none">
        <div
          className="h-full bg-blue-500/70 transition-all duration-200"
          style={{ width: `${globalProgressPercent}%` }}
        />
      </div>
    </main>
  );
};
