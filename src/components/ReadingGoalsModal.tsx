import React from 'react';
import { 
  X, 
  Flame, 
  Clock, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Plus 
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ReadingGoalsData, ThemeMode, THEME_CONFIGS } from '../types/reader';
import { calculateReadingEstimate } from '../utils/features';
import { getTodayDateString } from '../utils/storage';

interface ReadingGoalsModalProps {
  open: boolean;
  theme: ThemeMode;
  goals: ReadingGoalsData;
  currentChapterTitle: string;
  pagesLeftInChapter: number;
  currentGlobalPage: number;
  bookTotalPages: number;
  highlightsCount: number;
  bookmarksCount: number;
  onUpdateGoals: (patch: Partial<ReadingGoalsData>) => void;
  onLogReadingMinutes: (minutesToAdd: number) => void;
  onClose: () => void;
}

const GOAL_PRESETS = [15, 20, 30, 45, 60];

export const ReadingGoalsModal: React.FC<ReadingGoalsModalProps> = ({
  open,
  theme,
  goals,
  currentChapterTitle,
  pagesLeftInChapter,
  currentGlobalPage,
  bookTotalPages,
  highlightsCount,
  bookmarksCount,
  onUpdateGoals,
  onLogReadingMinutes,
  onClose,
}) => {
  const readerTheme = THEME_CONFIGS[theme];
  const todayStr = getTodayDateString();
  const todayLog = goals.dailyLogs.find((l) => l.date === todayStr) || {
    date: todayStr,
    minutesRead: 12,
    pagesRead: 8,
  };

  const goalProgressPercent = Math.min(
    100,
    Math.round((todayLog.minutesRead / Math.max(1, goals.dailyGoalMinutes)) * 100)
  );

  const chapterEstimate = calculateReadingEstimate(
    pagesLeftInChapter,
    310,
    goals.readingSpeedWpm
  );

  const bookPagesRemaining = Math.max(0, bookTotalPages - currentGlobalPage);
  const bookEstimate = calculateReadingEstimate(
    bookPagesRemaining,
    310,
    goals.readingSpeedWpm
  );

  const maxLogMinutes = Math.max(
    goals.dailyGoalMinutes,
    ...goals.dailyLogs.map((d) => d.minutesRead),
    30
  );

  // SVG Ring Math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (goalProgressPercent / 100) * circumference;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 select-none"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Reading Goals and Insights"
        >
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: readerTheme.popoverBg,
              borderColor: readerTheme.border,
              color: readerTheme.text,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: readerTheme.border }}
            >
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="font-serif font-semibold text-base tracking-tight">
                  Reading Goals & Insights
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition opacity-70 hover:opacity-100 cursor-pointer"
                aria-label="Close Reading Goals"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Top Hero Row: Apple Books Daily Reading Goal Ring + Controls */}
              <div
                className="p-4 sm:p-5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-5"
                style={{ borderColor: readerTheme.border }}
              >
                {/* Ring + Today's Status */}
                <div className="flex items-center space-x-5">
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="9"
                        className="opacity-10"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold font-mono tabular-nums">
                        {Math.round(todayLog.minutesRead)}m
                      </span>
                      <span className="text-[10px] opacity-60">
                        of {goals.dailyGoalMinutes}m
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
                      Today’s Reading Goal
                    </div>
                    <div className="text-lg font-serif font-bold">
                      {goalProgressPercent >= 100
                        ? 'Daily Goal Accomplished!'
                        : `${Math.max(0, Math.round(goals.dailyGoalMinutes - todayLog.minutesRead))} min left to hit today’s goal`}
                    </div>
                    <div className="text-xs opacity-70 font-mono tabular-nums">
                      {todayLog.pagesRead} pages read today · {goalProgressPercent}% complete
                    </div>
                    <div className="pt-1.5">
                      <button
                        onClick={() => onLogReadingMinutes(5)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log +5m Session</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Daily Target Selector */}
                <div className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-5 space-y-2"
                  style={{ borderColor: readerTheme.border }}
                >
                  <label className="text-xs font-semibold block opacity-75">
                    Daily Target (min/day)
                  </label>
                  <div className="grid grid-cols-5 sm:grid-cols-3 gap-1.5">
                    {GOAL_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        onClick={() => onUpdateGoals({ dailyGoalMinutes: mins })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono tabular-nums transition cursor-pointer ${
                          goals.dailyGoalMinutes === mins
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 opacity-80'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4-Metric Insights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className="p-3.5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]"
                  style={{ borderColor: readerTheme.border }}
                >
                  <div className="flex items-center justify-between text-xs opacity-65 mb-1">
                    <span>Reading Streak</span>
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums">
                    {goals.streakDays} Days
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5">
                    {goals.totalPagesReadAllTime} total pages
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]"
                  style={{ borderColor: readerTheme.border }}
                >
                  <div className="flex items-center justify-between text-xs opacity-65 mb-1">
                    <span>Chapter Left</span>
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums">
                    {chapterEstimate.formatted}
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5 truncate">
                    {pagesLeftInChapter}p in {currentChapterTitle}
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]"
                  style={{ borderColor: readerTheme.border }}
                >
                  <div className="flex items-center justify-between text-xs opacity-65 mb-1">
                    <span>Book Left</span>
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums">
                    {bookEstimate.formatted}
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5">
                    {bookPagesRemaining} of {bookTotalPages} pages left
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]"
                  style={{ borderColor: readerTheme.border }}
                >
                  <div className="flex items-center justify-between text-xs opacity-65 mb-1">
                    <span>Reading Pace</span>
                    <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums">
                    {goals.readingSpeedWpm} WPM
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5">
                    {highlightsCount} notes · {bookmarksCount} bookmarks
                  </div>
                </div>
              </div>

              {/* 7-Day Reading Activity Chart */}
              <div
                className="p-4 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02] space-y-3"
                style={{ borderColor: readerTheme.border }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold opacity-80">
                    Last 7 Days Activity (Minutes & Pages)
                  </span>
                  <span className="text-[11px] font-mono opacity-60 tabular-nums">
                    Goal line: {goals.dailyGoalMinutes} min/day
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
                  {goals.dailyLogs.slice(-7).map((log) => {
                    const heightPct = Math.max(
                      10,
                      Math.min(100, Math.round((log.minutesRead / maxLogMinutes) * 100))
                    );
                    const metGoal = log.minutesRead >= goals.dailyGoalMinutes;
                    const isToday = log.date === todayStr;
                    const shortDay = log.date.slice(5); // MM-DD

                    return (
                      <div
                        key={log.date}
                        className="flex flex-col items-center justify-end h-full space-y-1.5"
                      >
                        <span className="text-[10px] font-mono tabular-nums opacity-70">
                          {Math.round(log.minutesRead)}m
                        </span>
                        <div className="w-full max-w-[36px] flex-1 flex items-end bg-black/5 dark:bg-white/5 rounded-t-md overflow-hidden">
                          <div
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              metGoal
                                ? 'bg-blue-500'
                                : isToday
                                ? 'bg-amber-500'
                                : 'bg-blue-500/45'
                            }`}
                            style={{ height: `${heightPct}%` }}
                            title={`${log.date}: ${log.minutesRead} mins (${log.pagesRead} pages)`}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-mono tabular-nums ${
                            isToday ? 'font-bold text-blue-500' : 'opacity-60'
                          }`}
                        >
                          {isToday ? 'Today' : shortDay}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reading Speed Calibration Slider */}
              <div
                className="p-4 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{ borderColor: readerTheme.border }}
              >
                <div>
                  <label htmlFor="wpm-slider" className="text-xs font-semibold block">
                    Calibrate Your Reading Speed ({goals.readingSpeedWpm} words/min)
                  </label>
                  <span className="text-[11px] opacity-65">
                    Adjusts estimated time remaining for chapters and full books
                  </span>
                </div>
                <input
                  id="wpm-slider"
                  type="range"
                  min="150"
                  max="400"
                  step="5"
                  value={goals.readingSpeedWpm}
                  onChange={(e) =>
                    onUpdateGoals({ readingSpeedWpm: parseInt(e.target.value, 10) })
                  }
                  className="w-full sm:w-48 accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
