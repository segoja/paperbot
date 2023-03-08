import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import PapaParse from 'papaparse';
import moment from 'moment';
import { inject as service } from '@ember/service';

export default class PbOverlaysComponent extends Component {
  @service currentUser;

  overlaysSorting = Object.freeze(['name']);

  @sort('args.overlays', 'overlaysSorting') arrangedContent;

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

  @action async overlayImport(file) {
    let reference = '"name","qContainer","qHeader","qItems","nContainer","nHeader","nItems"';
    let extension = 'csv';
    let recordType = 'overlay';
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

  @action overlayExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0) {
      let header = [
        'name',
        'qContainer',
        'qHeader',
        'qItems',
        'nContainer',
        'nHeader',
        'nItems'
      ];
      csvdata.push(header);
      this.filteredContent.forEach((overlay) => {
        let csvrow = [
          overlay.name,
          overlay.qContainer,
          overlay.qHeader,
          overlay.qItems,
          overlay.nContainer,
          overlay.nHeader,
          overlay.nItems
        ];
        csvdata.push(csvrow);
      });

      csvdata = PapaParse.unparse(csvdata, {
        delimiter: ',',
        header: true,
        quotes: true,
        quoteChar: '"',
      });
      let filename = moment().format('YYYYMMDD-HHmmss') + '-overlays.csv';

      this.currentUser.download(csvdata, filename, 'text/csv');
    }
  }
}
