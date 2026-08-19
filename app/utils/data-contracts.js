export const DATA_SCHEMA_VERSION = 1;
export const BACKUP_FORMAT = 'paperbot-main-backup';
export const BACKUP_FORMAT_VERSION = 1;

const field = (type, nullable = false) => ({ type, nullable });
const relation = field('relation', true);
const date = field('date', true);

const schemas = {
  audiofile: {
    name: field('string'),
    command: field('string'),
    active: field('boolean'),
    admin: field('boolean'),
    mod: field('boolean'),
    vip: field('boolean'),
    sub: field('boolean'),
    cooldown: field('number'),
    timer: field('number'),
    soundfile: field('string'),
    volume: field('number'),
    selected: field('boolean'),
  },
  client: {
    type: field('string'),
    publicKey: field('string'),
    username: field('string'),
    oauth: field('string'),
    channel: field('string'),
    debug: field('boolean'),
    reconnect: field('boolean'),
    secure: field('boolean'),
    botclientstreams: field('relationArray'),
    chatclientstreams: field('relationArray'),
    botclientconfigs: field('relationArray'),
    chatclientconfigs: field('relationArray'),
  },
  command: {
    name: field('string'),
    type: field('string'),
    active: field('boolean'),
    admin: field('boolean'),
    mod: field('boolean'),
    vip: field('boolean'),
    sub: field('boolean'),
    cooldown: field('number'),
    timer: field('number'),
    response: field('string'),
    soundfile: field('string'),
    volume: field('number'),
    date_added: date,
  },
  config: {
    name: field('string'),
    overlayfolder: field('string'),
    externalevents: field('string'),
    externaleventskey: field('string'),
    premiumRequests: field('boolean'),
    premiumThreshold: field('number'),
    premiumSorting: field('boolean'),
    songQueue: field('unknown', true),
    lastPlayed: field('string'),
    nextPlayed: field('string'),
    defchannel: field('string'),
    overlayType: field('string'),
    showOverlay: field('boolean'),
    chromaColor: field('string'),
    overlayLength: field('number'),
    overlayMax: field('boolean'),
    overlayMin: field('boolean'),
    overlayWidth: field('number'),
    overlayHeight: field('number'),
    overlayPosX: field('number'),
    overlayPosY: field('number'),
    defOverlay: relation,
    timerLines: field('number'),
    timerTime: field('number'),
    defbotclient: relation,
    defchatclient: relation,
    showLyrics: field('boolean'),
    readerMax: field('boolean'),
    readerMin: field('boolean'),
    readerWidth: field('number'),
    readerHeight: field('number'),
    readerPosX: field('number'),
    readerPosY: field('number'),
    readerColumns: field('number'),
    readerZoom: field('number'),
    mainMax: field('boolean'),
    mainMin: field('boolean'),
    mainWidth: field('number'),
    mainHeight: field('number'),
    mainPosX: field('number'),
    mainPosY: field('number'),
    cpansetlist: field('boolean'),
    cpanpending: field('boolean'),
    cpanplayed: field('boolean'),
    cpanmessages: field('boolean'),
    cpanevents: field('boolean'),
    darkmode: field('boolean'),
    soundOverlap: field('boolean'),
    clearRequests: field('boolean'),
    allowDuplicated: field('boolean'),
    isdefault: field('boolean'),
    soundboardVolume: field('number'),
    cloudType: field('string'),
    remoteUrl: field('string'),
    database: field('string'),
    username: field('string'),
    password: field('string'),
    autoConnect: field('boolean'),
  },
  event: {
    eventId: field('string'),
    externalId: field('string'),
    platform: field('string'),
    timestamp: date,
    parsedbody: field('string'),
    user: field('string'),
    displayname: field('string'),
    color: field('string'),
    csscolor: field('string'),
    badges: field('string', true),
    htmlbadges: field('string'),
    type: field('string'),
    usertype: field('string', true),
    reward: field('string', true),
    emotes: field('string', true),
  },
  overlay: {
    name: field('string'),
    font: field('string'),
    qContainer: field('string'),
    qItems: field('string'),
    qCss: field('string'),
    nContainer: field('string'),
    nItems: field('string'),
    nCss: field('string'),
    configs: field('relationArray'),
  },
  request: {
    timestamp: date,
    chatid: field('string'),
    externalId: field('string'),
    platform: field('string'),
    type: field('string', true),
    user: field('string'),
    displayname: field('string'),
    color: field('string'),
    csscolor: field('string'),
    emotes: field('string', true),
    position: field('number'),
    donation: field('number'),
    donationFormatted: field('string'),
    isPremium: field('boolean'),
    isPlaying: field('boolean'),
    processed: field('boolean'),
    title: field('string'),
    artist: field('string'),
    song: relation,
  },
  song: {
    title: field('string'),
    artist: field('string'),
    lyrics: field('string'),
    type: field('string'),
    keywords: field('string'),
    active: field('boolean'),
    admin: field('boolean'),
    mod: field('boolean'),
    vip: field('boolean'),
    sub: field('boolean'),
    date_added: date,
    last_requested: date,
    last_played: date,
    zoomLevel: field('number'),
    transSteps: field('number'),
    columns: field('number'),
    viewMode: field('boolean'),
    requests: field('relationArray'),
    times_requested: field('number'),
    times_played: field('number'),
    account: field('string'),
    remoteid: field('string'),
  },
  slsong: {
    title: field('string'),
    artist: field('string'),
    songtype: field('string'),
    keywords: field('string'),
    account: field('string'),
    is_active: field('boolean'),
    is_admin: field('boolean'),
    is_mod: field('boolean'),
    is_vip: field('boolean'),
    is_sub: field('boolean'),
    date_added: date,
    last_requested: date,
    last_played: date,
    times_requested: field('number'),
    times_played: field('number'),
    pouchrev: field('string'),
    pouchid: field('string'),
  },
  stream: {
    title: field('string'),
    channel: field('string'),
    savechat: field('boolean'),
    events: field('boolean'),
    requests: field('boolean'),
    midi: field('boolean'),
    finished: field('boolean'),
    date,
    eventlog: field('array', true),
    chatlog: field('array', true),
    songqueue: field('array', true),
    botclient: relation,
    chatclient: relation,
  },
  timer: {
    name: field('string'),
    type: field('string'),
    active: field('boolean'),
    time: field('number'),
    chatlines: field('number'),
    message: field('string'),
    soundfile: field('string'),
    volume: field('number'),
    date_added: date,
  },
  textfile: {
    title: field('string'),
    artist: field('string'),
    lyrics: field('string'),
    type: field('string'),
    selected: field('boolean'),
  },
  vault: {
    v: field('string'),
    vaultId: field('string'),
    vaultSalt: field('string'),
    alg: field('string'),
    kdfName: field('string'),
    kdfHash: field('string'),
    kdfIterations: field('number'),
    updatedAt: field('string'),
  },
  window: {
    maximized: field('boolean'),
    width: field('number'),
    height: field('number'),
    posX: field('number'),
    posY: field('number'),
  },
};

