import { Model } from 'ember-pouch';
import { attr, belongsTo } from '@ember-data/model';
import { readOnly } from '@ember/object/computed';

export default class RequestModel extends Model {
  
  @attr('date',   {defaultValue: ""}) timestamp;
  @attr('string', {defaultValue: ""}) chatid;
  @attr('string', {defaultValue: ""}) type;
  @attr('string', {defaultValue: ""}) user;
  @attr('string', {defaultValue: ""}) displayname;
  @attr('string', {defaultValue: ""}) color;
  @attr('string', {defaultValue: ""}) csscolor;
  @attr('string', {defaultValue: ""}) emotes;
  
  @attr('boolean',{defaultValue: false}) processed;
    
  @belongsTo('song') song;  
  @readOnly('song.title') title;
  @readOnly('song.artist') artist;
  
  get fullText(){
    let text = '"'+this.title+'"';
    if(this.artist){
      text = text+' by '+this.artist+'.';
    }
    return text;    
  }
}