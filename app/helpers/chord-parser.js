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
        // console.log(content);
        content = content.toString();
        content = content.replace(/\r\n?/g, '\n');
        content = content.replace(/\n\s\n/g, '\n\n');
        content = content.replace(/\n/g, '<br>\n');
        let lines = content.split('<br>\n');
        
        let isPhrase = false;
         
        let idcounter = 0;
        lines.forEach((line) => { 
          if (line.replace(/\s/g, '')) {
            if(line.includes('<strong>') && line.includes('</strong>')){
              isPhrase = true;
              processed += '<div class="song-phrase"><div class="chords-row">';
              // let chordLine = line.replace(/\s/g, '&nbsp');
              let chordLines = line.split('</strong>');
              // console.log(chordLines);
              let classified = [];
              if(chordLines.length > 0){
                chordLines.forEach((chord) => { 
                  let idLine = chord.replace(/\<strong\>/g, '<strong class="chord" id="chordId'+idcounter+'">')+'</strong>';
                  idcounter++
                  classified.push(idLine);              
                });
                // console.debug(classified);
                processed += classified.join("").toString();
              } else {
                processed += line.replace(/\<strong\>/g, '<strong class="chord">');
              }
              processed += '</div>';
            } else {
              if(isPhrase){
              isPhrase = false;
                processed += '<div class="lyrics-row">' + line + '</div>';
                processed += '</div>';
              } else {
                processed += '<div class="lyrics-row">' + line + '</div>';
              }
            }
          } else {
            if(isPhrase){
              isPhrase = false;
              processed += '</div><div class="empty-row"><br></div>';
            } else {
              processed += '<div class="empty-row"><br></div>';
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
