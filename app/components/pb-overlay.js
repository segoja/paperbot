import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort } from '@ember/object/computed';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import moment from 'moment';
import { htmlSafe } from '@ember/template';

export default class PbOverlayComponent extends Component {
  @service globalConfig;

  constructor() {
    super(...arguments);

    this.pendingRequests = [
      {
        title: 'Fake song number one',
        artist: 'SuperFake',
        time: moment().add(1, 'minutes').format('YYYY/MM/DD HH:mm:ss'),
        user: 'Paperbot',
      },
      {
        title: 'Just another fake song',
        artist: 'The faker',
        time: moment().add(4, 'minutes').format('YYYY/MM/DD HH:mm:ss'),
        user: 'Tinfoilbot',
      },
      {
        title: 'Ultimate sake song',
        artist: 'Audiofake',
        time: moment().add(8, 'minutes').format('YYYY/MM/DD HH:mm:ss'),
        user: 'Anonymous',
      },
      {
        title: 'You are so fake!',
        artist: 'The Fake Buffalo',
        time: moment().add(13, 'minutes').format('YYYY/MM/DD HH:mm:ss'),
        user: 'Baaabot',
      },
      {
        title: 'Fake it!',
        artist: 'Fake Cold Sauce Cucumbers',
        time: moment().add(18, 'minutes').format('YYYY/MM/DD HH:mm:ss'),
        user: 'FaKuser',
      },
      {
        title: 'Unfaked',
        artist: 'Jake the Fake',
        time: moment().add(22, 'minutes').format('YYYY/MM/DD HH:mm:ss'),
        user: 'UsEr4l',
      },
    ];

    this.fontListGenerator();
    // this.overlayGenerator();
  }

  /*  
  @tracked content = '';

  get overlayContent(){
    return this.content;
  }
*/
  //
  // Call this function and pass in the name of the font you want to check for availability.
  //
  doesFontExist(fontName) {
    // creating our in-memory Canvas element where the magic happens
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    // the text whose final pixel size I want to measure
    var text = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // specifying the baseline font
    context.font = '72px monospace';

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

  @action async fontListGenerator() {
    let fontList = [];
    if ('queryLocalFonts' in window) {
      // The Local Font Access API is supported
      // Query for all available fonts and log metadata.
      try {
        let availableFonts = await window.queryLocalFonts();
        availableFonts.forEach(async (fontData) => {
          let detected = await this.doesFontExist(fontData.fullName);
          if (detected) {
            let fontName = '"' + fontData.fullName + '", ' + fontData.family;
            this.fonts.push(fontName);
          }
          // fontList.push({psName: fontData.postscriptName,fullName:fontData.fullName, family:fontData.family, style:fontData.style});
        });
        this.fonts = [...new Set(this.fonts)];
        // this.processFonts(fontList);
      } catch (err) {
        console.error(err.name, err.message);
      }
    } else {
      fontList.push({ psName: 'cursive', fullName: '', family: '', style: '' });
      fontList.push({
        psName: 'monospace',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({ psName: 'serif', fullName: '', family: '', style: '' });
      fontList.push({
        psName: 'sans-serif',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({ psName: 'fantasy', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'default', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'Arial', fullName: '', family: '', style: '' });
      fontList.push({
        psName: 'Arial Black',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({
        psName: 'Arial Narrow',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({
        psName: 'Arial Rounded MT Bold',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({
        psName: 'Bookman Old Style',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({
        psName: 'Bradley Hand ITC',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({ psName: 'Century', fullName: '', family: '', style: '' });
      fontList.push({
        psName: 'Century Gothic',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({
        psName: 'Comic Sans MS',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({ psName: 'Courier', fullName: '', family: '', style: '' });
      fontList.push({
        psName: 'Courier New',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({ psName: 'Georgia', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'Gentium', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'Impact', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'King', fullName: '', family: '', style: '' });
      fontList.push({
        psName: 'Lucida Console',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({ psName: 'Lalit', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'Modena', fullName: '', family: '', style: '' });
      fontList.push({
        psName: 'Monotype Corsiva',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({ psName: 'Papyrus', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'Tahoma', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'TeX', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'Times', fullName: '', family: '', style: '' });
      fontList.push({
        psName: 'Times New Roman',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({
        psName: 'Trebuchet MS',
        fullName: '',
        family: '',
        style: '',
      });
      fontList.push({ psName: 'Verdana', fullName: '', family: '', style: '' });
      fontList.push({ psName: 'Verona', fullName: '', family: '', style: '' });
      this.processFonts(fontList);
    }
  }

  @action async processFonts(fontList) {
    this.fonts = [];

    // compute height and width for all fonts
    for (let i = 0; i < fontList.length; i++) {
      let font = fontList.shift();
      let detected = false;
      let fontName = '';
      if (font.fullName) {
        detected = await this.doesFontExist(font.fullName);
        fontName = '"' + font.fullName + '", ' + font.family;
      } else {
        detected = await this.doesFontExist(font.psName);
        fontName = font.psName;
      }
      if (detected) {
        // console.debug(fontName);
        this.fonts.push(fontName);
      }
    }
    // this.fonts = await this.fonts.filter(item => item);
  }

  @tracked fonts = [];

  get fontList() {
    return [...new Set(this.fonts)];
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

  @action setFont(font) {
    if (!isEmpty(font)) {
      this.args.overlay.font = String(font);
    } else {
      this.args.overlay.font = '';
    }
    if (this.args.overlay.hasDirtyAttributes) {
      this.args.overlay.save();
    }
  }

  get overlayContent() {
    let defaultEntry = `
          <tr class="item">
            <td class="bg-transparent text-white">
              <div class="row g-0">
                <strong class="col">$title</strong>
                <div class="col-auto">$user</div>
              </div>
              <div class="row g-0">
                <small class="col"><small>$artist</small></small>
                <small class="col-auto"><small>$time</small></small>
              </div>
            </td>
          </tr>
            `;

    let defaultOverlay = `
      <table class="table table-dark">
        <thead>
          <tr>
            <th class="bg-transparent text-white"><span class="d-inline-block float-start">Title</span> <span class="d-inline-block float-end">Requested by</span></th>
          </tr>
        </thead>
        <tbody>
          $items
        </tbody>
      </table>`;

    let htmlEntries = '';

    if (this.pendingRequests.length > 0) {
      let visible = this.pendingRequests.slice(
        0,
        this.globalConfig.config.get('overlayLength') || 5
      );
      visible.forEach((request) => {
        let entry = this.args.overlay.qItems || defaultEntry;
        entry = entry.replace('$title', request.title);
        entry = entry.replace('$artist', request.artist);
        entry = entry.replace('$time', request.time);
        entry = entry.replace('$user', request.user);

        htmlEntries = htmlEntries.concat(entry);
      });
    }

    let htmlOverlay = this.args.overlay.qContainer || defaultOverlay;
    htmlOverlay = htmlOverlay.replace('$items', htmlEntries);

    return htmlSafe(htmlOverlay);
  }
}
