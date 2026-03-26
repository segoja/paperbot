import Helper from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';

export function chordParser(chordAnalysis, [content], hash = {}) {
  if (isEmpty(content)) {
    return;
  }

  let analysis = chordAnalysis.analyze(content, { key: hash.key });

  if (!hash.mode) {
    return analysis.transposedText;
  }

  return htmlSafe(chordAnalysis.renderChordMode(analysis));
}

export default class ChordParserHelper extends Helper {
  @service('chord-analysis') chordAnalysis;

  compute(params, hash) {
    return chordParser(this.chordAnalysis, params, hash);
  }
}
