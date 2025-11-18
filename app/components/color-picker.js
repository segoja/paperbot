import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class colorPickerComponent extends Component {
  @tracked colorBlock = '';
  @tracked ctx1 = '';
  @tracked width1 = '';
  @tracked height1 = '';

  @tracked colorStrip = '';
  @tracked ctx2 = '';
  @tracked width2 = '';
  @tracked height2 = '';

  @tracked colorLabel = '';

  @tracked x = 0;
  @tracked y = 0;
  @tracked drag = false;
  @tracked rgbaColor = this.args.color || 'rgba(0,255,0,1)';
  @tracked hexColor = this.args.color || '#00ff00';

  constructor() {
    super(...arguments);
  }

  willDestroy() {
    super.willDestroy(...arguments);
  }

  changeColor(e) {
    this.x = e.offsetX;
    this.y = e.offsetY;
    var imageData = this.ctx1.getImageData(this.x, this.y, 1, 1).data;
    this.rgbaColor =
      'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',1)';
    this.hexColor = this.RGBAToHexA(this.rgbaColor, true);
    this.colorLabel.style.backgroundColor = this.hexColor;
  }

  fillGradient() {
    this.ctx1.fillStyle = this.rgbaColor;
    this.ctx1.fillRect(0, 0, this.width1, this.height1);

    var grdWhite = this.ctx2.createLinearGradient(0, 0, this.width1, 0);
    grdWhite.addColorStop(0, 'rgba(255,255,255,1)');
    grdWhite.addColorStop(1, 'rgba(255,255,255,0)');
    this.ctx1.fillStyle = grdWhite;
    this.ctx1.fillRect(0, 0, this.width1, this.height1);

    var grdBlack = this.ctx2.createLinearGradient(0, 0, 0, this.height1);
    grdBlack.addColorStop(0, 'rgba(0,0,0,0)');
    grdBlack.addColorStop(1, 'rgba(0,0,0,1)');
    this.ctx1.fillStyle = grdBlack;
    this.ctx1.fillRect(0, 0, this.width1, this.height1);
  }

  @action async firstLoad() {
    this.colorBlock = document.getElementsByClassName('color-block')[0];
    this.ctx1 = this.colorBlock.getContext('2d', {
      willReadFrequently: true,
      premultipliedAlpha: true,
    });
    this.width1 = this.colorBlock.width;
    this.height1 = this.colorBlock.height;

    this.colorStrip = document.getElementsByClassName('color-strip')[0];
    this.ctx2 = this.colorStrip.getContext('2d', {
      willReadFrequently: true,
      premultipliedAlpha: true,
    });
    this.width2 = this.colorStrip.width;
    this.height2 = this.colorStrip.height;

    this.colorLabel = document.getElementsByClassName('color-label')[0];

    this.x = 0;
    this.y = 0;
    this.drag = false;

    this.ctx1.rect(0, 0, this.width1, this.height1);
    this.fillGradient();

    this.ctx2.rect(0, 0, this.width2, this.height2);
    var grd1 = this.ctx2.createLinearGradient(0, 0, 0, this.height1);
    grd1.addColorStop(0, 'rgba(255, 0, 0, 1)');
    grd1.addColorStop(0.17, 'rgba(255, 255, 0, 1)');
    grd1.addColorStop(0.34, 'rgba(0, 255, 0, 1)');
    grd1.addColorStop(0.51, 'rgba(0, 255, 255, 1)');
    grd1.addColorStop(0.68, 'rgba(0, 0, 255, 1)');
    grd1.addColorStop(0.85, 'rgba(255, 0, 255, 1)');
    grd1.addColorStop(1, 'rgba(255, 0, 0, 1)');
    this.ctx2.fillStyle = grd1;
    this.ctx2.fill();

    this.rgbaColor = await this.args.color;
    this.hexColor = this.RGBAToHexA(this.rgbaColor, true);
    this.colorLabel.style.backgroundColor = this.args.color;
  }

  @action stripClick(e) {
    this.x = e.offsetX;
    this.y = e.offsetY;
    var imageData = this.ctx2.getImageData(this.x, this.y, 1, 1).data;
    this.rgbaColor =
      'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',1)';
    this.fillGradient();
  }

  @action blockClick() {
    this.drag = true;
  }

  @action blockMove(e) {
    if (this.drag) {
      this.changeColor(e);
    }
  }

  @action blockUp(e) {
    this.drag = false;
    this.changeColor(e);
  }

  RGBAToHexA(rgba, forceRemoveAlpha = false) {
    return (
      '#' +
      rgba
        .replace(/^rgba?\(|\s+|\)$/g, '') // Get's rgba / rgb string values
        .split(',') // splits them at ","
        .filter((string, index) => !forceRemoveAlpha || index !== 3)
        .map((string) => parseFloat(string)) // Converts them to numbers
        .map((number, index) =>
          index === 3 ? Math.round(number * 255) : number,
        ) // Converts alpha to 255 number
        .map((number) => number.toString(16)) // Converts numbers to hex
        .map((string) => (string.length === 1 ? '0' + string : string)) // Adds 0 when length of one number is 1
        .join('')
    ); // Puts the array to togehter to a string
  }

  @action applyColor() {
    // this.hexColor = this.RGBAToHexA(this.rgbaColor, false);
    this.args.onDone(this.hexColor);
  }
}
