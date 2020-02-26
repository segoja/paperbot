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

export default class PostsController extends Controller {
  @inject ('posts.post') post;
  @service router;

  queryParams= [
    {'queryParamsObj.page': 'page'},
    {'queryParamsObj.perPage': 'perPage'},
    {'queryParamsObj.query': 'query'}
  ];
  queryParamsObj = new QueryParamsObj();

  @action createPost() {
    this.post.set('globals.isEditing', true);
    let newPost = this.store.createRecord('post');
    newPost.set('date' , new Date());
    this.router.transitionTo('posts.post', newPost.save());
  }
}
