import { Model } from 'ember-pouch';
import { attr } from '@ember-data/model';

export default class WindowModel extends Model {
  @attr('boolean', { defaultValue: false }) maximized;
  @attr('number', { defaultValue: 1024 }) width;
  @attr('number', { defaultValue: 800 }) height;
  @attr('number', { defaultValue: 0 }) posX;
  @attr('number', { defaultValue: 0 }) posY;
}
