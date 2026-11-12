import { 
  BionicIntensity, 
  ReadingGoalsData 
} from '../types/reader';

// ============================================================================
// 1. BIONIC READING ENGINE
// ============================================================================

export interface BionicToken {
  isWhitespace: boolean;
  raw: string;
  leadingPunct: string;
  boldPart: string;
  regularPart: string;
  trailingPunct: string;
}

export function computeFixationLength(wordLength: number, intensity: BionicIntensity = 'medium'): number {
  if (wordLength <= 0) return 0;
  if (wordLength === 1) return 1;
  if (wordLength <= 3) {
    return intensity === 'high' ? 2 : 1;
  }
  const ratio = intensity === 'low' ? 0.35 : intensity === 'high' ? 0.6 : 0.48;
  return Math.max(1, Math.min(wordLength - 1, Math.ceil(wordLength * ratio)));
}

export function splitBionicToken(token: string, intensity: BionicIntensity = 'medium'): BionicToken {
  if (/^\s+$/.test(token)) {
    return {
      isWhitespace: true,
      raw: token,
      leadingPunct: '',
      boldPart: '',
      regularPart: '',
      trailingPunct: '',
    };
  }

  // Match leading non-word punctuation, core letters/numbers/apostrophes, trailing punctuation
  const match = token.match(/^([^a-zA-Z0-9\u00C0-\u024F]*)([a-zA-Z0-9\u00C0-\u024F'’]+)(.*)$/);
  if (!match) {
    return {
      isWhitespace: false,
      raw: token,
      leadingPunct: '',
      boldPart: '',
      regularPart: token,
      trailingPunct: '',
    };
  }

  const [, leadingPunct, coreWord, trailingPunct] = match;
  const fixLen = computeFixationLength(coreWord.length, intensity);

  return {
    isWhitespace: false,
    raw: token,
    leadingPunct,
    boldPart: coreWord.slice(0, fixLen),
    regularPart: coreWord.slice(fixLen),
    trailingPunct,
  };
}

export function tokenizeBionicText(text: string, intensity: BionicIntensity = 'medium'): BionicToken[] {
  if (!text) return [];
  const parts = text.split(/(\s+)/);
  return parts.filter((p) => p.length > 0).map((part) => splitBionicToken(part, intensity));
}

// ============================================================================
// 2. READING GOALS & INSIGHTS CALCULATIONS
// ============================================================================

export function calculateReadingEstimate(
  pagesRemaining: number,
  wordsPerPage = 310,
  readingSpeedWpm = 235
): { minutes: number; formatted: string } {
  const safePages = Math.max(0, pagesRemaining);
  const safeWpm = Math.max(60, readingSpeedWpm);
  const totalWords = safePages * wordsPerPage;
  const minutes = Math.max(1, Math.round(totalWords / safeWpm));

  if (safePages === 0) {
    return { minutes: 0, formatted: 'Completed' };
  }
  if (minutes < 60) {
    return { minutes, formatted: `${minutes} min` };
  }
  const hrs = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  return {
    minutes,
    formatted: remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`,
  };
}

export function recordPageVisit(
  goals: ReadingGoalsData,
  pageNumber: number,
  todayDateStr: string,
  minutesDelta = 0
): ReadingGoalsData {
  const alreadyVisited = goals.visitedPageNumbers.includes(pageNumber);
  const nextVisited = alreadyVisited
    ? goals.visitedPageNumbers
    : [...goals.visitedPageNumbers, pageNumber];
  const pagesDelta = alreadyVisited ? 0 : 1;

  const existingLogIdx = goals.dailyLogs.findIndex((l) => l.date === todayDateStr);
  let nextLogs = [...goals.dailyLogs];

  if (existingLogIdx >= 0) {
    const current = nextLogs[existingLogIdx];
    nextLogs[existingLogIdx] = {
      ...current,
      pagesRead: current.pagesRead + pagesDelta,
      minutesRead: Math.round((current.minutesRead + minutesDelta) * 10) / 10,
    };
  } else {
    nextLogs.push({
      date: todayDateStr,
      pagesRead: Math.max(1, pagesDelta),
      minutesRead: Math.max(1, Math.round(minutesDelta * 10) / 10),
    });
    nextLogs = nextLogs.slice(-7);
  }

  return {
    ...goals,
    totalPagesReadAllTime: goals.totalPagesReadAllTime + pagesDelta,
    visitedPageNumbers: nextVisited,
    dailyLogs: nextLogs,
  };
}
