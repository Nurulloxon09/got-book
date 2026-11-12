import fs from 'fs';
import zlib from 'zlib';

const buf = fs.readFileSync('public/assets/aistudio/game_of_thrones_ad710f3d.pdf');

const pages = [];
let idx = 0;
while ((idx = buf.indexOf('stream', idx)) !== -1) {
  const startStream = idx + 6;
  const endStream = buf.indexOf('endstream', startStream);
  if (endStream !== -1) {
    let s = startStream;
    if (buf[s] === 13 && buf[s+1] === 10) s += 2;
    else if (buf[s] === 10 || buf[s] === 13) s += 1;
    let raw = buf.subarray(s, endStream);
    try {
      const decomp = zlib.inflateSync(raw);
      const str = decomp.toString('latin1');
      if (str.includes('Tj') || str.includes('TJ')) {
        pages.push(str);
      }
    } catch(e) {}
  }
  idx = endStream !== -1 ? endStream + 9 : idx + 6;
}

function unescapePdf(str) {
  return str.replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
            .replace(/\\([\\()nrtbf])/g, (_, c) => {
              if (c === 'n') return '\n';
              if (c === 'r') return '\r';
              if (c === 't') return '\t';
              if (c === 'b') return '\b';
              if (c === 'f') return '\f';
              return c;
            });
}

function parseStream(content) {
  const lines = [];
  // Tokenize operators
  const regex = /(\((?:[^()\\]|\\.)*\)\s*Tj|\[(?:[^\]]*)\]\s*TJ)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const token = match[0].trim();
    if (token.endsWith('Tj')) {
      const p1 = token.indexOf('(');
      const p2 = token.lastIndexOf(')');
      if (p1 !== -1 && p2 > p1) {
        lines.push(unescapePdf(token.substring(p1 + 1, p2)));
      }
    } else if (token.endsWith('TJ')) {
      const inside = token.substring(1, token.lastIndexOf(']'));
      const partRegex = /\((?:[^()\\]|\\.)*\)/g;
      let pm;
      let piece = '';
      while ((pm = partRegex.exec(inside)) !== null) {
        piece += unescapePdf(pm[0].slice(1, -1));
      }
      lines.push(piece);
    }
  }
  return lines;
}

console.log('Total pages found:', pages.length);
for (let p of [5, 12, 13]) {
  if (pages[p]) {
    const parsed = parseStream(pages[p]);
    console.log(`--- Page ${p + 1} (${parsed.length} fragments) ---`);
    console.log(parsed.slice(0, 10).join(' '));
  }
}
