import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';

export default class GlobalConfigService extends Service {
  @tracked config = '';
}
