import Helper from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import { isEmpty } from '@ember/utils';
import * as Transposer from 'chord-transposer';

export default class ChordParser extends Helper {
  
  idCounter = 0;

  compute(params, hash) {
    // return nothing when params is empty
    if (isEmpty(params[0])) {
      return;
    }
        
    let content = params[0];
    content = content.replace(/\(/g, 'þ(þ');
    content = content.replace(/\)/g, 'þ)þ');
    content = content.replace(/\[/g, 'þ[þ');
    content = content.replace(/\]/g, 'þ]þ');
    content = content.replace(/\{/g, 'þ{þ');
    content = content.replace(/\}/g, 'þ}þ');
    content = content.replace(/\n/g, 'þ\nþ');
    content = content.replace(/\r/g, 'þ\rþ');
    content = content.replace(/\-/g, 'þ-þ');
    content = content.replace(/\,/g, 'þ,þ');
    content = content.replace(/\þ/g, ' þ ');
    
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
        content = content.replace(/\s\þ\s\r\s\þ\s\n\s\þ\s?/g, '\n');
        content = content.replace(/\s\þ\s\n\s\þ\s\s\s\þ\s\n\s\þ\s/g, '\n\n');
        content = content.replace(/\s\þ\s\n\s\þ\s/g, '<br>\n');
        let lines = content.split('<br>\n');
        
        let isPhrase = false;
         
        this.idcounter = 0;
        lines.forEach((line) => { 
          if (line.replace(/\s/g, '')) {
            if(line.includes('<strong>') && line.includes('</strong>')){
              if(!isPhrase){
                isPhrase = true;
                processed += '<div class="phrase"><div class="chords-row">';
                // console.log(line);
                processed += this.chordEnhancer(line);
                processed += '</div>';
              } else {
                processed += '</div><div class="phrase"><div class="chords-row">';
                // console.log(line);
                processed += this.chordEnhancer(line);
                processed += '</div></div>';
                isPhrase = false;
              }
            } else {
              if(isPhrase){
                isPhrase = false;
                processed += '<div class="lyrics-row">' + line + '</div>';
                processed += '</div>';
              } else {
                processed += '<div class="phrase">';
                processed += '<div class="lyrics-row">' + line + '</div>';
                processed += '</div>';                
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
      processed = processed.replace(/\s\þ\s/g, '');
      return htmlSafe(processed);
    } catch (exceptionVar) {
      
      if(mode){
        console.debug('No chords detected, using basic parsing.');

        content = content.toString();
        content = content.replace(/\s\þ\s\r\s\þ\s\n\s\þ\s?/g, '\n');
        content = content.replace(/\s\þ\s\n\s\þ\s\s\s\þ\s\n\s\þ\s/g, '\n\n');
        content = content.replace(/\s\þ\s\n\s\þ\s/g, '<br>\n');
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
    
  chordEnhancer(line){
    // let chordLine = line.replace(/\s/g, '&nbsp');
    let chordLines = line.split('<strong>');
    // console.log(chordLines);
    let classified = [];
    if(chordLines.length > 0){
      chordLines.forEach((chord) => {
        let niceLine = '';
        // console.log(chord.match(/\<\/strong\>/g));
        if(chord.includes('</strong>')){
          if(chord.match(/\<\/strong\>/g).length > 1){
            let subChords = chord.split('<strong>');                      
            subChords.forEach((subchord) => {                        
              let idLine = subchord.replace(/\<\/strong\>/g, '</strong><strong class="chord" id="chordId'+this.idCounter+'">')+'</strong>';
              // console.log(subchord);
              this.idCounter++
              classified.push(idLine);
            });
          } else {
            //let idLine = chord.replace(/\<strong\>/g, '<strong class="chord" id="chordId'+this.idCounter+'">')+'</strong>';
            // console.log(chord);
            let idLine = '<strong class="chord" id="chordId'+this.idCounter+'">'+chord+'</strong>';
            this.idCounter++
            niceLine += idLine;
          }
        } else {
          niceLine += chord;
        }
        classified.push(niceLine);
      });
      // console.debug(classified);
      return classified.join("").toString();
    } else {
      return line.replace(/\<strong\>/g, '<strong class="chord">');
    }
  }  
}
