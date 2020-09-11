import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 20;
  @tracked query = '';
}

export default class SongsController extends Controller {
  @service router;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'}
  ];
  
  
  queryParamsObj = new QueryParamsObj();
  
  
  @action createSong() {
    let newSong = this.store.createRecord('song');
    newSong.title = "Test song from ember!";
    newSong.twitchuser = "papercat84";
    newSong.date_added = "2020-09-24T22:00:00+00:00";
    newSong.save();
  }
  @action deleteSong(song) {
    song.destroyRecord();
  }
  
}

