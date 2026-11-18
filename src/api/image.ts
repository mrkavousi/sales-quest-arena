import { GameApiError } from './game';

/** Mirrors the backend: JPEG/PNG/WEBP, at most 4 MiB per upload. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Anything above this is re-encoded; phone photos are routinely larger than the upload cap. */
const KEEP_AS_IS_BYTES = 1_500_000;
const PICK_LIMIT_BYTES = 30 * 1024 * 1024;
const MAX_EDGE = 1600;

export type EvidenceCheck = 'ok' | 'badType' | 'empty' | 'tooLarge';

/** Cheap check when the player picks a file; the real limits are enforced again by the server. */
export function checkEvidenceFile(file: { type: string; size: number }): EvidenceCheck {
  if (!file.type.startsWith('image/')) return 'badType';
  if (file.size <= 0) return 'empty';
  if (file.size > PICK_LIMIT_BYTES) return 'tooLarge';
  return 'ok';
}

const tooLarge = () => new GameApiError(422, 'EVIDENCE_TOO_LARGE', 'The image is too large to upload.');

/** Downscale to a JPEG so the upload fits the server cap and mobile data. Small allowed files pass through. */
export async function prepareEvidence(file: File): Promise<File> {
  const allowed = ACCEPTED.includes(file.type);
  if (allowed && file.size <= KEEP_AS_IS_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no canvas');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('no blob');
    if (blob.size > MAX_UPLOAD_BYTES) throw tooLarge();
    const name = file.name.replace(/\.[^.]+$/, '') || 'evidence';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  } catch (error) {
    if (error instanceof GameApiError) throw error;
    // Could not re-encode: fall back to the original only when the server would accept it as is.
    if (allowed && file.size <= MAX_UPLOAD_BYTES) return file;
    throw tooLarge();
  }
}
