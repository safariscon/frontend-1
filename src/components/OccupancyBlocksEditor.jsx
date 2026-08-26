import { useEffect, useState } from 'react';
import { hotelApi } from '../lib/api';

const EMPTY_FORM = { startDate: '', endDate: '', units: 1, note: '' };

export default function OccupancyBlocksEditor({ token, serviceId, optionId, quantity = 1, copy = null }) {
  const [blocks, setBlocks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM, units: Math.max(1, Number(quantity) || 1) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token || !serviceId || !optionId) return;
    try {
      const response = await hotelApi.listOptionBlocks(token, serviceId, optionId);
      setBlocks(response.blocks || []);
      setBookings(response.bookings || []);
      setForm((prev) => ({ ...prev, units: Math.max(1, Number(response.quantity || quantity || 1)) }));
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    if (!token || !serviceId || !optionId) return undefined;
    let cancelled = false;
    hotelApi.listOptionBlocks(token, serviceId, optionId)
      .then((response) => {
        if (cancelled) return;
        setBlocks(response.blocks || []);
        setBookings(response.bookings || []);
        setForm((prev) => ({ ...prev, units: Math.max(1, Number(response.quantity || quantity || 1)) }));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      });
    return () => { cancelled = true; };
  }, [token, serviceId, optionId, quantity]);

  const closeDates = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.startDate || !form.endDate || form.endDate <= form.startDate) {
      setError('Choose a start date and an available-again date after it.');
      return;
    }
    setSaving(true);
    try {
      await hotelApi.createOptionBlock(token, serviceId, optionId, {
        startDate: form.startDate,
        endDate: form.endDate,
        units: Number(form.units || 1),
        note: form.note,
      });
      setForm({ ...EMPTY_FORM, units: Math.max(1, Number(quantity) || 1) });
      await load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const reopen = async (blockId) => {
    if (!window.confirm('Open these dates for booking again?')) return;
    try {
      await hotelApi.deleteOptionBlock(token, serviceId, optionId, blockId);
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const units = Math.max(1, Number(quantity) || 1);
  const unitNoun = copy?.unitNoun || 'unit';
  const unitNounPlural = copy?.unitNounPlural || 'units';

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-black text-slate-950">{copy?.occupancyTitle || 'Occupied / closed dates'}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {copy?.occupancyHint || `This option has ${units} ${units === 1 ? 'unit' : 'units'}. Close a date range when a unit is occupied offline, under maintenance, or otherwise not bookable. Checkout morning is free: guests can check in on the “available again” date.`}
      </p>

      {bookings.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Bookings already holding {unitNounPlural}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {bookings.map((row, index) => (
              <li key={`${row.startDate}-${row.endDate}-${index}`}>
                {row.startDate} → {row.endDate} · {row.units || 1} {Number(row.units) === 1 ? unitNoun : unitNounPlural} · {row.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      {blocks.length > 0 && (
        <ul className="mt-3 space-y-2">
          {blocks.map((block) => (
            <li key={block.id || block._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm font-semibold text-slate-800">
                Closed {block.startDate} until {block.endDate}
                {block.units > 1 ? ` · ${block.units} ${unitNounPlural}` : ''}
                {block.note ? ` · ${block.note}` : ''}
              </span>
              <button type="button" onClick={() => reopen(block.id || block._id)} className="text-sm font-bold text-primary">
                Reopen
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={closeDates} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">{copy?.occupancyStartLabel || 'Occupied from'}</span>
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">{copy?.occupancyEndLabel || 'Available again on'}</span>
          <input
            type="date"
            min={form.startDate || undefined}
            value={form.endDate}
            onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">{copy?.occupancyUnitsLabel || 'Units to close'}</span>
          <input
            type="number"
            min="1"
            max={units}
            value={form.units}
            onChange={(event) => setForm((prev) => ({ ...prev, units: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Note (optional)</span>
          <input
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            placeholder={copy?.occupancyNotePlaceholder || 'Owner stay, maintenance…'}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>
        {error ? <p className="md:col-span-2 text-sm font-semibold text-red-600">{error}</p> : null}
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {saving ? 'Closing dates…' : 'Close these dates'}
          </button>
        </div>
      </form>
    </div>
  );
}
