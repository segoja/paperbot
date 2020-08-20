import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/string';
import moment from 'moment';

export default helper(function([message]) {
  //if (!message) { return; } // return nothing when params is empty

  var pre = "";
  
  if (message.type != "system"){
    if (message.reward){
      pre = '<div class="col chatline py-2 highlight alert-warning">';
    }  else {
      pre = '<div class="col chatline py-2">';
    }       
  } else { 
    pre = '<div class="col chatline py-2 system alert-light">';
  }   

  var body = "";
  switch (message.type) {
    case 'system':
      body = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong> '+ message.parsedbody +'</span>';
    break;
    case 'action':
      body = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong> '+ message.parsedbody +'</span>';
    break;
    case 'chat':
      body = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong></span> '+ message.parsedbody;  
    break;
    default:
      body = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong></span> '+ message.parsedbody;
    break;
  }
  
  var post = "</div>";
  
  return htmlSafe(pre+body+post);
});