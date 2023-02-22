import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isEmpty } from '@ember/utils';
import moment from 'moment';

export default class tabParserService extends Service {
  @service intl;

  @action parseTabs(tablature) {
    var _block,
      alignment_marker,
      block,
      blocks,
      ch,
      ch2,
      chord,
      cont,
      current_block,
      end_current_block,
      error,
      i,
      j,
      k,
      l,
      len,
      len1,
      len2,
      len3,
      len4,
      line,
      lines,
      m,
      message_only,
      min_length,
      misaligned,
      multi_digit,
      n,
      notes,
      o,
      p,
      pos,
      s,
      some_notes,
      squishy,
      string,
      string_name,
      strings,
      tuning;
    tuning = 'eBGDAE';
    strings = {};
    for (j = tuning.length - 1; j >= 0; j += -1) {
      string_name = tuning[j];
      strings[string_name] = '';
    }
    lines = tablature.split(/\r?\n/);
    blocks = [];
    current_block = null;
    end_current_block = function () {
      var block_line, k, len, m, ref;
      if (current_block) {
        current_block.tuning = '';
        ref = current_block.lines;
        for (k = 0, len = ref.length; k < len; k++) {
          block_line = ref[k];
          m = block_line.match(/^\s*([A-G])/i);
          if (m != null) {
            current_block.tuning += m[1];
          } else {
            current_block.tuning = tuning;
          }
        }
        if (current_block.tuning.toUpperCase() === tuning.toUpperCase()) {
          current_block.tuning = tuning;
        }
        return (current_block = null);
      }
    };
    for (k = 0, len = lines.length; k < len; k++) {
      line = lines[k];
      if (line.match(/[-��]/)) {
        if (!current_block) {
          current_block = {
            lines: [],
          };
          blocks.push(current_block);
        }
        current_block.lines.push(line);
      } else {
        end_current_block();
      }
    }
    end_current_block();
    for (l = 0, len1 = blocks.length; l < len1; l++) {
      block = blocks[l];
      if (!(block.lines.length > 1)) {
        continue;
      }
      lines = block.lines;
      if (lines.length === 4) {
        throw new Error('Bass tablature is not supported (yet)');
      }
      if (lines.length !== 6) {
        throw new Error(
          lines.length + '-string tablature is not supported (yet)'
        );
      }
      if (block.tuning !== tuning) {
        throw new Error(
          'Alternate tunings such as ' +
            block.tuning +
            ' are not supported (yet)'
        );
      }
      min_length = 2e308;
      for (n = 0, len2 = lines.length; n < len2; n++) {
        line = lines[n];
        if (line.length < min_length) {
          min_length = line.length;
        }
      }
      for (o = 0, len3 = lines.length; o < len3; o++) {
        line = lines[o];
        if (line.length > min_length) {
          if (line[min_length] !== ' ') {
            alignment_marker = ' <<';
            misaligned = (function () {
              var len4, p, results;
              results = [];
              for (p = 0, len4 = lines.length; p < len4; p++) {
                line = lines[p];
                if (line[min_length] === ' ') {
                  results.push(
                    '' +
                      line.slice(0, min_length) +
                      alignment_marker +
                      line.slice(min_length)
                  );
                } else {
                  results.push('' + line + alignment_marker);
                }
              }
              return results;
            })().join('\n');
            message_only = 'Tab interpretation failed due to misalignment';
            error = new Error(message_only + ':\n\n' + misaligned);
            error.message_only = message_only;
            error.misaligned_block = misaligned;
            error.blocks = (function () {
              var len4, p, results;
              results = [];
              for (p = 0, len4 = blocks.length; p < len4; p++) {
                _block = blocks[p];
                if (_block === block) {
                  results.push(misaligned);
                } else {
                  results.push(_block.lines.join('\n'));
                }
              }
              return results;
            })().join('\n\n');
            throw error;
          }
        }
      }
      lines = (function () {
        var len4, p, results;
        results = [];
        for (p = 0, len4 = lines.length; p < len4; p++) {
          line = lines[p];
          results.push(line.slice(0, min_length));
        }
        return results;
      })();
      for (i = p = 0, len4 = lines.length; p < len4; i = ++p) {
        line = lines[i];
        m = line.match(/^\s*([A-G])\s*(.*)$/i);
        if (m != null) {
          string_name = m[1].toUpperCase();
          some_notes = m[2].trim();
          if (string_name === 'E' && i === 0) {
            string_name = 'e';
          }
        } else {
          string_name = tuning[i];
          some_notes = line;
        }
        strings[string_name] += some_notes;
      }
    }
    if (blocks[0] == null) {
      throw new Error('Tab interpretation failed: no music blocks found');
    }
    squishy = tablature.match(/[03-9]\d/) != null;
    pos = 0;
    cont = true;
    notes = [];
    while (cont) {
      cont = false;
      multi_digit = false;
      chord = [];
      for (s in strings) {
        string = strings[s];
        ch = string[pos];
        ch2 = string[pos + 1];
        if (ch != null) {
          cont = true;
        }
        if (!squishy) {
          if (
            (ch != null ? ch.match(/\d/) : void 0) &&
            (ch2 != null ? ch2.match(/\d/) : void 0)
          ) {
            multi_digit = true;
          }
        }
      }
      for (s in strings) {
        string = strings[s];
        ch = string[pos];
        ch2 = string[pos + 1];
        if (
          (ch != null ? ch.match(/\d/) : void 0) ||
          (multi_digit && (ch2 != null ? ch2.match(/\d/) : void 0))
        ) {
          if ((ch2 != null ? ch2.match(/\d/) : void 0) && !squishy) {
            chord.push({
              f: (ch != null ? ch.match(/\d/) : void 0)
                ? parseInt(ch + ch2)
                : parseInt(ch2),
              s: tuning.indexOf(s),
            });
          } else {
            chord.push({
              f: parseInt(ch),
              s: tuning.indexOf(s),
            });
          }
        }
      }
      if (chord.length > 0) {
        notes.push(chord);
      }
      pos++;
      if (multi_digit) {
        pos++;
      }
    }
    return notes;
  }

