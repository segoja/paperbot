import { Model } from 'ember-pouch';
import { attr, belongsTo } from '@ember-data/model';

export default class ConfigModel extends Model {
  @attr('string', {defaultValue: ""}) name;
  @attr('string', {defaultValue: ""}) overlayfolder;
  @attr('string', {defaultValue: ""}) couchdbuser;
  @attr('string', {defaultValue: ""}) couchdbpassword;
  @attr('string', {defaultValue: ""}) couchdburl;

  @attr('string', {defaultValue: ""}) externalevents;  
  @attr('string', {defaultValue: ""}) externaleventskey;


  @attr songQueue;
  @attr('string', {defaultValue: ""}) lastPlayed;
  @attr('string', {defaultValue: ""}) defchannel;
  
  @attr('string', {defaultValue: ""}) overlayType;
  @attr('boolean', {defaultValue: false}) showOverlay;
  @attr('string', {defaultValue: "#006600ff"}) chromaColor;

  @belongsTo('client', { inverse: 'botclientconfigs', save: true }) defbotclient;
  @belongsTo('client', { inverse: 'chatclientconfigs', save: true }) defchatclient;

  @attr('boolean', {defaultValue: false}) showLyrics;
  @attr('boolean', {defaultValue: false}) cpanpending;
  @attr('boolean', {defaultValue: false}) cpanplayed;
  @attr('boolean', {defaultValue: false}) cpanmessages;
  @attr('boolean', {defaultValue: false}) cpanevents;
  @attr('boolean', {defaultValue: true}) extraPanRight;
  @attr('boolean', {defaultValue: true}) extraPanRightTop;
  @attr('boolean', {defaultValue: true}) extraPanRightBottom;  
  @attr('boolean', {defaultValue: true}) extraPanLeft;  
  @attr('boolean', {defaultValue: true}) extraPanLeftTop;  
  @attr('boolean', {defaultValue: true}) extraPanLeftBottom;

  get noPanels(){
    if(!this.extraPanLeft && !this.extraPanRight){
      return true;
    } else {
      return false;
    }
  }

  @attr('boolean', {defaultValue: false}) darkmode;
  @attr('boolean', {defaultValue: false}) isdefault;
    
  get switcher(){
    return this.darkmode;
  }
}