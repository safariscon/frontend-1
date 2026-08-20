/** Shared upload limits for service images and booking file fields. */
export const MAX_UPLOAD_FILE_SIZE_MB = 10;
export const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;

export function isUploadWithinLimit(file, maxBytes = MAX_UPLOAD_FILE_SIZE_BYTES) {
  return Boolean(file) && Number(file.size || 0) <= maxBytes;
}

export function filterImagesWithinLimit(files = [], maxBytes = MAX_UPLOAD_FILE_SIZE_BYTES) {
  return Array.from(files || []).filter(
    (file) => file?.type?.startsWith('image/') && isUploadWithinLimit(file, maxBytes)
  );
}
