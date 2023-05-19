import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';
import * as Transposer from 'chord-transposer';

export default class PbLyricsComponent extends Component {
  @service globalConfig;
  
  constructor(){
    super(...arguments);
    this.isEditing = false;
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.isEditing = false;
  }

  @tracked isEditing = false;
  
  @action toggleEdit(){
    this.isEditing = !this.isEditing;
  }
  
  @action resetZoom() {
    this.args.song.zoomLevel = Number(0.85);
  }

  @action autoColumn() {
    this.args.song.columns = 1;
  }

  @action moreColumn() {
    if (this.args.song.columns < 5) {
      this.args.song.columns = Number(this.args.song.columns) + 1;
    }
  }

  @action lessColumn() {
    if (this.args.song.columns > 0) {
      this.args.song.columns = Number(this.args.song.columns) - 1;
    }
  }

  @action upKey() {
    this.transpose(1);
  }

  @action downKey() {
    this.transpose(-1);
  }

  @action transpose(step){    
    if(this.args.song.lyrics){
      let content = String(this.args.song.lyrics);
      content = content.replace(/\)/g, '¶)¶');
      content = content.replace(/\[/g, '¶[¶');
      content = content.replace(/\]/g, '¶]¶');
      content = content.replace(/\{/g, '¶{¶');
      content = content.replace(/\}/g, '¶}¶');
      content = content.replace(/\-/g, '¶-¶');
      content = content.replace(/\,/g, '¶,¶');
      content = content.replace(/\./g, '¶.¶');
      content = content.replace(/\*/g, '¶\*¶');
      content = content.replace(/\+/g, '¶\+¶');
      content = content.replace(/\n/g, '¶\n¶');
      content = content.replace(/\r/g, '¶\r¶');
      content = content.replace(/¶/g, ' ¶ ');
      
      content = Transposer.transpose(content);
      
      if (!isNaN(step)) {        
        content = content.up(step);
        this.args.song.transSteps += step;
        content = String(content);
        content = content.replace(/\s¶\s\s¶\s/g, '');
        content = content.replace(/\s¶\s/g, '');
        content = content.replace(/¶\s/g, '');
        content = content.replace(/\s¶/g, '');
        content = content.replace(/¶/g, '');
        this.args.song.lyrics = content;
      }
    }
  }

  @action addZoom() {
    this.args.song.zoomLevel = Number(this.args.song.zoomLevel) + Number(0.05);
  }

  @action subZoom() {
    this.args.song.zoomLevel = Number(this.args.song.zoomLevel) - Number(0.05);
  }
  
  @action modeSwitch(){
    this.args.song.viewMode = !this.args.song.viewMode;
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
    const canvas = this.getTextWidth.canvas || (this.getTextWidth.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
  }

  @tracked calculating = false;
  @action autoAdjust() {
    if (this.args.song) {
      if (this.args.song.lyrics) {
        
        let songLines = this.args.song.lyrics.replace(/\r/g, '').split('\n');
        let sortedSongLines = songLines.sort(function (a, b) { return b.length - a.length; });
        let numLines = songLines.length;
        let longestLine = sortedSongLines[0];
        var lyricsContainers = document.getElementsByClassName(this.args.song.viewMode ? 'fancy-columns' : 'fancy-columns-pre');

        if (lyricsContainers.length > 0) {
          let fontDetails = this.getCanvasFont(lyricsContainers[0]);

          let fontSize = this.getCssStyle(lyricsContainers[0],'font-size')
          fontSize = fontSize.replace('px', '');
          console.log(fontSize);

          // 40px is the column separation
          let lineWidth = this.getTextWidth(longestLine, fontDetails) + 40;
          let lineHeightStyle = window.getComputedStyle(lyricsContainers[0], null);
          lineHeightStyle = lineHeightStyle.getPropertyValue('line-height');
          let lineHeight = parseFloat(lineHeightStyle);

          console.log(lyricsContainers[0].className);

          let totalHeight = lineHeight * numLines;

          let container = document.getElementById('bodycontainer');
          if (container) {
            // console.log('The container dimensions are: '+(container.offsetWidth -24)+'x'+(container.offsetHeight -32)+'px');
            // 24px is the left+right total external padding.
            let numColumns = Math.ceil((container.offsetWidth - 24) / lineWidth);
            let optimalColWidth = (container.offsetWidth - 24) / numColumns;
            let currentColWidth = (container.offsetWidth - 24) / this.args.song.columns;

            if (currentColWidth > optimalColWidth) {
              currentColWidth = currentColWidth / 2;
            }

            // 34 is the sum of upper and lower margins of the container
            let containerHeight = container.offsetHeight - 34;
            let optimalNumLines = Math.floor(containerHeight / lineHeight);
            let linesPerColumn = Math.floor(numLines / numColumns);
            let columnHeight = (linesPerColumn - 3) * lineHeight;

            let widthCoef = (lineWidth / optimalColWidth) * 100;
            let heightCoef = (columnHeight / containerHeight) * 100;
            let widthDiff = Math.abs(Math.floor(optimalColWidth - lineWidth));
            let TotalWDiff = container.offsetWidth - 24 - (lineWidth * numColumns + 40 * (numColumns - 1));

            let defFontsize = this.getCssStyle(document.body, 'font-size').replace('px', '');
            console.log('Default font size: ' + defFontsize);

            let zoomLevel = ((container.offsetWidth - 24) * fontSize) / lineWidth / defFontsize;

            if (zoomLevel > 2.5) {
              zoomLevel = 2.5;
            }

            let finalFontSize = zoomLevel * defFontsize;

            console.log('Zoom level: ' + zoomLevel);
            if (widthCoef < 80 || heightCoef < 50) {
              if (finalFontSize > defFontsize) {
                if (zoomLevel >= 2.5) {
                  this.args.song.zoomLevel = 2.5;
                  console.debug('Tweaked Zoom level 1: ' + this.args.song.zoomLevel + 'em');
                } else {
                  this.args.song.zoomLevel = zoomLevel;
                  console.debug('Tweaked Zoom level 1: ' + this.args.song.zoomLevel + 'em');                  
                }
              }
            }

            let finalLineWidth = this.getTextWidth( longestLine, this.getCanvasFont(lyricsContainers[0]));

            if (numColumns < 6) {
              this.args.song.columns = numColumns;  
            }

            let overflow = true;

            do {
              lyricsContainers = document.getElementsByClassName( this.args.song.viewMode ? 'fancy-columns' : 'fancy-columns-pre');
              fontDetails = this.getCanvasFont(lyricsContainers[0]);
              fontSize = this.getCssStyle(lyricsContainers[0],'font-size').replace('px', '');

              lineWidth = this.getTextWidth(longestLine, fontDetails) + 40;
              lineHeightStyle = window.getComputedStyle(lyricsContainers[0], null).getPropertyValue('line-height');
              lineHeight = parseFloat(lineHeightStyle);

              totalHeight = lineHeight * numLines;
              numColumns = Math.ceil((container.offsetWidth - 24) / lineWidth);

              optimalColWidth = (container.offsetWidth - 24) / numColumns;
              currentColWidth = (container.offsetWidth - 24) / this.args.song.columns;

              if (currentColWidth > optimalColWidth) {
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
              TotalWDiff = container.offsetWidth - 24 - (lineWidth * numColumns + 40 * (numColumns - 1));

              zoomLevel = ((optimalColWidth - 24) * fontSize) / lineWidth / defFontsize;

              if (zoomLevel > 2.5) {
                zoomLevel = 2.5;
              }

              finalFontSize = zoomLevel * defFontsize;

              if (columnHeight > containerHeight) {
                if (widthCoef < 60 && heightCoef > 90) {
                  if (numColumns < 5) {
                    this.args.song.columns = numColumns + 1;
                  }
                  if (lineWidth < optimalColWidth && zoomLevel + 0.025 <= 2) {
                    this.args.song.zoomLevel = zoomLevel + 0.025;
                    console.debug('Tweaked Zoom level 2: ' + this.args.song.zoomLevel + 'em');
                  } else {
                    if (finalFontSize > defFontsize || this.args.song.zoomLevel >= 2.5) {
                      this.args.song.zoomLevel -= 0.05;
                      console.debug('Tweaked Zoom level 3: ' + this.args.song.zoomLevel + 'em');
                    }
                  }
                } else {
                  if (finalFontSize > defFontsize || this.args.song.zoomLevel >= 2.5) {
                    this.args.song.zoomLevel -= 0.25;
                    this.args.song.columns += 1;
                    console.debug('Tweaked Zoom level 4: ' +this.args.song.zoomLevel +'em');
                  }
                }
              }

              if (lineWidth > optimalColWidth || (lineWidth * numColumns) > container.offsetWidth - 24) {
                if (finalFontSize > defFontsize && zoomLevel - 0.25 <= 2) {
                  this.args.song.zoomLevel = zoomLevel - 0.25;
                  console.debug('Tweaked Zoom level 5: ' + this.args.song.zoomLevel + 'em');
                }
              }
              if (heightCoef < 90 && numColumns > 1) {
                if (numColumns < 6) {
                  this.args.song.columns = numColumns - 1;
                }
                if (finalFontSize > defFontsize || this.args.song.zoomLevel >= 2.5) {
                  this.args.song.zoomLevel -= 0.25;
                  console.debug('Tweaked Zoom level 6: ' + this.args.song.zoomLevel + 'em');
                }
              }
              if (lineWidth < optimalColWidth && this.args.song.zoomLevel <= 2) {
                this.args.song.zoomLevel += 0.025;
                console.debug('Tweaked Zoom level 7: ' + this.args.song.zoomLevel + 'em');
              }

              finalLineWidth = this.getTextWidth(
                longestLine,
                this.getCanvasFont(lyricsContainers[0])
              );

              console.log('=============================');
              console.log('Initial font size: ' + fontSize + 'px');
              console.log('Container height: ' + containerHeight + 'px');
              console.log('Column height: ' + columnHeight + 'px');
              console.log('Height coef: ' + heightCoef + '%');
              console.log('Number of columns: ' + this.args.song.columns);
              console.log('Container width: ' + (container.offsetWidth - 24) + 'px');
              console.log('Optimal column width: ' + optimalColWidth + 'px');
              console.log('Current column width: ' + currentColWidth + 'px');
              console.log('Actual line width: ' + lineWidth + 'px');
              console.log('Width coef: ' + widthCoef + '%');
              console.log('Col Width Diff: ' + widthDiff + 'px');
              console.log('Total Width Diff: ' + TotalWDiff + 'px');
              console.log('Zoom level: ' + this.args.song.zoomLevel + '%');

              console.log('Last font size: ' + finalFontSize + 'px');
              console.log('Last line width: ' + finalLineWidth + 'px');
              
              overflow = false;
              
              if(lineWidth > optimalColWidth) { overflow =  true }
              if(lineWidth >  container.offsetWidth) { overflow =  true }
              if(columnHeight > container.offsetHeight) { overflow =  true }
              if((this.args.song.columns * optimalColWidth) > container.offsetWidth) { overflow =  true }
              
              console.log('Is overflowing? '+ overflow);
            // } while (overflow  || currentColWidth > optimalColWidth && heightCoef > 70);
            } while (currentColWidth > optimalColWidth && heightCoef > 70);
          }
        }
      }
    }
  } 
}
