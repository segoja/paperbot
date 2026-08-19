import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  DATA_SCHEMA_VERSION,
  DataContractError,
  validateMainDataset,
} from 'paperbot/utils/data-contracts';

export function createBackupEnvelope(documents, createdAt = new Date()) {
  const validation = validateMainDataset(documents);
  if (!validation.valid) {
    throw new DataContractError(
      'The main database contains invalid records.',
      validation.errors,
    );
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: DATA_SCHEMA_VERSION,
    createdAt: createdAt.toISOString(),
    documents,
  };
}

export function assertBulkWriteSucceeded(results, operation) {
  if (!Array.isArray(results)) {
    throw new DataContractError(`${operation} returned an invalid result.`);
  }
  const failures = results.filter(
    (result) => result?.error || (!result?.ok && !result?.rev),
  );
  if (failures.length > 0) {
    throw new DataContractError(
      `${operation} failed for ${failures.length} document(s).`,
      failures.map(
        (failure) =>
          `${failure.id || '<unknown>'}: ${failure.reason || failure.message || failure.name || 'unknown error'}`,
      ),
    );
  }
  return results;
}

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DataContractError('The selected backup is not valid JSON.');
  }

  const isLegacy = Array.isArray(parsed);
  if (!isLegacy) {
    if (!parsed || typeof parsed !== 'object') {
      throw new DataContractError(
        'The selected backup has an invalid structure.',
      );
    }
    if (parsed.format !== BACKUP_FORMAT) {
      throw new DataContractError(
        'The selected file is not a Paperbot main database backup.',
      );
    }
    if (parsed.formatVersion !== BACKUP_FORMAT_VERSION) {
      throw new DataContractError(
        `Backup format ${String(parsed.formatVersion)} is not supported.`,
      );
    }
    if (!Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion < 0) {
      throw new DataContractError('The backup schema version is invalid.');
    }
    if (parsed.schemaVersion > DATA_SCHEMA_VERSION) {
      throw new DataContractError(
        `Backup schema ${parsed.schemaVersion} is newer than supported schema ${DATA_SCHEMA_VERSION}.`,
      );
    }
    if (
      typeof parsed.createdAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      throw new DataContractError('The backup creation date is invalid.');
    }
  }

  const rawDocuments = isLegacy ? parsed : parsed.documents;
  const isInternalDocument = (document) =>
    typeof document?._id === 'string' &&
    (document._id.startsWith('_design/') || document._id.startsWith('_local/'));
  const ignoredInternalDocuments = Array.isArray(rawDocuments)
    ? rawDocuments.filter(isInternalDocument)
    : [];
  const documents = Array.isArray(rawDocuments)
    ? rawDocuments.filter((document) => !isInternalDocument(document))
    : rawDocuments;
  const validation = validateMainDataset(documents);
  if (!validation.valid) {
    throw new DataContractError(
      'The selected backup contains invalid records.',
      validation.errors,
    );
  }

  return {
    documents: validation.documents,
    warnings: [
      ...validation.warnings,
      ...(ignoredInternalDocuments.length > 0
        ? [
            `${ignoredInternalDocuments.length} internal database document(s) were ignored.`,
          ]
        : []),
    ],
    legacy: isLegacy,
  };
}
