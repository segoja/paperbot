# Paperbot Data Model and Framework Audit

Date: 2026-08-19

## Executive decision

**Do not rebuild Paperbot in React now. Keep the existing Ember UI, stabilize the data contract, and extract a framework-neutral domain/repository layer first.**

The material risks in this repository are not caused by rendering. They are caused by unvalidated documents, duplicated relationship state, multi-record operations implemented as unrelated asynchronous saves, raw database import/export, and business invariants spread across Ember controllers and services. Replacing Ember with React would not replace PouchDB, relational-pouch, replication, conflict handling, migrations, or these invariants. It would require reimplementing them while the current behavior has almost no data-layer tests.

The recommended path is therefore:

1. Freeze and test the existing serialized format.
2. Fix proven data-loss and consistency defects without changing the UI.
3. Put typed codecs, repositories, and domain operations between the UI and PouchDB.
4. Reassess React only after the Ember UI no longer owns persistence behavior.

At that point, staying on Ember and moving to React become UI-shell choices rather than data-migration projects.

## Audit boundaries and method

This audit covers:

- all files in `app/models`;
- the custom adapter and serializer in `app/adapters` and `app/serializers`;
- record creation, mutation, deletion, import, export, replication, and encryption paths;
- domain rules in controllers, components, and services;
- compatibility with the existing `paperbot` and `paperbot-config` databases.

It does not assess visual design or propose visual changes. No Playwright, Firefox, screenshots, or browser downloads were used.

The repository contains 14 model classes, 219 declared attributes including `rev`, and 12 declared relationships. Application code contains at least 27 `createRecord`, 147 `save`, and 30 `destroyRecord` call sites. There are no model, adapter, serializer, queue, backup, migration, or replication tests.

## Current architecture

### Storage topology

| Store | Adapter | Contents | Remote replication | Included in DB export |
| --- | --- | --- | --- | --- |
| `paperbot` | `application` | songs, requests, streams, clients, commands, timers, overlays, events, vault metadata | Yes | Yes |
| `paperbot-config` | `config` | singleton `config/ppbconfig` | No, intentionally device-local | No |

The split is intentional for cloud sync: the UI states that bot settings remain local (`app/components/pb-cloud.hbs:81`). It is not reflected in the backup contract: the single “Export DB” action reads only the application adapter (`app/controllers/application.js:423`), while the adjacent settings UI presents it as a database backup (`app/components/pb-settings.hbs:573`). A restore therefore cannot reconstruct the local configuration.

### Physical document contract

The custom adapter dynamically creates a relational-pouch schema from Ember Data metadata (`app/adapters/pouch.js:208`). A string-ID record is stored approximately as:

```json
{
  "_id": "<document-type>_2_<record-id>",
  "_rev": "<couch-revision>",
  "data": {
    "<attribute>": "<serialized-value>",
    "<belongs-to>": "<related-id>",
    "<has-many>": ["<related-id>"]
  }
}
```

The `_2_` segment is relational-pouch's string-ID marker, not an application schema version. Paperbot has no persisted application schema version or migration registry.

`config/environment.js:9` enables `saveHasMany`, so both sides of every relationship are serialized. This duplicates relationship truth: for example, a request stores `song`, and a song stores `requests`. Correctness depends on every mutation saving all affected records successfully.

### Relationship graph

```text
Config --defOverlay----> Overlay
Config --defbotclient--> Client
Config --defchatclient-> Client

Client --botclientstreams--> Stream --botclient--> Client
Client --chatclientstreams-> Stream --chatclient-> Client

Song --requests--------> Request --song-------> Song
Overlay --configs------> Config
Client --*configs------> Config
```

The configuration edges cross the two-database boundary. IDs can be resolved through Ember Data, but referential updates cannot be atomic across those databases.

## Model catalog

Notation: `?` means nullable/absent in practice, and a value after `=` is the declared default.

