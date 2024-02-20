import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import PapaParse from 'papaparse';
import dayjs from 'dayjs';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class PbOverlaysComponent extends Component {
  @service currentUser;

  constructor() {
    super(...arguments);
    this.sortString = 'name:asc';
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.sortString = 'name:asc';
  }

  @tracked sortString = 'name:asc';
  get overlaysSorting() {
    return Object.freeze(this.sortString.split(','));
  }

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

  @action clearSearch() {
    this.args.queryParamsObj.query = '';
    this.args.queryParamsObj.page = 1;
  }

  get dynamicHeight() {
    let elmnt = document.getElementById('bodycontainer');
    let height = 0;
    if (elmnt) {
      height = Number(elmnt.offsetHeight) || 0;
    }
    return height;
  }

  @action updateRowNr() {
    if (this.dynamicHeight) {
      let height = this.dynamicHeight;
      let rows = Math.floor(height / 43);
      if (!isNaN(rows) && rows > 1) {
        this.args.queryParamsObj.perPage = rows - 1;
        this.args.queryParamsObj.page = 1;
      }
    }
  }

  @action sortColumn(attribute) {
    let sortData = this.sortString.split(',');
    this.sortString = '';
    if (attribute) {
      let newSort = '';
      let exist = sortData.filter((row) => row.includes(attribute));
      if (exist.length > 0) {
        if (exist.toString().includes(':asc')) {
          newSort = attribute + ':desc,';
        } else {
          newSort = attribute + ':asc,';
        }
      } else {
        newSort = attribute + ':asc,';
      }
      if (sortData.length > 0) {
        let others = sortData.filter((row) => !row.includes(attribute));
        if (others.length > 0) {
          newSort += others.join(',');
        }
      }
      this.sortString = newSort.toString();
    }
  }

  @action async overlayImport(file) {
    let reference =
      '"name","qContainer","qHeader","qItems","nContainer","nHeader","nItems"';
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
        'nItems',
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
          overlay.nItems,
        ];
        csvdata.push(csvrow);
      });

      csvdata = PapaParse.unparse(csvdata, {
        delimiter: ',',
        header: true,
        quotes: true,
        quoteChar: '"',
      });
      let filename = dayjs().format('YYYYMMDD-HHmmss') + '-overlays.csv';

      this.currentUser.download(csvdata, filename, 'text/csv');
    }
  }
}
