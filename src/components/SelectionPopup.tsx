import React, { useState, useMemo, useEffect } from 'react';
import { 
  Underline, 
  Copy, 
  MoreHorizontal, 
  Search, 
  Globe, 
  BookOpen, 
  Share2, 
  Trash2,
  Check,
  Sparkles,
  UserCheck,
  Loader2,
  CornerDownLeft
} from 'lucide-react';
import { HIGHLIGHT_COLORS, HighlightColor } from '../types/reader';
import { askAboutPage, lookupCharacter, hasGeminiKey } from '../utils/ai';

export interface SelectionState {
  text: string;
  x: number;
  y: number;
  paragraphIndex: number;
  existingHighlightId?: string;
  currentColor?: string;
  existingNote?: string;
}

interface SelectionPopupProps {
  selection: SelectionState | null;
  chapterTitle?: string;
  pageContext?: string;
  onChangeColor: (color: HighlightColor['id']) => void;
  onUpdateNoteLive: (note: string) => void;
  onRemoveHighlight: (id: string) => void;
  onSearchBook: (query: string) => void;
  onClose: () => void;
}

export const SelectionPopup: React.FC<SelectionPopupProps> = ({
  selection,
  chapterTitle = 'A Game of Thrones',
  pageContext = '',
  onChangeColor,
  onUpdateNoteLive,
  onRemoveHighlight,
  onSearchBook,
  onClose,
}) => {
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightColor['id']>('yellow');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string>('');

  const isGeminiAvailable = hasGeminiKey();

  useEffect(() => {
    if (selection) {
      setNoteText(selection.existingNote || '');
      setSelectedColor((selection.currentColor as HighlightColor['id']) || 'yellow');
      setShowMoreMenu(false);
      setAiResponse(null);
      setAiLoading(false);
    }
  }, [selection?.existingHighlightId, selection?.text]);

  useEffect(() => {
    if (selection && selection.existingNote !== undefined && selection.existingNote !== noteText) {
      setNoteText(selection.existingNote);
    }
  }, [selection?.existingNote]);

  const isLikelyCharacter = useMemo(() => {
    if (!selection) return false;
    const trimmed = selection.text.trim();
    const words = trimmed.split(/\s+/);
    return (
      words.length >= 1 &&
      words.length <= 3 &&
      trimmed.length >= 3 &&
      trimmed.length <= 35 &&
      words.every((w) => /^[A-Z][a-zA-Z'’-]*$/.test(w))
    );
  }, [selection]);

  if (!selection) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selection.text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 650);
  };

  const handleSearchWeb = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(selection.text)}`, '_blank');
    onClose();
  };

  const handleSearchWikipedia = () => {
    window.open(`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(selection.text)}`, '_blank');
    onClose();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Quote from A Game of Thrones',
        text: `"${selection.text}"`,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const handleNoteChange = (val: string) => {
    setNoteText(val);
    onUpdateNoteLive(val);
  };

  const handleColorPick = (colorId: HighlightColor['id']) => {
    setSelectedColor(colorId);
    onChangeColor(colorId);
  };

  const handleAskAI = async () => {
    setAiLoading(true);
    setAiTitle('Explanation');
    setAiResponse(null);
    try {
      const res = await askAboutPage(selection.text, pageContext);
      setAiResponse(res);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLookupCharacter = async () => {
    setAiLoading(true);
    setAiTitle(`Character: ${selection.text.trim()}`);
    setAiResponse(null);
    try {
      const res = await lookupCharacter(selection.text.trim(), chapterTitle);
      setAiResponse(res);
    } finally {
      setAiLoading(false);
    }
  };

  // Minimalist compact popover positioning
  const popupWidth = 248;
  const left = Math.max(16, Math.min(window.innerWidth - popupWidth - 16, selection.x - popupWidth / 2));
  const estimatedHeight = aiResponse || aiLoading ? 210 : showMoreMenu ? 195 : 88;
  const maxTop = Math.max(56, window.innerHeight - estimatedHeight - 16);
  const top = Math.max(56, Math.min(maxTop, selection.y - 84));

  return (
    <div
      data-selection-popup="true"
      className="fixed z-50 rounded-xl bg-white/95 dark:bg-[#1f1f22]/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.22)] border border-black/8 dark:border-white/10 p-2 text-neutral-800 dark:text-neutral-100 select-none text-xs transition-all"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${popupWidth}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Minimalist Top Bar: Color swatches + Underline + Quick icon actions */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center space-x-1.5">
          {HIGHLIGHT_COLORS.map((c) => {
            const isChosen = selectedColor === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleColorPick(c.id)}
                className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                  isChosen
                    ? 'scale-115 ring-1.5 ring-neutral-900/70 dark:ring-white/90 ring-offset-1 ring-offset-white dark:ring-offset-[#1f1f22]'
                    : 'opacity-80 hover:opacity-100 hover:scale-110'
                }`}
                style={{ backgroundColor: c.accent }}
                title={`Highlight ${c.name}`}
                aria-label={`Highlight ${c.name}`}
              />
            );
          })}

          <button
            onClick={() => handleColorPick('underline')}
            className={`w-5 h-5 rounded-md flex items-center justify-center transition cursor-pointer ${
              selectedColor === 'underline'
                ? 'bg-black/10 dark:bg-white/15 text-neutral-900 dark:text-white'
                : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Underline text"
            aria-label="Underline text"
          >
            <Underline className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center space-x-0.5">
          <button
            onClick={handleCopy}
            className="p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            title={copied ? 'Copied' : 'Copy text'}
            aria-label="Copy text"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {selection.existingHighlightId && (
            <button
              onClick={() => onRemoveHighlight(selection.existingHighlightId!)}
              className="p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition cursor-pointer"
              title="Remove Highlight"
              aria-label="Remove Highlight"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`p-1 rounded-md transition cursor-pointer ${
              showMoreMenu
                ? 'bg-black/10 dark:bg-white/15 opacity-100'
                : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="More options"
            aria-label="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimalist Note Input */}
      <div className="mt-1.5 pt-1.5 border-t border-black/6 dark:border-white/8 flex items-center space-x-1">
        <input
          type="text"
          autoFocus
          value={noteText}
          onChange={(e) => handleNoteChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Add a note..."
          aria-label="Write a note for this highlight"
          className="w-full px-2 py-1 text-[11px] rounded-md bg-black/[0.03] dark:bg-white/[0.04] focus:bg-black/[0.05] dark:focus:bg-white/[0.07] focus:outline-none placeholder:opacity-45 font-sans"
        />
        <button
          onClick={onClose}
          className="p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
          title="Save & close (Enter)"
          aria-label="Done"
        >
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>

      {/* AI Response Card */}
      {(aiLoading || aiResponse) && (
        <div className="mt-1.5 p-2 rounded-lg bg-black/4 dark:bg-white/5 text-[11px] leading-relaxed">
          <div className="flex items-center justify-between mb-1 opacity-60 font-mono text-[10px]">
            <span>{aiTitle}</span>
            <button
              onClick={() => {
                setAiResponse(null);
                setAiLoading(false);
              }}
              className="hover:opacity-100 opacity-60 cursor-pointer"
            >
              ✕
            </button>
          </div>
          {aiLoading ? (
            <div className="flex items-center space-x-1.5 py-0.5 opacity-60">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <p className="font-serif select-text max-h-32 overflow-y-auto pr-1">
              {aiResponse}
            </p>
          )}
        </div>
      )}

      {/* Compact More Menu */}
      {showMoreMenu && (
        <div className="mt-1.5 pt-1 border-t border-black/6 dark:border-white/8 space-y-0.5 text-[11px]">
          <button
            onClick={() => {
              onSearchBook(selection.text);
              onClose();
            }}
            className="w-full text-left px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 cursor-pointer"
          >
            <BookOpen className="w-3 h-3 opacity-55" />
            <span>Search Book</span>
          </button>

          <button
            onClick={handleSearchWeb}
            className="w-full text-left px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 cursor-pointer"
          >
            <Globe className="w-3 h-3 opacity-55" />
            <span>Search Web</span>
          </button>

          <button
            onClick={handleSearchWikipedia}
            className="w-full text-left px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 cursor-pointer"
          >
            <Search className="w-3 h-3 opacity-55" />
            <span>Wikipedia</span>
          </button>

          <button
            onClick={handleShare}
            className="w-full text-left px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 cursor-pointer"
          >
            <Share2 className="w-3 h-3 opacity-55" />
            <span>Share Quote</span>
          </button>

          {isGeminiAvailable && (
            <button
              onClick={handleAskAI}
              disabled={aiLoading}
              className="w-full text-left px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 text-blue-600 dark:text-blue-400 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>Ask AI</span>
            </button>
          )}

          {isGeminiAvailable && isLikelyCharacter && (
            <button
              onClick={handleLookupCharacter}
              disabled={aiLoading}
              className="w-full text-left px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 text-purple-600 dark:text-purple-400 cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3 h-3" />
              <span>Who is this?</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
