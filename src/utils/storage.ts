import { 
  ReaderSettings, 
  HighlightItem, 
  Bookmark, 
  ReadingState, 
  ReadingGoalsData 
} from '../types/reader';

const SETTINGS_KEY = 'apple_books_settings_v1';
const READING_POS_KEY = 'apple_books_reading_pos_v1';
const HIGHLIGHTS_KEY = 'apple_books_highlights_v1';
const BOOKMARKS_KEY = 'apple_books_bookmarks_v1';
const READING_GOALS_KEY = 'apple_books_reading_goals_v1';

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'sepia',
  fontSize: 20,
  fontFamily: 'Literata',
  lineSpacing: 1.65,
  marginPercent: 14,
  justified: true,
  bionicReading: false,
  bionicIntensity: 'medium',
  focusMode: false,
};

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultReadingGoals(): ReadingGoalsData {
  const today = new Date();
  const logs = [];
  const sampleMinutes = [18, 25, 14, 32, 22, 28, 12];
  const samplePages = [11, 16, 9, 21, 14, 18, 8];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    logs.push({
      date: dateStr,
      minutesRead: sampleMinutes[6 - i],
      pagesRead: samplePages[6 - i],
    });
  }

  return {
    dailyGoalMinutes: 20,
    readingSpeedWpm: 235,
    streakDays: 5,
    totalPagesReadAllTime: 97,
    visitedPageNumbers: [6],
    dailyLogs: logs,
  };
}

export function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Error reading settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving settings', e);
  }
}

export function loadReadingPosition(): ReadingState {
  try {
    const raw = localStorage.getItem(READING_POS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading position', e);
  }
  return { chapterIndex: 1, pageInChapter: 0, globalPage: 6 };
}

export function saveReadingPosition(pos: ReadingState): void {
  try {
    localStorage.setItem(READING_POS_KEY, JSON.stringify(pos));
  } catch (e) {
    console.warn('Error saving reading position', e);
  }
}

export function loadHighlights(): HighlightItem[] {
  try {
    const raw = localStorage.getItem(HIGHLIGHTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error loading highlights', e);
  }
  return [];
}

export function saveHighlights(items: HighlightItem[]): void {
  try {
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving highlights', e);
  }
}

export function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error loading bookmarks', e);
  }
  return [];
}

export function saveBookmarks(items: Bookmark[]): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Error saving bookmarks', e);
  }
}

export function loadReadingGoals(): ReadingGoalsData {
  try {
    const raw = localStorage.getItem(READING_GOALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getDefaultReadingGoals(), ...parsed };
    }
  } catch (e) {
    console.warn('Error loading reading goals', e);
  }
  return getDefaultReadingGoals();
}

export function saveReadingGoals(data: ReadingGoalsData): void {
  try {
    localStorage.setItem(READING_GOALS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Error saving reading goals', e);
  }
}
