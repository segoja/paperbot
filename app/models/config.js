import { Model } from 'ember-pouch';
import { attr, belongsTo } from '@ember-data/model';
import { readOnly } from '@ember/object/computed';

export default class ConfigModel extends Model {
  @attr('string', { defaultValue: '' }) name;
  @attr('string', { defaultValue: '' }) overlayfolder;

  @attr('string', { defaultValue: '' }) externalevents;
  @attr('string', { defaultValue: '' }) externaleventskey;

  @attr songQueue;

  @attr('string', { defaultValue: '' }) lastPlayed;
  @attr('string', { defaultValue: '' }) nextPlayed;

  @attr('string', { defaultValue: '' }) defchannel;

  @attr('string', { defaultValue: '' }) overlayType;
  @attr('boolean', { defaultValue: false }) showOverlay;
  @attr('string', { defaultValue: '#006600ff' }) chromaColor;
  @attr('number', { defaultValue: 5 }) overlayLength;
  @attr('boolean', { defaultValue: false }) overlayMax;
  @attr('boolean', { defaultValue: false }) overlayMin;
  @attr('number', { defaultValue: 550 }) overlayWidth;
  @attr('number', { defaultValue: 175 }) overlayHeight;
  @attr('number', { defaultValue: 0 }) overlayPosX;
  @attr('number', { defaultValue: 0 }) overlayPosY;
  
  @belongsTo('overlay', { inverse: 'configs', async: true })
  defOverlay;
  
  @attr('number', { defaultValue: 25 }) timerLines;
  @attr('number', { defaultValue: 1 }) timerTime;

  @belongsTo('client', { inverse: 'botclientconfigs', async: true })
  defbotclient;

  @belongsTo('client', {
    inverse: 'chatclientconfigs',
    async: true,
  })
  defchatclient;

  @attr('boolean', { defaultValue: false }) showLyrics;
  @attr('boolean', { defaultValue: false }) readerMax;
  @attr('boolean', { defaultValue: false }) readerMin;
  @attr('number', { defaultValue: 450 }) readerWidth;
  @attr('number', { defaultValue: 600 }) readerHeight;
  @attr('number', { defaultValue: 0 }) readerPosX;
  @attr('number', { defaultValue: 0 }) readerPosY;
  @attr('number', { defaultValue: 0 }) readerColumns;
  @attr('number', { defaultValue: 1 }) readerZoom;

  @attr('boolean', { defaultValue: false }) mainMax;
  @attr('boolean', { defaultValue: false }) mainMin;
  @attr('number', { defaultValue: 1080 }) mainWidth;
  @attr('number', { defaultValue: 800 }) mainHeight;
  @attr('number', { defaultValue: 0 }) mainPosX;
  @attr('number', { defaultValue: 0 }) mainPosY;

  @attr('boolean', { defaultValue: true }) cpansetlist;
  @attr('boolean', { defaultValue: false }) cpanpending;
  @attr('boolean', { defaultValue: false }) cpanplayed;
  @attr('boolean', { defaultValue: true }) cpanmessages;
  @attr('boolean', { defaultValue: true }) cpanevents;

  get noPanels() {
    if (!this.extraPanLeft && !this.extraPanRight) {
      return true;
    } else {
      return false;
    }
  }

  @attr('boolean', { defaultValue: true }) darkmode;
  @attr('boolean', { defaultValue: false }) soundOverlap;
  @attr('boolean', { defaultValue: false }) clearRequests;
  @attr('boolean', { defaultValue: false }) allowDuplicated;
  @attr('boolean', { defaultValue: false }) isdefault;

  get switcher() {
    return this.darkmode;
  }

  @attr('string', { defaultValue: 'cloudstation' }) cloudType;
  @attr('string', { defaultValue: '' }) remoteUrl;
  @attr('string', { defaultValue: '' }) database;
  @attr('string', { defaultValue: '' }) username;
  @attr('string', { defaultValue: '' }) password;
  @attr('boolean',{ defaultValue: false }) autoConnect;
  
  get cloudUrl(){
    let dbUrl = '';
    if(this.cloudType == 'cloudstation'){
      dbUrl = 'https://my.cloudstation.com/'+this.database;
    }
    if(this.cloudType == 'custom'){
      dbUrl = this.remoteUrl;
    }
    return dbUrl;
  }
  
  get isCloudDisabled(){
    return this.cloudType == 'disabled';
  }

  get isCustomCloud(){
    return this.cloudType == 'custom';
  }

  get canConnect() {
    if (this.cloudUrl && this.username && this.password) {
      return true;
    }
    return false;
  }

  get canGetEvents(){
    if (this.externalevents && this.externaleventskey) {
      return true;
    }
    return false;
  }


  @readOnly('defOverlay.id') defOverlayId;
  @readOnly('defbotclient.id') defBotId;
  @readOnly('defchatclient.id') defChatId;


  @attr('string') rev;
}
