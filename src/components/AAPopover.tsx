import React from 'react';
import { AlignJustify, AlignLeft, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  ReaderSettings, 
  THEME_CONFIGS, 
  ThemeMode, 
  FontFamily 
} from '../types/reader';

interface AAPopoverProps {
  open: boolean;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

const FONTS: { id: FontFamily; label: string; sampleClass: string }[] = [
  { id: 'Literata', label: 'Literata (Original)', sampleClass: 'font-literata' },
  { id: 'Charter', label: 'Charter', sampleClass: 'font-charter' },
  { id: 'Georgia', label: 'Georgia', sampleClass: 'font-georgia' },
  { id: 'Palatino', label: 'Palatino', sampleClass: 'font-palatino' },
  { id: 'system-ui', label: 'Sans (San Francisco)', sampleClass: 'font-system' },
];

const THEMES: { id: ThemeMode; label: string; bg: string; text: string; border: string }[] = [
  { id: 'white', label: 'White', bg: '#FFFFFF', text: '#1A1A1A', border: '#D0D0D0' },
  { id: 'sepia', label: 'Sepia', bg: '#FBF0D9', text: '#5B4636', border: '#E2D1B2' },
  { id: 'gray', label: 'Gray', bg: '#4A4A4C', text: '#E8E8E8', border: '#5C5C60' },
  { id: 'night', label: 'Night', bg: '#1C1C1E', text: '#D1D1D6', border: '#333336' },
];

export const AAPopover: React.FC<AAPopoverProps> = ({
  open,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const currentTheme = THEME_CONFIGS[settings.theme];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed top-12 right-4 sm:right-12 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-[12px] p-4 shadow-2xl border select-none text-[13px]"
          style={{
            backgroundColor: currentTheme.popoverBg,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Font Size +/- */}
          <div className="flex items-center justify-between pb-3.5 border-b border-black/10 dark:border-white/10">
            <span className="text-xs font-medium opacity-60">Size</span>
            <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-lg p-0.5 space-x-1">
              <button
                onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                disabled={settings.fontSize <= 14}
                className="w-10 h-7 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 font-serif text-[12px] font-medium transition disabled:opacity-30 cursor-pointer"
                title="Decrease font size (-)"
              >
                A
              </button>
              <div className="text-[11px] font-mono w-7 text-center opacity-70">
                {settings.fontSize}
              </div>
              <button
                onClick={() => onUpdateSettings({ fontSize: Math.min(32, settings.fontSize + 1) })}
                disabled={settings.fontSize >= 32}
                className="w-10 h-7 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 font-serif text-[16px] font-semibold transition disabled:opacity-30 cursor-pointer"
                title="Increase font size (+)"
              >
                A
              </button>
            </div>
          </div>

          {/* 2. Theme Circles */}
          <div className="py-3.5 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-60">Theme</span>
              <span className="text-xs font-medium capitalize opacity-70">
                {THEME_CONFIGS[settings.theme].name}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => {
                const isSelected = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className="group flex flex-col items-center focus:outline-none cursor-pointer"
                    title={t.label}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isSelected ? 'ring-2 ring-blue-500 scale-105 shadow-sm' : 'hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: t.bg,
                        border: `1.5px solid ${t.border}`,
                      }}
                    >
                      {isSelected && (
                        <Check
                          className="w-4 h-4 stroke-[2.5]"
                          style={{ color: t.text }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] mt-1 opacity-70 group-hover:opacity-100">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Font Family dropdown */}
          <div className="py-3.5 border-b border-black/10 dark:border-white/10">
            <label className="text-xs font-medium opacity-60 block mb-1.5">
              Font
            </label>
            <select
              value={settings.fontFamily}
              onChange={(e) => onUpdateSettings({ fontFamily: e.target.value as FontFamily })}
              className="w-full py-1.5 px-2.5 rounded-md bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              style={{ color: currentTheme.text }}
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id} className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Spacing and Alignment controls */}
          <div className="pt-3.5 space-y-3">
            {/* Line spacing */}
            <div>
              <div className="flex justify-between items-center text-xs opacity-60 mb-1">
                <span>Line Spacing</span>
                <span>{settings.lineSpacing.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="1.4"
                max="2.1"
                step="0.05"
                value={settings.lineSpacing}
                onChange={(e) => onUpdateSettings({ lineSpacing: parseFloat(e.target.value) })}
                className="w-full accent-blue-500 h-1 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Side Margins */}
            <div>
              <div className="flex justify-between items-center text-xs opacity-60 mb-1">
                <span>Side Margins</span>
                <span>{settings.marginPercent}%</span>
              </div>
              <input
                type="range"
                min="8"
                max="26"
                step="2"
                value={settings.marginPercent}
                onChange={(e) => onUpdateSettings({ marginPercent: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-500 h-1 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Justification toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs opacity-60">Text Alignment</span>
              <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-md p-0.5 space-x-1">
                <button
                  onClick={() => onUpdateSettings({ justified: true })}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    settings.justified ? 'bg-black/10 dark:bg-white/15 font-semibold' : 'opacity-60'
                  }`}
                  title="Justified (Book style)"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onUpdateSettings({ justified: false })}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    !settings.justified ? 'bg-black/10 dark:bg-white/15 font-semibold' : 'opacity-60'
                  }`}
                  title="Left Aligned"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
