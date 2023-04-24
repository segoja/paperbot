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
      console.debug('Custom selection active...');
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
        this.currentSong.columns =
          Number(this.currentSong.columns) + 1;
      }
    }
  }

  @action lessColumn() {
    if (this.currentSong.columns > 0) {
      this.currentSong.columns =
        Number(this.currentSong.columns) - 1;
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
      let content = Transposer.transpose(this.currentSong.lyrics);
      if (!isNaN(step)) {        
        content = content.up(step);
        this.currentSong.transSteps += step;
        this.currentSong.lyrics = String(content);
      }
    }
  }

  @action addZoom() {
    if(this.currentSong){
      this.currentSong.zoomLevel = Number(this.currentSong.zoomLevel) + Number(0.025);
    }
  }

  @action subZoom() {
    if(this.currentSong){
      this.currentSong.zoomLevel = Number(this.currentSong.zoomLevel) - Number(0.025);
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
    //console.log(chordictionary);
    // var myInstrument = new Instrument (tuning, fretNumber, fretsToDisplay, maxSpan);
    let myInstrument = new chordictionary.Instrument('EADGBE', 24, 7, 4);

    let lyrics = document.getElementById('bodycontainer');
    let chords = lyrics.querySelectorAll('strong');
    //console.debug(chords);
    
    if(!this.calculating && this.currentSong.viewMode){
      this.calculating = true;
      let idcounter = 0;
      chords.forEach((chord)=>{
        //console.log(chord);
        let info = myInstrument.getChordsList(chord.innerText,4);
        
        if(info.chordList.length > 0){
          let tooltip = document.createElement("div");
          tooltip.className = 'chord-tooltip';
          // let result = chordictionary.parseChord(chord.innerText);
          info.chordList.forEach((variation)=>{
            let subElement = document.createElement("div");
            subElement.className = 'chord-variation';
            subElement.id = 'variation'+idcounter;
            subElement.innerHTML = idcounter;
            // let htmlContent = myInstrument.getChordLayout(variation.tab.join(""));
            subElement.innerHTML = idcounter;
            tooltip.appendChild(subElement);

            idcounter++
          });
        
          chord.appendChild(tooltip);
        }
        
        // let htmlContent = myInstrument.getChordLayout(result.tab.join(""), result.chords[0]);        
        // tooltip.innerHTML = 'Text';
      });
     /* 
      
        let info = myInstrument.getChordsList(chord.innerText,4);
        if(info.chordList.length > 0){
          info.chordList.forEach((variation)=>{
            let subElement = document.createElement("div");
            subElement.id = 'variation'+idcounter;
            let stringNr = 1;
            let tabArray = []:
            variation.tab.forEach((fret)=>{
              let pair = (stringNr, fret); 
              tabArray.push(pair);
            });
            console.log(pair);
            //let htmlContent = myInstrument.getChordLayout(variation.tab.join(""));
            //tooltip.innerHTML += htmlContent;
             vexchords.draw(
                sel,
                {
                  chord: [[1, 2], [2, 1], [3, 2], [4, 0], [5, 'x'], [6, 'x']]
                },
                { width: 200, height: 240, defaultColor: '#745' }
              ); 
        
            idcounter++
            
          });
        }
      */
    }
    if(this.currentSong){
      if(this.currentSong.lyrics){        
        let songLines = this.currentSong.lyrics.replace(/\r/g,'').split('\n');
        let sortedSongLines = songLines.sort(function(a, b) { 
          return b.length - a.length;
        });
        let numLines = songLines.length;
        // console.log('Number of lines: '+numLines);
        let longestLine =  sortedSongLines[0];  
        
        // var lyricsContainers = document.getElementsByClassName('card-body');
        var lyricsContainers = document.getElementsByClassName(this.currentSong.viewMode? 'fancy-columns':'fancy-columns-pre'); 
        
        if(lyricsContainers.length > 0){
          let fontDetails = this.getCanvasFont(lyricsContainers[0]);
          // 40px is the column separation
          let lineWidth = this.getTextWidth(longestLine, fontDetails) + 40;
          let lineHeightStyle = window.getComputedStyle(lyricsContainers[0], null).getPropertyValue('line-height');
          let lineHeight = parseFloat(lineHeightStyle);
          
          // console.log('Line width: '+lineWidth+'px');
          // console.log('Line height: '+lineHeight+'px'); 
          
          let container = document.getElementById('bodycontainer');
          if(container){
            // console.log('The container dimensions are: '+container.offsetWidth+'x'+container.offsetHeight+'px');
            // 24px is the external padding.
            let numColumns = Math.floor((container.offsetWidth - 24) / lineWidth);
            // console.log('Number of columns: '+ numColumns);
            
            let actualColWidth = container.offsetWidth / numColumns;
            // console.log('Actual col width: '+ actualColWidth +'px');
            
            let optimalNumLines = Math.floor(container.offsetHeight / lineHeight);
            
            let containerHeight = container.offsetHeight;
            
            // console.log('Optimal num lines to fill height: '+ optimalNumLines);
            
            let linesPerColumn = numLines / numColumns;
            // console.log('Lines per column: '+ linesPerColumn);
            
            let linesRatio = optimalNumLines / linesPerColumn;
            let widthRatio = actualColWidth / lineWidth;
            
            // console.log('Lines ratio opt/colL: '+ linesRatio);
            // console.log('Width ratio: '+ widthRatio);
                        
            this.currentSong.columns = numColumns;
            
            let fontsize = this.getCssStyle(container, 'font-size');
            
            let colHeight = numColumns * lineHeight;
            let optimalColHeight = optimalNumLines * lineHeight;
            
            // let percentHeight = (colHeight * 100) / optimalColHeight;
            let percentHeight = (linesPerColumn * 100) / ( optimalNumLines -3 );
            let percentWidth= (lineWidth * 100) / actualColWidth;
            
            let totalPercentWidth = (actualColWidth * numColumns) * 100 / container.offsetWidth;
            
            let zoomLevel = (this.currentSong.zoomLevel * ( optimalNumLines -3 )) / linesPerColumn;
            
            let diffPercent = percentHeight - percentWidth;
            
            //if(percentHeight > 90 && diffPercent > 10){
            //  zoomLevel = (this.currentSong.zoomLevel * (optimalNumLines -3)) / linesPerColumn;
            //}
            
            // console.log('All columns width %: '+totalPercentWidth);            
            // console.log('Estimated font size: '+zoomLevel);
            // console.log('Percent of the col width filled: '+percentWidth);
            // console.log('Percent of the height filled: '+percentHeight);
            
            
            if(percentHeight < percentWidth || percentWidth < 90){
              //if(percentWidth < 90){
                this.currentSong.zoomLevel += 0.025;
                later(() => {
                  this.autoAdjust(); 
                }, 5);
              //} else {
                // this.currentSong.zoomLevel = zoomLevel; 
             // }
            } else {
              if(percentHeight > percentWidth){
                this.currentSong.zoomLevel = zoomLevel;
                if(totalPercentWidth < 75){
                  this.currentSong.columns = numColumns +1;                 
                }
              }
            }
            
            
            later(() => {
              this.calculating = false;
            }, 5000);
          } 
        }        
        // console.log('Longest line: ',longestLine);
        // console.log('Lenth: '+longestLine.length);
      }
    }
  }
}
