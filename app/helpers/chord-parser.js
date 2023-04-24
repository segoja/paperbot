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
    let processed = '';
        
    try {
      content = Transposer.transpose(content);

      if (!isNaN(key)) {
        content = content.up(key);
      }
      
      processed = '';
      if(mode){
        if (content.tokens) {
          content.tokens.map((token) => {
            if (token.length > 1) {
              token.map((item) => {
                if (typeof item === 'object') {
                  // console.log(item);
                  let fullName = '';
                  if(item.root) { fullName += item.root; }
                   
                  if(item.suffix) { fullName += item.suffix; }
                  
                  if(item.bass) { fullName += item.bass; }
                  
                  // console.log(chord);
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
        
        let isPhrase = false;

        lines.forEach((line) => {
          if (line.replace(/\s/g, '')) {
            if(line.includes('<strong>') && line.includes('</strong>')){
              isPhrase = true;
              processed += '<div>'
              processed += '<span>' + line.replace(/\s/g, '&nbsp') + '<br></span>';
            } else {
              if(isPhrase){
              isPhrase = false;
                processed += '<span>' + line.replace(/\s/g, '&nbsp') + '<br></span>';
                processed += '</div>';
              } else {
                processed += '<div>' + line.replace(/\s/g, '&nbsp') + '</div>';
              }
            }
          } else {
            if(isPhrase){
              isPhrase = false;
              processed += '</div><div><br></div>';
            } else {
              processed += '<div><br></div>';
            }
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
