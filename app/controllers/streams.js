import Controller, { inject } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 10;
  @tracked query = '';
}

export default class StreamsController extends Controller {
  @inject ('streams.stream') stream;
  @service router;
  @service store;
  @service globalConfig;
  @service currentUser;
  
  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'}
  ];

  queryParamsObj = new QueryParamsObj();

  @tracked lastStream;
  
  
  async defaultSetter(stream){
    
    stream.set('date', new Date());

    
    if(this.globalConfig.defchannel != null){
      console.log(this.globalConfig.defchannel);
      stream.set('channel', this.globalConfig.defchannel);
    }
    
    if(this.globalConfig.defbotclient != null){
      var botclient = await this.store.peekRecord('client', this.globalConfig.defbotclient);
      if(botclient){
        console.log(this.globalConfig.defbotclient);
        stream.set('botclient', botclient);
        await botclient.save().then(()=>stream.save());
      } 
    }
    
    if(this.globalConfig.defchatclient != null){
      var chatclient = await this.store.peekRecord('client', this.globalConfig.defchatclient);
      if(chatclient){
        console.log(this.globalConfig.defchatclient);
        stream.set('chatclient', chatclient);
        await chatclient.save().then(()=>stream.save());
      }   
    }
    
    this.router.transitionTo('streams.stream', stream);
  }

  @action createStream() {
    var newStream = this.store.createRecord('stream');
    this.stream.isEditing = true;

    newStream.save().then((stream)=>{
      return this.defaultSetter(stream);
    });
  }
  
  @action gridEditStream(stream) {
    this.stream.isEditing = true;
    this.router.transitionTo('streams.stream', stream);
  } 

  @action gridDeleteStream(stream) {
    stream.destroyRecord().then(() => {
      this.currentUser.isViewing = false;
      this.stream.isEditing = false;
      this.lastStream = null;
    });
  } 
}
