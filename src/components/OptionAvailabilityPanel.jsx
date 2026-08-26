import { useEffect, useState } from 'react';
import AvailabilityEditor from './AvailabilityEditor';
import OccupancyBlocksEditor from './OccupancyBlocksEditor';
import { hotelApi } from '../lib/api';

const EMPTY_AVAILABILITY = {
  isAnytime: false,
  windowStartDate: '',
  windowEndDate: '',
  daysOfWeek: [],
  dayStartTime: '',
  dayEndTime: '',
  capacityTotal: 1,
};

export default function OptionAvailabilityPanel({
  token,
  serviceId,
  optionId,
  stayMode = false,
  quantity = 1,
  availabilityPolicy = null,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_AVAILABILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !serviceId || !optionId) return undefined;
    let cancelled = false;
    hotelApi.getServiceAvailability(token, serviceId, optionId)
      .then((response) => {
        if (cancelled) return;
        setForm(response.availability || EMPTY_AVAILABILITY);
        setError('');
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setForm({ ...EMPTY_AVAILABILITY, capacityTotal: Math.max(1, Number(quantity) || 1) });
        setError(loadError.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token, serviceId, optionId, quantity]);

  const save = async (event) => {
    event?.preventDefault?.();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = stayMode
        ? {
            ...form,
            daysOfWeek: [],
            dayStartTime: '',
            dayEndTime: '',
            capacityTotal: Number(form.capacityTotal || quantity || 1),
          }
        : form;
      const response = await hotelApi.saveOptionAvailability(token, serviceId, optionId, payload);
      setMessage(response.message || 'Availability saved.');
      if (response.availability) setForm(response.availability);
      onSaved?.(response);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="mt-3 text-sm text-slate-500">Loading availability…</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      <AvailabilityEditor
        title={stayMode ? 'Open calendar for this room / option' : 'When this option can be booked'}
        value={form}
        onChange={setForm}
        stayMode={stayMode}
        modes={stayMode ? { dateWindow: true, daysOfWeek: false, timeOfDay: false } : availabilityPolicy?.modes}
        trackCapacity={!stayMode && availabilityPolicy?.trackCapacity !== false}
      />
      {stayMode ? (
        <OccupancyBlocksEditor
          token={token}
          serviceId={serviceId}
          optionId={optionId}
          quantity={quantity}
        />
      ) : null}
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {saving ? 'Saving dates…' : 'Save availability'}
      </button>
    </div>
  );
}
