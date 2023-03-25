import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class PbStreamEditChatComponent extends Component {
  @service globalConfig;
  @service twitchChat;

  scrollPosition = 0;

  // With this getter we enable/disable the chat input box according to the chat client status.
  get inputDisabled(){
    if(!this.twitchChat.botConnected){
      return true;
    } else {
      return false;
    }  
  }

  get embedChatUrl() {
    let hostname = window.location.hostname;
    let channel = this.args.stream.channel;
    let darkmode = '';
    if (this.globalConfig.config.darkmode) {
      darkmode = '&darkpopout';
    }

    console.debug('The hostname is: '+hostname);
    return (
      'https://www.twitch.tv/embed/' +
      channel +
      '/chat?parent=' +
      hostname +
      darkmode
    );
  }

  constructor() {
    super(...arguments);
  }

  // Pannels interaction

  @action togglePan() {
    this.globalConfig.config.cpanmessages =
      !this.globalConfig.config.cpanmessages;
    this.globalConfig.config.save();
  }
}
