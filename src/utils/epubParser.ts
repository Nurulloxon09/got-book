import ePub from 'epubjs';
import { BookData, BookChapter, BookPage } from '../types/reader';

function chunkParagraphsIntoPages(paragraphs: string[], startPageNumber: number): BookPage[] {
  const pages: BookPage[] = [];
  let currentParagraphs: string[] = [];
  let currentLength = 0;
  let currentPageNumber = startPageNumber;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // ~1200 chars or 4 paragraphs per page
    if (currentParagraphs.length >= 4 || (currentLength + trimmed.length > 1400 && currentParagraphs.length > 0)) {
      pages.push({
        pageNumber: currentPageNumber++,
        text: currentParagraphs.join('\n\n'),
        paragraphs: [...currentParagraphs],
      });
      currentParagraphs = [];
      currentLength = 0;
    }

    currentParagraphs.push(trimmed);
    currentLength += trimmed.length;
  }

  if (currentParagraphs.length > 0) {
    pages.push({
      pageNumber: currentPageNumber,
      text: currentParagraphs.join('\n\n'),
      paragraphs: [...currentParagraphs],
    });
  }

  if (pages.length === 0) {
    pages.push({
      pageNumber: startPageNumber,
      text: 'No content.',
      paragraphs: ['No content.'],
    });
  }

  return pages;
}

export async function parseBookFile(file: File): Promise<BookData> {
  const isEpub = file.name.toLowerCase().endsWith('.epub');
  const isTxt = file.name.toLowerCase().endsWith('.txt');

  if (isTxt) {
    const text = await file.text();
    const rawParagraphs = text
      .split(/\r?\n\r?\n+/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 0);

    const pages = chunkParagraphsIntoPages(rawParagraphs, 1);
    const chapter: BookChapter = {
      id: 'ch-txt-1',
      title: file.name.replace(/\.[^/.]+$/, ''),
      pov: 'TEXT',
      startPage: 1,
      pageCount: pages.length,
      pages,
    };

    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      author: 'Unknown Author',
      totalPages: pages.length,
      chapters: [chapter],
    };
  }

  if (isEpub) {
    const arrayBuffer = await file.arrayBuffer();
    // In epubjs, ePub is either the default export or the namespace itself
    const epubFn = typeof ePub === 'function' ? ePub : (ePub as unknown as { default: typeof ePub }).default;
    const epubBook = epubFn(arrayBuffer);
    await epubBook.ready;

    // Metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (epubBook as any).package?.metadata || {};
    const title = meta.title || file.name.replace(/\.[^/.]+$/, '');
    const author = meta.creator || 'Unknown Author';

    const chapters: BookChapter[] = [];
    let globalPageCounter = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spineItems: any[] = (epubBook as any).spine?.items || [];
    let chapterIndex = 0;

    for (const item of spineItems) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loaded: any = await item.load((epubBook as any).load.bind(epubBook));
        let doc: Document | null = null;

        if (loaded instanceof Document) {
          doc = loaded;
        } else if (typeof loaded === 'string') {
          doc = new DOMParser().parseFromString(loaded, 'text/html');
        } else if (loaded && loaded.querySelector) {
          doc = loaded as Document;
        }

        if (!doc) continue;

        // Try to find chapter title
        const headingEl = doc.querySelector('h1, h2, h3, title');
        const chapterTitle = headingEl?.textContent?.trim() || `Chapter ${chapterIndex + 1}`;

        // Extract paragraphs
        const paragraphEls = Array.from(doc.querySelectorAll('p, blockquote, li'));
        let paragraphs: string[] = [];

        if (paragraphEls.length > 0) {
          paragraphs = paragraphEls
            .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() || '')
            .filter((t) => t.length > 10);
        } else {
          // Fallback to body text split
          const bodyText = doc.body?.textContent || '';
          paragraphs = bodyText
            .split(/\n\n+/)
            .map((p) => p.replace(/\s+/g, ' ').trim())
            .filter((p) => p.length > 10);
        }

        if (paragraphs.length === 0) continue;

        const pages = chunkParagraphsIntoPages(paragraphs, globalPageCounter);
        const startPage = globalPageCounter;
        globalPageCounter += pages.length;

        chapters.push({
          id: `ch-epub-${chapterIndex}`,
          title: chapterTitle.slice(0, 80),
          pov: 'CHAPTER',
          startPage,
          pageCount: pages.length,
          pages,
        });

        chapterIndex++;
      } catch (err) {
        console.warn(`Could not parse spine item ${item.idref}:`, err);
      }
    }

    if (chapters.length === 0) {
      throw new Error('No readable chapters could be extracted from this EPUB file.');
    }

    return {
      title,
      author,
      totalPages: globalPageCounter - 1,
      chapters,
    };
  }

  throw new Error('Unsupported file format. Please upload an .epub or .txt file.');
}