| Model | Classification and storage | Declared data contract |
| --- | --- | --- |
| `song` | Core catalog entity; `paperbot` | `title:string=""`, `artist:string=""`, `lyrics:string=""`, `type:string=""`, `keywords:string=""`, `active:boolean=true`, `admin/mod/vip/sub:boolean=false`, `date_added/last_requested/last_played:date=""`, `zoomLevel:number=.85`, `transSteps:number=0`, `columns:number=1`, `viewMode:boolean=true`, `times_requested/times_played:number=0`, `account:string=""`, `remoteid:string=""`, `rev:string?`; has many `requests` |
| `request` | Queue entry plus request snapshot; `paperbot` | `timestamp:date=""`, `chatid/externalId/platform/type/user/displayname/color/csscolor/emotes:string=""`, `position:number=0`, `donation:number=0`, `donationFormatted:string=""`, `isPremium/isPlaying/processed:boolean=false`, `title/artist:string=""`, `rev:string?`; belongs to nullable-in-practice `song` |
| `stream` | Stream session and embedded historical snapshot; `paperbot` | `title/channel:string=""`, `savechat/events/requests/midi/finished:boolean=false`, `date:date?`, `eventlog/chatlog/songqueue:untyped`, `rev:string?`; belongs to bot and chat `client` records |
| `client` | Twitch connection/integration configuration; `paperbot` | `type/publicKey/username/oauth/channel:string=""`, `debug:boolean=false`, `reconnect/secure:boolean=true`, `rev:string?`; has many bot/chat streams and default configurations |
| `config` | Singleton device settings aggregate; `paperbot-config` | 56 attributes covering identity, queue policy, overlays, timers, window geometry, panel state, audio, cloud credentials, and revision; belongs to one overlay and two clients |
| `overlay` | User-authored HTML/CSS templates; `paperbot` | `name/font/qContainer/qItems/qCss/nContainer/nItems/nCss:string=""`, `rev:string?`; has many configurations |
| `command` | Chat command entity; `paperbot` | `name/type/response/soundfile:string=""`, `active/admin/mod/vip/sub:boolean=false`, `cooldown/timer/volume:number=0`, `date_added:date=""`, `rev:string?` |
| `timer` | Scheduled command entity; `paperbot` | `name/type/message/soundfile:string=""`, `active:boolean=false`, `time:number=1`, `chatlines:number=5`, `volume:number=0`, `date_added:date=""`, `rev:string?` |
| `event` | Short-lived external event record; `paperbot` | `eventId/externalId/platform/parsedbody/user/displayname/color/csscolor/badges/htmlbadges/type/usertype/reward/emotes:string=""`, `timestamp:date=""`, `rev:string?` |
| `vault` | Replicated encryption metadata singleton; `paperbot` | `v:string="v1"`, `vaultId/vaultSalt/kdfName/kdfHash/updatedAt:string=""`, `alg:string="AES-GCM"`, `kdfIterations:number=310000`, `rev:string?` |
| `audiofile` | Import-screen staging record; not intentionally saved | Command-like fields plus `selected`; creating these through Ember Data unnecessarily introduces transient records into the application store |
| `textfile` | Import-screen staging record; not intentionally saved | `title/artist/lyrics/type:string=""`, `selected:boolean=false`, `rev:string?`; also unnecessarily uses Ember Data |
| `slsong` | Dormant legacy remote-song DTO | Duplicates much of `song` using different names. Its only integration path is commented out; numeric counters incorrectly default to `""` |
| `window` | Unused legacy model | `maximized:boolean=false`, `width:number=1024`, `height:number=800`, `posX/posY:number=0`, `rev:string?`; current geometry is stored in `config` instead |

### Configuration aggregate

`config` is too broad to be a coherent domain entity. Its persisted groups are:

- identity: `name`, `isdefault`, `defchannel`, default client/overlay relationships;
- queue policy: `premiumRequests`, `premiumThreshold`, `premiumSorting`, `clearRequests`, `allowDuplicated`, `lastPlayed`, `nextPlayed`, `songQueue`;
- overlay: folder, type, visibility, chroma, length, geometry, min/max state;
- reader and main window: geometry, min/max state, columns, zoom;
- panel visibility: five `cpan*` flags;
- timer/audio: timer thresholds, overlap, volume;
- cloud/integrations: provider, URL, database, username, password, external event provider/key, auto-connect;
- UI preference: `darkmode`.

It also references undeclared `extraPanLeft` and `extraPanRight` fields in `noPanels` (`app/models/config.js:71`) and retains apparently unused `songQueue`, `lastPlayed`, and `nextPlayed` fields. This is schema drift, not simply naming style.

## Findings

### Critical

#### DM-01: Queue writes can persist an invalid position and diverge aggregate state

Evidence:

