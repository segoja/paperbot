import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 10;
  @tracked query = '';
}

export default class StreamsController extends Controller {
  @inject ('streams.stream') stream;
  @service router;
  @service globalConfig;
  
  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'}
  ];

  queryParamsObj = new QueryParamsObj();

  @tracked lastStream;
  @tracked isViewing;


  @action createStream() {
    let newStream = this.store.createRecord('stream');
    newStream.set('date', new Date());
    
    // Set the stream with the default values if they are set in config.
    if(this.globalConfig.config.defbotclient){
      newStream.set('botclient', this.globalConfig.config.defbotclient);
    }
    if(this.globalConfig.config.defchatclient){
      newStream.set('chatclient', this.globalConfig.config.defchatclient);
    }
    if(this.globalConfig.config.defchannel){
      newStream.set('channel', this.globalConfig.config.defchannel);
    }
    
    this.stream.isEditing = true;
    this.router.transitionTo('streams.stream', newStream.save());
  }
  
  @action gridEditStream(stream) {
    this.stream.isEditing = true;
    this.router.transitionTo('streams.stream', stream);
  } 

  @action gridDeleteStream(stream) {
    stream.destroyRecord().then(() => {
      this.isViewing = false;
      this.stream.isEditing = false;
      this.lastStream = null;
    });
  } 
}
