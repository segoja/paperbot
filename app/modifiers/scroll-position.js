import Modifier from 'ember-modifier';

export default class ScrollPositionModifier extends Modifier {
  get scrollPosition() {
    // get the first positional argument passed to the modifier
    //
    // {{scoll-position @someNumber relative=@someBoolean}}
    //                  ~~~~~~~~~~~
    //
    return this.args.positional[0];
  }

  get isRelative() {
    // get the named argument "relative" passed to the modifier
    //
    // {{scoll-position @someNumber relative=@someBoolean}}
    //                                       ~~~~~~~~~~~~
    //
    return this.args.named.relative;
  }

  didReceiveArguments() {
    if(this.isRelative) {
      this.element.scrollTop = this.args.positional[0];
    } else {
      this.element.scrollTop = this.element.scrollHeight;
    }
  }
}