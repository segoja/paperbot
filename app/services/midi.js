import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { Note, Chord, Scale, ScaleType } from 'tonal';

const DEFAULT_MIDI_DEVICE_NAME = 'XPIANO88';

export default class MidiService extends Service {
  @tracked midiAccess = null;
  @tracked midiOutputs = [];

  @tracked selectedNoteOutputId = null;
  @tracked selectedChordOutputId = null;

  @tracked key = 'C';
  @tracked mode = 'major';
  @tracked chordOctave = 2;

  @tracked chordsEnabled = false;
  @tracked notesEnabled = false;
  @tracked isMuted = false;

  /**
   * signature -> {
   *   notes: number[],
   *   velocity: number,
   *   timeoutId: number | null,
   *   outputId: string | null,
   *   channel: number,
   *   type: 'note' | 'chord'
   * }
   */
  activeVoices = new Map();

  chordOctaves = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8];

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
      this.selectedNoteOutputId = null;
      this.selectedChordOutputId = null;
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

    if (
      this.selectedNoteOutputId &&
      !this.midiAccess.outputs.get(this.selectedNoteOutputId)
    ) {
      this.selectedNoteOutputId = null;
    }

    if (
      this.selectedChordOutputId &&
      !this.midiAccess.outputs.get(this.selectedChordOutputId)
    ) {
      this.selectedChordOutputId = null;
    }

    if (!this.selectedNoteOutputId) {
      this.selectNoteMidiDeviceByName(DEFAULT_MIDI_DEVICE_NAME);
    }

    if (!this.selectedChordOutputId) {
      this.selectChordMidiDeviceByName(DEFAULT_MIDI_DEVICE_NAME);
    }
  }

  get selectedNoteOutput() {
    if (!this.midiAccess || !this.selectedNoteOutputId) {
      return null;
    }

    return this.midiAccess.outputs.get(this.selectedNoteOutputId) ?? null;
  }

  get selectedChordOutput() {
    if (!this.midiAccess || !this.selectedChordOutputId) {
      return null;
    }

    return this.midiAccess.outputs.get(this.selectedChordOutputId) ?? null;
  }

  getAvailableMidiOutputs() {
    return this.midiOutputs.map((output) => ({
      ...output,
      noteSelected: output.id === this.selectedNoteOutputId,
      chordSelected: output.id === this.selectedChordOutputId,
    }));
  }

  get availableMidiOutputOptions() {
    return this.midiOutputs.map((output) => ({
      label: output.name,
      value: output.id,
    }));
  }

  get selectedNoteOutputOption() {
    return (
      this.availableMidiOutputOptions.find(
        (option) => option.value === this.selectedNoteOutputId,
      ) ?? null
    );
  }

  get selectedChordOutputOption() {
    return (
      this.availableMidiOutputOptions.find(
        (option) => option.value === this.selectedChordOutputId,
      ) ?? null
    );
  }

  get availableMidiOutputs() {
    const result = this.midiOutputs;
    console.debug('[MidiService] availableMidiOutputs', result);

    if (result.length > 0) {
      return result.map((output) => output.name);
    }

    return null;
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
    return this.getAvailableKeys().map((option) => option.label);
  }

  get selectedKeyOption() {
    const list = this.getAvailableKeys();
    const result = list.find((option) => option.value === this.key) ?? null;
    return result?.label;
  }

  formatModeLabel(mode) {
    return mode.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getMidiOutputById(deviceId) {
    if (!this.midiAccess || !deviceId) {
      return null;
    }

    return this.midiAccess.outputs.get(deviceId) ?? null;
  }

  findMidiOutputByName(deviceName) {
    if (!deviceName) {
      return null;
    }

    let normalizedTarget = deviceName.trim().toLowerCase();

    let exactMatch = this.midiOutputs.find((output) => {
      return output.name?.trim().toLowerCase() === normalizedTarget;
    });

    if (exactMatch) {
      return exactMatch;
    }

    let fuzzyMatch = this.midiOutputs.find((output) => {
      return output.name?.trim().toLowerCase().includes(normalizedTarget);
    });

    return fuzzyMatch ?? null;
  }

  selectNoteMidiDevice(deviceId) {
    if (!this.midiAccess) {
      console.debug('[MidiService] MIDI access is not initialized yet.');
      return false;
    }

    let output = this.midiAccess.outputs.get(deviceId);

    if (!output) {
      console.debug(
        `[MidiService] Note MIDI device "${deviceId}" was not found among available outputs.`,
      );
      return false;
    }

    this.selectedNoteOutputId = output.id;
    return true;
  }

  selectChordMidiDevice(deviceId) {
    if (!this.midiAccess) {
      console.debug('[MidiService] MIDI access is not initialized yet.');
      return false;
    }

    let output = this.midiAccess.outputs.get(deviceId);

    if (!output) {
      console.debug(
        `[MidiService] Chord MIDI device "${deviceId}" was not found among available outputs.`,
      );
      return false;
    }

    this.selectedChordOutputId = output.id;
    return true;
  }

  selectNoteMidiDeviceByName(deviceName) {
    let match = this.findMidiOutputByName(deviceName);

    if (!match) {
      console.debug(
        `[MidiService] Note MIDI device named "${deviceName}" was not found among available outputs.`,
      );
      return false;
    }

    return this.selectNoteMidiDevice(match.id);
  }

  selectChordMidiDeviceByName(deviceName) {
    let match = this.findMidiOutputByName(deviceName);

    if (!match) {
      console.debug(
        `[MidiService] Chord MIDI device named "${deviceName}" was not found among available outputs.`,
      );
      return false;
    }

    return this.selectChordMidiDevice(match.id);
  }

  setSelectedNoteOutput(option) {
    if (!option?.value) {
      return false;
    }

    return this.selectNoteMidiDevice(option.value);
  }

  setSelectedChordOutput(option) {
    if (!option?.value) {
      return false;
    }

    return this.selectChordMidiDevice(option.value);
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
    console.debug('[MidiService] Received input:', textInput);

    if (!textInput) return false;

    const params = textInput.split(' ');

    const firstParam = params[0];
    if (!firstParam) return false;

    if (String(firstParam).toUpperCase() === 'INFO') {
      // TODO: compose a message with allowed notes and chords in the scale
      const scale = Scale.get(`${this.key} ${this.mode}`);
      console.debug('[MidiService] Scale:', scale);
      const message = `Scale ${this.key} ${this.formatModeLabel(this.mode)}, notes: ${scale.notes}`;
      console.debug('[MidiService] returning message:' + message);
      return message;
    }

    const isNote = this.looksLikeNote(String(firstParam).toUpperCase());

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
    let duration = 500;
    let chordOctave = this.chordOctave;

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
    let duration = 500;
    let chordOctave = this.chordOctave;

    if (params[1]) {
      chordOctave = Number(params[1]);
      if (Number.isFinite(chordOctave)) {
        chordOctave = chordOctave > 8 ? 8 : chordOctave;
        chordOctave = chordOctave < -1 ? -1 : chordOctave;
      } else {
        chordOctave = this.chordOctave;
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

    console.debug('[MidiService] Chord text:', chordText);

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

    const { velocity, channel, duration, chordOctave } = options;

    let parsed = this.parsePlayableInput(inputText, { chordOctave });

    if (!parsed) {
      const message = `Could not parse playable input "${inputText}".`;
      console.debug(`[MidiService] ${message}`);
      return false;
    }

    let output =
      parsed.type === 'note'
        ? this.selectedNoteOutput
        : this.selectedChordOutput;

    if (!output) {
      const message =
        parsed.type === 'note'
          ? 'No MIDI output has been selected for single notes.'
          : 'No MIDI output has been selected for chords.';

      console.debug(`[MidiService] ${message}`);
      return message;
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
      let existingOutput = this.getMidiOutputById(existing.outputId);
      this.sendNoteOff(existing.notes, existingOutput, existing.channel);
    }

    this.sendNoteOn(parsed.notes, output, nextVelocity, channel);

    let timeoutId = null;

    if (typeof duration === 'number' && duration > 0) {
      timeoutId = window.setTimeout(() => {
        this.stopBySignature(parsed.signature);
      }, duration);
    }

    this.activeVoices.set(parsed.signature, {
      notes: parsed.notes,
      velocity: nextVelocity,
      timeoutId,
      outputId: output.id,
      channel,
      type: parsed.type,
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
      chordOctave: options.chordOctave ?? this.chordOctave,
    });

    if (!parsed) {
      return false;
    }

    return this.stopBySignature(parsed.signature, channel);
  }

  stopBySignature(signature) {
    let existing = this.activeVoices.get(signature);

    if (!existing) {
      return false;
    }

    if (existing.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    let output = this.getMidiOutputById(existing.outputId);
    this.sendNoteOff(existing.notes, output, existing.channel);
    this.activeVoices.delete(signature);
    return true;
  }

  stopAll() {
    for (let [signature, voice] of this.activeVoices.entries()) {
      if (voice.timeoutId) {
        clearTimeout(voice.timeoutId);
      }

      let output = this.getMidiOutputById(voice.outputId);
      this.sendNoteOff(voice.notes, output, voice.channel);
      this.activeVoices.delete(signature);
    }
  }

  panic(channel = 0) {
    this.stopAll();

    let outputs = [this.selectedNoteOutput, this.selectedChordOutput].filter(
      Boolean,
    );
    let uniqueOutputs = [...new Set(outputs)];

    for (let output of uniqueOutputs) {
      for (let note = 0; note <= 127; note++) {
        output.send([0x80 + channel, note, 0]);
      }
    }
  }

  sendNoteOn(notes, output, velocity, channel = 0) {
    if (!output) {
      return;
    }

    for (let note of notes) {
      output.send([0x90 + channel, note, velocity]);
    }
  }

  sendNoteOff(notes, output, channel = 0) {
    if (!output) {
      return;
    }

    for (let note of notes) {
      output.send([0x80 + channel, note, 0]);
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
    return /^[A-Ga-g](?:#{1,2}|b{1,2})?$/.test(text.trim());
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

    let chordOctave = options.chordOctave ?? this.chordOctave;

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

  buildDiatonicTriad(rootText, chordOctave = this.chordOctave) {
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
      console.debug(
        '[MidiService] Could not find root pitch class in current scale:',
        rootPitchClass,
        scale,
      );
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

    let match = cleaned.match(/^([A-Ga-g])((?:#{1,2}|b{1,2})?)$/);

    if (!match) {
      return null;
    }

    let [, letter, accidental] = match;
    let candidate = `${letter.toUpperCase()}${accidental || ''}`;

    return Note.pitchClass(candidate) || null;
  }

  normalizeNoteWithOctave(noteText) {
    let cleaned = noteText.trim().replaceAll('♯', '#').replaceAll('♭', 'b');

    let match = cleaned.match(/^([A-Ga-g])((?:#{1,2}|b{1,2})?)(-?\d+)$/);

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

    let match = cleaned.match(/^([A-Ga-g])((?:#{1,2}|b{1,2})?)(.*)$/);

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
