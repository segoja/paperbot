import { helper } from '@ember/component/helper';
import moment from 'moment';

export default helper(function([value]) {
  return moment(value).fromNow();
});