export const MAIN_RECORD_TYPES = Object.freeze(
  Object.keys(schemas).filter((type) => type !== 'config'),
);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function valueMatches(value, descriptor) {
  if (value === null || value === undefined) return descriptor.nullable;

  switch (descriptor.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return (
        typeof value === 'string' &&
        value.length > 0 &&
        !Number.isNaN(Date.parse(value))
      );
    case 'array':
      return Array.isArray(value);
    case 'relation':
      return typeof value === 'string' || typeof value === 'number';
    case 'relationArray':
      return (
        Array.isArray(value) &&
        value.every(
          (entry) => typeof entry === 'string' || typeof entry === 'number',
        )
      );
    case 'unknown':
      return true;
    default:
      return false;
  }
}

function unsafeValueErrors(
  value,
  path = 'data',
  seen = new Set(),
  allowUndefined = false,
) {
  if (value === null) return [];

  const valueType = typeof value;
  if (valueType === 'number' && !Number.isFinite(value)) {
    return [`${path} contains a non-finite number.`];
  }
  if (valueType === 'undefined' && allowUndefined) return [];
  if (['undefined', 'function', 'symbol', 'bigint'].includes(valueType)) {
    return [`${path} contains a non-serializable ${valueType} value.`];
  }
  if (valueType !== 'object') return [];
  if (typeof value.then === 'function') {
    return [`${path} contains an asynchronous value.`];
  }
  if (seen.has(value)) return [`${path} contains a circular reference.`];

  seen.add(value);
  const errors = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      errors.push(
        ...unsafeValueErrors(entry, `${path}[${index}]`, seen, allowUndefined),
      );
    });
  } else {
    for (const [key, entry] of Object.entries(value)) {
      errors.push(
        ...unsafeValueErrors(entry, `${path}.${key}`, seen, allowUndefined),
      );
    }
  }
  seen.delete(value);
  return errors;
}

