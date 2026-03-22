import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { Note, Chord, Scale, ScaleType } from 'tonal';

const DEFAULT_MIDI_DEVICE_NAME = 'XPIANO88';
const DEFAULT_CHORD_OCTAVE = 2;

export default class MidiService extends Service {
  @tracked midiAccess = null;
  @tracked midiOutputs = [];
  @tracked selectedOutputId = null;
  @tracked selectedOutput = null;
  @tracked key = 'D';
  @tracked mode = 'ionian';

  @tracked chordsEnabled = false;
  @tracked notesEnabled = false;
  @tracked isMuted = false;

  /**
   * signature -> { notes: number[], velocity: number, timeoutId: number | null }
   */
  activeVoices = new Map();

  constructor() {
    super(...arguments);
    this.initMidi();
  }

  async initMidi() {
    if (!navigator.requestMIDIAccess) {
      console.debug(
        '[MidiService] Web MIDI API is not available in this browser.',
      );
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.refreshMidiOutputs();

      this.midiAccess.onstatechange = () => {
        this.refreshMidiOutputs();
      };
    } catch (error) {
      console.debug(
        `[MidiService] Could not initialize MIDI access: ${error?.message ?? error}`,
      );
    }
  }

  refreshMidiOutputs() {
    if (!this.midiAccess) {
      this.midiOutputs = [];
      this.selectedOutputId = null;
      this.selectedOutput = null;
      return;
    }

    this.midiOutputs = Array.from(this.midiAccess.outputs.values()).map(
      (output) => ({
        id: output.id,
        name: output.name,
        manufacturer: output.manufacturer,
        state: output.state,
        connection: output.connection,
      }),
    );

    if (this.selectedOutputId) {
      let output = this.midiAccess.outputs.get(this.selectedOutputId);
      this.selectedOutput = output ?? null;

      if (!output) {
        this.selectedOutputId = null;
      }
    } else {
      this.selectMidiDeviceByName(DEFAULT_MIDI_DEVICE_NAME);
    }
  }

  getAvailableMidiOutputs() {
    return this.midiOutputs.map((output) => ({
      ...output,
      selected: output.id === this.selectedOutputId,
    }));
  }

