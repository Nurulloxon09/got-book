import React, { useMemo, useState, useEffect } from 'react';
import { Eye, ChevronUp, ChevronDown, X } from 'lucide-react';
import { 
  BookChapter, 
  ReaderSettings, 
  THEME_CONFIGS, 
  HighlightItem,
  HIGHLIGHT_COLORS
} from '../types/reader';
import { tokenizeBionicText, calculateReadingEstimate } from '../utils/features';

interface ReadingAreaProps {
  chapter: BookChapter | null;
  pageInChapter: number;
  settings: ReaderSettings;
  highlights: HighlightItem[];
  jumpHistory: number[];
  bookTotalPages?: number;
  searchHighlightQuery?: string;
  readingSpeedWpm: number;
  onJumpBack: () => void;
  onPageTurnLeft: () => void;
  onPageTurnRight: () => void;
  onOpenReadingGoals: () => void;
  onExitFocusMode: () => void;
  onInstantHighlightSelection: (payload: { 
    x: number; 
    y: number; 
    text: string; 
    paragraphIndex: number; 
    existingHighlightId?: string; 
    currentColor?: string;
    existingNote?: string;
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
  readingSpeedWpm,
  onJumpBack,
  onPageTurnLeft,
  onPageTurnRight,
  onOpenReadingGoals,
  onExitFocusMode,
  onInstantHighlightSelection,
}) => {
  const currentTheme = THEME_CONFIGS[settings.theme];
  const [focusedParaIndex, setFocusedParaIndex] = useState<number>(0);

  // Reset focused paragraph to 0 whenever chapter or page changes
  useEffect(() => {
    setFocusedParaIndex(0);
  }, [chapter?.id, pageInChapter]);

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

  // Current page object from chapter.pages (filtering out duplicate chapter heading paragraphs on page 0)
  const currentPageObj = chapter?.pages?.[pageInChapter] || null;
  const currentParagraphs = useMemo(() => {
    if (!currentPageObj) return [];
    const rawParas = currentPageObj.paragraphs;
    const filtered = rawParas.filter((text, idx) => {
      if (pageInChapter === 0 && idx === 0 && chapter) {
        const clean = text.trim().toUpperCase();
        if (
          clean === chapter.title.trim().toUpperCase() ||
          clean === chapter.pov.trim().toUpperCase()
        ) {
          return false;
        }
      }
      return true;
    });
    return filtered.map((text, idx) => ({
      globalIndex: idx,
      text:
        pageInChapter === 0 && idx === 0 && text.includes('”') && !text.trim().startsWith('“') && !text.trim().startsWith('"')
          ? `“${text.trim()}`
          : text,
    }));
  }, [currentPageObj, pageInChapter, chapter]);

  const totalPagesInChapter = chapter?.pages?.length || 1;
  const actualGlobalPageNumber = currentPageObj?.pageNumber ?? ((chapter?.startPage || 1) + pageInChapter);
  const pagesLeftInChapter = Math.max(0, totalPagesInChapter - 1 - pageInChapter);

  const chapterTimeEstimate = useMemo(
    () => calculateReadingEstimate(pagesLeftInChapter, 310, readingSpeedWpm),
    [pagesLeftInChapter, readingSpeedWpm]
  );

  // Global reading progress percentage
  const globalProgressPercent = Math.min(
    100,
    Math.max(1, Math.round((actualGlobalPageNumber / Math.max(1, bookTotalPages)) * 100))
  );

  // Helper to render text with optional Bionic Reading fixation bolding
  const renderFormattedSegment = (text: string, keyPrefix: string) => {
    if (!settings.bionicReading) {
      return text;
    }
    const tokens = tokenizeBionicText(text, settings.bionicIntensity);
    return tokens.map((tok, idx) => {
      if (tok.isWhitespace) {
        return <React.Fragment key={`${keyPrefix}-ws-${idx}`}>{tok.raw}</React.Fragment>;
      }
      return (
        <React.Fragment key={`${keyPrefix}-w-${idx}`}>
          {tok.leadingPunct}
          <strong className="font-bold">{tok.boldPart}</strong>
          <span className="opacity-90">{tok.regularPart}</span>
          {tok.trailingPunct}
        </React.Fragment>
      );
    });
  };

  // Handle text selection in reading area with instant highlight + note creation
  const handleMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    // Only process primary (left) mouse button releases
    if (e.button !== 0) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const selectedText = sel.toString().trim();
    if (selectedText.length < 1) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    const paraEl = (node as HTMLElement | null)?.closest('[data-para-idx]');
    if (!paraEl) return;

    const detectedParaIndex = parseInt(paraEl.getAttribute('data-para-idx') || '0', 10);

    const match = highlights.find(
      (h) =>
        h.chapterTitle === chapter?.title &&
        (h.pageNumber === actualGlobalPageNumber || !h.pageNumber) &&
        (h.text.includes(selectedText) || selectedText.includes(h.text))
    );

    const pageContext = currentPageObj?.text || selectedText;

    // Clear raw browser range so the newly applied <mark> highlight & note input take focus cleanly
    sel.removeAllRanges();

    onInstantHighlightSelection({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: selectedText,
      paragraphIndex: detectedParaIndex,
      existingHighlightId: match?.id,
      currentColor: match?.color,
      existingNote: match?.note,
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

  // Render paragraph with highlights, Bionic Reading, Focus Mode spotlight, and notes marker
  const renderParagraph = (para: { globalIndex: number; text: string }, isFirst: boolean) => {
    let content: React.ReactNode = renderFormattedSegment(para.text, `p-${para.globalIndex}`);

    const matchingHighlights = pageHighlights.filter((h) => {
      if (typeof h.paragraphIndex === 'number' && h.paragraphIndex > 0) {
        return h.paragraphIndex === para.globalIndex && para.text.includes(h.text);
      }
      if (h.paragraphIndex === 0) {
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
        const segKey = `p-${para.globalIndex}-pt-${i}`;
        if (!part.highlight) {
          return <span key={segKey}>{renderFormattedSegment(part.text, segKey)}</span>;
        }
        const hl = part.highlight;
        const colorObj = HIGHLIGHT_COLORS.find((c) => c.id === hl.color) || HIGHLIGHT_COLORS[0];

        const handleHighlightClick = (e: React.MouseEvent<HTMLElement>) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          onInstantHighlightSelection({
            x: rect.left + rect.width / 2,
            y: rect.top,
            text: hl.text,
            paragraphIndex: para.globalIndex,
            existingHighlightId: hl.id,
            currentColor: hl.color,
            existingNote: hl.note,
            pageContext: currentPageObj?.text || hl.text,
          });
        };

        if (hl.color === 'underline') {
          return (
            <span
              key={segKey}
              onClick={handleHighlightClick}
              className="underline decoration-blue-500 underline-offset-4 decoration-2 cursor-pointer"
              title={hl.note ? `Note: ${hl.note}` : 'Click to edit highlight or note'}
            >
              {renderFormattedSegment(part.text, segKey)}
            </span>
          );
        }

        return (
          <mark
            key={segKey}
            onClick={handleHighlightClick}
            className="rounded px-0.5 transition-colors cursor-pointer"
            style={{
              backgroundColor: colorObj.bg,
              color: 'inherit',
            }}
            title={hl.note ? `Note: ${hl.note}` : 'Click to edit highlight or note'}
          >
            {renderFormattedSegment(part.text, segKey)}
          </mark>
        );
      });
    }

    const isFocused = !settings.focusMode || focusedParaIndex === para.globalIndex;

    return (
      <div
        key={para.globalIndex}
        data-para-idx={para.globalIndex}
        onMouseEnter={() => {
          if (settings.focusMode) {
            setFocusedParaIndex(para.globalIndex);
          }
        }}
        onClick={() => {
          if (settings.focusMode) {
            setFocusedParaIndex(para.globalIndex);
          }
        }}
        className={`relative group mb-3 last:mb-0 transition-opacity duration-150 ${
          isFocused ? 'opacity-100' : 'opacity-25 hover:opacity-60'
        }`}
      >
        <p
          className={`book-paragraph ${
            isFirst && pageInChapter === 0 && !settings.bionicReading && matchingHighlights.length === 0
              ? 'book-paragraph-first book-first-letter'
              : isFirst && pageInChapter === 0
              ? 'book-paragraph-first'
              : ''
          }`}
          style={{
            textAlign: settings.justified ? 'justify' : 'left',
          }}
        >
          {content}
        </p>

        {/* Small square marker in right margin if this paragraph has a note */}
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

      {/* Floating Focus Mode Controller Bar when Focus Mode is active */}
      {settings.focusMode && currentParagraphs.length > 0 && (
        <div
          className="fixed top-14 left-5 z-30 flex items-center space-x-2 px-3 py-1.5 rounded-xl border shadow-lg backdrop-blur-md text-xs select-none"
          style={{
            backgroundColor: currentTheme.popoverBg,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
        >
          <Eye className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-medium">
            Focus Mode · Paragraph {focusedParaIndex + 1} of {currentParagraphs.length}
          </span>
          <div className="flex items-center space-x-0.5 ml-1">
            <button
              onClick={() => setFocusedParaIndex((i) => Math.max(0, i - 1))}
              disabled={focusedParaIndex <= 0}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
              title="Previous Paragraph"
              aria-label="Focus Previous Paragraph"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() =>
                setFocusedParaIndex((i) => Math.min(currentParagraphs.length - 1, i + 1))
              }
              disabled={focusedParaIndex >= currentParagraphs.length - 1}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
              title="Next Paragraph"
              aria-label="Focus Next Paragraph"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={onExitFocusMode}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-65 hover:opacity-100 cursor-pointer"
            title="Exit Focus Mode"
            aria-label="Exit Focus Mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              <header className="mb-4 text-center select-none opacity-45 hover:opacity-80 transition-opacity">
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

      {/* Footer line: Apple Books 3 parts (Back to page N | Page N of Total · % | N pages left in this chapter · ~Xm) */}
      <footer
        className="h-8 px-6 sm:px-12 flex items-center justify-between text-[11px] font-mono tabular-nums select-none opacity-75 z-30 transition-opacity"
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
        <button
          onClick={onOpenReadingGoals}
          className="font-sans font-medium tracking-wide text-center hover:underline cursor-pointer"
          title="Open Reading Goals & Insights"
        >
          Page {actualGlobalPageNumber} of {bookTotalPages} · {globalProgressPercent}%
        </button>

        {/* Right: N pages left in this chapter + estimated reading time */}
        <button
          onClick={onOpenReadingGoals}
          className="font-sans min-w-[120px] text-right hover:underline cursor-pointer"
          title="Open Reading Goals & Insights"
        >
          {pagesLeftInChapter === 0
            ? 'End of chapter'
            : `${pagesLeftInChapter} page${pagesLeftInChapter === 1 ? '' : 's'} left · ~${chapterTimeEstimate.formatted}`}
        </button>
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
