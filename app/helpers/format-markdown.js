import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/string';
import marked from 'marked';

export default helper(function(params) {
  let value = params[0];
  return htmlSafe(marked(value));
});