  getAvailableModes() {
    return ScaleType.all()
      .map((scale) => scale.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  get availableModes() {
    return this.getAvailableModes();
  }

  get selectedModeOption() {
    console.debug('modes', this.availableModes);
    return this.availableModes.find((option) => option === this.mode) ?? null;
  }

  getAvailableKeys() {
    return [
      { label: 'C', value: 'C' },
      { label: 'C# / Db', value: 'C#' },
      { label: 'D', value: 'D' },
      { label: 'D# / Eb', value: 'D#' },
      { label: 'E', value: 'E' },
      { label: 'F', value: 'F' },
      { label: 'F# / Gb', value: 'F#' },
      { label: 'G', value: 'G' },
      { label: 'G# / Ab', value: 'G#' },
      { label: 'A', value: 'A' },
      { label: 'A# / Bb', value: 'A#' },
      { label: 'B', value: 'B' },
    ];
  }

  get availableKeys() {
    const result = this.getAvailableKeys().map((option) => option.label);
    console.debug('keys', result);
    return result;
  }

  get selectedKeyOption() {
    const list = this.getAvailableKeys();
    const result = list.find((option) => option.value === this.key) ?? null;
    return result?.label;
  }

  formatModeLabel(mode) {
    return mode.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  selectMidiDevice(deviceId) {
    if (!this.midiAccess) {
      console.debug('[MidiService] MIDI access is not initialized yet.');
      return false;
    }

    let output = this.midiAccess.outputs.get(deviceId);

    if (!output) {
      console.debug(
        `[MidiService] MIDI device "${deviceId}" was not found among available outputs.`,
      );
      return false;
    }

    this.selectedOutputId = output.id;
    this.selectedOutput = output;
    return true;
  }

  selectMidiDeviceByName(deviceName) {
    if (!deviceName) {
      return false;
    }

    let normalizedTarget = deviceName.trim().toLowerCase();

    let exactMatch = this.midiOutputs.find((output) => {
      return output.name?.trim().toLowerCase() === normalizedTarget;
    });

    if (exactMatch) {
      return this.selectMidiDevice(exactMatch.id);
    }

    let fuzzyMatch = this.midiOutputs.find((output) => {
      return output.name?.trim().toLowerCase().includes(normalizedTarget);
    });

    if (fuzzyMatch) {
      return this.selectMidiDevice(fuzzyMatch.id);
    }

    console.debug(
      `[MidiService] MIDI device named "${deviceName}" was not found among available outputs.`,
    );
    return false;
  }

  setKeyAndMode(keyText, modeText) {
    let normalizedKey = this.normalizeKey(keyText);
    let normalizedMode = this.normalizeMode(modeText);

    if (!normalizedKey) {
      console.debug(`[MidiService] Invalid key "${keyText}".`);
      return false;
    }

    if (!normalizedMode) {
      console.debug(`[MidiService] Invalid mode "${modeText}".`);
      return false;
    }

    this.key = normalizedKey;
    this.mode = normalizedMode;
    return true;
  }

  inputHandler(textInput) {
    if (!textInput) return false;

    const params = textInput.split(' ');
    console.debug('[MidiService] Received input:', params);

    const firstParam = params[0];
    if (!firstParam) return false;

    if (firstParam === 'info') {
      return {
        key: this.key,
        mode: this.mode,
        notesEnabled: this.notesEnabled,
        chordsEnabled: this.chordsEnabled,
        isMuted: this.isMuted,
      };
    }

    const isNote = this.looksLikeNote(firstParam);

    if (isNote) {
      return this.playNote(params);
    } else {
      return this.playChord(params);
    }
  }

  playNote(params = []) {
    if (!this.notesEnabled) return 'Single notes are disabled.';
    if (this.isMuted) return 'Midi output is muted.';

    let noteText = params[0];
    let velocity = 90;
    let channel = 0;
    let duration = null;
    let chordOctave = DEFAULT_CHORD_OCTAVE;

    if (params[1]) {
      duration = Number(params[1]);
      if (Number.isFinite(duration)) {
        duration = duration < 5 ? 1 : duration;
      } else {
        duration = null;
      }
    }

    if (params[2]) {
      velocity = Number(params[2]);
      if (Number.isFinite(velocity)) {
        velocity = velocity > 127 ? 127 : velocity;
        velocity = velocity < 0 ? 45 : velocity;
      } else {
        velocity = 90;
      }
    }

    return this.play(noteText, {
      velocity,
      channel,
      duration,
      chordOctave,
    });
  }

  playChord(params = []) {
    if (!this.chordsEnabled) return 'Chords are disabled.';
    if (this.isMuted) return 'Midi output is muted.';

    let chordText = params[0];
    let velocity = 90;
    let channel = 0;
    let duration = null;
    let chordOctave = DEFAULT_CHORD_OCTAVE;

    if (params[1]) {
      chordOctave = Number(params[1]);
      if (Number.isFinite(chordOctave)) {
        chordOctave = chordOctave > 7 ? 7 : chordOctave;
        chordOctave = chordOctave < -1 ? -1 : chordOctave;
      } else {
        chordOctave = DEFAULT_CHORD_OCTAVE;
      }
    }

    if (params[2]) {
      duration = Number(params[2]);
      if (Number.isFinite(duration)) {
        duration = duration < 5 ? 1 : duration;
      } else {
        duration = null;
      }
    }

    if (params[3]) {
      velocity = Number(params[3]);
      if (Number.isFinite(velocity)) {
        velocity = velocity > 127 ? 127 : velocity;
        velocity = velocity < 0 ? 45 : velocity;
      } else {
        velocity = 90;
      }
    }

    return this.play(chordText, {
      velocity,
      channel,
      duration,
      chordOctave,
    });
  }

  play(inputText, options = {}) {
    if (this.isMuted) {
      return 'Midi output is muted.';
    }

    if (!this.selectedOutput) {
      console.debug('[MidiService] No MIDI output has been selected.');
      return false;
    }

    const { velocity, channel, duration, chordOctave } = options;

    let parsed = this.parsePlayableInput(inputText, { chordOctave });

    if (!parsed) {
      const message = `Could not parse playable input "${inputText}".`;
      console.debug(`[MidiService] ${message}`);
      return false;
    }

    if (!this.isPlayableInCurrentScale(parsed)) {
      const message = `"${inputText}" is outside the current key/mode (${this.key} ${this.mode}).`;
      console.debug(`[MidiService] ${message}`);
      return message;
    }

    let existing = this.activeVoices.get(parsed.signature);
    let nextVelocity = existing
      ? Math.min(existing.velocity + 5, 127)
      : this.normalizeVelocity(velocity);

    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    if (existing) {
      this.sendNoteOff(existing.notes, channel);
    }

    this.sendNoteOn(parsed.notes, nextVelocity, channel);

    let timeoutId = null;

    if (typeof duration === 'number' && duration > 0) {
      timeoutId = window.setTimeout(() => {
        this.stopBySignature(parsed.signature, channel);
      }, duration);
    }

    this.activeVoices.set(parsed.signature, {
      notes: parsed.notes,
      velocity: nextVelocity,
      timeoutId,
    });

    return {
      type: parsed.type,
      input: inputText,
      notes: parsed.notes,
      velocity: nextVelocity,
      signature: parsed.signature,
    };
  }

  stop(inputText, channel = 0, options = {}) {
    let parsed = this.parsePlayableInput(inputText, {
      chordOctave: options.chordOctave ?? DEFAULT_CHORD_OCTAVE,
    });

    if (!parsed) {
      return false;
    }

    return this.stopBySignature(parsed.signature, channel);
  }

  stopBySignature(signature, channel = 0) {
    let existing = this.activeVoices.get(signature);

    if (!existing) {
      return false;
    }

    if (existing.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    this.sendNoteOff(existing.notes, channel);
    this.activeVoices.delete(signature);
    return true;
  }

  stopAll(channel = 0) {
    for (let [signature, voice] of this.activeVoices.entries()) {
      if (voice.timeoutId) {
        clearTimeout(voice.timeoutId);
      }

      this.sendNoteOff(voice.notes, channel);
      this.activeVoices.delete(signature);
    }
  }

  panic(channel = 0) {
    this.stopAll(channel);

    if (this.selectedOutput) {
      for (let note = 0; note <= 127; note++) {
        this.selectedOutput.send([0x80 + channel, note, 0]);
      }
    }
  }

  sendNoteOn(notes, velocity, channel = 0) {
    for (let note of notes) {
      this.selectedOutput.send([0x90 + channel, note, velocity]);
    }
  }

  sendNoteOff(notes, channel = 0) {
    for (let note of notes) {
      this.selectedOutput.send([0x80 + channel, note, 0]);
    }
  }

  parsePlayableInput(inputText, options = {}) {
    let text = inputText?.trim();

    if (!text) {
      return null;
    }

    if (this.looksLikeNote(text)) {
      return this.parseNote(text);
    }

    return this.parseChord(text, options);
  }

  looksLikeNote(text) {
    return /^[A-Ga-g][#b]?-?\d+$/.test(text);
  }

  isBareChordRoot(text) {
    return /^[A-Ga-g][#b]?$/.test(text.trim());
  }

  parseNote(text) {
    let normalized = this.normalizeNoteWithOctave(text);

    if (!normalized) {
      return null;
    }

    let midi = Note.midi(normalized);

    if (midi === null || midi < 0 || midi > 127) {
      return null;
    }

    let pitchClass = Note.pitchClass(normalized);

    return {
      type: 'note',
      signature: `note:${normalized}`,
      source: text,
      noteNames: [pitchClass],
      notes: [midi],
    };
  }

  parseChord(text, options = {}) {
    let cleaned = text?.trim();

    if (!cleaned) {
      return null;
    }

    let chordOctave = options.chordOctave ?? DEFAULT_CHORD_OCTAVE;

    if (this.isBareChordRoot(cleaned)) {
      let normalizedRoot = this.normalizeKey(cleaned);

      if (!normalizedRoot) {
        return null;
      }

      return this.buildDiatonicTriad(normalizedRoot, chordOctave);
    }

    let normalizedChordName = this.normalizeChordName(cleaned);

    if (!normalizedChordName) {
      return null;
    }

    let chord = Chord.get(normalizedChordName);

    if (!chord || !chord.tonic || !chord.notes?.length) {
      return null;
    }

    let bassPitchClass = this.extractBassPitchClass(normalizedChordName);
    let midiNotes = this.chordNotesToMidi(
      chord.notes,
      chordOctave,
      bassPitchClass,
    );

    if (!midiNotes.length) {
      return null;
    }

    return {
      type: 'chord',
      signature: `chord:${normalizedChordName}@${chordOctave}`,
      source: text,
      noteNames: this.getPitchClassesFromMidiNotes(midiNotes),
      notes: midiNotes,
    };
  }

  buildDiatonicTriad(rootText, chordOctave = DEFAULT_CHORD_OCTAVE) {
    let rootPitchClass = Note.pitchClass(rootText);

    if (!rootPitchClass) {
      return null;
    }

    let scale = Scale.get(`${this.key} ${this.mode}`);
    let scalePitchClasses = (scale.notes || []).map((noteName) =>
      Note.pitchClass(noteName),
    );

    if (scalePitchClasses.length < 3) {
      console.debug(
        '[MidiService] Could not build diatonic triad because current scale has fewer than 3 notes:',
        scale,
      );
      return null;
    }

    let degreeIndex = scalePitchClasses.findIndex(
      (pitchClass) => pitchClass === rootPitchClass,
    );

    if (degreeIndex === -1) {
      return null;
    }

    let triadPitchClasses = [
      scalePitchClasses[degreeIndex],
      scalePitchClasses[(degreeIndex + 2) % scalePitchClasses.length],
      scalePitchClasses[(degreeIndex + 4) % scalePitchClasses.length],
    ];

    let midiNotes = this.chordNotesToMidi(triadPitchClasses, chordOctave);

    if (!midiNotes.length) {
      return null;
    }

    return {
      type: 'chord',
      signature: `chord:diatonic:${rootPitchClass}@${chordOctave}:${this.key}-${this.mode}`,
      source: rootText,
      noteNames: triadPitchClasses,
      notes: midiNotes,
    };
  }

  chordNotesToMidi(noteNames, baseOctave = 4, bassPitchClass = null) {
    let result = [];
    let orderedNames = [...noteNames];

    if (bassPitchClass) {
      let bassIndex = orderedNames.findIndex((noteName) => {
        return Note.pitchClass(noteName) === bassPitchClass;
      });

      if (bassIndex > 0) {
        orderedNames = [
          ...orderedNames.slice(bassIndex),
          ...orderedNames.slice(0, bassIndex),
        ];
      }
    }

    let lastMidi = null;
    let octave = baseOctave;

    for (let noteName of orderedNames) {
      let pitchClass = Note.pitchClass(noteName);
      let midi = Note.midi(`${pitchClass}${octave}`);

      if (midi === null) {
        return [];
      }

      while (lastMidi !== null && midi <= lastMidi) {
        octave += 1;
        midi = Note.midi(`${pitchClass}${octave}`);
      }

      if (midi < 0 || midi > 127) {
        return [];
      }

      result.push(midi);
      lastMidi = midi;
    }

    return result;
  }

  getPitchClassesFromMidiNotes(midiNotes) {
    return midiNotes.map((midi) => Note.pitchClass(Note.fromMidi(midi)));
  }

  extractBassPitchClass(chordName) {
    if (!chordName.includes('/')) {
      return null;
    }

    let [, bass] = chordName.split('/');

    if (!bass) {
      return null;
    }

    return Note.pitchClass(bass) || null;
  }

  isPlayableInCurrentScale(parsed) {
    let allowedPitchClasses = this.getCurrentScalePitchClasses();

    return parsed.noteNames.every((noteName) => {
      let pitchClass = Note.pitchClass(noteName);
      return allowedPitchClasses.has(pitchClass);
    });
  }

  getCurrentScalePitchClasses() {
    let scaleName = `${this.key} ${this.mode}`;
    let scale = Scale.get(scaleName);

    return new Set(
      (scale.notes || []).map((noteName) => Note.pitchClass(noteName)),
    );
  }

  normalizeVelocity(value) {
    let numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return 90;
    }

    return Math.max(1, Math.min(Math.round(numeric), 127));
  }

  normalizeMode(modeText) {
    if (!modeText) {
      return null;
    }

    let cleaned = modeText.trim().toLowerCase().replace(/\s+/g, ' ');
    let scale = Scale.get(`C ${cleaned}`);

    if (!scale || scale.empty || !scale.notes?.length) {
      return null;
    }

    return cleaned;
  }

  normalizeKey(keyText) {
    if (!keyText) {
      return null;
    }

    let cleaned = keyText.trim().replaceAll('♯', '#').replaceAll('♭', 'b');

    let match = cleaned.match(/^([A-Ga-g])([#b]?)$/);

    if (!match) {
      return null;
    }

    let [, letter, accidental] = match;
    let candidate = `${letter.toUpperCase()}${accidental || ''}`;

    return Note.pitchClass(candidate) || null;
  }

  normalizeNoteWithOctave(noteText) {
    let cleaned = noteText.trim().replaceAll('♯', '#').replaceAll('♭', 'b');

    let match = cleaned.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);

    if (!match) {
      return null;
    }

    let [, letter, accidental, octave] = match;
    let candidate = `${letter.toUpperCase()}${accidental || ''}${octave}`;

    return Note.midi(candidate) === null ? null : candidate;
  }

  normalizeChordName(chordText) {
    if (!chordText) {
      return null;
    }

    let cleaned = chordText.trim().replaceAll('♯', '#').replaceAll('♭', 'b');

    let match = cleaned.match(/^([A-Ga-g])([#b]?)(.*)$/);

    if (!match) {
      return null;
    }

    let [, letter, accidental, rest] = match;
    let normalized = `${letter.toUpperCase()}${accidental || ''}${rest || ''}`;

    let chord = Chord.get(normalized);

    if (!chord || !chord.tonic || !chord.notes?.length) {
      return null;
    }

    return normalized;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  toggleChords() {
    this.chordsEnabled = !this.chordsEnabled;
  }

  toggleNotes() {
    this.notesEnabled = !this.notesEnabled;
  }
}
