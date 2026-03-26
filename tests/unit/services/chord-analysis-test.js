import { module, test } from 'qunit';

import { setupTest } from 'paperbot/tests/helpers';

module('Unit | Service | chord-analysis', function (hooks) {
  setupTest(hooks);

  test('it exposes detected chords and probable keys after analysis', function (assert) {
    let service = this.owner.lookup('service:chord-analysis');
    let analysis = service.analyze('C G Am F\nlyrics', { key: 0 });

    assert.deepEqual(
      analysis.detectedChords.map((chord) => chord.displayName),
      ['C', 'G', 'Am', 'F'],
    );
    assert.strictEqual(analysis.probableKeys[0]?.tonic, 'C');
    assert.strictEqual(analysis.probableKeys[0]?.mode, 'major');
    assert.true(analysis.probableKeys[0]?.diatonicChords.includes('Am'));
    assert.strictEqual(service.lastAnalysis, analysis);
  });

  test('it falls back cleanly when no chords are detected', function (assert) {
    let service = this.owner.lookup('service:chord-analysis');
    let analysis = service.analyze('plain lyrics only', { key: 0 });

    assert.deepEqual(analysis.detectedChords, []);
    assert.deepEqual(analysis.probableKeys, []);
    assert.strictEqual(
      service.renderPlainMode(analysis.normalizedContent),
      '<div class="phrase"><div class="lyrics-row">plain lyrics only</div></div>',
    );
  });
});
