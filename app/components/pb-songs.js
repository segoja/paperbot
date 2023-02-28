import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import PapaParse from 'papaparse';
import moment from 'moment';
import { inject as service } from '@ember/service';

export default class PbSongsComponent extends Component {
  @service currentUser;
  @service queueHandler;
  @service twitchChat;
  @service globalConfig;
  @service store;

  songsSorting = Object.freeze(['date_added:asc']);

  @sort('args.songs', 'songsSorting') arrangedContent;

  @computedFilterByQuery(
    'arrangedContent',
    ['type'],
    'args.queryParamsObj.type',
    { conjunction: 'and', sort: false }
  )
  filteredByType;

  @computedFilterByQuery(
    'filteredByType',
    ['title', 'artist'],
    'args.queryParamsObj.query',
    { conjunction: 'and', sort: false }
  )
  filteredContent;

  @pagedArray('filteredContent', {
    page: alias('parent.args.queryParamsObj.page'),
    perPage: alias('parent.args.queryParamsObj.perPage'),
  })
  pagedContent;

  @action resetPage() {
    this.args.queryParamsObj.page = 1;
  }

  @tracked importcontent;

  get isSetlist() {
    if (!this.currentUser.isViewing && this.currentUser.showSetlist) {
      return true;
    }
    return false;
  }

  @action toggleSetlist() {
    this.currentUser.showSetlist = !this.currentUser.showSetlist;
  }

  @action wipeSongs() {
    this.args.queryParamsObj.page = 1;
    this.filteredContent.forEach((song) => {
      let requestList = [];
      song.requests.slice().forEach((request) => requestList.push(request));
      if (requestList.length > 0) {
        requestList.map((request) => request.destroyRecord());
      }
      song.destroyRecord().then(() => {
        console.debug('Song wiped.');
      });
    });
  }

  @action async songImport(file) {
    let reference =
      '"title","artist","lyrics","type","account","active","admin","mod","vip","sub","date_added","last_played","times_requested","times_played","remoteid"';
    let extension = 'csv';
    let recordType = 'song';
    let response = '';
    if (file) {
      response = await file.readAsText();
      this.currentUser.importRecords(
        reference,
        extension,
        recordType,
        response
      );
    } else {
      this.currentUser.importRecords(
        reference,
        extension,
        recordType,
        response
      );
    }
  }

  @action songExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0) {
      let header = [
        'title',
        'artist',
        'lyrics',
        'type',
        'account',
        'active',
        'admin',
        'mod',
        'vip',
        'sub',
        'date_added',
        'last_played',
        'times_requested',
        'times_played',
        'remoteid',
      ];
      csvdata.push(header);
      this.filteredContent.forEach((song) => {
        let csvrow = [
          song.title,
          song.artist,
          song.lyrics,
          song.type,
          song.account,
          song.active,
          song.admin,
          song.mod,
          song.vip,
          song.sub,
          song.date_added,
          song.last_played,
          song.times_requested,
          song.times_played,
          song.remoteid,
        ];
        csvdata.push(csvrow);
      });

      csvdata = PapaParse.unparse(csvdata, {
        delimiter: ',',
        header: true,
        quotes: true,
        quoteChar: '"',
      });
      let filename = moment().format('YYYYMMDD-HHmmss') + '-songs.csv';

      this.currentUser.download(csvdata, filename, 'text/csv');
    }
  }
}
