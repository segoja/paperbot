import Helper from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import { isEmpty } from '@ember/utils';
import * as Transposer from 'chord-transposer';

export default class ChordParser extends Helper {

  compute(params, hash) {
    // return nothing when params is empty
    if (isEmpty(params[0])) {
      return;
    }
        
    let content = params[0];
    let key = hash.key;
    let mode = hash.mode;

    try {
      content = Transposer.transpose(content);

      if (!isNaN(key)) {
        content = content.up(key);
      }
      
      let processed = '';
      if(mode){
        if (content.tokens) {
          content.tokens.map((token) => {
            if (token.length > 1) {
              token.map((item) => {
                if (typeof item === 'object') {
                  item.root = '<strong>' + item.root;
                  item.suffix = item.suffix + '</strong>';
                  if (item.bass) {
                    item.bass = '<strong>' + item.bass + '</strong>';
                  }
                }
              });
            }
          });
        }
      
        content = content.toString();
        content = content.replace(/\r\n?/g, '\n');
        content = content.replace(/\n\s\n/g, '\n\n');
        content = content.replace(/\n/g, '<br>\n');
        let lines = content.split('<br>\n');

        lines.forEach((line) => {
          if (line.replace(/\s/g, '')) {
            processed += '<div>' + line.replace(/\s/g, '&nbsp') + '</div>';
          } else {
            processed += '<div><br></div>';
          }
        });
      } else {
        processed = content.toString();
      }
      
      return htmlSafe(processed);
    } catch (exceptionVar) {
      
      if(mode){
        console.debug('No chords detected, using basic parsing.');

        content = content.toString();
        content = content.replace(/\r\n?/g, '\n');
        content = content.replace(/\n\s\n/g, '\n\n');
        content = content.replace(/\n/g, '<br>\n');
        let lines = content.split('<br>\n');
        // console.debug(lines);

        // console.debug(content);
        //content = content.replace(regex, `<strong>$1</strong>`);*/
        let processed = '';
        lines.forEach((line) => {
          if (line.replace(/\s/g, '')) {
            processed += '<div>' + line.replace(/\s/g, '&nbsp') + '</div>';
          } else {
            processed += '<div><br></div>';
          }
        });
      } else {
        processed = content.toString();
      }
      return htmlSafe(processed);
    }
  }
}
