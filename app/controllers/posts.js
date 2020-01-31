import Controller from '@ember/controller';
import { action } from "@ember/object";
import { inject as service } from '@ember/service';
import { inject } from '@ember/controller';

export default class PostsController extends Controller {
  @inject ('posts.post') post;
  @service router;

  page = 1;
  perPage = 5;
  query = '';

  queryParams= ["page", "perPage", "query"];

  @action createPost() {
    this.post.set('globals.isEditing', true);
    let newPost = this.store.createRecord('post');
    newPost.set('date' , new Date());
    this.router.transitionTo('posts.post', newPost.save());
  }
}
