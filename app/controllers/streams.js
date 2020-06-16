import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 5;
  @tracked query = '';
}

export default class StreamsController extends Controller {
  @inject ('streams.stream') stream;
  @service router;
  
  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'}
  ];

  queryParamsObj = new QueryParamsObj();

  @tracked lastStream;
  @tracked isViewing;


  @action createStream() {
    this.stream.isEditing = true;
    this.isViewing = true;
    let newStream = this.store.createRecord('stream');
    newStream.set('date', new Date());
    this.router.transitionTo('streams.stream', newStream.save());
  }
}
