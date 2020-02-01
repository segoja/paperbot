import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/string';
import marked from 'marked';

export default helper(function([value]) {
  return htmlSafe(marked(value));
});