- `externalToQueue` assigns `this.nextPosition()` without `await` (`app/services/queue-handler.js:328`) and then assigns that Promise to the numeric `position` attribute (`app/services/queue-handler.js:342`). Ember Data's number transform serializes this as `null`.
- Adding, removing, playing, and reordering requests updates multiple request records and song counters through separate saves (`app/services/queue-handler.js:123-215`, `257-301`, and `376-486`).
- Many of those writes use asynchronous `forEach`/`map` callbacks that the caller does not await.
- Request creation and `song.times_requested` updates are separate operations. Playing a request and incrementing `song.times_played` are also separate operations.

Failure modes include null or duplicate positions, more than one playing request, gaps after deletion, stale counters, a saved request without its counter update, and a counter update without the corresponding request. Replication conflicts make these outcomes more likely.

Remediation: create one `QueueService` domain boundary with serialized commands (`enqueue`, `remove`, `move`, `markPlayed`, `markPending`, `clear`). Validate invariants before writing, use `bulkDocs` with explicit conflict handling where records share a database, and add a deterministic reconciliation operation. Treat counters as derived/rebuildable data.

### High

#### DM-02: There is no schema version, validation boundary, or migration runner

The physical schema is inferred from whichever Ember models happen to initialize. Imports write raw documents directly. Old fields are retained silently, missing fields receive runtime defaults, and renamed fields have no migration path.

This makes compatibility accidental. A React rewrite would be especially risky because it would need to reverse-engineer implicit Ember serializer behavior before it could safely read existing data.

Remediation: define versioned `Stored*V1` document codecs, store a database manifest, validate every read/import, and run idempotent migrations before exposing records to the application.

#### DM-03: Backup and restore do not represent the complete application state

`handleExport` exports only `paperbot`; `paperbot-config` is omitted. `handleImport` parses arbitrary JSON and calls `bulkDocs(..., { new_edits: false })` without a manifest, type allowlist, shape validation, duplicate policy, compatibility check, preview, or rollback (`app/controllers/application.js:423-469`). Revision trees from the input are trusted verbatim.

This can produce an incomplete restore or introduce incompatible documents. It also makes encrypted data restoration ambiguous because the vault metadata is backed up while device-local cloud credentials and settings are not.

Remediation: export a manifest plus separately named datasets for both databases, include checksums and schema versions, validate into a temporary database, report rejected records, and swap/import only after all checks pass. Preserve an explicit “main data only” export only if it is named as such.

#### DM-04: Missing records may leave callers waiting forever

`eventuallyConsistent` is enabled. When relational-pouch reports that an ID has never existed, `_eventuallyConsistent` returns a deferred promise that resolves only if a future change for that exact ID arrives (`app/adapters/pouch.js:517-571`). There is no timeout, cancellation, route teardown handling, or not-found result.

Remediation: return a typed not-found error after a bounded replication wait, cancel waiters when the adapter/database is destroyed or changed, and distinguish “replication pending” from “record absent.”

#### DM-05: Relationship truth is duplicated and maintained manually

With `saveHasMany: true`, both `song.requests` and `request.song`, both client/stream sides, and both config/default sides are persisted. Delete handlers collect children, destroy the parent, and then save children in separate operations. Implementations differ between grid, detail, and bulk deletion paths (`app/controllers/songs.js:67`, `app/controllers/songs/song.js:50`, `app/components/pb-songs.js:130`).

The config relationships also span `paperbot-config` and `paperbot`, so they cannot be made atomic. A failed second save leaves dangling or stale IDs.

Remediation: establish one persisted owner for every one-to-many relationship. Prefer the child's foreign key for song/request and client/stream. Represent local config defaults as nullable IDs validated against the main repository, not bidirectional persisted relationships.

#### DM-06: Data behavior has effectively no regression protection

The test suite contains only chord parser/analysis tests. It does not cover any active model, serializer, adapter, relationship, queue operation, import/export, migration, encryption envelope, or replication conflict.

Remediation: establish serialized fixture and repository contract tests before changing models or frameworks. This is a prerequisite for both an Ember upgrade and a React rewrite.

#### DM-07: Startup eagerly loads every active record type

The application route calls `findAll` for configurations, clients, overlays, songs, streams, commands, timers, events, requests, and vaults (`app/routes/application.js:21-34`). Event, request, stream-log, lyrics, and template payloads are unbounded. `stream.chatlog`, `eventlog`, and `songqueue` are embedded untyped arrays inside one document.

This creates startup, memory, serialization, and CouchDB document-size risks as user history grows.

