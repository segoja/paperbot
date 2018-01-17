import Component from '@ember/component';

export default Component.extend({
  actions: {
    saveAction: function() {
      this.sendAction('saveAction');
    },
    deleteAction: function() {
      this.sendAction('deleteAction');
    }
  }
});
