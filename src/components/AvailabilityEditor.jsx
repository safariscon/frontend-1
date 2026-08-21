import { DAY_OPTIONS } from '../lib/availability';

const EMPTY = {
  isAnytime: false,
  windowStartDate: '',
  windowEndDate: '',
  daysOfWeek: [],
  dayStartTime: '',
  dayEndTime: '',
  capacityTotal: 1,
  trackCapacity: true,
};

export default function AvailabilityEditor({
  value = EMPTY,
  onChange,
  modes = { dateWindow: true, daysOfWeek: true, timeOfDay: true },
  trackCapacity = true,
  title = 'Availability',
}) {
  const form = { ...EMPTY, ...value };
  const set = (patch) => onChange({ ...form, ...patch });

  const toggleDay = (key) => {
    const current = Array.isArray(form.daysOfWeek) ? form.daysOfWeek : [];
    const next = current.includes(key)
      ? current.filter((day) => day !== key)
      : [...current, key];
    set({ daysOfWeek: next });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">
        When customers can consume this service/option. Empty date/day/time means unrestricted for that part.
      </p>

      <label className="mt-4 flex items-start gap-2 text-sm font-semibold text-slate-800">
        <input
          type="checkbox"
          className="mt-1"
          checked={Boolean(form.isAnytime)}
          onChange={(event) => set({ isAnytime: event.target.checked })}
        />
        Available anytime (no date / day / time limits)
      </label>

      {!form.isAnytime && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {modes.dateWindow !== false && (
            <>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Available from</span>
                <input
                  type="date"
                  value={form.windowStartDate || ''}
                  onChange={(event) => set({ windowStartDate: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Available until</span>
                <input
                  type="date"
                  value={form.windowEndDate || ''}
                  onChange={(event) => set({ windowEndDate: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>
            </>
          )}

          {modes.timeOfDay !== false && (
            <>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Open time</span>
                <input
                  type="time"
                  value={form.dayStartTime || ''}
                  onChange={(event) => set({ dayStartTime: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Close time</span>
                <input
                  type="time"
                  value={form.dayEndTime || ''}
                  onChange={(event) => set({ dayEndTime: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </label>
            </>
          )}

          {modes.daysOfWeek !== false && (
            <div className="md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Available days</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(DAY_OPTIONS || [
                  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
                ]).map((entry) => {
                  const key = Array.isArray(entry) ? entry[0] : entry.key;
                  const label = Array.isArray(entry) ? entry[1] : entry.label;
                  const selected = (form.daysOfWeek || []).includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDay(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold ${selected ? 'bg-primary text-white' : 'border border-slate-200 text-slate-700'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500">Leave all unselected = every day.</p>
            </div>
          )}
        </div>
      )}

      {trackCapacity && (
        <label className="mt-4 block max-w-xs">
          <span className="text-sm font-semibold text-slate-700">Capacity (rooms / units)</span>
          <input
            type="number"
            min="0"
            value={form.capacityTotal ?? 1}
            onChange={(event) => set({ capacityTotal: Number(event.target.value) })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
          />
          {form.capacityRemaining != null && (
            <span className="mt-1 block text-xs text-slate-500">Remaining after paid bookings: {form.capacityRemaining}</span>
          )}
        </label>
      )}
    </div>
  );
}
