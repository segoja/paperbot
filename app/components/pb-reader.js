import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort } from '@ember/object/computed';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';
import * as Transposer from 'chord-transposer';

import chordictionary from 'chordictionary';

import * as vexchords from 'vexchords';

export default class PbReaderComponent extends Component {
  @service currentUser;
  @service twitchChat;
  @service globalConfig;
  @service headData;
  @service lightControl;
  @service queueHandler;
  @tracked selected = '';
  @tracked songQuery = '';
  @tracked restore = true;
  @tracked zoomLevel = 0.85;
  @tracked transKey = 0;
  @tracked mode = true;

  constructor() {
    super(...arguments);
  }

  songsSorting = Object.freeze(['date_added:asc']);
  @sort('args.songs', 'songsSorting') arrangedContent;

  @computedFilterByQuery('arrangedContent', ['title', 'artist'], 'songQuery', {
    conjunction: 'and',
    sort: false,
    limit: 20,
  })
  filteredSongs;

  get currentSong() {
    return this.activeSong;
  }


  @tracked activeSong = [];
  @action setActiveSong(){
    if(this.selected){
      this.activeSong = this.selected;
      console.debug('Custom selection active...');
    } else {
      let requests = this.queueHandler.pendingSongs
      if(requests.length > 0){
        let first = requests.find(item => item!==undefined);
        if(first){
          first.get('song').then((song)=>{
            if(song){
              this.activeSong = song;
                console.debug('First request active...');
            } else {
              console.debug('The first pending request in queue has no lyrics available.');
            }
          });
        }
      } else {
        this.activeSong = [];
        console.debug('No requests pending...');
      }
    }
  }

  @action searchSong(query) {
    this.songQuery = query;
    return this.filteredSongs;
  }

  @action selectSong(song) {
    if(this.currentSong.hasDirtyAttributes){
      this.currentSong.rollbackAttributes();
    }
    this.selected = song;
    this.restore = false;
    later(() => {
      this.restore = true;
    }, 10);
  }

  @action resetZoom() {
    if(this.currentSong){
      this.currentSong.zoomLevel = Number(0.85);
    }
  }

  @action autoColumn() {
    if(this.currentSong){
      this.currentSong.columns = 0;
    }
  }

  @action moreColumn() {
    if(this.currentSong){
      if (this.currentSong.columns < 5) {
        this.currentSong.columns = Number(this.currentSong.columns) + 1;
      }
    }
  }

  @action lessColumn() {
    if (this.currentSong.columns > 0) {
      this.currentSong.columns = Number(this.currentSong.columns) - 1;
    }
  }

  @action upKey() {
    if(this.currentSong){
      this.transpose(1);
    }
  }

  @action downKey() {
    if(this.currentSong){
      this.transpose(-1);
    }
  }

  @action transpose(step){    
    if(this.currentSong.lyrics){
      let content = String(this.currentSong.lyrics);
      content = content.replace(/\(/g, '�(�');
      content = content.replace(/\)/g, '�)�');
      content = content.replace(/\[/g, '�[�');
      content = content.replace(/\]/g, '�]�');
      content = content.replace(/\{/g, '�{�');
      content = content.replace(/\}/g, '�}�');
      content = content.replace(/\n/g, '�\n�');
      content = content.replace(/\r/g, '�\r�');
      content = content.replace(/\�/g, ' � ');      
      content = Transposer.transpose(content);
      
      if (!isNaN(step)) {        
        content = content.up(step);
        this.currentSong.transSteps += step;
        content = String(content);
        content = content.replace(/\s\�\s/g, '');
        this.currentSong.lyrics = content;
      }
    }
  }

  @action addZoom() {
    if(this.currentSong){      
      this.currentSong.zoomLevel = Number(this.currentSong.zoomLevel) + Number(0.05);
    }
  }

  @action subZoom() {
    if(this.currentSong){
      this.currentSong.zoomLevel = Number(this.currentSong.zoomLevel) - Number(0.05);
    }
  }
  
  @action modeSwitch(){
    if(this.currentSong){
      this.currentSong.viewMode = !this.currentSong.viewMode;
    }
  }
  
  @tracked saving = false;
  @action doneEditing() {
    if(this.currentSong){
      this.currentSong.save();
      this.saving = true;
      later(() => {
        this.saving = false;
      }, 500);
    }
  }
  
  
  
  // Lyrics auto-adjustment functions:
  
