import { useState } from 'react';
import { getAuthData, rebookApi } from '../../lib/api';

export default function CustomerChangeRequestCard({ booking, open, onClose, onSubmitted }) {
  const [requestType, setRequestType] = useState('rebook');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Please explain why you cannot attend.');
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
      <h4 className="font-black text-slate-950">Need to change this booking?</h4>
      <p className="mt-1 text-sm text-slate-600">Tell us why you cannot attend and choose re-book or cancel.</p>
      <div className="mt-4 flex gap-2">
        {['rebook', 'cancel'].map((type) => (
          <button key={type} type="button" onClick={() => setRequestType(type)} className={`rounded-lg border px-4 py-2 text-sm font-bold ${requestType === type ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
            {type === 'rebook' ? 'Re-book' : 'Cancel'}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-bold text-slate-700">Reason / message
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={1500} required placeholder="Please explain the reason and provide any details..." className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-primary" />
      </label>
      <p className="mt-1 text-xs text-slate-500">Submit before the allowed deadline. Re-book IDs are one-time use only.</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {success && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p>}
      <div className="mt-4 flex gap-2">
        <button disabled={saving || Boolean(success)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Submitting...' : 'Submit request'}</button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Close</button>
      </div>
    </form>
  );
}
