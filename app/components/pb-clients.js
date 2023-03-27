import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import PapaParse from 'papaparse';
import moment from 'moment';
import { inject as service } from '@ember/service';

export default class PbClientsComponent extends Component {
  @service currentUser;

  clientsSorting = Object.freeze(['name']);

  @sort('args.clients', 'clientsSorting') arrangedContent;

  @computedFilterByQuery(
    'arrangedContent',
    ['username'],
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

  @action async clientImport(file) {
    let reference = '"type","publicKey","username","oauth","channel","debug","reconnect","secure"';
    let extension = 'csv';
    let recordType = 'client';
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

  @action clientExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0) {
      let header = [
        'type',
        'publicKey',
        'username',
        'oauth',
        'channel',
        'debug',
        'reconnect',
        'secure',
      ];
      csvdata.push(header);
      this.filteredContent.forEach((client) => {
        let csvrow = [
          client.type,
          client.publicKey,
          client.username,
          client.oauth,
          client.channel,
          client.debug,
          client.reconnect,
          client.secure,
        ];
        csvdata.push(csvrow);
      });

      csvdata = PapaParse.unparse(csvdata, {
        delimiter: ',',
        header: true,
        quotes: true,
        quoteChar: '"',
      });
      let filename = moment().format('YYYYMMDD-HHmmss') + '-clients.csv';

      this.currentUser.download(csvdata, filename, 'text/csv');
    }
  }
}