Remediation: load only boot-critical settings and current queue state; query catalog/history by page or range; give embedded stream snapshots explicit schemas and retention/size limits.

### Medium

#### DM-08: Attribute types and defaults are internally inconsistent

- Seven active date attributes default to `""`; Ember Data serializes invalid/non-Date values as `null`.
- `stream.eventlog`, `chatlog`, and `songqueue`, plus `config.songQueue`, are untyped.
- `request.song` is declared as a relationship but is assigned `""` for unmatched external requests (`app/services/queue-handler.js:348`). Later code assumes `firstRequest.song.get(...)` exists (`app/services/queue-handler.js:440`).
- Event string attributes receive `null`, `false`, and an `htmlSafe` value (`app/services/events-external.js:602-627`).
- Legacy `slsong` numeric counters default to strings.

Remediation: use `null` for absent dates/relationships, explicit value-object codecs for nested arrays, discriminated request types for catalog-backed versus free-text requests, and normalized input coercion at repository boundaries.

#### DM-09: Import/export schemas have drifted from the models

- Overlay CSV refers to nonexistent `qHeader` and `nHeader` fields and omits `font`, `qCss`, and `nCss` (`app/components/pb-overlays.js:99-145`).
- Song CSV omits `keywords`, `last_requested`, and reader-view settings (`app/components/pb-songs.js:143-205`).
- Generic CSV import requires an exact raw header string and splits the first line using CRLF-specific logic (`app/services/current-user.js:61-90`).
- Imports create and save records independently without awaiting completion or rolling back partial success.
- Client CSV includes OAuth credentials and legacy key material (`app/components/pb-clients.js:99-147`) without an explicit secret-export boundary.

Remediation: use model-specific versioned codecs, parse headers through PapaParse, validate the whole file before saving, report row errors, bulk-write accepted rows, and require an explicit protected-secrets export mode.

#### DM-10: New records are persisted before the user provides valid data

Create actions save empty clients, overlays, songs, streams, commands, and timers before navigating to edit them. Canceling or abandoning the editor therefore leaves blank persisted records. Validation does not prevent this (`app/controllers/clients.js:27`, `overlays.js:27`, `songs.js:31`, `streams.js:62`, `commands.js:31`, `timers.js:32`).

Remediation: create records in memory, validate and save on confirmation, and unload or roll back on cancel. Alternatively, make drafts an explicit record state with cleanup rules.

#### DM-11: Domain rules are duplicated across framework classes

Request creation exists in `queue-handler` and multiple branches of `twitch-chat`; song statistics are updated in each branch. Delete/unlink logic is duplicated between list and detail controllers. Stream completion constructs anonymous snapshot objects in a component (`app/components/pb-stream-edit.js:168-231`).

Remediation: move these operations to framework-neutral command services and repositories. Ember controllers/components should translate user actions into commands, not coordinate persistence.

#### DM-12: Model classes mix persistence, parsing, secrets, and transport concerns

`ClientModel.optsgetter` constructs tmi.js connection options. `ClientModel.vaultId` and `ConfigModel.vaultIds` detect encryption by substring and then call `JSON.parse` without error handling. `ConfigModel` owns cloud capability rules and UI/window state alongside credentials.

Malformed imported values containing `vaultId` can make these getters throw. The models are also coupled to particular integrations and UI behavior.

Remediation: keep stored records as data, move envelope parsing to a total `SecretEnvelopeCodec`, move Twitch options to the integration adapter, and split settings into typed sections in the domain layer while retaining the V1 stored shape.

### Low

#### DM-13: Temporary and obsolete data types are modeled as persistent records

`audiofile` and `textfile` are UI staging rows but use Ember Data. `window` is unused. `slsong` duplicates `song` for a commented-out integration. These types enlarge the inferred schema and obscure which records are durable.

Remediation: replace staging models with plain tracked objects, quarantine dormant DTOs with their integration, and remove obsolete types only after a database scan confirms no live documents require migration.

#### DM-14: Naming obscures compatibility rules

Persisted names mix camelCase (`zoomLevel`), snake_case (`date_added`), compact lowercase (`chatid`), and near-duplicates (`songQueue`/`songqueue`). `rev` is exposed as a domain attribute on every model even though it is persistence metadata.

Renaming stored keys immediately would create unnecessary migration risk. Normalize names in domain types and map them explicitly to the unchanged V1 storage keys.

## Target data architecture

