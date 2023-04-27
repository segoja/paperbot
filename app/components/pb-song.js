import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';

export default class PbSongComponent extends Component {
  
  constructor(){
    super(...arguments);
    this.activeTab = 'main';
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.activeTab = 'main';
  }
  
  songTypes = ['original', 'cover'];
  
  tabList = ['main', 'lyrics', 'metrics'];
  
  @tracked activeTab = 'main';
  
  @action tabSwitch(tab){
    console.log(tab);
    if(tab){
      this.activeTab = tab;
    }
    console.log(this.activeTab);
  }

  @tracked saving = false;
  @action doneEditing() {
    this.args.saveSong();
    this.saving = true;
    later(() => {
      this.saving = false;
    }, 500);
  }
}
