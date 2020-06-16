import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/string';
import moment from 'moment';

export default helper(function([message]) {
  //if (!message) { return; } // return nothing when params is empty

  var output = "";
  switch (message.type) {
    case 'action':
      output = '<span class="'+ message.type +'" style="color: '+ message.color +';">['+ moment(message.timestamp).format("HH:mm:ss")+'] ' + message.user +': '+ message.parsedbody +'</span>';
    break;
    case 'chat':
      output = '<span class="'+ message.type +'" style="color: '+ message.color +';">['+ moment(message.timestamp).format("HH:mm:ss")+'] ' + message.user +':</span> '+ message.parsedbody;  
    break;
    default:
      output = '<span class="'+ message.type +'" style="color: '+ message.color +';">['+ moment(message.timestamp).format("HH:mm:ss")+'] ' + message.user +':</span> '+ message.parsedbody;
    break;
  }
  return htmlSafe(output);
});