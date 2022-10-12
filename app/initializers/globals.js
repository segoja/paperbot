export function initialize(application) {
  var globals = {
    isEditing: false,
  };

  application.register('globals:main', globals, { instantiate: false });
}

export default {
  name: 'globals',
  initialize: initialize
};
