import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort } from '@ember/object/computed';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';

export default class PbOverlayComponent extends Component {
  @service globalConfig;

  //
  // Call this function and pass in the name of the font you want to check for availability.
  //
  doesFontExist(fontName) {
      // creating our in-memory Canvas element where the magic happens
      var canvas = document.createElement("canvas");
      var context = canvas.getContext("2d");
       
      // the text whose final pixel size I want to measure
      var text = "abcdefghijklmnopqrstuvwxyz0123456789";
       
      // specifying the baseline font
      context.font = "72px monospace";
       
      // checking the size of the baseline text
      var baselineSize = context.measureText(text).width;
       
      // specifying the font whose existence we want to check
      context.font = "72px '" + fontName + "', monospace";
       
      // checking the size of the font we want to check
      var newSize = context.measureText(text).width;
       
      // removing the Canvas element we created
      canvas = null;
       
      //
      // If the size of the two text instances is the same, the font does not exist because it is being rendered
      // using the default sans-serif font
      //
      if (newSize == baselineSize) {
          return false;
      } else {
          return true;
      }
  }

  constructor() {
    super(...arguments);
    this.fontListGenerator();
  }
  
  @action async fontListGenerator(){
    let fontlist = [];
    if ('queryLocalFonts' in window) {
      // The Local Font Access API is supported
      // Query for all available fonts and log metadata.
      try {
        const availableFonts = await window.queryLocalFonts();
        for (const fontData of availableFonts) {
          fontlist.push({psName: fontData.postscriptName,fullName:fontData.fullName, family:fontData.family, style:fontData.style});
        }
      } catch (err) {
        console.error(err.name, err.message);
      }      
    } else {
      fontlist.push({psName: 'cursive', fullName:'', family:'', style:''});
      fontlist.push({psName: 'monospace', fullName:'', family:'', style:''});
      fontlist.push({psName: 'serif', fullName:'', family:'', style:''});
      fontlist.push({psName: 'sans-serif', fullName:'', family:'', style:''});
      fontlist.push({psName: 'fantasy', fullName:'', family:'', style:''});
      fontlist.push({psName: 'default', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Arial', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Arial Black', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Arial Narrow', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Arial Rounded MT Bold', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Bookman Old Style', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Bradley Hand ITC', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Century', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Century Gothic', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Comic Sans MS', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Courier', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Courier New', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Georgia', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Gentium', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Impact', fullName:'', family:'', style:''});
      fontlist.push({psName: 'King', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Lucida Console', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Lalit', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Modena', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Monotype Corsiva', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Papyrus', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Tahoma', fullName:'', family:'', style:''});
      fontlist.push({psName: 'TeX', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Times', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Times New Roman', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Trebuchet MS', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Verdana', fullName:'', family:'', style:''});
      fontlist.push({psName: 'Verona', fullName:'', family:'', style:''});
    }
    // compute height and width for all fonts
    for (let i=0; i<fontlist.length; i++) {
      let font = fontlist.shift();
      let detected = false;
      let fontName = '';
      if(font.fullName){
        detected = this.doesFontExist(font.fullName);
        fontName = '\"'+font.fullName+'\", '+font.family;
      } else {        
        detected = this.doesFontExist(font.psName);
        fontName = font.psName;
      }
      if(detected){
        this.fonts.push(fontName);
      }
    }
    this.fonts = this.fonts.filter(item => item);
    console.log(this.fonts);
  }
  
  @tracked fonts = [];
  
  get fontList(){
    return this.fonts;
  }

  fontSorting = Object.freeze(['name:asc']);
  @sort('fontList', 'fontSorting') arrangedFonts;

  @tracked saving = false;

  @action doneEditing() {
    this.args.saveOverlay();
    this.saving = true;
    later(() => {
      this.saving = false;
    }, 500);
  }
  
  @action setFont(font){
    console.log(font);
    if(!isEmpty(font)){
      if(font.fullName){
        this.args.overlay.font = String(font.fullName);
      } else {
        this.args.overlay.font = String(font.psName);        
      }
      console.log(this.args.overlay);
    } else {
      this.args.overlay.font = '';
    }
  }
}
