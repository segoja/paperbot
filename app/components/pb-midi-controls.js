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

  get canChords() {
    const result = this.midi.chordsEnabled;
    return result;
  }

  get canNotes() {
    const result = this.midi.notesEnabled;
    return result;
  }

  @action setMidiKey(key) {
    if (!key) return;
    console.debug('[MidiService] Setting key to', key);
    const selectedKey = this.midi
      .getAvailableKeys()
      .find((option) => option.label === key);

    this.midi.setKeyAndMode(selectedKey.value, this.midi.mode);
  }
  @action setMidiMode(mode) {
    if (!mode) return;
    console.debug('[MidiService] Setting mode to', mode);
    this.midi.setKeyAndMode(this.midi.key, mode);
  }

  @action setMidiChordsOutput(event) {
    console.debug('Setting chords output to', event);
    if (event.value) this.midi.setSelectedChordOutput(event);
  }

  @action setMidiNotesOutput(event) {
    console.debug('Setting chords output to', event);
    if (event.value) this.midi.setSelectedNoteOutput(event);
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
