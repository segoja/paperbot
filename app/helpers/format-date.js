import { helper } from '@ember/component/helper';
import dayjs from 'dayjs';

export default helper(function ([value]) {
  return dayjs(value).format('DD/MM/YY hh:mm:ss');
});