### Compatibility layer

Introduce TypeScript types and runtime codecs with two deliberately separate representations:

```ts
type StoredDocumentV1<T> = {
  _id: string;
  _rev?: string;
  data: T;
};

type DecodeResult<T> =
  | { ok: true; value: T; warnings: DataWarning[] }
  | { ok: false; errors: DataError[] };
```

`StoredSongV1`, `StoredRequestV1`, and the other stored types must preserve current field names, ID encoding, null behavior, and encrypted-envelope strings. Domain types use consistent names and explicit nullability. Codecs are the only place allowed to coerce legacy values.

Add a manifest document per database containing the Paperbot schema version and completed migrations. Migrations must be idempotent, preserve `_id` identity, use current `_rev` values, back up before writing, and produce an audit summary.

### Domain model

Use these boundaries without immediately changing stored documents:

- `Song`: catalog content, permissions, reader preferences; statistics are derived/reconcilable.
- `QueueEntry`: `songId: string | null`, immutable title/artist snapshot, requester metadata, money value, status, rank, and timestamps.
- `QueueState`: ordered pending/played views and at most one current entry; it owns all queue invariants.
- `StreamSession`: connection references and explicit typed snapshots of chat, events, and queue history.
- `ChatClient`, `Command`, `Timer`, `Overlay`: focused integration entities.
- `DeviceSettings`: window/UI/audio settings.
- `QueueSettings`, `IntegrationSettings`, `CloudSettings`: typed sections mapped to the existing singleton config document.
- `VaultMetadata` and `EncryptedSecretV2`: security types decoded only by the crypto boundary.

Keep request title/artist duplication intentionally as an immutable historical snapshot. Document that snapshot fields win for display after a song is renamed or deleted. This resolves the current ambiguous `title || song.title` rule.

### Repository boundaries

```ts
interface SongRepository {
  get(id: string): Promise<Song | null>;
  list(query: SongQuery): Promise<Page<Song>>;
  save(song: Song, expectedRevision?: string): Promise<Song>;
  remove(id: string, expectedRevision: string): Promise<void>;
}

interface QueueRepository {
  loadActive(): Promise<QueueState>;
  execute(command: QueueCommand): Promise<QueueState>;
  reconcile(): Promise<QueueRepairReport>;
}

interface SettingsRepository {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<Settings>;
}

interface DatasetRepository {
  export(options: ExportOptions): Promise<DatasetArchive>;
  validateImport(input: unknown): Promise<ImportReport>;
  import(archive: DatasetArchive): Promise<ImportReport>;
}
```

Implement PouchDB repositories first. Ember Data models may temporarily adapt to these interfaces, but controllers, components, and integration services must stop calling `save`/`destroyRecord` for aggregate operations. React, if later selected, consumes the same interfaces.

## Strategy comparison

Scores use 1 (poor) to 5 (strong). “Delivery efficiency” gives a higher score to lower total effort.

| Criterion | Stabilize current Ember/Data patterns | Extract domain layer, retain Ember | Rewrite UI in React now |
| --- | ---: | ---: | ---: |
| Data reliability | 3 | 5 | 2 |
| Existing-data safety | 4 | 5 | 2 |
| Testability | 3 | 5 | 4 |
| Reduced framework coupling | 1 | 5 | 3 |
| Incremental rollout | 4 | 5 | 1 |
| Delivery efficiency | 5 | 3 | 1 |
| **Total** | **20/30** | **28/30** | **13/30** |
| Relative effort | Medium | Large | Extra large; still requires the extraction work |

### Recommendation

Choose **extract domain layer, retain Ember**.

The current Ember components and routes are already the working product and can remain visually unchanged. Ember itself is not blocking a sound data architecture. The upgrade risk lies mainly in the 619-line custom adapter, serializer compatibility code that references behavior as old as Ember Data 1.13, direct record APIs throughout the UI, and relational-pouch semantics.

A React rewrite becomes reasonable only if, after extraction, one or more of these conditions is true:

- the team cannot sustainably maintain or hire for Ember;
- required product capabilities are materially blocked by Ember rather than the data layer;
- an Ember upgrade cannot be completed behind the repository contract;
- a React vertical slice demonstrates lower maintenance cost while passing the same repository and compatibility tests.

No current model evidence satisfies those conditions. The current evidence supports architectural extraction, not a UI rewrite.

## Remediation sequence

### Phase 0: Contract freeze and recovery

