import { useEffect, useState } from 'react';
import { MAX_UPLOAD_FILE_SIZE_MB, filterImagesWithinLimit, isUploadWithinLimit } from '../lib/uploads';

const MAX_GALLERY = 5;

export default function ServiceImagesEditor({
  primaryImage = '',
  primaryImageFile = null,
  galleryImages = [],
  galleryFiles = [],
  onChange,
}) {
  const gallery = galleryImages.filter((url) => url && url !== primaryImage);

  const set = (patch) => onChange({
    primaryImage,
    primaryImageFile,
    galleryImages,
    galleryFiles,
    ...patch,
  });

  const rejectOversized = () => {
    window.alert(`Each image must be ${MAX_UPLOAD_FILE_SIZE_MB} MB or smaller.`);
  };

  return (
    <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="font-black text-slate-950">Cover photo</h3>
        <p className="mt-1 text-sm text-slate-600">Optional. Customers see this first on the services list. If empty, the first gallery photo is used. Max {MAX_UPLOAD_FILE_SIZE_MB} MB each.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {(primaryImage || primaryImageFile) ? (
            <div className="relative h-36 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <LocalPreview file={primaryImageFile} url={primaryImage} alt="Cover" />
              <button
                type="button"
                onClick={() => set({ primaryImage: '', primaryImageFile: null })}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-red-700 shadow"
                aria-label="Remove cover"
              >
                ×
              </button>
            </div>
          ) : null}
          <label className="flex h-36 w-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-3 text-center text-sm font-semibold text-slate-600 hover:border-primary hover:text-primary">
            <span>{primaryImage || primaryImageFile ? 'Replace cover' : 'Upload cover photo'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file || !file.type.startsWith('image/')) return;
                if (!isUploadWithinLimit(file)) {
                  rejectOversized();
                  return;
                }
                set({ primaryImageFile: file });
              }}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-black text-slate-950">Additional photos</h3>
        <p className="mt-1 text-sm text-slate-600">Optional. Up to {MAX_GALLERY} images for service details. Max {MAX_UPLOAD_FILE_SIZE_MB} MB each.</p>
        <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-primary">
          Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const picked = Array.from(event.target.files || []);
              event.target.value = '';
              const accepted = filterImagesWithinLimit(picked);
              if (accepted.length !== picked.filter((file) => file.type.startsWith('image/')).length) {
                rejectOversized();
              }
              const remaining = Math.max(0, MAX_GALLERY - gallery.length - galleryFiles.length);
              set({ galleryFiles: [...galleryFiles, ...accepted].slice(0, galleryFiles.length + remaining) });
            }}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {gallery.map((url) => (
            <div key={url} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img src={url} alt="Gallery" className="h-28 w-full object-cover" />
              <button
                type="button"
                onClick={() => set({ galleryImages: galleryImages.filter((item) => item !== url) })}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-red-700 shadow"
                aria-label="Remove photo"
              >
                ×
              </button>
              {!primaryImage && !primaryImageFile && (
                <button
                  type="button"
                  onClick={() => set({ primaryImage: url, primaryImageFile: null })}
                  className="absolute bottom-2 left-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold text-primary"
                >
                  Make cover
                </button>
              )}
            </div>
          ))}
          {galleryFiles.map((file) => (
            <div key={`${file.name}-${file.size}`} className="relative overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
              <LocalPreview file={file} alt={file.name} className="h-28 w-full object-cover" />
              <button
                type="button"
                onClick={() => set({ galleryFiles: galleryFiles.filter((item) => item !== file) })}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-red-700 shadow"
                aria-label="Remove new photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocalPreview({ file, url, alt, className = 'h-full w-full object-cover' }) {
  const [preview, setPreview] = useState(url || '');
  useEffect(() => {
    if (!file) {
      const timer = window.setTimeout(() => setPreview(url || ''), 0);
      return () => window.clearTimeout(timer);
    }
    const objectUrl = URL.createObjectURL(file);
    const timer = window.setTimeout(() => setPreview(objectUrl), 0);
    return () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, url]);
  if (!preview) return <div className={`grid place-items-center bg-slate-100 text-xs text-slate-500 ${className}`}>Preview</div>;
  return <img src={preview} alt={alt || 'Preview'} className={className} />;
}

export { MAX_GALLERY };
