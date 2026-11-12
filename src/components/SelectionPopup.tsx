import React, { useState, useMemo } from 'react';
import { 
  Underline, 
  MessageSquare, 
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
  Loader2
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
}

interface SelectionPopupProps {
  selection: SelectionState | null;
  chapterTitle?: string;
  pageContext?: string;
  onApplyHighlight: (color: HighlightColor['id'], note?: string) => void;
  onRemoveHighlight: (id: string) => void;
  onSearchBook: (query: string) => void;
  onClose: () => void;
}

export const SelectionPopup: React.FC<SelectionPopupProps> = ({
  selection,
  chapterTitle = 'A Game of Thrones',
  pageContext = '',
  onApplyHighlight,
  onRemoveHighlight,
  onSearchBook,
  onClose,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string>('');

  const isGeminiAvailable = hasGeminiKey();

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
  }, [selection?.text]);

  if (!selection) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selection.text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 800);
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

  const handleSaveNote = () => {
    const color = (selection.currentColor as HighlightColor['id']) || 'yellow';
    onApplyHighlight(color, noteText.trim());
    setNoteText('');
    setShowNoteInput(false);
    onClose();
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

  // Position calculation to stay comfortably within viewport and clear top toolbar
  const popupWidth = 285;
  const left = Math.max(16, Math.min(window.innerWidth - popupWidth - 16, selection.x - popupWidth / 2));
  const estimatedHeight = showNoteInput ? 230 : (aiResponse || aiLoading ? 240 : 130);
  const maxTop = Math.max(60, window.innerHeight - estimatedHeight - 20);
  const top = Math.max(60, Math.min(maxTop, selection.y - 75));

  return (
    <div
      className="fixed z-50 rounded-[12px] bg-white dark:bg-[#252528] shadow-2xl border border-black/10 dark:border-white/10 p-2 text-neutral-800 dark:text-neutral-100 select-none text-[12px] transition-all"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${popupWidth}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Row 1: 5 Color dots + Underline button */}
      <div className="flex items-center justify-between px-1.5 py-1">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => onApplyHighlight(c.id)}
            className="w-5 h-5 rounded-full flex items-center justify-center hover:scale-125 transition-transform"
            style={{ backgroundColor: c.accent }}
            title={`Highlight ${c.name}`}
          />
        ))}

        <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

        {/* Underline button */}
        <button
          onClick={() => onApplyHighlight('underline')}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center justify-center font-serif text-[13px] font-medium"
          title="Underline text"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: Actions Menu */}
      <div className="mt-1 pt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] px-1 font-medium">
        <button
          onClick={() => setShowNoteInput(!showNoteInput)}
          className="flex items-center space-x-1 py-1 px-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          <MessageSquare className="w-3 h-3 opacity-60" />
          <span>Add Note</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 py-1 px-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="flex items-center space-x-1 py-1 px-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          <MoreHorizontal className="w-3 h-3 opacity-60" />
          <span>More</span>
        </button>

        {selection.existingHighlightId && (
          <button
            onClick={() => onRemoveHighlight(selection.existingHighlightId!)}
            className="p-1 rounded hover:bg-red-500/10 text-red-500 transition ml-0.5"
            title="Remove Highlight"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Row 3: AI Actions row (Ask AI & Who is this?) */}
      {isGeminiAvailable && (
        <div className="mt-1.5 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center space-x-1 px-1">
          <button
            onClick={handleAskAI}
            disabled={aiLoading}
            className="flex-1 py-1 px-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center space-x-1 text-[10px] transition disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>Ask AI</span>
          </button>

          {isLikelyCharacter && (
            <button
              onClick={handleLookupCharacter}
              disabled={aiLoading}
              className="flex-1 py-1 px-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium flex items-center justify-center space-x-1 text-[10px] transition disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
              <span>Who is this?</span>
            </button>
          )}
        </div>
      )}

      {/* AI Response Card */}
      {(aiLoading || aiResponse) && (
        <div className="mt-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] leading-relaxed">
          <div className="flex items-center justify-between mb-1 opacity-70 font-mono text-[10px]">
            <span className="font-semibold">{aiTitle}</span>
            <button
              onClick={() => {
                setAiResponse(null);
                setAiLoading(false);
              }}
              className="hover:opacity-100 opacity-60"
            >
              ✕
            </button>
          </div>
          {aiLoading ? (
            <div className="flex items-center space-x-1.5 py-1 text-neutral-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Consulting Citadel archives...</span>
            </div>
          ) : (
            <p className="font-serif select-text max-h-36 overflow-y-auto pr-1">
              {aiResponse}
            </p>
          )}
        </div>
      )}

      {/* Inline Note Textarea if opened */}
      {showNoteInput && (
        <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5">
          {!selection.currentColor && (
            <div className="flex items-center space-x-1.5 text-[10px] text-amber-600 dark:text-amber-400 mb-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block shrink-0" />
              <span>Will be saved with default yellow highlight</span>
            </div>
          )}
          <textarea
            autoFocus
            rows={2}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveNote();
              }
            }}
            placeholder="Write a note... (Cmd+Enter to save)"
            className="w-full p-2 text-xs rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:border-blue-500 resize-none font-sans"
          />
          <div className="flex justify-end space-x-1.5 mt-1">
            <button
              onClick={() => setShowNoteInput(false)}
              className="px-2 py-0.5 rounded text-[10px] opacity-60 hover:opacity-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNote}
              className="px-2.5 py-0.5 rounded text-[10px] bg-blue-500 text-white font-medium hover:bg-blue-600 shadow-sm"
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* More submenu popup */}
      {showMoreMenu && (
        <div className="mt-1.5 pt-1.5 border-t border-black/5 dark:border-white/5 space-y-0.5">
          <button
            onClick={() => {
              onSearchBook(selection.text);
              onClose();
            }}
            className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 text-[11px]"
          >
            <BookOpen className="w-3 h-3 opacity-60" />
            <span>Search Book</span>
          </button>

          <button
            onClick={handleSearchWeb}
            className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 text-[11px]"
          >
            <Globe className="w-3 h-3 opacity-60" />
            <span>Search Web</span>
          </button>

          <button
            onClick={handleSearchWikipedia}
            className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 text-[11px]"
          >
            <Search className="w-3 h-3 opacity-60" />
            <span>Search Wikipedia</span>
          </button>

          <button
            onClick={handleShare}
            className="w-full text-left px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center space-x-2 text-[11px]"
          >
            <Share2 className="w-3 h-3 opacity-60" />
            <span>Share Quote</span>
          </button>
        </div>
      )}
    </div>
  );
};
