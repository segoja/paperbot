import Model, { attr } from '@ember-data/model';

export default class SlsongModel extends Model {
  @attr('string', {defaultValue: ""}) title;
  @attr('string', {defaultValue: ""}) artist; 
  @attr('string', {defaultValue: ""}) songtype;  
  @attr('string', {defaultValue: ""}) keywords;  
  @attr('string', {defaultValue: ""}) account;
  @attr('boolean', {defaultValue: true}) is_active;
    
  @attr('boolean', {defaultValue: false}) is_admin;
  @attr('boolean', {defaultValue: false}) is_mod;
  @attr('boolean', {defaultValue: false}) is_vip;
  @attr('boolean', {defaultValue: false}) is_sub;
  
  @attr('string', {defaultValue: ""}) date_added;
  @attr('string', {defaultValue: ""}) last_request;
  
  @attr('number', {defaultValue: ""}) times_requested;
  @attr('number', {defaultValue: ""}) times_played;
  
  @attr('string', {defaultValue: ""}) pouchrev;
  @attr('string', {defaultValue: ""}) pouchid;
}