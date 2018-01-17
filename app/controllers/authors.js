import Controller from '@ember/controller';

export default Controller.extend({
  page: 1,
  perPage: 5,

  queryParams: ["page", "perPage"]
});
