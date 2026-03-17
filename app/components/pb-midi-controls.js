import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class lightSwitchComponent extends Component {
  @service globalConfig;
  @service midi;

  constructor() {
    super(...arguments);
  }

  get noFilters() {
    return this.midi.isMuted || !this.args.isConnected;
  }

  get noChords() {
    return (
      this.midi.isMuted || !this.midi.chordsEnabled || !this.args.isConnected
    );
  }

  get noNotes() {
    return (
      this.midi.isMuted || !this.midi.notesEnabled || !this.args.isConnected
    );
  }

  @action toggleChords() {
    this.midi.toggleChords();
  }

  @action toggleNotes() {
    this.midi.toggleNotes();
  }

  @action toggleMute() {
    this.midi.toggleMute();
  }
}
