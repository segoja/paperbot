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
  @attr('string', {defaultValue: ""}) nextPlayed;
  
  @attr('string', {defaultValue: ""}) defchannel;
  
  @attr('string', {defaultValue: ""}) overlayType;
  @attr('boolean', {defaultValue: false}) showOverlay;
  @attr('string', {defaultValue: "#006600ff"}) chromaColor;
  @attr('number', {defaultValue: 5}) overlayLength;
  @attr('number', {defaultValue: 550}) overlayWidth;
  @attr('number', {defaultValue: 175}) overlayHeight;
  @attr('number', {defaultValue: 0}) overlayPosX;
  @attr('number', {defaultValue: 0}) overlayPosY;
  @attr('number', {defaultValue: 25}) timerLines;
  @attr('number', {defaultValue: 0}) timerTime;

  @belongsTo('client', { inverse: 'botclientconfigs', save: true }) defbotclient;
  @belongsTo('client', { inverse: 'chatclientconfigs', save: true }) defchatclient;

  @attr('boolean', {defaultValue: false}) showLyrics;
  @attr('boolean', {defaultValue: false}) readerMax;  
  @attr('number', {defaultValue: 450}) readerWidth;
  @attr('number', {defaultValue: 600}) readerHeight;
  @attr('number', {defaultValue: 0}) readerPosX;
  @attr('number', {defaultValue: 0}) readerPosY;
  @attr('number', {defaultValue: 0}) readerColumns;
  @attr('number', {defaultValue: 1}) readerZoom;

  @attr('boolean', {defaultValue: false}) mainMax;
  @attr('number', {defaultValue: 1080}) mainWidth;
  @attr('number', {defaultValue: 800}) mainHeight;
  @attr('number', {defaultValue: 0}) mainPosX;
  @attr('number', {defaultValue: 0}) mainPosY;    
  
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
  @attr('boolean', {defaultValue: false}) soundOverlap;
  @attr('boolean', {defaultValue: false}) clearRequests;
  @attr('boolean', {defaultValue: false}) isdefault;
    
  get switcher(){
    return this.darkmode;
  }
}