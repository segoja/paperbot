import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { empty, sort } from '@ember/object/computed';

export default class PbStreamEditEventsComponent extends Component {
  @service eventsExternal;
  @service globalConfig;

  @empty ('eventsExternal.events') isEventsExternalEmpty;
  
  @tracked scrollEventsPosition = 0;
  @tracked eventlist = [];  
    
  eventsDescSorting = Object.freeze(['timestamp:desc']);    
  
  @sort (
    'eventsExternal.evenlist',
    'eventsDescSorting'
  ) arrangedDescEvents;  
    
  // With this getter we limit the number of messages displayed on screen.
  get events(){
    let events = [];
    if(this.arrangedDescEvents.length > 0){
      events = this.arrangedDescEvents;
    }
    return events;
  }   
  
  constructor() {
    super(...arguments);
    if(this.args.stream.events && this.globalConfig.config.externaleventskey && this.globalConfig.config.externalevents){
      this.eventsExternal.client.on("event", this.eventGetter);
      this.eventsExternal.client.on("event:test", this.eventGetter);
    }
  }
  
  @action togglePan(){
    this.globalConfig.config.cpanevents = !this.globalConfig.config.cpanevents;
    this.globalConfig.config.save();
  }
  
  // This action gets triggered every time the an event gets triggered in the channel
  @action eventGetter() {
    this.scrollEventsPosition = 0;
  }  
}
