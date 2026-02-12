import Controller, { inject } from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { all } from 'rsvp';

export default class ClientController extends Controller {
  @inject clients;
  @inject streams;
  @service router;
  @service globalConfig;
  @service currentUser;

  @action closeClient() {
    this.currentUser.isViewing = false;
    this.router.transitionTo('clients');
  }

  @action editClient() {}

  @action saveAndReturnClient() {
    this.saveClient();
    this.router.transitionTo('clients');
  }

  @action saveClient() {
    this.model.save();
  }

  get config() {
    return this.globalConfig.get('config');
  }

  async unlinkChildren(client) {
    // collect the children before deletion
    var childrenList = [];

    childrenList.push(...(await client.botclientstreams));
    childrenList.push(...(await client.chatclientstreams));
    childrenList.push(...(await client.botclientconfigs));
    childrenList.push(...(await client.chatclientconfigs));

    var processed = all(childrenList);
    return processed;
  }

  @action deleteClient() {
    //Wait for children to be destroyed then destroy the client
    this.unlinkChildren(this.model).then((children) => {
      console.debug('Children unlinked?');
      this.model.destroyRecord().then(async () => {
        this.currentUser.isViewing = false;
        const uniqueChildren = [
          ...new Map(children.map((child) => [child.id, child])).values(),
        ];
        for (let i = 0; i < uniqueChildren.length; i++) {
          await uniqueChildren[i].save();
        }
        this.router.transitionTo('clients');
      });
    });
  }
}
