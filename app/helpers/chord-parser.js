import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import ChordSheetJS from 'chordsheetjs';

export default helper(function([element]) {
  if (!element) { return; } // return nothing when params is empty
  const parser = new ChordSheetJS.ChordSheetParser();
  let content = element.replace(/\n\s\n/g, '<hr>\n');
  let song = parser.parse(String(content).substring(1));
  if(song.lines.length > 0){
    song.lines.forEach((line)=>{
      // console.log(line);
      if(line.items.length > 0){
        let countC = 0;
        let countL = 0;
        line.items.forEach((item)=>{          
          if(item.chords){

            item.chords = '<strong>'+item.chords+'</strong>';
            if(!countC){
              item.chords = '<div>'+item.chords;
            }            
            item.chords = item.chords.replace(/\s/g, '&nbsp');
            countC++ 
            if(countC == line.items.length){
              item.chords = item.chords+'</div>';
            }
          }
          if(item.lyrics){
            if(!countL){
              item.lyrics = '<div>'+item.lyrics;
            }
            item.lyrics = item.lyrics.replace(/\s/g, '&nbsp');
            countL++
            if(countL == line.items.length){
              item.lyrics = item.lyrics+'</div>';
            }
          }          
        });
      }   
    });
    console.log(song);
    if(song.lines.length > 0){
      const formatter = new ChordSheetJS.TextFormatter();
      let disp = formatter.format(song);
      return htmlSafe(disp); 
    }   
  }
  return htmlSafe(element);
});