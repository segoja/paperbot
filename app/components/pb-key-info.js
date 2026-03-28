import Component from '@glimmer/component';

export default class PbKeyInfoComponent extends Component {
  get data() {
    return this.args.analysis?.probableKeys?.map((key) => {
      let chords = key.diatonicChords.toString().replace(/,/g, ', ');
      let name = key.tonic + ' ' + key.mode;
      return { name: name, chords: chords };
    });
  }
}
