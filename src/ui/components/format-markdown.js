import { helper as buildHelper } from '@ember/component/helper';
import { htmlSafe } from '@ember/string';
import marked from 'marked';

export const helper = buildHelper(function(params) {
  let value = params[0];
  return htmlSafe(marked(value));
});
