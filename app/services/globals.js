import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class GlobalsService extends Service {
  
  @tracked stream = {isViewing: false, last: []};
  @tracked client = {isViewing: false, last: []};
  @tracked command = {isViewing: false, last: []};

  constructor() {
    super(...arguments); 
  }
}
