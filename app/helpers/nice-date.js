import Helper from '@ember/component/helper';
import { isEmpty } from '@ember/utils';
import { inject as service } from '@ember/service';

export default class NiceDate extends Helper {
  @service intl;
  @service NiceDate;
  
  compute(params,hash) {    
    if (!isEmpty(params[0])) {
      let date = params[0];
      let format = "";
      if (hash && hash.format) {
        format = hash.format;
      }
      let lang = "";
      if (hash && hash.lang) {
        lang = hash.lang;        
      }
      return this.NiceDate.fancydate(date, format, lang);
    }
  }
}