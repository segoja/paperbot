import Controller, { inject } from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { fs } from '@tauri-apps/api';

export default class StreamController extends Controller {
  @inject streams;
  @service router;
  @service store;
  @service currentUser;

  @tracked isEditing;

  @action closeStream() {
    this.currentUser.lastStream = null;
    this.currentUser.isViewing = false;
    this.isEditing = false;
    this.router.transitionTo('streams.index');
  }

  @action editStream() {
    this.isEditing = true;
  }

  @action saveAndReturnStream() {
    this.isEditing = false;
    this.model.save();
  }
  
  @action returnStream() {
    this.isEditing = false;
  }

  @action saveStream() {
    this.model.save();
  }

  @action async setBotClient(client) {
    let oldClient = await this.model.get('botclient');
    this.model.botclient = client;
    this.model.save().then(()=>{
      if(client){
        client.save();
      }      
      if(oldClient){
          oldClient.save();
      }
    });
  }

  @action async setChatClient(client) {
    let oldClient = await this.model.get('chatclient');
    this.model.chatclient = client;
    this.model.save().then(()=>{
      if(client){
        client.save();
      }      
      if(oldClient){
        oldClient.save();
      }
    });
  }

  @tracked oldHtml = '';
  @action overlayGenerator(newHtml, pathString) {
    if (this.currentUser.isTauri) {
      this.oldHtml = newHtml;
      fs.writeFile({ contents: newHtml, path: pathString }).then(() => {
        console.debug('done!');
      });
    }
  }

  @action async deleteStream() {
    let oldBotClient = await this.model.get('botclient');
    let oldChatClient = await this.model.get('chatclient');
    
    this.model.destroyRecord().then(() => {
      if(oldBotClient){
        oldBotClient.save();
      }
      if(oldChatClient){
        oldChatClient.save();
      }
      
      this.currentUser.lastStream = null;
      this.currentUser.isViewing = false;
      this.isEditing = false;
      this.router.transitionTo('streams');
    });
  }
}
