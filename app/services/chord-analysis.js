import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { Chord, Key, Note } from 'tonal';
import * as Transposer from 'chord-transposer';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeLineBreaks(content) {
  return String(content).replace(/\r\n?/g, '\n');
}

function normalizeChordName(chordText) {
  if (!chordText) {
    return null;
  }

  let cleaned = chordText.trim();
  let match = cleaned.match(/^([A-Ga-g])((?:#{1,2}|b{1,2})?)(.*)$/);

  if (!match) {
    return null;
  }

  let [, letter, accidental, rest] = match;
  let normalized = `${letter.toUpperCase()}${accidental || ''}${rest || ''}`;
  let chord = Chord.get(normalized);

  return chord?.tonic ? normalized : null;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildMajorCandidate(tonic) {
  let key = Key.majorKey(tonic);

  return {
    tonic,
    mode: 'major',
    scaleNotes: key.scale,
    diatonicChords: key.triads,
    supportedChords: new Set([...key.triads, ...key.chords]),
  };
}

function buildMinorCandidate(tonic) {
  let key = Key.minorKey(tonic);
  let scaleNotes = uniqueValues([
    ...key.natural.scale,
    ...key.harmonic.scale,
    ...key.melodic.scale,
  ]);
  let diatonicChords = uniqueValues([
    ...key.natural.triads,
    ...key.harmonic.triads,
    ...key.melodic.triads,
  ]);
  let supportedChords = new Set([
    ...diatonicChords,
    ...key.natural.chords,
    ...key.harmonic.chords,
    ...key.melodic.chords,
  ]);

  return {
    tonic,
    mode: 'minor',
    scaleNotes,
    diatonicChords,
    supportedChords,
  };
}

function scoreCandidate(candidate, detectedChords) {
  let matchedChords = [];
  let score = 0;

  detectedChords.forEach((detected) => {
    if (candidate.supportedChords.has(detected.baseName)) {
      matchedChords.push(detected.displayName);
      score += 4;
      return;
    }

    if (candidate.scaleNotes.includes(detected.tonic)) {
      score += 1;
    } else {
      score -= 0.5;
    }
  });

  let tonicChord =
    candidate.mode === 'minor' ? `${candidate.tonic}m` : candidate.tonic;
  if (detectedChords.some((detected) => detected.baseName === tonicChord)) {
    score += 2;
  }

  return {
    tonic: candidate.tonic,
    mode: candidate.mode,
    scaleNotes: candidate.scaleNotes,
    diatonicChords: candidate.diatonicChords,
    matchedChords: uniqueValues(matchedChords),
    score,
  };
}

export default class ChordAnalysisService extends Service {
  @tracked lastAnalysis = null;

  analyze(content, options = {}) {
    let normalizedContent = normalizeLineBreaks(content ?? '');
    let analysis = {
      normalizedContent,
      transposedText: normalizedContent,
      tokens: [],
      detectedChords: [],
      probableKeys: [],
      error: null,
    };

    try {
      let transposed = Transposer.transpose(normalizedContent);
      let steps = Number(options.key);

      if (!Number.isNaN(steps)) {
        transposed = transposed.up(steps);
      }

      analysis.transposedText = transposed.toString();
      analysis.tokens = transposed.tokens ?? [];
      analysis.detectedChords = this.collectDetectedChords(analysis.tokens);
      analysis.probableKeys = this.buildProbableKeys(analysis.detectedChords);
    } catch (error) {
      analysis.error = error;
    }

    this.lastAnalysis = analysis;
    console.debug('[ChordAnalysisService] Analysis:', analysis);
    return analysis;
  }

  collectDetectedChords(tokens) {
    let seen = new Set();
    let detectedChords = [];

    tokens.forEach((line) => {
      line.forEach((token) => {
        if (typeof token !== 'object' || token === null) {
          return;
        }

        let displayName = token.toString();
        let baseName = normalizeChordName(`${token.root}${token.suffix ?? ''}`);
        let tonic = Note.pitchClass(token.root);

        if (!displayName || !baseName || !tonic || seen.has(displayName)) {
          return;
        }

        seen.add(displayName);
        detectedChords.push({ displayName, baseName, tonic });
      });
    });

    return detectedChords;
  }

  buildProbableKeys(detectedChords) {
    let tonics = uniqueValues(detectedChords.map((chord) => chord.tonic));

    return tonics
      .flatMap((tonic) => [
        scoreCandidate(buildMajorCandidate(tonic), detectedChords),
        scoreCandidate(buildMinorCandidate(tonic), detectedChords),
      ])
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return right.matchedChords.length - left.matchedChords.length;
      })
      .slice(0, 2);
  }

  renderChordMode(analysis) {
    if (analysis.error) {
      return this.renderPlainMode(analysis.normalizedContent);
    }

    let html = '';
    let pendingChordLine = null;
    let nextChordId = 0;

    analysis.tokens.forEach((line) => {
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

    return html;
  }

  renderPlainMode(content) {
    return normalizeLineBreaks(content)
      .split('\n')
      .map((line) => {
        if (line.trim() === '') {
          return '<div class="empty-row"><br></div>';
        }

        return `<div class="phrase"><div class="lyrics-row">${escapeHtml(line)}</div></div>`;
      })
      .join('');
  }
}
