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

// ============================================================================
// 3. TWO-FINGER TOUCHPAD & TOUCH HORIZONTAL SWIPE ENGINE
// ============================================================================

export interface SwipeGestureState {
  accumulatedX: number;
  lastEventTime: number;
  lastTriggerTime: number;
  lockedDirection: 'next' | 'prev' | null;
  lastAbsDeltaX: number;
}

export function createInitialSwipeState(): SwipeGestureState {
  return {
    accumulatedX: 0,
    lastEventTime: 0,
    lastTriggerTime: 0,
    lockedDirection: null,
    lastAbsDeltaX: 0,
  };
}

export function processHorizontalWheelGesture(
  state: SwipeGestureState,
  deltaX: number,
  deltaY: number,
  nowMs: number,
  shiftKey = false,
  threshold = 42
): {
  state: SwipeGestureState;
  action: 'next' | 'prev' | null;
  isHorizontal: boolean;
} {
  const dx = deltaX !== 0 ? deltaX : shiftKey ? deltaY : 0;

  // Ignore predominantly vertical scroll gestures
  if (!shiftKey && Math.abs(deltaY) > Math.abs(dx) * 1.2) {
    return { state, action: null, isHorizontal: false };
  }

  if (Math.abs(dx) < 1) {
    return { state, action: null, isHorizontal: false };
  }

  const gapMs = state.lastEventTime > 0 ? nowMs - state.lastEventTime : Infinity;
  const sinceTriggerMs = state.lastTriggerTime > 0 ? nowMs - state.lastTriggerTime : Infinity;
  const currentDirection: 'next' | 'prev' = dx > 0 ? 'next' : 'prev';

  let lockedDirection = state.lockedDirection;
  let accumulatedX = state.accumulatedX;

  // Reset gesture lock when:
  // 1) Finger pause (> 220ms) after animation cooldown (>= 500ms)
  // 2) User reverses swipe direction
  // 3) Cooldown elapsed (> 580ms) and a fresh acceleration impulse occurs
  const isNewImpulseAfterCooldown =
    sinceTriggerMs > 580 && Math.abs(dx) > state.lastAbsDeltaX + 6;

  if (
    (gapMs > 220 && sinceTriggerMs >= 500) ||
    (lockedDirection !== null && currentDirection !== lockedDirection) ||
    isNewImpulseAfterCooldown
  ) {
    lockedDirection = null;
    accumulatedX = 0;
  }

  if (lockedDirection !== null) {
    return {
      state: {
        accumulatedX: 0,
        lastEventTime: nowMs,
        lastTriggerTime: state.lastTriggerTime,
        lockedDirection,
        lastAbsDeltaX: Math.abs(dx),
      },
      action: null,
      isHorizontal: true,
    };
  }

  const nextAcc = accumulatedX + dx;

  if (nextAcc >= threshold) {
    return {
      state: {
        accumulatedX: 0,
        lastEventTime: nowMs,
        lastTriggerTime: nowMs,
        lockedDirection: 'next',
        lastAbsDeltaX: Math.abs(dx),
      },
      action: 'next',
      isHorizontal: true,
    };
  }

  if (nextAcc <= -threshold) {
    return {
      state: {
        accumulatedX: 0,
        lastEventTime: nowMs,
        lastTriggerTime: nowMs,
        lockedDirection: 'prev',
        lastAbsDeltaX: Math.abs(dx),
      },
      action: 'prev',
      isHorizontal: true,
    };
  }

  return {
    state: {
      accumulatedX: nextAcc,
      lastEventTime: nowMs,
      lastTriggerTime: state.lastTriggerTime,
      lockedDirection: null,
      lastAbsDeltaX: Math.abs(dx),
    },
    action: null,
    isHorizontal: true,
  };
}

export function evaluateTouchSwipe(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  threshold = 45
): 'next' | 'prev' | null {
  const dx = endX - startX;
  const dy = endY - startY;

  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.2) {
    return null;
  }

  // Sliding fingers left (endX < startX) advances to next page; sliding right goes to previous page
  return dx < 0 ? 'next' : 'prev';
}

