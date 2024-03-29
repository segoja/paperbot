import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import moment from 'moment';

export default helper(function ([element]) {
  //if (!element) { return; } // return nothing when params is empty

  var output = '';
  switch (element.type) {
    case 'action':
      output =
        '<span class="' +
        element.type +
        '" style="color: ' +
        element.color +
        ';"><small>[' +
        moment(element.timestamp).format('YYYY/MM/DD HH:mm:ss') +
        '] ' +
        element.user +
        ':</small><br> ' +
        element.song +
        '</span>';
      break;
    case 'chat':
      output =
        '<small><span class="' +
        element.type +
        '" style="color: ' +
        element.color +
        ';">[' +
        moment(element.timestamp).format('YYYY/MM/DD HH:mm:ss') +
        '] ' +
        element.user +
        ':</span></small><br> ' +
        element.song;
      break;
    default:
      output =
        '<small><span class="' +
        element.type +
        '" style="color: ' +
        element.color +
        ';">[' +
        moment(element.timestamp).format('YYYY/MM/DD HH:mm:ss') +
        '] ' +
        element.user +
        ':</span></small><br> ' +
        element.song;
      break;
  }
  return htmlSafe(output);
});
