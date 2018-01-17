import Component from '@ember/component';

export default Component.extend({
  actions: {
    edit: function() {
      this.set('isEditing', true);
    },

    doneEditing: function() {
      this.set('isEditing', false);
      this.sendAction('saveAction');
    },

    deletePost: function() {
      this.sendAction('deleteAction');
    }
  }
});
