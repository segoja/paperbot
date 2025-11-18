import { isNone } from '@ember/utils';
import AttachmentsTransform from './attachments';

export default class AttachmentTransform extends AttachmentsTransform {
  deserialize(serialized) {
    return super.deserialize(serialized).pop();
  }
  serialize(deserialized) {
    if (isNone(deserialized)) {
      return null;
    }
    return super.serialize([deserialized]);
  }
}
