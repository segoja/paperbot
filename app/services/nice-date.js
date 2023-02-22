import Service, { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import moment from 'moment';

export default class NiceDateService extends Service {
  @service intl;

  fancydate(date, format, lang) {
    if (!isEmpty(date)) {
      var dateFormat = 'DD-MM-YY HH:mm';
      let datetoformat = date;
      if (format) {
        dateFormat = format;
      }
      if (lang) {
        moment().locale(lang);
      } else {
        if (this.intl.locale === 'en-us') {
          moment().locale('en');
        } else {
          moment().locale('nl');
        }
      }
      return moment(datetoformat).format(dateFormat);
    } else {
      return '';
    }
  }
}
