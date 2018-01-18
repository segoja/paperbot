import Component from '@ember/component';
import { get, set } from '@ember/object';

export default Component.extend({
  actions: {
    edit: function() {
      set(this, 'isEditing', true);
    },

    doneEditing: function() {
      set(this, 'isEditing', false);
      get(this, 'saveAction')();
    },

    deletePost: function() {
      get(this, 'deleteAction')();
    }
  }
});
