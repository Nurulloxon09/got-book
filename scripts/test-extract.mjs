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
  // First handle escaped newlines:
  str = str.replace(/\\\r?\n/g, '');
  // Next handle octal character codes (like \222 for curly apostrophe, etc.)
  str = str.replace(/\\([0-7]{1,3})/g, (_, oct) => {
    const code = parseInt(oct, 8);
    // CP1252 mapping
    if (code === 0x91 || code === 0o221) return '‘';
    if (code === 0x92 || code === 0o222) return '’';
    if (code === 0x93 || code === 0o223) return '“';
    if (code === 0x94 || code === 0o224) return '”';
    if (code === 0x96 || code === 0o226) return '–';
    if (code === 0x97 || code === 0o227) return '—';
    if (code === 0x85 || code === 0o205) return '…';
    return String.fromCharCode(code);
  });
  // Handle standard escape sequences
  str = str.replace(/\\n/g, '\n')
           .replace(/\\r/g, '\r')
           .replace(/\\t/g, '\t')
           .replace(/\\b/g, '\b')
           .replace(/\\f/g, '\f')
           .replace(/\\\\/g, '\\')
           .replace(/\\\(/g, '(')
           .replace(/\\\)/g, ')');
  return str;
}

function extractFullPageText(str) {
  // Tokens inside BT ... ET
  const pieces = [];
  // match either (str) Tj, (str) ', (str) ", or [ ... ] TJ
  const regex = /(\((?:[^()\\]|\\.)*\)\s*(?:Tj|'|")|\[(?:[^\]]*)\]\s*TJ)/g;
  let m;
  while ((m = regex.exec(str)) !== null) {
    const token = m[0].trim();
    if (token.endsWith('Tj') || token.endsWith("'") || token.endsWith('"')) {
      const p1 = token.indexOf('(');
      const p2 = token.lastIndexOf(')');
      if (p1 !== -1 && p2 > p1) {
        pieces.push(unescapePdf(token.substring(p1 + 1, p2)));
      }
    } else if (token.endsWith('TJ')) {
      const inside = token.substring(1, token.lastIndexOf(']'));
      const partRegex = /\((?:[^()\\]|\\.)*\)/g;
      let pm;
      let sub = '';
      while ((pm = partRegex.exec(inside)) !== null) {
        sub += unescapePdf(pm[0].slice(1, -1));
      }
      pieces.push(sub);
    }
  }
  return pieces.join('');
}

console.log('--- Page 6 Sample ---');
console.log(extractFullPageText(pages[5]).slice(0, 400));
console.log('\n--- Page 14 Sample ---');
console.log(extractFullPageText(pages[13]).slice(0, 400));
