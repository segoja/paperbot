import Ember from "ember";

export default Ember.Controller.extend({
  page: 1,
  perPage: 5,
  query: '',

  queryParams: ["page", "perPage", "query"]
});
