import Controller from '@ember/controller';
import { inject as service } from '@ember/service';


export default class OverlayController extends Controller {
  @service store;
  @service router;
  @service currentUser;

}
