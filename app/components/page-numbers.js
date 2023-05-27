import PageNumbers from 'ember-cli-pagination/components/page-numbers';
import { action, defineProperty, set } from '@ember/object';
import { alias } from '@ember/object/computed';
import Util from 'ember-cli-pagination/util';
import { tracked } from '@glimmer/tracking';
import PageItems from 'ember-cli-pagination/lib/page-items';

export default class PageNumbersComponent extends PageNumbers {
  @tracked componentId = '';

  @tracked numPagesToShow = 10;

  constructor() {
    super(...arguments);
    this.visible = false;

    let elements = document.getElementsByClassName('pagination');

    let randomtext = Math.random().toString(36).slice(2, 7);
    this.componentId =
      'pgntr' + String(randomtext) + String((elements.length || 0) + 1);
  }

  get pageItemsObj() {
    let result = PageItems.create({
      parent: this,
    });

    defineProperty(result, 'currentPage', alias('parent.currentPage'));
    defineProperty(result, 'totalPages', alias('parent.totalPages'));
    defineProperty(result, 'truncatePages', alias('parent.truncatePages'));
    defineProperty(result, 'numPagesToShow', alias('parent.numPagesToShow'));
    defineProperty(result, 'showFL', alias('parent.showFL'));

    return result;
  }

  get dynamicWidth() {
    let width = 0;
    let elmnt = document.getElementById(this.componentId);
    if (elmnt) {
      let parent = elmnt.parentElement;
      if (parent) {
        width = parent.offsetWidth;
      }
    }
    return width;
  }

  @action updateBtnNr() {
    if (this.dynamicWidth) {
      let width = this.dynamicWidth;
      // 43 is the width of each button;
      let buttons = Math.ceil(width / 44);
      if (!isNaN(buttons) && buttons > 2 && buttons <= 12) {
        // console.log('Number of buttons: '+ buttons);
        set(this, 'numPagesToShow', buttons - 2);
      }
    }
  }

  get contentLength() {
    return this.args.content.content.length;
  }

  @action pageClicked(number) {
    Util.log('PageNumbers#pageClicked number ' + number);
    this.currentPage = number;
    this._runAction('action', number);
  }

  @action incrementPage(num) {
    const currentPage = Number(this.currentPage),
      totalPages = Number(this.totalPages);

    if (currentPage === totalPages && num === 1) {
      return false;
    }
    if (currentPage <= 1 && num === -1) {
      return false;
    }
    this.currentPage = this.currentPage + num;

    const newPage = this.currentPage;
    this._runAction('action', newPage);
  }
}
