import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import moment from 'moment';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 15;
  @tracked query = '';
  @tracked type = '';
}

export default class SongsController extends Controller {
  @inject('songs.song') song;
  @service audio;
  @service store;
  @service router;
  @service currentUser;

  queryParams = [
    { 'queryParamsObj.page': 'page' },
    { 'queryParamsObj.perPage': 'perPage' },
    { 'queryParamsObj.query': 'query' },
    { 'queryParamsObj.type': 'type' },
  ];

  queryParamsObj = new QueryParamsObj();

  @tracked songTypes = ['original', 'cover'];

  @action createSong() {
    let newSong = this.store.createRecord('song');
    newSong.set('date_added', new Date());
    newSong.save().then(() => {
      this.router.transitionTo('songs.song', newSong);
    });
  }

  @action importSongs(song) {
    let newSong = this.store.createRecord('song');
    newSong.set('title', song.title);
    newSong.set('artist', song.artist);
    newSong.set('lyrics', song.lyrics);
    newSong.set('type', song.type);
    newSong.set('account', song.account);
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
    let requestList = [];
    song.requests.then((requests) =>
      requests.forEach((request) => requestList.push(request))
    );
    song.destroyRecord().then(() => {
      if (requestList.length > 0) {
        requestList.map((request) => {
          request.save();      
        });
      }
      this.currentUser.isViewing = false;
    });
  }

  @action udpdateRest() {
    /* fetch('http://paper.bot', {mode: 'no-cors', method: 'POST'}).then(async (response) => {
      console.debug("Server is online");
      if(this.model.get('leght') != 0){
        this.model.forEach(async (song)=>{
          if(song.remoteid){
            await this.store.findRecord('slsong', song.remoteid).then(async(slsong)=>{
              await console.debug("The song "+slsong.title+" is already in the remote server! Updating...");
              slsong.set('title',song.title);
              slsong.set('artist',song.artist);
              slsong.set('songtype',song.type);
              slsong.set('account',song.account);    
              slsong.set('is_active',song.active);
              slsong.set('is_admin',song.admin);
              slsong.set('is_mod',song.mod);
              slsong.set('is_vip',song.vip);
              slsong.set('is_sub',song.sub);
              slsong.set('date_added',song.date_added);
              slsong.set('last_played',song.last_played);
              slsong.set('times_requested',song.times_requested);
              slsong.set('times_played',song.times_played);
              slsong.set('pouchrev',song.rev);
              slsong.set('pouchid',song.id);
              await slsong.save();
            }, async(error)=>{
              await console.debug("Creating copy in the remote server of the song: "+song.title);
              let newSlsong = this.store.createRecord('slsong');
              newSlsong.save().then(async(savedSlsong)=>{
                song.remoteid = savedSlsong.id;
                await song.save().then(async(updatedmodel)=>{  
                  savedSlsong.set('title',updatedmodel.title);
                  savedSlsong.set('artist',updatedmodel.artist);
                  savedSlsong.set('songtype',updatedmodel.type);
                  savedSlsong.set('account',updatedmodel.account);    
                  savedSlsong.set('is_active',updatedmodel.active);
                  savedSlsong.set('is_admin',updatedmodel.admin);
                  savedSlsong.set('is_mod',updatedmodel.mod);
                  savedSlsong.set('is_vip',updatedmodel.vip);
                  savedSlsong.set('is_sub',updatedmodel.sub);
                  savedSlsong.set('date_added',updatedmodel.date_added);
                  savedSlsong.set('last_played',updatedmodel.last_played);
                  savedSlsong.set('times_requested',updatedmodel.times_requested);
                  savedSlsong.set('times_played',updatedmodel.times_played);
                  savedSlsong.set('pouchrev',updatedmodel.rev);
                  savedSlsong.set('pouchid',updatedmodel.id);
                  await savedSlsong.save();
                });               
              });

            });          
          } else {
            await console.debug("Creating copy in the remote server of the song: "+song.title);
            let newSlsong = this.store.createRecord('slsong');
            newSlsong.save().then(async (savedSlsong)=>{
              song.remoteid = savedSlsong.id;
              await song.save().then(async(updatedmodel)=>{  
                savedSlsong.set('title',updatedmodel.title);
                savedSlsong.set('artist',updatedmodel.artist);
                savedSlsong.set('songtype',updatedmodel.type);
                savedSlsong.set('account',updatedmodel.account);    
                savedSlsong.set('is_active',updatedmodel.active);
                savedSlsong.set('is_admin',updatedmodel.admin);
                savedSlsong.set('is_mod',updatedmodel.mod);
                savedSlsong.set('is_vip',updatedmodel.vip);
                savedSlsong.set('is_sub',updatedmodel.sub);
                savedSlsong.set('date_added',updatedmodel.date_added);
                savedSlsong.set('last_played',updatedmodel.last_played);
                savedSlsong.set('times_requested',updatedmodel.times_requested);
                savedSlsong.set('times_played',updatedmodel.times_played);
                savedSlsong.set('pouchrev',updatedmodel.rev);
                savedSlsong.set('pouchid',updatedmodel.id);
                await savedSlsong.save();
              });               
            });
          }        
        });
      }
    }, (kaput)=>{
      console.debug("Server is not connected.");
    });*/
  }
}