export class DataContractError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'DataContractError';
    this.errors = errors;
  }
}

/**
 * Validate record data while preserving unknown legacy fields.
 * Missing known fields are accepted because Ember Data supplies model defaults.
 */
export function validateRecordData(type, input, options = {}) {
  const schema = schemas[type];
  const errors = unsafeValueErrors(
    input,
    'data',
    new Set(),
    options.allowUndefined === true,
  );
  const warnings = [];

  if (!isPlainObject(input)) {
    return {
      valid: false,
      data: input,
      errors: ['Record data must be an object.'],
      warnings,
    };
  }

  const data = input;
  if (!schema) {
    warnings.push(`Unknown record type ${type} was preserved opaquely.`);
    return { valid: errors.length === 0, data, errors, warnings };
  }

  for (const [key, descriptor] of Object.entries(schema)) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (!valueMatches(data[key], descriptor)) {
      warnings.push(
        `${type}.${key} has a legacy ${typeof data[key]} value; expected ${descriptor.type}.`,
      );
    }
  }

  for (const key of Object.keys(data)) {
    if (!Object.prototype.hasOwnProperty.call(schema, key) && key !== 'id') {
      warnings.push(`${type}.${key} is an unknown legacy field.`);
    }
  }

  return { valid: errors.length === 0, data, errors, warnings };
}

export function recordTypeFromDocumentId(id) {
  if (typeof id !== 'string') return null;
  const separator = id.indexOf('_');
  if (separator < 1) return null;
  return id.slice(0, separator);
}

export function validatePouchDocument(document) {
  if (!isPlainObject(document)) {
    return {
      valid: false,
      errors: ['Document must be an object.'],
      warnings: [],
    };
  }

  const type = recordTypeFromDocumentId(document._id);
  const errors = [];
  if (
    typeof document._id !== 'string' ||
    !/^.+_[123](?:_|$)/.test(document._id)
  ) {
    errors.push(`Invalid relational document id: ${String(document._id)}`);
  }
  if (
    typeof document._rev !== 'string' ||
    !/^\d+-[^\s]+$/.test(document._rev)
  ) {
    errors.push(`${String(document._id)} has an invalid revision.`);
  }
  if (type === 'config') {
    errors.push('Config documents do not belong in a main database backup.');
  }

  if (errors.length > 0) return { valid: false, type, errors, warnings: [] };

  const result = validateRecordData(type, document.data);
  return {
    ...result,
    type,
    document,
  };
}

export function validateMainDataset(documents) {
  const errors = [];
  const warnings = [];
  const normalizedDocuments = [];
  const ids = new Set();

  if (!Array.isArray(documents)) {
    return {
      valid: false,
      documents: [],
      errors: ['Documents must be an array.'],
      warnings,
    };
  }

  for (const document of documents) {
    const result = validatePouchDocument(document);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.valid) {
      if (ids.has(document._id))
        errors.push(`Duplicate document id: ${document._id}`);
      ids.add(document._id);
      normalizedDocuments.push(result.document);
    }
  }

  return {
    valid: errors.length === 0,
    documents: normalizedDocuments,
    errors,
    warnings,
  };
}

export function assertValidRecordData(type, input) {
  const result = validateRecordData(type, input, { allowUndefined: true });
  if (!result.valid) {
    throw new DataContractError(`Invalid ${type} record.`, result.errors);
  }
  return result.data;
}
