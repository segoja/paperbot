import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class PbKeyInfoComponent extends Component {
  @service chordAnalysis;
  constructor() {
    super(...arguments);
  }

  get data() {
    const result = this.chordAnalysis.lastAnalysis.probableKeys?.map((key) => {
      let chords = key.diatonicChords.toString().replace(/,/g, ', ');
      let name = key.tonic + ' ' + key.mode;
      return { name: name, chords: chords };
    });
    return result;
  }
}
