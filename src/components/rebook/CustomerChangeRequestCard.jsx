import { useState } from 'react';
import { getAuthData, rebookApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

export default function CustomerChangeRequestCard({ booking, open, onClose, onSubmitted, defaultType = 'rebook' }) {
  const { language } = useLanguage();
  const [requestType, setRequestType] = useState(defaultType);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError(t('rebook.explainWhy', language));
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await rebookApi.createRequest(getAuthData()?.token, {
        originalBookingId: booking._id,
        requestType,
        reason: reason.trim(),
      });
      setSuccess(response.message);
      setReason('');
      onSubmitted?.(response.request);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-left">
      <h4 className="font-black text-slate-950">{t('rebook.needChange', language)}</h4>
      <p className="mt-1 text-sm text-slate-600">{t('rebook.needChangeLead', language)}</p>
      <div className="mt-4 flex gap-2">
        {['rebook', 'cancel'].map((type) => (
          <button key={type} type="button" onClick={() => setRequestType(type)} className={`rounded-lg border px-4 py-2 text-sm font-bold ${requestType === type ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            {type === 'rebook' ? t('rebook.rebook', language) : t('rebook.cancel', language)}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-bold text-slate-700">{t('rebook.reason', language)}
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={1500} required placeholder={t('rebook.reasonPlaceholder', language)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-primary" />
      </label>
      <p className="mt-1 text-xs text-slate-500">{t('rebook.submitBefore', language)}</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {success && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p>}
      <div className="mt-4 flex gap-2">
        <button disabled={saving || Boolean(success)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? t('submitting', language) : t('rebook.submitRequest', language)}</button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">{t('close', language)}</button>
      </div>
    </form>
  );
}
