export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_VIEWPORT = 280;

export function coverScale(naturalWidth, naturalHeight, viewport) {
  if (!naturalWidth || !naturalHeight || !viewport) return 1;
  return Math.max(viewport / naturalWidth, viewport / naturalHeight);
}

export function clampAvatarOffset(offset, naturalWidth, naturalHeight, viewport, zoom) {
  const scale = coverScale(naturalWidth, naturalHeight, viewport) * Math.max(1, Number(zoom) || 1);
  const maxX = Math.max(0, (naturalWidth * scale - viewport) / 2);
  const maxY = Math.max(0, (naturalHeight * scale - viewport) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, Number(offset?.x) || 0)),
    y: Math.min(maxY, Math.max(-maxY, Number(offset?.y) || 0)),
  };
}

export async function cropAvatarToFile(image, { zoom, offset, viewport, outputSize = AVATAR_OUTPUT_SIZE }) {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  const scale = coverScale(naturalWidth, naturalHeight, viewport) * Math.max(1, Number(zoom) || 1);
  const left = (viewport - naturalWidth * scale) / 2 + (Number(offset?.x) || 0);
  const top = (viewport - naturalHeight * scale) / 2 + (Number(offset?.y) || 0);
  const sourceSize = viewport / scale;
  const sx = Math.min(Math.max(0, (0 - left) / scale), Math.max(0, naturalWidth - sourceSize));
  const sy = Math.min(Math.max(0, (0 - top) / scale), Math.max(0, naturalHeight - sourceSize));

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((next) => {
      if (!next) reject(new Error('Could not crop the photo.'));
      else resolve(next);
    }, 'image/jpeg', 0.92);
  });

  return new File([blob], `profile-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
