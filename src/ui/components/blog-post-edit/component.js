import Component from '@ember/component';
import { set } from '@ember/object';

export default Component.extend({
  actions: {
    edit: function() {
      set(this, 'isEditing', true);
    },

    doneEditing: function() {
      set(this, 'isEditing', false);
      this.saveAction();
    },

    deletePost: function() {
      this.deleteAction();
    }
  }
});
