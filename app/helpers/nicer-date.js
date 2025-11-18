import Helper from '@ember/component/helper';
import dayjs from 'dayjs';
import { isEmpty } from '@ember/utils';

export default class r extends Helper {
  compute(params, hash) {
    if (!isEmpty(params[0])) {
      let date = params[0];
      let format = 'YYYY/MM/DD HH:mm:ss';
      if (hash && hash.format) {
        format = hash.format;
      }

      return dayjs(date).format(format);
    }
  }
}
