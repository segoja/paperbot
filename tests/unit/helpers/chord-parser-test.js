import { module, test } from 'qunit';

import { chordParser } from 'paperbot/helpers/chord-parser';

function render(content, hash = {}) {
  return chordParser([content], hash).toString();
}

module('Unit | Helper | chord-parser', function () {
  test('it escapes lyric markup while preserving chord markup', function (assert) {
    let html = render('C\nlyrics <img src=x onerror=1> <b>tag</b>', {
      key: 0,
      mode: true,
    });

    let element = document.createElement('div');
    element.innerHTML = html;

    assert.strictEqual(element.querySelectorAll('strong.chord').length, 1);
    assert.strictEqual(element.querySelectorAll('img').length, 0);
    assert.strictEqual(element.querySelectorAll('b').length, 0);
    assert.true(html.includes('&lt;img src=x onerror=1&gt;'));
    assert.true(html.includes('&lt;b&gt;tag&lt;/b&gt;'));
  });

  test('it resets chord ids on each call', function (assert) {
    let first = render('C G\nlyrics', { key: 0, mode: true });
    let second = render('C G\nlyrics', { key: 0, mode: true });

    assert.true(first.includes('id="chordId0"'));
    assert.true(first.includes('id="chordId1"'));
    assert.true(second.includes('id="chordId0"'));
    assert.true(second.includes('id="chordId1"'));
    assert.false(second.includes('id="chordId2"'));
  });

  test('it closes a trailing chord line into a complete phrase', function (assert) {
    let html = render('C G', { key: 0, mode: true });
    let element = document.createElement('div');
    element.innerHTML = html;

    assert.strictEqual(element.querySelectorAll('.phrase').length, 1);
    assert.strictEqual(element.querySelectorAll('.chords-row').length, 1);
    assert.strictEqual(element.querySelectorAll('.lyrics-row').length, 0);
  });
});
