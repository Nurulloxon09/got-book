import { ReaderSettings, HighlightItem, Bookmark, ReadingState } from '../types/reader';

const SETTINGS_KEY = 'apple_books_settings_v1';
const READING_POS_KEY = 'apple_books_reading_pos_v1';
const HIGHLIGHTS_KEY = 'apple_books_highlights_v1';
const BOOKMARKS_KEY = 'apple_books_bookmarks_v1';

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'sepia',
  fontSize: 20,
  fontFamily: 'Literata',
  lineSpacing: 1.65,
  marginPercent: 14,
  justified: true,
};

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
  // Default to Chapter 1 (Bran, or Prologue ch 1)
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
