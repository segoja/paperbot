import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import ChordSheetJS from 'chordsheetjs';
import * as Transposer from 'chord-transposer';
import XRegExp from 'xregexp';

export default helper(function([element, key]) {
  if (!element) { return; } // return nothing when params is empty
  
  var content = '';
  
    try{
      content = Transposer.transpose(element);
      
      if(!isNaN(key)){
        content = content.up(key);
      }
      
      if(content.tokens){
        content.tokens.map((token)=>{
          if(token.length > 1){
            token.map((item)=>{
              if(typeof item === 'object'){
                item.root = '<strong>'+item.root;
                item.suffix = item.suffix+'</strong>';
                if(item.bass){
                  item.bass = '<strong>'+item.bass+'</strong>';
                }
              }
            });
          }
        })
      }
      content = content.toString();

    }catch (exceptionVar) {
      console.debug('No chords detected, using basic parsing.');
      content = element;
    } finally{
     
      content = content.replace(/\r\n?/g, '\n');
      content = content.replace(/\n\s\n/g, '\n\n');
      content = content.replace(/\n/g, '<br>\n');
      let lines = content.split('<br>\n');
      // console.log(lines);

       // console.log(content);
      //content = content.replace(regex, `<strong>$1</strong>`);*/
      let processed = '';
      lines.forEach((line)=>{
        if(line.replace(/\s/g, '')){
          processed += '<div>'+line.replace(/\s/g, '&nbsp')+'</div>';
        } else {
          processed += '<div><br></div>';
        }
      });
       
      return htmlSafe(processed);
    }
});