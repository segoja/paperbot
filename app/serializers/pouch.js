import JSONSerializer from '@ember-data/serializer/json';
import RESTSerializer from '@ember-data/serializer/rest';
import { getOwner } from '@ember/owner';
import { decamelize } from '@ember/string';
import { inject as service } from '@ember/service';

const keys = Object.keys;

//should this take a config?
function shouldSaveRelationship(container, relationship) {
  if (typeof relationship.options.save !== 'undefined')
    return relationship.options.save;

  if (relationship.kind === 'belongsTo') return true;

  //TODO: save default locally? probably on container?
  let saveDefault = configFlagEnabled(container, 'saveHasMany'); //default is false if not specified

  return saveDefault;
}

function configFlagEnabled(container, key) {
  //default is off
  let config = getOwner(container).resolveRegistration('config:environment');
  let result = config['emberPouch'] && config['emberPouch'][key];

  return result;
}

class Serializer extends RESTSerializer {
  @service store;

  constructor() {
    super(...arguments);
  }

  shouldSerializeHasMany(snapshot, key, relationship) {
    let result = shouldSaveRelationship(this, relationship);
    return result;
  }

  // This fixes a failure in Ember Data 1.13 where an empty hasMany
  // was saving as undefined rather than [].
  serializeHasMany(snapshot, json, relationship) {
    if (
      this._shouldSerializeHasMany(snapshot, relationship.key, relationship)
    ) {
      super.serializeHasMany.apply(this, arguments);

      const key = relationship.key;

      if (!json[key]) {
        json[key] = [];
      }
    }
  }

  _isAttachment(attribute) {
    let recordModelClass =
      typeof attribute.type === 'string'
        ? attribute.type
        : this.store.modelFor(attribute.modelName);
    return ['attachment', 'attachments'].indexOf(recordModelClass) !== -1;
  }

  serializeIntoHash(data, type, snapshot, options) {
    let root = decamelize(type.modelName);
    data[root] = this.serialize(snapshot, options);
  }

  serializeAttribute(snapshot, json, key, attribute) {
    super.serializeAttribute(snapshot, json, key, attribute);
    if (this._isAttachment(attribute)) {
      // if provided, use the mapping provided by `attrs` in the serializer
      let recordModelClass =
        typeof snapshot.type === 'string'
          ? snapshot.type
          : this.store.modelFor(snapshot.modelName);
      var payloadKey = this._getMappedKey(key, recordModelClass);
      if (payloadKey === key && this.keyForAttribute) {
        payloadKey = this.keyForAttribute(key, 'serialize');
      }

      // Merge any attachments in this attribute into the `attachments` property.
      // relational-pouch will put these in the special CouchDB `_attachments` property
      // of the document.
      // This will conflict with any 'attachments' attr in the model. Suggest that
      // #toRawDoc in relational-pouch should allow _attachments to be specified
      json.attachments = Object.assign(
        {},
        json.attachments || {},
        json[payloadKey],
      ); // jshint ignore:line
      json[payloadKey] = keys(json[payloadKey]).reduce((attr, fileName) => {
        attr[fileName] = Object.assign({}, json[payloadKey][fileName]); // jshint ignore:line
        delete attr[fileName].data;
        delete attr[fileName].content_type;
        return attr;
      }, {});
    }
  }

  extractAttributes(modelClass, resourceHash) {
    let attributes = super.extractAttributes(modelClass, resourceHash);
    let modelAttrs = modelClass.attributes;
    modelClass.eachTransformedAttribute((key) => {
      let attribute = modelAttrs.get(key);
      if (this._isAttachment(attribute)) {
        // put the corresponding _attachments entries from the response into the attribute
        let fileNames = keys(attributes[key]);
        fileNames.forEach((fileName) => {
          attributes[key][fileName] = resourceHash.attachments[fileName];
        });
      }
    });
    return attributes;
  }

  extractRelationships(modelClass) {
    let relationships = super.extractRelationships(...arguments);

    modelClass.eachRelationship((key, relationshipMeta) => {
      if (
        relationshipMeta.kind === 'hasMany' &&
        !shouldSaveRelationship(this, relationshipMeta) &&
        !!relationshipMeta.options.async
      ) {
        relationships[key] = { links: { related: key } };
      }
    });

    return relationships;
  }
}

// DEPRECATION: The private method _shouldSerializeHasMany has been promoted to the public API
// See https://www.emberjs.com/deprecations/ember-data/v2.x/#toc_jsonserializer-shouldserializehasmany
if (!JSONSerializer.prototype.shouldSerializeHasMany) {
  Serializer.reopen({
    _shouldSerializeHasMany(snapshot, key, relationship) {
      return this.shouldSerializeHasMany(snapshot, key, relationship);
    },
  });
}

export default Serializer;