  @action paddingLeft(string, character, length) {
    if (string == null) {
      string = '';
    }
    return (Array(length + 1).join(character) + string).slice(-length);
  }

  @action paddingRight(string, character, length) {
    if (string == null) {
      string = '';
    }
    return (string + Array(length + 1).join(character)).slice(0, length);
  }

  @action stringifyTabs(notes, tuning) {
    var chord,
      i,
      j,
      k,
      l,
      len,
      len1,
      len2,
      max_length,
      note,
      notes_here,
      string,
      string_name,
      strings;
    if (tuning == null) {
      tuning = 'eBGDAE';
    }
    strings = (function () {
      var j, len, results;
      results = [];
      for (j = 0, len = tuning.length; j < len; j++) {
        string_name = tuning[j];
        results.push(string_name + '|-');
      }
      return results;
    })();
    for (j = 0, len = notes.length; j < len; j++) {
      chord = notes[j];
      notes_here = (function () {
        var k, len1, results;
        results = [];
        for (k = 0, len1 = tuning.length; k < len1; k++) {
          string_name = tuning[k];
          results.push(null);
        }
        return results;
      })();
      max_length = 1;
      for (k = 0, len1 = chord.length; k < len1; k++) {
        note = chord[k];
        notes_here[note.s] = note.f;
        max_length = Math.max(max_length, ('' + note.f).length);
      }
      for (i = l = 0, len2 = strings.length; l < len2; i = ++l) {
        string = strings[i];
        strings[i] += paddingRight(notes_here[i], '-', max_length) + '-';
      }
    }
    return strings.join('\n');
  }
}
