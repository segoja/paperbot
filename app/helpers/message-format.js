import { helper } from '@ember/component/helper';
import { htmlSafe } from '@ember/template';
import moment from 'moment';

export default helper(function([message]) {
  //if (!message) { return; } // return nothing when params is empty

  var pre = "";
  
  if (message.type != "system"){
    if (message.reward){
      pre = '<div class="col chatline py-1 highlight alert-warning">';
    }  else {
      pre = '<div class="col chatline py-1">';
    }       
  } else { 
      pre = '<div class="col chatline py-1 system alert-light">';
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
      body = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong></span> <span class="'+ message.type+'">'+ message.parsedbody+'</span>';  
    break;
    default:
      body = '<small class="d-none d-md-inline">['+ moment(message.timestamp).format("HH:mm:ss")+']</small><span class="'+ message.type +'" style="color: '+ message.color +';"> '+message.htmlbadges+' <strong>' + message.displayname +':</strong></span> <span class="'+ message.type+'">'+ message.parsedbody+'</span>';
    break;
  }
  
  var post = "</div>";
  
  return htmlSafe(pre+body+post);
});