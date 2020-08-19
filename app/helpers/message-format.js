import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/string';
import moment from 'moment';

export default helper(function([message]) {
  //if (!message) { return; } // return nothing when params is empty

  var output = "";
  switch (message.type) {
    case 'action':
      output = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong> '+ message.parsedbody +'</span>';
    break;
    case 'chat':
      output = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong></span> '+ message.parsedbody;  
    break;
    default:
      output = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong></span> '+ message.parsedbody;
    break;
  }
  return htmlSafe(output);
});