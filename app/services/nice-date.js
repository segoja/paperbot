import Service, { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import dayjs from 'dayjs';

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
        dayjs().locale(lang);
      } else {
        if (this.intl.locale === 'en-us') {
          dayjs().locale('en');
        } else {
          dayjs().locale('nl');
        }
      }
      return dayjs(datetoformat).format(dateFormat);
    } else {
      return '';
    }
  }
}