- Capture sanitized raw fixtures for every active document type, including legacy null/string values and both encryption formats.
- Add round-trip serializer tests and a read-only integrity scanner.
- Replace backup/restore with a versioned two-database archive and validated dry-run import.
- Add a repair report for dangling relationships, invalid queue positions, duplicate playing flags, and counter drift.

### Phase 1: Correctness fixes

- Fix the missing `await` in external queue insertion.
- Centralize queue commands and await every write.
- Make free-text requests explicitly nullable in `songId` and safe in play/navigation paths.
- Stop persisting blank records and reject invalid imports before writes.
- Add bounded missing-record behavior and conflict outcomes.

### Phase 2: Domain and repository extraction

- Add `Stored*V1` codecs and normalized domain types.
- Implement repositories over the existing PouchDB IDs/documents.
- Move queue, deletion, stream-finalization, and import/export rules out of UI classes.
- Make relationship ownership and snapshot/counter policies explicit.

### Phase 3: Dependency modernization

- Upgrade Ember, Ember Data/WarpDrive, Tauri, and supporting packages in isolated steps behind contract tests.
- Decide whether the custom Ember Data adapter remains useful or whether Ember should call the PouchDB repositories directly.
- Remove staging/legacy models only after compatibility scans and migrations.

### Phase 4: Framework gate

Run a React proof of concept only after all persisted operations are available through framework-neutral repositories. Use one complete workflow such as catalog search -> enqueue -> play -> stream snapshot. It must preserve the current UI and pass the same fixture, migration, and replication tests before a wider rewrite is approved.

## Required tests and acceptance scenarios

### Stored contract

- Round-trip every V1 model through codec, serializer, relational-pouch document, and back.
- Cover `null`, empty legacy strings, dates, numeric strings, unknown fields, missing fields, and corrupt relationship IDs.
- Prove existing `_id`, `_rev`, snake_case keys, and encrypted envelopes remain readable.

### Relationships and deletion

- Load and unlink song/request, client/stream, config/client, and config/overlay relationships from both directions.
- Delete parents with zero, one, and many children; inject a failed child write and verify repair/retry behavior.
- Detect dangling IDs and ensure repair is idempotent.

### Queue invariants

- Enqueue catalog and free-text requests concurrently.
- Insert at top, remove, clear, move between pending/played, next, previous, and toggle playing.
- Assert integer unique ordering, at most one current entry, nonnegative counters, and deterministic reconciliation.
- Inject PouchDB `409` conflicts and partial bulk failures; no command may report success with violated invariants.

### Backup, import, and migration

- Export and restore both databases into empty instances and compare normalized contents.
- Restore legacy main-only backups with a clear warning and safe local-config behavior.
- Reject malformed JSON, unknown document types, invalid IDs, unsupported future schema versions, and corrupt envelopes without modifying live data.
- Interrupt import/migration and verify restart or rollback is safe.

### Encryption and replication

- Read plaintext legacy secrets, CryptoJS legacy clients, valid V2 envelopes, wrong-passphrase data, corrupt ciphertext, and vault mismatches.
- Replicate creates, updates, deletes, and conflicts between two databases while records are clean and locally dirty.
- Bound missing-record waits and cancel them on database change/destruction.

### Performance

- Measure startup without loading historical streams/events.
- Exercise large catalogs, queues, and stream snapshots with documented limits.
- Verify queries use appropriate indexes and do not scan unrelated document types.

## Validation baseline

- `npm.cmd run lint`: failed. Template lint passed; JavaScript lint reported 10,006 existing Prettier line-ending errors (`CRLF` versus configured `LF`). No files were reformatted.
- `npm.cmd run test:ember`: produced no test result and timed out after 124 seconds. No browser or browser dependency was downloaded.
- Existing automated coverage is limited to chord parsing/analysis and does not exercise the audited data layer.
- The worktree was clean before the audit. This report is the only intended tracked change.

## Final assessment

Paperbot's domain is small enough to stabilize incrementally, but the current persistence behavior is implicit and fragile. Rewriting in React now would multiply the risk because the team would be changing the UI framework and rediscovering the storage contract at the same time.

Stay with Ember for the stabilization and extraction phases. Treat the custom PouchDB contract as the compatibility boundary, move domain rules behind typed repositories, and make the later framework choice only after the data layer is independently tested. That path fixes the actual defects and preserves the option to adopt React without risking existing user data.