  getCssStyle(element, prop) {
    return window.getComputedStyle(element, null).getPropertyValue(prop);
  }

  getCanvasFont(el = document.body) {
    const fontWeight = this.getCssStyle(el, 'font-weight') || 'normal';
    const fontSize = this.getCssStyle(el, 'font-size') || '16px';
    const fontFamily = this.getCssStyle(el, 'font-family') || 'Times New Roman';
    
    return `${fontWeight} ${fontSize} ${fontFamily}`;
  }      
          
  /**
    * Uses canvas.measureText to compute and return the width and height of the given text of given font in pixels.
    * 
    * @param {String} text The text to be rendered.
    * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
    * 
    * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
    */
  getTextWidth(text, font) {
    // re-use canvas object for better performance
    const canvas = this.getTextWidth.canvas || (this.getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
  }
    
  @tracked calculating = false;
  @action autoAdjust(){
    let myInstrument = new chordictionary.Instrument('EADGBE', 24, 7, 4);

    let lyrics = document.getElementById('bodycontainer');
    let chords = lyrics.querySelectorAll('strong');

    if(this.currentSong){
      if(this.currentSong.lyrics){        
        let songLines = this.currentSong.lyrics.replace(/\r/g,'').split('\n');
        let sortedSongLines = songLines.sort(function(a, b) { 
          return b.length - a.length;
        });
        let numLines = songLines.length;
        let longestLine =  sortedSongLines[0];  
        var lyricsContainers = document.getElementsByClassName(this.currentSong.viewMode? 'fancy-columns':'fancy-columns-pre'); 
        
        if(lyricsContainers.length > 0){
          let fontDetails = this.getCanvasFont(lyricsContainers[0]);
          
          let fontSize = this.getCssStyle(lyricsContainers[0], 'font-size').replace('px', '');
          console.log(fontSize);
          
          // 40px is the column separation
          let lineWidth = this.getTextWidth(longestLine, fontDetails) + 40;
          let lineHeightStyle = window.getComputedStyle(lyricsContainers[0], null).getPropertyValue('line-height');
          let lineHeight = parseFloat(lineHeightStyle);
          
          console.log(lyricsContainers[0].className);
          
          let totalHeight = lineHeight * numLines;
          
          let container = document.getElementById('bodycontainer');
          if(container){
            // console.log('The container dimensions are: '+(container.offsetWidth -24)+'x'+(container.offsetHeight -32)+'px');
            // 24px is the left+right total external padding.
            let numColumns = Math.ceil((container.offsetWidth - 24) / lineWidth);
            let optimalColWidth = (container.offsetWidth - 24) / numColumns;    
            let currentColWidth = (container.offsetWidth - 24) / this.currentSong.columns;    

            if(currentColWidth > optimalColWidth){
              currentColWidth = currentColWidth / 2;
            }
            
            // 34 is the sum of upper and lower margins of the container
            let containerHeight = container.offsetHeight - 34;
            let optimalNumLines = Math.floor(containerHeight / lineHeight);            
            let linesPerColumn = Math.floor(numLines / numColumns);
            let columnHeight = (linesPerColumn - 3 )* lineHeight;
         
            let widthCoef = (lineWidth / optimalColWidth) * 100;            
            let heightCoef = (columnHeight / containerHeight) * 100;
            let widthDiff = Math.abs(Math.floor(optimalColWidth - lineWidth));
            let TotalWDiff = (container.offsetWidth - 24) - ((lineWidth * numColumns)+(40*(numColumns-1)));
            
            let defFontsize = this.getCssStyle(document.body, 'font-size').replace('px', ''); 
            console.log('Default font size: '+defFontsize);            
            
            let zoomLevel = (((container.offsetWidth - 24) * fontSize) / lineWidth) / defFontsize;
            
            let finalFontSize = zoomLevel * defFontsize;
            
            console.log('Zoom level: '+zoomLevel);
            if(widthCoef < 80 || heightCoef < 50 ){
              if(finalFontSize > defFontsize || zoomLevel <= 2){
                if(zoomLevel >= 0.5 ){
                  this.currentSong.zoomLevel = zoomLevel;
                  console.debug('Tweaked Zoom level 1: '+this.currentSong.zoomLevel+'em');
                }
              }
            }
            
            let finalLineWidth = this.getTextWidth(longestLine, this.getCanvasFont(lyricsContainers[0]));
            
            if(numColumns < 6){
              this.currentSong.columns = numColumns;  
            }

                do {
                  
                  console.log('=============================');
                  console.log('Initial font size: '+fontSize+'px');
                  console.log('Container height: '+ containerHeight +'px');
                  console.log('Column height: '+ columnHeight +'px');
                  console.log('Height coef: '+heightCoef+'%');
                  console.log('Number of columns: '+ this.currentSong.columns);
                  console.log('Container width: '+ (container.offsetWidth - 24) +'px');
                  console.log('Optimal column width: '+optimalColWidth+'px');           
                  console.log('Current column width: '+currentColWidth+'px');              
                  console.log('Actual line width: '+lineWidth+'px');
                  console.log('Width coef: '+widthCoef+'%');
                  console.log('Col Width Diff: '+widthDiff+'px');
                  console.log('Total Width Diff: '+TotalWDiff+'px');
                  console.log('Zoom level: '+this.currentSong.zoomLevel+'%');
                  
                  lyricsContainers = document.getElementsByClassName(this.currentSong.viewMode? 'fancy-columns':'fancy-columns-pre'); 
                  fontDetails = this.getCanvasFont(lyricsContainers[0]);
                  fontSize = this.getCssStyle(lyricsContainers[0], 'font-size').replace('px', '');
                  
                  lineWidth = this.getTextWidth(longestLine, fontDetails) + 40;
                  lineHeightStyle = window.getComputedStyle(lyricsContainers[0], null).getPropertyValue('line-height');
                  lineHeight = parseFloat(lineHeightStyle);
                  
                  totalHeight = lineHeight * numLines;
                  numColumns = Math.ceil((container.offsetWidth - 24) / lineWidth);
                     
                  optimalColWidth = (container.offsetWidth - 24) / numColumns;
                  currentColWidth = (container.offsetWidth - 24) / this.currentSong.columns;
                  
                  if(currentColWidth > optimalColWidth){
                    currentColWidth = currentColWidth / 2;
                  }
                  
                  // 34 is the sum of upper and lower margins of the container
                  containerHeight = container.offsetHeight - 34;
                  
                  optimalNumLines = Math.floor(containerHeight / lineHeight);
                                    
                  linesPerColumn = Math.floor(numLines / numColumns);
                  
                  columnHeight = (linesPerColumn - 3) * lineHeight; 
                  
                  widthCoef = (lineWidth / optimalColWidth) * 100;            
                  heightCoef = (columnHeight / containerHeight) * 100;
                  widthDiff = Math.abs(Math.floor(optimalColWidth - lineWidth));
                  TotalWDiff = (container.offsetWidth - 24) - ((lineWidth * numColumns)+(40*(numColumns-1)));
                  
                  zoomLevel = (((optimalColWidth - 24) * fontSize) / lineWidth) / defFontsize;
                  
                  finalFontSize = zoomLevel * defFontsize;   
                  
                  if(columnHeight > containerHeight){
                    if(widthCoef < 60 && heightCoef > 90){
                      if(numColumns < 5){
                        this.currentSong.columns =  numColumns + 1;
                      }
                      if(lineWidth < optimalColWidth && (zoomLevel + 0.025) <= 2){
                        this.currentSong.zoomLevel = zoomLevel + 0.025;
                          console.debug('Tweaked Zoom level 2: '+this.currentSong.zoomLevel+'em');
                      } else {
                        if(finalFontSize > defFontsize || this.currentSong.zoomLevel >= 0.5 ){
                          this.currentSong.zoomLevel -= 0.025;
                          console.debug('Tweaked Zoom level 3: '+this.currentSong.zoomLevel+'em');
                        }
                      }
                    } else {
                      if(finalFontSize > defFontsize || this.currentSong.zoomLevel >= 0.5 ){
                        this.currentSong.zoomLevel -= 0.025;
                          console.debug('Tweaked Zoom level 4: '+this.currentSong.zoomLevel+'em');
                      }
                    }
                  }
                  
                  if(lineWidth > optimalColWidth || (lineWidth * numColumns) > (container.offsetWidth - 24)){
                    if(finalFontSize > defFontsize && (zoomLevel - 0.025) <= 2){
                      this.currentSong.zoomLevel = zoomLevel - 0.025;
                          console.debug('Tweaked Zoom level 5: '+this.currentSong.zoomLevel+'em');
                    }
                  }
                  if(heightCoef < 90 && numColumns > 1){
                    if(numColumns < 6){
                      this.currentSong.columns = numColumns - 1; 
                    }
                    if(finalFontSize > defFontsize || this.currentSong.zoomLevel >= 0.5 ){
                      this.currentSong.zoomLevel -= 0.025;
                      console.debug('Tweaked Zoom level 6: '+this.currentSong.zoomLevel+'em');
                    }
                  }
                  if(lineWidth < optimalColWidth && this.currentSong.zoomLevel <= 2){
                    this.currentSong.zoomLevel += 0.025;
                    console.debug('Tweaked Zoom level 7: '+this.currentSong.zoomLevel+'em');
                  }
                
                  finalLineWidth = this.getTextWidth(longestLine, this.getCanvasFont(lyricsContainers[0]));
                  console.log('Last font size: '+finalFontSize+'px');
                  console.log('Last line width: '+finalLineWidth+'px');
                  
                
                } while (currentColWidth > optimalColWidth && heightCoef > 70);
          } 
        }        
      }
    }
  }
  


@action measureTextWidth(text, fontSize) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `${fontSize}px sans-serif`;
  const metrics = context.measureText(text);
  return metrics.width;
}
  
@action newautoAdjust() {
    let lyricsContainers = document.getElementsByClassName(this.currentSong.viewMode? 'fancy-columns':'fancy-columns-pre')
    const container = lyricsContainers[0];
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const containerText = container.textContent;
    const defaultFontSize = parseInt(getComputedStyle(document.documentElement).fontSize, 10);
    const fontFactor = defaultFontSize / 16; // adjust factor as needed
    const fixedColumnGap = 40; // set a fixed column gap of 40px

    // split raw text into lines and calculate maximum line width
    const lines = containerText.split("\n");
    let maxLineWidth = 0;
    lines.forEach((line) => {
      const lineWidth = this.measureTextWidth(line, defaultFontSize);
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
      }
    });

