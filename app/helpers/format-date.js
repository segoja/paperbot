import { helper } from '@ember/component/helper';
import moment from 'moment';

export default helper(function(params) {
  let value = params[0];
  return moment(value).fromNow();
});
