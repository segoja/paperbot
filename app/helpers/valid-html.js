import Helper from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import { isEmpty } from '@ember/utils';

export default class ValidHtml extends Helper {

  compute(params) {
    if (isEmpty(params[0])) {
      return;
    }

    let parser = new DOMParser();
    let doc = parser.parseFromString(params[0], "application/xml");
    let errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      return 'Your html code is broken.';
    } else {        
      return htmlSafe(params[0]);
    }  
  }
  
}