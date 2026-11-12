import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';

async function buildBookData() {
  console.log('Reading PDF file...');
  const data = fs.readFileSync('public/assets/aistudio/game_of_thrones_ad710f3d.pdf');
  const parser = new PDFParse(new Uint8Array(data));
  const res = await parser.getText();
  
  // Split pages by "-- N of 755 --"
  const rawPages = res.text.split(/-- \d+ of 755 --/);
  // rawPages[1] is page 1, rawPages[5] is page 5 (Prologue start), rawPages[14] is page 14 (Prologue end), rawPages[15] is Bran start
  console.log(`Extracted ${rawPages.length - 1} pages from PDF.`);

  function cleanPageText(text) {
    let lines = text.split('\n');
    lines = lines.filter(line => {
      const trimmed = line.trim();
      if (/^(previous\s*\|\s*)?Table of Contents(\s*\|\s*next)?$/i.test(trimmed)) return false;
      if (/^previous$/i.test(trimmed)) return false;
      if (/^next$/i.test(trimmed)) return false;
      return true;
    });
    return lines.join('\n').trim();
  }

  // Build each page object cleanly
  const allPages = [];
  for (let pNum = 1; pNum < rawPages.length; pNum++) {
    const cleaned = cleanPageText(rawPages[pNum]);
    // Determine paragraphs on this physical PDF page
    // Split by double newline or blank lines
    let paragraphs = cleaned
      .split(/\n\s*\n/)
      .map(p => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(p => p.length > 0);

    // If a page only has single lines (no double newline), group into coherent paragraphs:
    if (paragraphs.length <= 1 && cleaned.length > 400) {
      // Split on dialogue or indentation if needed, or keep clean
      paragraphs = cleaned.split(/\n(?=[“A-Z])/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean);
    }

    allPages.push({
      pageNumber: pNum,
      text: cleaned,
      paragraphs: paragraphs.length > 0 ? paragraphs : [cleaned]
    });
  }

  // Scan all chapter boundaries:
  const chapters = [];
  let currentChapter = {
    id: 'intro',
    title: 'Title & Contents',
    pov: 'Intro',
    startPage: 1,
    pageCount: 0,
    pages: []
  };

  for (const pageObj of allPages) {
    const pNum = pageObj.pageNumber;
    const lines = pageObj.text.split('\n').map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || '';

    let isNewChapter = false;
    let chTitle = '';
    let chPov = '';

    if (pNum === 5) {
      isNewChapter = true;
      chTitle = 'Prologue';
      chPov = 'PROLOGUE';
    } else if (pNum >= 15 && pNum <= 731) {
      if (/^(PROLOGUE|BRAN|CATELYN|DAENERYS|EDDARD|JON|TYRION|SANSA|ARYA)\b/.test(firstLine)) {
        isNewChapter = true;
        const match = firstLine.match(/^(PROLOGUE|BRAN|CATELYN|DAENERYS|EDDARD|JON|TYRION|SANSA|ARYA)\b/);
        chPov = match ? match[1] : firstLine;
        chTitle = chPov.charAt(0) + chPov.slice(1).toLowerCase();
      }
    } else if (pNum >= 732) {
      if (pNum === 732 || firstLine.startsWith('APPENDIX') || firstLine.startsWith('THE HOUSES') || firstLine.startsWith('HOUSE')) {
        isNewChapter = true;
        chPov = 'APPENDIX';
        chTitle = firstLine.length < 35 ? firstLine : 'Appendix: The Houses';
      }
    }

    if (isNewChapter && pNum > currentChapter.startPage) {
      chapters.push(currentChapter);
      currentChapter = {
        id: `ch-${chapters.length + 1}`,
        title: chTitle,
        pov: chPov,
        startPage: pNum,
        pageCount: 0,
        pages: []
      };
    }

    currentChapter.pages.push(pageObj);
  }
  chapters.push(currentChapter);

  // Compute pageCounts
  for (const ch of chapters) {
    ch.pageCount = ch.pages.length;
  }

  console.log(`Generated ${chapters.length} chapters.`);
  console.log('Prologue info:', {
    startPage: chapters[1].startPage,
    pageCount: chapters[1].pageCount,
    endPage: chapters[1].startPage + chapters[1].pageCount - 1
  });
  console.log('Chapter 2 (Bran) info:', {
    startPage: chapters[2].startPage,
    pageCount: chapters[2].pageCount
  });

  const outputDir = 'public/books';
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'game_of_thrones.json'), JSON.stringify({
    title: 'A Game of Thrones',
    author: 'George R.R. Martin',
    series: 'A Song of Ice and Fire (Book 1)',
    totalPages: rawPages.length - 1,
    chapters: chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      pov: ch.pov,
      startPage: ch.startPage,
      pageCount: ch.pageCount,
      pages: ch.pages.map(p => ({
        pageNumber: p.pageNumber,
        text: p.text,
        paragraphs: p.paragraphs
      }))
    }))
  }, null, 2));

  console.log('Saved corrected public/books/game_of_thrones.json successfully!');
}

buildBookData().catch(console.error);
