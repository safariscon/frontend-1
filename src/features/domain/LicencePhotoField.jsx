import { useRef, useState } from 'react';
import { authApi, getAuthData } from '../../lib/api';
import { MAX_UPLOAD_FILE_SIZE_MB, isUploadWithinLimit } from '../../lib/uploads';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

/**
 * Single licence / permit photo. Uploads immediately so the booking payload
 * only ever carries a URL, never a File.
 */
export default function LicencePhotoField({ label, help, required, value, error, onChange }) {
  const inputRef = useRef(null);
  const { language } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setUploadError(t('domain.transport.licence.imageOnly', language));
      return;
    }
    if (!isUploadWithinLimit(file)) {
      setUploadError(t('booking.maxFileSize', language, { n: MAX_UPLOAD_FILE_SIZE_MB }));
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const response = await authApi.uploadDocuments(getAuthData()?.token, [file]);
      const url = response?.urls?.[0] || response?.images?.[0]?.url || '';
      if (!url) throw new Error(t('domain.transport.licence.uploadFailed', language));
      onChange(url);
    } catch (requestError) {
      setUploadError(requestError.message || t('domain.transport.licence.uploadFailed', language));
    } finally {
      setUploading(false);
    }
  };

  const shownError = uploadError || error;

  return (
    <div className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <div className="mt-1 rounded-xl border border-slate-300 bg-white p-3">
        {value ? (
          <img src={value} alt={label} className="h-32 w-full rounded-lg object-cover" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400">
            {t('domain.transport.licence.noPhoto', language)}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {uploading
              ? t('domain.transport.licence.uploading', language)
              : (value ? t('domain.transport.licence.replace', language) : t('domain.transport.licence.upload', language))}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {t('domain.transport.licence.remove', language)}
            </button>
          ) : null}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
      {help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null}
      {shownError ? <p className="mt-1 text-xs font-semibold text-red-600">{shownError}</p> : null}
    </div>
  );
}
