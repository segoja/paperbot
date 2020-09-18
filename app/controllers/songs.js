import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';
import moment from 'moment';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 10;
  @tracked query = '';
  @tracked type = '';
}

export default class SongsController extends Controller {
  @inject ('songs.song') song;
  @service router;
  @service audio;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'},
    {'queryParamsObj.type': 'type'}
  ];
  
  queryParamsObj = new QueryParamsObj();

  @tracked isViewing;
  @tracked songTypes = ['original','cover'];

  @action createSong() {
    let newSong = this.store.createRecord('song');
    newSong.date_added = moment().format();
    this.router.transitionTo('songs.song', newSong.save());
  }
  
  @action importSongs(song){
    let newSong = this.store.createRecord('song');    
    newSong.set('title', song.title);
    newSong.set('artist', song.artist);
    newSong.set('type', song.type);
    newSong.set('active', song.active);
    newSong.set('admin', song.admin);
    newSong.set('mod', song.mod);
    newSong.set('vip', song.vip);
    newSong.set('sub', song.sub);
    newSong.set('date_added', song.date_added);
    newSong.set('last_played', song.last_played);
    newSong.set('times_requested', song.times_requested);
    newSong.set('times_played', song.times_played);    
    newSong.save();
  }
  
  @action gridEditSong(song) {
    this.router.transitionTo('songs.song', song);
  } 

  @action gridActiveSong(song) {
    song.active = !song.active;
    song.save();
  } 

  @action gridDeleteSong(song) {    
    song.destroyRecord().then(() => {
      this.isViewing = false;
    });
  }  
}
