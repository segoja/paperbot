import Helper from '@ember/component/helper';
import { isEmpty } from '@ember/utils';

export default class ValidCss extends Helper {
  compute(params) {
    if (isEmpty(params[0])) {
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '10px'; //make small in case display:none fails
    iframe.style.height = '10px';
    document.body.appendChild(iframe);
    const style = iframe.contentDocument.createElement('style');
    style.innerHTML = params[0];
    iframe.contentDocument.head.appendChild(style);
    // const sheet = style.sheet,
    const result = Array.from(style.sheet.cssRules)
      .map((rule) => rule.cssText || '')
      .join('\n');
    iframe.remove();
    return result;
  }
}
