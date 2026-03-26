import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import { isEmpty } from '@ember/utils';
import * as Transposer from 'chord-transposer';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderChordMode(content, key) {
  let transposed = Transposer.transpose(content);
  let steps = Number(key);

  if (!Number.isNaN(steps)) {
    transposed = transposed.up(steps);
  }

  let html = '';
  let pendingChordLine = null;
  let nextChordId = 0;

  transposed.tokens.forEach((line) => {
    let hasChord = false;
    let hasContent = false;
    let lineHtml = line
      .map((token) => {
        if (typeof token === 'object' && token !== null) {
          hasChord = true;
          hasContent = true;

          let chordHtml = `<strong class="chord" id="chordId${nextChordId}">${escapeHtml(
            token.toString(),
          )}</strong>`;
          nextChordId += 1;
          return chordHtml;
        }

        let text = String(token);
        hasContent ||= text.trim() !== '';
        return escapeHtml(text);
      })
      .join('');

    if (!hasContent) {
      if (pendingChordLine !== null) {
        html += `<div class="phrase"><div class="chords-row">${pendingChordLine}</div></div>`;
        pendingChordLine = null;
      }

      html += '<div class="empty-row"><br></div>';
      return;
    }

    if (hasChord) {
      if (pendingChordLine !== null) {
        html += `<div class="phrase"><div class="chords-row">${pendingChordLine}</div></div>`;
      }

      pendingChordLine = lineHtml;
      return;
    }

    if (pendingChordLine !== null) {
      html += `<div class="phrase"><div class="chords-row">${pendingChordLine}</div><div class="lyrics-row">${lineHtml}</div></div>`;
      pendingChordLine = null;
      return;
    }

    html += `<div class="phrase"><div class="lyrics-row">${lineHtml}</div></div>`;
  });

  if (pendingChordLine !== null) {
    html += `<div class="phrase"><div class="chords-row">${pendingChordLine}</div></div>`;
  }

  return htmlSafe(html);
}

function renderPlainMode(content) {
  return htmlSafe(
    content
      .split('\n')
      .map((line) => {
        if (line.trim() === '') {
          return '<div class="empty-row"><br></div>';
        }

        return `<div class="phrase"><div class="lyrics-row">${escapeHtml(line)}</div></div>`;
      })
      .join(''),
  );
}

export function chordParser([content], hash = {}) {
  if (isEmpty(content)) {
    return;
  }

  let normalizedContent = String(content).replace(/\r\n?/g, '\n');

  try {
    if (!hash.mode) {
      let transposed = Transposer.transpose(normalizedContent);
      let steps = Number(hash.key);

      if (!Number.isNaN(steps)) {
        transposed = transposed.up(steps);
      }

      return transposed.toString();
    }

    return renderChordMode(normalizedContent, hash.key);
  } catch {
    if (!hash.mode) {
      return normalizedContent;
    }

    return renderPlainMode(normalizedContent);
  }
}

export default helper(chordParser);
