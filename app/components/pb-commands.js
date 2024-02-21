import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sort, alias } from '@ember/object/computed';
import pagedArray from 'ember-cli-pagination/computed/paged-array';
import computedFilterByQuery from 'ember-cli-filter-by-query';
import { tracked } from '@glimmer/tracking';
import PapaParse from 'papaparse';
import dayjs from 'dayjs';
import { inject as service } from '@ember/service';

export default class PbCommandsComponent extends Component {
  @service currentUser;
  @service audio;

  constructor() {
    super(...arguments);
    this.toTop = true;
    this.sortString = 'name:asc';
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.toTop = true;
    this.sortString = 'name:asc';
  }

  @tracked sortString = 'name:asc';
  get commandsSorting() {
    return Object.freeze(this.sortString.split(','));
  }

  @sort('args.commands', 'commandsSorting') arrangedContent;

  @computedFilterByQuery(
    'arrangedContent',
    ['type'],
    'args.queryParamsObj.type',
    { conjunction: 'and', sort: false },
  )
  filteredByType;

  @computedFilterByQuery(
    'filteredByType',
    ['name', 'response'],
    'args.queryParamsObj.query',
    { conjunction: 'and', sort: false },
  )
  filteredContent;

  @pagedArray('filteredContent', {
    page: alias('parent.args.queryParamsObj.page'),
    perPage: alias('parent.args.queryParamsObj.perPage'),
  })
  pagedContent;

  @action wipeCommands() {
    this.args.queryParamsObj.page = 1;
    this.filteredContent.forEach((command) => {
      this.audio.removeFromRegister(command.id);
      console.debug(command.soundfile + ' removed from the soundboard');
      command.destroyRecord().then(() => {
        console.debug('Command wiped.');
      });
    });
  }

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

  @action selectType(type) {
    this.args.queryParamsObj.type = type;
    this.resetPage();
  }

  @tracked importcontent;

  @action async commandImport(file) {
    let reference =
      '"name","type","active","admin","mod","vip","sub","cooldown","timer","response","soundfile","volume"';
    let extension = 'csv';
    let recordType = 'command';
    let response = '';
    if (file) {
      response = await file.readAsText();
      this.currentUser.importRecords(
        reference,
        extension,
        recordType,
        response,
      );
    } else {
      this.currentUser.importRecords(
        reference,
        extension,
        recordType,
        response,
      );
    }
  }

  @action commandExportFiltered() {
    var csvdata = [];
    if (this.filteredContent.length > 0) {
      let header = [
        'name',
        'type',
        'active',
        'admin',
        'mod',
        'vip',
        'sub',
        'cooldown',
        'timer',
        'response',
        'soundfile',
        'volume',
      ];
      csvdata.push(header);
      this.filteredContent.forEach((command) => {
        let csvrow = [
          command.name,
          command.type,
          command.active,
          command.admin,
          command.mod,
          command.vip,
          command.sub,
          command.cooldown,
          command.timer,
          command.response,
          command.soundfile,
          command.volume,
        ];
        csvdata.push(csvrow);
      });

      csvdata = PapaParse.unparse(csvdata, {
        delimiter: ',',
        header: true,
        quotes: true,
        quoteChar: '"',
      });
      let filename =
        dayjs().format('YYYYMMDD-HHmmss') + '-paperbot-commands.csv';

      this.currentUser.download(csvdata, filename, 'text/csv');
    }
  }
}