    // initialize variables for maximum font size and number of columns
    let maxFontSize = containerHeight / (1.5 * fontFactor); // adjust factor as needed
    let maxContainerColumns = Math.floor((containerWidth + fixedColumnGap) / (maxLineWidth + fixedColumnGap));

    // loop through calculations until columns fit without overflow
    let optimalContainerColumns = 0;
    let optimalFontSize = 0;
    while (optimalContainerColumns === 0 || (optimalContainerColumns > 0 && (optimalFontSize * containerText.length * optimalContainerColumns) > containerWidth * containerHeight)) {
      // calculate maximum font size to avoid text overflow
      const maxFontSizeWidth = containerWidth / containerText.length;
      const maxFontSizeHeight = containerHeight / (1.5 * maxContainerColumns * fontFactor); // adjust factor as needed
      maxFontSize = Math.min(maxFontSizeWidth, maxFontSizeHeight);

      // calculate maximum number of columns to fit the container width
      maxContainerColumns = Math.floor((containerWidth + fixedColumnGap) / (maxLineWidth + fixedColumnGap));

      // calculate optimal font size based on container height
      const optimalFontSizeHeight = containerHeight / (1.5 * maxContainerColumns * fontFactor); // adjust factor as needed

      // try to enlarge font size as much as possible while avoiding overflow
      let columnOverflow = true;
      
      while (columnOverflow && optimalFontSize < maxFontSize) {
        optimalFontSize += 1;
        const optimalLineWidth = this.getTextWidth(lines[0], `${optimalFontSize}px sans-serif`);
        const optimalColumnWidth = (containerWidth + fixedColumnGap) / (Math.ceil(lines.length / maxContainerColumns) * (optimalLineWidth + fixedColumnGap));
        columnOverflow = optimalColumnWidth + fixedColumnGap > containerWidth;
      }
      
      // calculate optimal number of columns based on container width and line width
      const optimalLineWidth = this.getTextWidth(lines[0], `${optimalFontSize}px sans-serif`);
      optimalContainerColumns = Math.floor((containerWidth + fixedColumnGap) / (optimalLineWidth + fixedColumnGap));

      // reduce number of columns if optimal font size is too big
      if ((optimalFontSize * containerText.length * optimalContainerColumns) > containerWidth * containerHeight) {
        optimalContainerColumns--;
      }
    }

    // update component properties

    this.currentSong.zoomLevel = optimalFontSize;
    this.currentSong.columns = optimalContainerColumns;
  }
}
