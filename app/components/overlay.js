import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { sort } from '@ember/object/computed';
import { htmlSafe } from '@ember/template';
import moment from 'moment';

export default class PbReaderComponent extends Component {
  @service globalConfig;

  constructor() {
    super(...arguments);
  }
  
  requestSorting = Object.freeze(['position:asc', 'timestamp:desc']);
  @sort('args.requests', 'requestSorting') arrangedContent;

  get pendingRequests() {
    let count = 0;
    return this.arrangedContent.filter((request) => {
      if (
        !request.processed &&
        count < this.globalConfig.config.overlayLength
      ) {
        count = Number(count) + 1;
        return request;
      }
    });
  }
  
  
  get overlayContent(){
    let htmlEntries = '';
    let title = '';
    let user = '';
    let artist = '';
    let time = '';
    
    let defaultEntry = `
          <tr class="item">
            <td class="bg-transparent text-white">
              <div class="row g-0">
                <strong class="col">$title</strong>
                <div class="col-auto">$user</div>
              </div>
              <div class="row g-0">
                <small class="col"><small>$artist</small></small>
                <small class="col-auto"><small>$time</small></small>
              </div>
            </td>
          </tr>
            `;
    
    let defaultOverlay = `
      <table class="table">
        <thead>
          <tr>
            <th class="bg-transparent text-white"><span class="d-inline-block float-start">Title</span> <span class="d-inline-block float-end">Requested by</span></th>
          </tr>
        </thead>
        <tbody>
          $items
        </tbody>
      </table>`;
    
      if (this.pendingRequests.length > 0) {
        let visible = this.pendingRequests.slice(0, this.globalConfig.config.get('overlayLength') || 5);
        visible.forEach((pendingsong) => {
          title = pendingsong.effectiveTitle;
          console.log(pendingsong.effectiveArtist);
          artist = pendingsong.effectiveArtist;
          time = moment(pendingsong.timestamp).format(
            'YYYY/MM/DD HH:mm:ss'
          );
          user = pendingsong.user || 'bot';
          let entry = this.globalConfig.config.get('defOverlay.qItems') || defaultEntry;
          entry = entry.replace('\$title', title);
          entry = entry.replace('\$artist', artist);
          entry = entry.replace('\$time', time);
          entry = entry.replace('\$user', user);
          
          htmlEntries = htmlEntries.concat(entry);
        });
      }

      let htmlOverlay = this.globalConfig.config.get('defOverlay.qContainer') || defaultOverlay;        
      htmlOverlay = htmlOverlay.replace('\$items', htmlEntries);
      
      return htmlSafe(htmlOverlay);
  }
}
