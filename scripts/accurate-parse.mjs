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

function unescapePdfLiteral(str) {
  // Replace escaped newlines: \ followed by \r or \n
  str = str.replace(/\\\r\n/g, '').replace(/\\\r/g, '').replace(/\\\n/g, '');
  // Replace octal escapes: \222 etc
  str = str.replace(/\\([0-7]{1,3})/g, (_, oct) => {
    const code = parseInt(oct, 8);
    if (code === 0x91 || code === 0o221) return '‘';
    if (code === 0x92 || code === 0o222) return '’';
    if (code === 0x93 || code === 0o223) return '“';
    if (code === 0x94 || code === 0o224) return '”';
    if (code === 0x96 || code === 0o226) return '–';
    if (code === 0x97 || code === 0o227) return '—';
    if (code === 0x85 || code === 0o205) return '…';
    return String.fromCharCode(code);
  });
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

function parsePdfPage(streamStr) {
  const tokens = [];
  let i = 0;
  const len = streamStr.length;

  while (i < len) {
    const ch = streamStr[i];
    if (ch === '(') {
      // PDF string literal with parenthesis nesting
      let depth = 1;
      let start = i + 1;
      i++;
      let escaped = false;
      while (i < len && depth > 0) {
        if (escaped) {
          escaped = false;
        } else if (streamStr[i] === '\\') {
          escaped = true;
        } else if (streamStr[i] === '(') {
          depth++;
        } else if (streamStr[i] === ')') {
          depth--;
        }
        i++;
      }
      const raw = streamStr.substring(start, i - 1);
      tokens.push({ type: 'string', val: unescapePdfLiteral(raw) });
    } else if (/\s/.test(ch)) {
      i++;
    } else {
      // Operator or number
      let start = i;
      while (i < len && !/\s|\(|\)|\[|\]|<|>|\/|%/.test(streamStr[i])) {
        i++;
      }
      tokens.push({ type: 'word', val: streamStr.substring(start, i) });
    }
  }

  // Now reconstruct lines based on operators
  const lines = [];
  let curLine = '';
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type === 'string') {
      curLine += t.val;
    } else if (t.type === 'word') {
      if (t.val === 'T*' || t.val === 'TD' || t.val === 'Td') {
        if (curLine) {
          lines.push(curLine.trim());
          curLine = '';
        }
      }
    }
  }
  if (curLine) lines.push(curLine.trim());
  return lines;
}

const p6Lines = parsePdfPage(pages[5]);
console.log('--- Page 6 Reconstructed Lines (' + p6Lines.length + ' lines) ---');
console.log(p6Lines.slice(0, 15).join('\n'));

const p14Lines = parsePdfPage(pages[13]);
console.log('\n--- Page 14 Reconstructed Lines (' + p14Lines.length + ' lines) ---');
console.log(p14Lines.slice(0, 15).join('\n'));
