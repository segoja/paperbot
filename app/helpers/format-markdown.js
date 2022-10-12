import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/template';

export default helper(function([value]) {
  let result = '<pre>'+value.replace(/\n/gm, '</pre><pre>')+'</pre>';
  return htmlSafe(result);
});
