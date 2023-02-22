import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';

export default class PbSongComponent extends Component {
  songTypes = ['original', 'cover'];

  @tracked saving = false;
  @action doneEditing() {
    this.args.saveSong();
    this.saving = true;
    later(() => {
      this.saving = false;
    }, 500);
  }
}
