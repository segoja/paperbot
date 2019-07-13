import { helper as buildHelper } from '@ember/component/helper';
import moment from 'moment';

export const helper = buildHelper(function(params) {
  let value = params[0];
  return moment(value).fromNow();
});
