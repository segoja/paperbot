import Helper from '@ember/component/helper';
import moment from 'moment';
import { isEmpty } from '@ember/utils';

export default class r extends Helper {
  compute(params,hash) {    
    if (!isEmpty(params[0])) {
      let date = params[0];
      let format = 'YYYY/MM/DD HH:mm:ss';
      if (hash && hash.format) {
        format = hash.format;
      }

      return moment(date).format(format);
    }
  }
}
