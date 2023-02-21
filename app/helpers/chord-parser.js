import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import ChordSheetJS from 'chordsheetjs';
import { transpose, Chord, KeySignatures } from 'chord-transposer';

export default helper(function([element]) {
  if (!element) { return; } // return nothing when params is empty
  /*const parser = new ChordSheetJS.ChordSheetParser();
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
  }*/
  
  let regex = new RegExp('(\\b(?:(?:A(?:b(?:[679+]|sus)?|m[67]?|[689]|maj7|dim|\\+|sus)?)|(?:B(?:b(?:[679+]|sus|m[67]?|maj7|dim)?|m[67]?|[679+]|maj7|dim|sus)?)|(?:C(?:[679+]|m[67]?|maj7|dim|sus|\#(?:m[67]?|dim)?)?)|(?:D(?:b(?:[679+]|maj7|sus)?|[679]|m[67]?|maj7|dim|\\+|sus)?)|(?:E(?:b(?:[679+]|sus|m[67]?|maj7|dim)?|m[67]?|[679+]|maj7|dim|sus)?)|(?:F(?:[679+]|m[67]?|maj7|dim|sus|\#(?:[79]|m[67]|dim)?)?)|(?:G(?:b(?:maj7|sus|[6+])?|[679+]|m[67]?|maj7|dim|sus|\#(?:m[67]?|dim))?))(?=\\s|$))', 'gmu');
  let content = element.replace(/\#/g, '\#');
  content = element.replaceAll(regex, '<strong>$1</strong>');
  console.log(content);
  //content = content.replace(regex, `<strong>$1</strong>`);
  content = content.replace(/\r\n?/g, '\n');
  content = content.replace(/\n\s\n/g, '\n\n');
  content = content.replace(/\n/g, '<br>\n');
  let lines = content.split('<br>\n');
  // console.log(lines);
  
  let processed = '';
  lines.forEach((line)=>{
    if(line.replace(/\s/g, '')){
      processed += '<div>'+line.replace(/\s/g, '&nbsp')+'</div>';
    } else {
      processed += '<div><br></div>';
    }
  });
   
  return htmlSafe(processed);
});