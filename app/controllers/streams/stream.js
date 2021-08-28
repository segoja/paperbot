import Controller, { inject }  from '@ember/controller';
import { action } from "@ember/object";
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { fs } from "@tauri-apps/api";

export default class StreamController extends Controller {
  @inject streams;
  @service router;
  @service store;
  
  @tracked isEditing;

  @action closeStream () {
    this.streams.lastStream = null;
    this.streams.isViewing = false;
    this.isEditing = false;
    this.router.transitionTo('streams.index');      
  }
  
  @action editStream(){
    this.isEditing = true;
  } 

  @action saveAndReturnStream () {
    this.isEditing = false;
    this.model.save();
  }

  @action saveStream () {
    this.model.save();
  }

  @action setBotClient(client){
    if(this.model.get('botclient.id') != undefined){
      console.log('Changing botclient');
      var oldclient = this.store.peekRecord('client', this.model.get('botclient.id'));
      oldclient.botclientstreams.removeObject(this.model).then(()=>{
        oldclient.save().then(()=>{
          this.model.botclient = client;
          if(client){
            client.save().then(() => this.model.save());
          } else {
            this.model.save();
          }
        });
      });      
    } else {
      console.log('Setting botclient');      
      //Add the defbotclient to our config
      this.model.botclient = client;
      //Save the child then the parent
      if(client){
        client.save().then(() => this.model.save());
      } else {
        this.model.save();
      }    
    }
  }
 
  @action setChatClient(client){
    if(this.model.get('chatclient.id') != undefined){
      console.log('Changing chatclient');
      var oldclient = this.store.peekRecord('client', this.model.get('chatclient.id'));
      oldclient.chatclientstreams.removeObject(this.model).then(()=>{
        oldclient.save().then(()=>{
          this.model.chatclient = client;
          if(client){
            client.save().then(() => this.model.save());
          } else {
            this.model.save();
          }
        });
      });      
    } else {
      console.log('Setting botclient');
      //Add the defchatclient to our config
      this.model.chatclient = client;
      //Save the child then the parent
      if(client){
        client.save().then(() => this.model.save());
      } else {
        this.model.save();
      }   
    }
  }
   
  @tracked oldHtml = '';
  @action overlayGenerator(newHtml, pathString){
    console.log('Test tested!');
    console.log(newHtml);
    //if(this.oldHtml != newHtml){
      this.oldHtml = newHtml;
      fs.writeFile({'contents': newHtml, 'path': pathString}).then(()=>{
        console.log("done!")
      });          
    //}
  }

  async deleteClientLinks(){
    if(this.model.get('botclient.id') != undefined){
      console.log('Changing botclient');
      var oldbotclient = this.store.peekRecord('client', this.model.get('botclient.id'));
      await oldbotclient.botclientstreams.removeObject(this.model);
      await oldbotclient.save().then(()=>this.model.save());
    }
    if(this.model.get('chatclient.id') != undefined){
      var oldchatclient = await this.store.peekRecord('client', this.model.get('chatclient.id'));
      await oldchatclient.chatclientstreams.removeObject(this.model);
      await oldchatclient.save().then(()=>this.model.save());
    }
  }

  @action deleteStream() {
    //Remove the tag to our preset
    //this.model.tags.removeObject(tag);
    //Save the child then the parent
    //tag.save().then(() => this.model.save());
    this.deleteClientLinks().then(()=>{
      this.model.destroyRecord().then(() => {
        this.streams.lastStream = null;
        this.streams.isViewing = false;
        this.isEditing = false;
        this.router.transitionTo('streams');
      });      
    });
  }
}
