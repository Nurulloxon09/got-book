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
  jumpHistory: number | null;
  searchHighlightQuery?: string;
  onJumpBack: () => void;
  onPageTurnLeft: () => void;
  onPageTurnRight: () => void;
  onOpenSelectionPopup: (coords: { x: number; y: number; text: string; paragraphIndex: number; existingHighlightId?: string; currentColor?: string }) => void;
}

export const ReadingArea: React.FC<ReadingAreaProps> = ({
  chapter,
  pageInChapter,
  settings,
  highlights,
  jumpHistory,
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

  // Handle text selection in reading area
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const selectedText = sel.toString().trim();
    if (selectedText.length < 2) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Check if this selection overlaps an existing highlight
    const match = highlights.find(
      (h) => h.chapterTitle === chapter?.title && h.text.includes(selectedText)
    );

    onOpenSelectionPopup({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: selectedText,
      paragraphIndex: 0,
      existingHighlightId: match?.id,
      currentColor: match?.color,
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

    // Check if this paragraph contains highlighted segments
    const matchingHighlights = pageHighlights.filter((h) =>
      para.text.includes(h.text)
    );

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
      <div key={para.globalIndex} className="relative group mb-3 last:mb-0">
        <p
          className={`book-paragraph ${isFirst && pageInChapter === 0 ? 'book-paragraph-first book-first-letter' : ''}`}
          style={{
            textAlign: settings.justified ? 'justify' : 'left',
          }}
        >
          {content}
        </p>

        {/* Small square marker in right margin if this paragraph has a note */}
        {hasNote && (
          <div
            className="absolute -right-6 top-1.5 w-2.5 h-2.5 rounded-[2px] bg-amber-400 dark:bg-amber-500 shadow-xs"
            title="Note attached"
          />
        )}
      </div>
    );
  };

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
          {/* Chapter Heading (shown on first page of chapter) */}
          {pageInChapter === 0 && chapter && (
            <header className="mb-6 text-center select-none">
              <span className="text-[12px] uppercase font-mono tracking-widest opacity-50 block mb-1">
                {chapter.pov}
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                {chapter.title}
              </h1>
            </header>
          )}

          {/* Book Content Paragraphs */}
          <div className="space-y-0">
            {currentParagraphs.map((para, idx) =>
              renderParagraph(para, idx === 0)
            )}
          </div>
        </article>
      </div>

      {/* Footer line: Apple Books 3 parts (Back to page N | Page N | N pages left in this chapter) */}
      <footer
        className="h-8 px-8 sm:px-14 flex items-center justify-between text-[11px] font-mono select-none opacity-65 z-30 transition-opacity"
        style={{ color: currentTheme.secondaryText }}
      >
        {/* Left: Back to page N (if jumped from note/search) */}
        <div>
          {jumpHistory !== null ? (
            <button
              onClick={onJumpBack}
              className="hover:underline flex items-center space-x-1 font-sans text-blue-500 font-medium cursor-pointer"
            >
              <span>← Back to page {jumpHistory}</span>
            </button>
          ) : (
            <span className="opacity-0">placeholder</span>
          )}
        </div>

        {/* Center: Page N (exact sequential page number, e.g. Page 5, Page 6, Page 7, Page 8, Page 9... Page 14, Page 15) */}
        <div className="font-sans font-medium tracking-wide">
          Page {actualGlobalPageNumber}
        </div>

        {/* Right: N pages left in this chapter */}
        <div className="font-sans">
          {pagesLeftInChapter === 0
            ? 'End of chapter'
            : `${pagesLeftInChapter} page${pagesLeftInChapter === 1 ? '' : 's'} left in chapter`}
        </div>
      </footer>
    </main>
  );
};
