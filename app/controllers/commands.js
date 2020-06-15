import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

class QueryParamsObj {
  @tracked page = 1;
  @tracked perPage = 20;
  @tracked query = '';
}

export default class CommandsController extends Controller {
  @inject ('commands.command') command;
  @service router;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'}
  ];
  
  queryParamsObj = new QueryParamsObj();

  @tracked isViewing = false;

  @action createCommand() {
    this.command.isEditing = true;
    this.isViewing = true;
    let newCommand = this.store.createRecord('command');
    this.router.transitionTo('commands.command', newCommand.save());
  }
  
  @action closeCommand() {
    this.command.isEditing = false;
    this.isViewing = false;
    this.router.transitionTo('commands');      
  }
}
