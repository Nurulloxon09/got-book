export type ThemeMode = 'sepia' | 'white' | 'gray' | 'night';
export type FontFamily = 'Literata' | 'Charter' | 'Georgia' | 'Palatino' | 'system-ui';

export interface ThemeColors {
  name: string;
  id: ThemeMode;
  bg: string;
  text: string;
  secondaryText: string;
  toolbarBg: string;
  toolbarBorder: string;
  sidebarBg: string;
  sidebarBorder: string;
  cardBg: string;
  cardActiveBg: string;
  popoverBg: string;
  link: string;
  border: string;
}

export const THEME_CONFIGS: Record<ThemeMode, ThemeColors> = {
  sepia: {
    name: 'Sepia',
    id: 'sepia',
    bg: '#FBF0D9',
    text: '#5B4636',
    secondaryText: '#8E735D',
    toolbarBg: 'rgba(247, 235, 210, 0.88)',
    toolbarBorder: 'rgba(91, 70, 54, 0.12)',
    sidebarBg: '#F3E5C8',
    sidebarBorder: 'rgba(91, 70, 54, 0.15)',
    cardBg: '#F7EDD6',
    cardActiveBg: '#E9D6B5',
    popoverBg: '#FAF2DE',
    link: '#4A7CB5',
    border: 'rgba(91, 70, 54, 0.15)',
  },
  white: {
    name: 'White',
    id: 'white',
    bg: '#FFFFFF',
    text: '#1A1A1A',
    secondaryText: '#707070',
    toolbarBg: 'rgba(255, 255, 255, 0.88)',
    toolbarBorder: 'rgba(0, 0, 0, 0.08)',
    sidebarBg: '#F7F7F8',
    sidebarBorder: 'rgba(0, 0, 0, 0.1)',
    cardBg: '#FFFFFF',
    cardActiveBg: '#EAEAEA',
    popoverBg: '#FFFFFF',
    link: '#4A7CB5',
    border: 'rgba(0, 0, 0, 0.1)',
  },
  gray: {
    name: 'Gray',
    id: 'gray',
    bg: '#4A4A4C',
    text: '#E8E8E8',
    secondaryText: '#B0B0B4',
    toolbarBg: 'rgba(64, 64, 66, 0.9)',
    toolbarBorder: 'rgba(255, 255, 255, 0.1)',
    sidebarBg: '#3E3E40',
    sidebarBorder: 'rgba(255, 255, 255, 0.12)',
    cardBg: '#4A4A4C',
    cardActiveBg: '#59595C',
    popoverBg: '#404042',
    link: '#7BA6D9',
    border: 'rgba(255, 255, 255, 0.12)',
  },
  night: {
    name: 'Night',
    id: 'night',
    bg: '#1C1C1E',
    text: '#D1D1D6',
    secondaryText: '#8E8E93',
    toolbarBg: 'rgba(28, 28, 30, 0.9)',
    toolbarBorder: 'rgba(255, 255, 255, 0.08)',
    sidebarBg: '#161618',
    sidebarBorder: 'rgba(255, 255, 255, 0.1)',
    cardBg: '#232326',
    cardActiveBg: '#303035',
    popoverBg: '#242426',
    link: '#689FD8',
    border: 'rgba(255, 255, 255, 0.1)',
  },
};

export interface ReaderSettings {
  theme: ThemeMode;
  fontSize: number; // in px: 14 to 32, default 20
  fontFamily: FontFamily;
  lineSpacing: number; // 1.4 to 2.0, default 1.65
  marginPercent: number; // 8 to 24%, default 14%
  justified: boolean;
}

export interface HighlightColor {
  name: string;
  id: 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'underline';
  bg: string;
  border: string;
  accent: string;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { name: 'Yellow', id: 'yellow', bg: 'rgba(255, 226, 77, 0.45)', border: '#F5BE00', accent: '#FFD60A' },
  { name: 'Green', id: 'green', bg: 'rgba(102, 212, 118, 0.42)', border: '#30D158', accent: '#34C759' },
  { name: 'Blue', id: 'blue', bg: 'rgba(110, 198, 255, 0.42)', border: '#0A84FF', accent: '#007AFF' },
  { name: 'Pink', id: 'pink', bg: 'rgba(255, 117, 168, 0.42)', border: '#FF375F', accent: '#FF2D55' },
  { name: 'Purple', id: 'purple', bg: 'rgba(191, 90, 242, 0.42)', border: '#BF5AF2', accent: '#AF52DE' },
];

export interface Bookmark {
  id: string;
  chapterIndex: number;
  chapterTitle: string;
  pageNumber: number;
  textSnippet: string;
  createdAt: number;
}

export interface HighlightItem {
  id: string;
  chapterIndex: number;
  chapterTitle: string;
  pageNumber: number;
  paragraphIndex: number;
  charStart?: number;
  charEnd?: number;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'underline';
  note?: string;
  createdAt: number;
}

export interface BookPage {
  pageNumber: number;
  text: string;
  paragraphs: string[];
}

export interface BookChapter {
  id: string;
  title: string;
  pov: string;
  startPage: number;
  pageCount: number;
  pages: BookPage[];
}

export interface BookData {
  title: string;
  author: string;
  series?: string;
  totalPages: number;
  chapters: BookChapter[];
}

export interface ReadingState {
  chapterIndex: number;
  pageInChapter: number;
  globalPage: number;
}
