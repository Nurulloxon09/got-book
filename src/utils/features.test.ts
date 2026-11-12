import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFixationLength,
  splitBionicToken,
  tokenizeBionicText,
  calculateReadingEstimate,
  recordPageVisit,
} from './features';

test('Bionic Reading: computeFixationLength respects word length and intensity', () => {
  assert.equal(computeFixationLength(1, 'medium'), 1);
  assert.equal(computeFixationLength(3, 'low'), 1);
  assert.equal(computeFixationLength(3, 'high'), 2);
  assert.equal(computeFixationLength(8, 'low'), 3);
  assert.equal(computeFixationLength(8, 'medium'), 4);
  assert.equal(computeFixationLength(8, 'high'), 5);
});

test('Bionic Reading: splitBionicToken preserves leading/trailing punctuation', () => {
  const tok = splitBionicToken('"Winterfell,"', 'medium');
  assert.equal(tok.isWhitespace, false);
  assert.equal(tok.leadingPunct, '"');
  assert.equal(tok.boldPart, 'Winte');
  assert.equal(tok.regularPart, 'rfell');
  assert.equal(tok.trailingPunct, ',"');

  const spaceTok = splitBionicToken('   ', 'medium');
  assert.equal(spaceTok.isWhitespace, true);
});

test('Bionic Reading: tokenizeBionicText reconstructs original string seamlessly', () => {
  const sample = '“The Wall stood seven hundred feet high,” said Will.';
  const tokens = tokenizeBionicText(sample, 'medium');
  const reconstructed = tokens
    .map((t) => (t.isWhitespace ? t.raw : `${t.leadingPunct}${t.boldPart}${t.regularPart}${t.trailingPunct}`))
    .join('');
  assert.equal(reconstructed, sample);
});

test('Reading Goals: calculateReadingEstimate formats minutes and hours accurately', () => {
  const done = calculateReadingEstimate(0, 300, 250);
  assert.equal(done.formatted, 'Completed');

  const short = calculateReadingEstimate(10, 300, 250);
  assert.equal(short.minutes, 12);
  assert.equal(short.formatted, '12 min');

  const long = calculateReadingEstimate(120, 300, 240);
  assert.equal(long.minutes, 150);
  assert.equal(long.formatted, '2h 30m');
});

test('Reading Goals: recordPageVisit increments unique page visits and daily logs', () => {
  const initial = {
    dailyGoalMinutes: 20,
    readingSpeedWpm: 240,
    streakDays: 3,
    totalPagesReadAllTime: 10,
    visitedPageNumbers: [1, 2],
    dailyLogs: [{ date: '2026-11-12', minutesRead: 5, pagesRead: 2 }],
  };

  // Turning to a new page #3
  const afterNewPage = recordPageVisit(initial, 3, '2026-11-12', 1);
  assert.equal(afterNewPage.totalPagesReadAllTime, 11);
  assert.equal(afterNewPage.dailyLogs[0].pagesRead, 3);
  assert.equal(afterNewPage.dailyLogs[0].minutesRead, 6);

  // Turning back to an already visited page #2 only adds time if specified
  const afterRevisit = recordPageVisit(afterNewPage, 2, '2026-11-12', 0);
  assert.equal(afterRevisit.totalPagesReadAllTime, 11);
  assert.equal(afterRevisit.dailyLogs[0].pagesRead, 3);
});
