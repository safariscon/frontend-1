import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import AvailabilityEditor from '../components/AvailabilityEditor';
import InventoryFields from '../features/domain/InventoryFields';
import { emptyInventoryValues, isStayCategory, resolveDomain, validateInventoryClient } from '../features/domain/registry';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { categoriesApi, getAuthData, hotelApi } from '../lib/api';
import { categorySupportsOptions } from '../lib/serviceSchema';
import { formatRwf } from '../lib/currency';
import { isSellerRole } from '../lib/dashboard';

const EMPTY_OPTION = {
  name: '',
  price: '',
  currency: 'RWF',
  attributes: {},
};

const EMPTY_AVAILABILITY = {
  isAnytime: false,
  windowStartDate: '',
  windowEndDate: '',
  daysOfWeek: [],
  dayStartTime: '',
  dayEndTime: '',
  capacityTotal: 1,
};

export default function SellerServiceOptionsPage() {
  const { serviceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const token = getAuthData()?.token;
  const [service, setService] = useState(null);
  const [options, setOptions] = useState([]);
  const [optionSchema, setOptionSchema] = useState([]);
  const [availabilityPolicy, setAvailabilityPolicy] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_OPTION);
  const [availabilityForm, setAvailabilityForm] = useState(EMPTY_AVAILABILITY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supportsOptions = categorySupportsOptions(
    service?.supportsOptions,
    service?.category?.supportsOptions,
    service?.schemaSnapshot?.supportsOptions
  );
  const editorHref = isStayCategory(service)
    ? `/dashboard/seller/stays/${serviceId}`
    : `/dashboard/seller/services/${serviceId}/edit`;
  const requireOptionAvailability = Boolean(availabilityPolicy?.optionRequiresAvailability);

  const load = async () => {
    if (!token || !serviceId) return;
    setLoading(true);
    try {
      const [serviceResp, optionsResp] = await Promise.all([
        hotelApi.getService(token, serviceId),
        hotelApi.getServiceOptions(token, serviceId),
      ]);
      const nextService = serviceResp.service || serviceResp;
      setService(nextService);
      setOptions(optionsResp.options || optionsResp || []);

      let schema = nextService?.schemaSnapshot?.optionFieldSchema
        || nextService?.category?.optionFieldSchema
        || [];
      const categoryKey = nextService.categoryId || nextService.category?._id || nextService.categorySlug;
      if ((!schema || !schema.length) && categoryKey) {
        const detail = await categoriesApi.get(categoryKey).catch(() => null);
        schema = detail?.category?.optionFieldSchema || [];
        setAvailabilityPolicy(detail?.category?.availabilityPolicy || null);
      } else if (categoryKey) {
        const detail = await categoriesApi.get(categoryKey).catch(() => null);
        setAvailabilityPolicy(
          detail?.category?.availabilityPolicy
          || nextService?.schemaSnapshot?.availabilityPolicy
          || null
        );
      }
      setOptionSchema(sortSchemaFields(schema));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return undefined;
    }
    if (!isSellerRole(user.role)) {
      navigate('/');
      return undefined;
    }
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, token, user]);

  const startCreate = () => {
    setEditingId('new');
    setForm({ ...EMPTY_OPTION, attributes: emptyInventoryValues(resolveDomain(service)) });
    setAvailabilityForm(EMPTY_AVAILABILITY);
    setErrors({});
  };

  const startEdit = async (option) => {
    setEditingId(option._id || option.id);
    setForm({
      ...EMPTY_OPTION,
      name: option.name || '',
      price: option.price ?? '',
      currency: option.currency || 'RWF',
      attributes: option.attributes || emptyInventoryValues(resolveDomain(service)),
    });
    setErrors({});
    try {
      const response = await hotelApi.getServiceAvailability(token, serviceId, option._id || option.id);
      setAvailabilityForm(response.availability || EMPTY_AVAILABILITY);
      if (response.availabilityPolicy) setAvailabilityPolicy(response.availabilityPolicy);
    } catch {
      setAvailabilityForm(EMPTY_AVAILABILITY);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !(Number(form.price) > 0)) {
      toast.error('Option name and price are required.');
      return;
    }
    const schemaErrors = validateInventoryClient(resolveDomain(service), form.attributes);
    setErrors(schemaErrors);
    if (Object.keys(schemaErrors).length) {
      toast.error('Fill required option fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        currency: form.currency || 'RWF',
        attributes: form.attributes || {},
      };
      const response = editingId === 'new'
        ? await hotelApi.createServiceOption(token, serviceId, payload)
        : await hotelApi.updateServiceOption(token, serviceId, editingId, payload);
      const optionId = response.option?._id || response.option?.id || (editingId !== 'new' ? editingId : null);
      if (optionId) {
        await hotelApi.saveOptionAvailability(token, serviceId, optionId, availabilityForm);
      }
      toast.success(response.message || 'Option saved.');
      setEditingId(null);
      setForm(EMPTY_OPTION);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (optionId) => {
    if (!window.confirm('Delete this option?')) return;
    try {
      const response = await hotelApi.deleteServiceOption(token, serviceId, optionId);
      toast.success(response.message || 'Option deleted.');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (!user || !isSellerRole(user.role)) return null;

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link to={editorHref} className="text-sm font-semibold text-primary">← Back to service</Link>
          <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-slate-950">Service options</h1>
              <p className="mt-1 text-sm text-slate-600">{service?.title || service?.name || 'Service'} — rooms, vehicles, or packages customers can book</p>
            </div>
            <div className="flex gap-2">
              <Link to={editorHref} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Edit service</Link>
              {supportsOptions && (
                <button type="button" onClick={startCreate} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">+ Add option</button>
              )}
            </div>
          </div>

          {loading ? <p className="rounded-2xl bg-white p-6 text-slate-600">Loading options…</p> : !supportsOptions ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
              <p className="font-black">This category does not use options</p>
              <p className="mt-1 text-sm">Set a base price on the service editor instead.</p>
              <Link to={editorHref} className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">Edit service</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {!options.length && !editingId && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="font-black text-slate-900">No options yet</p>
                  <p className="mt-1 text-sm text-slate-600">Add at least one active option before admin can approve this service.</p>
                  <button type="button" onClick={startCreate} className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Add option</button>
                </div>
              )}

              {options.map((option) => (
                <article key={option._id || option.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-950">{option.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{formatRwf(option.price)}</p>
                      {optionSchema.length > 0 && (
                        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                          {optionSchema.map((field) => {
                            const value = option.attributes?.[field.id];
                            if (value === undefined || value === null || String(value).trim() === '') return null;
                            return (
                              <div key={field.id} className="rounded-lg bg-slate-50 px-3 py-2">
                                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{field.label}</dt>
                                <dd className="mt-0.5 text-sm font-semibold text-slate-800">{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(option)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">Edit</button>
                      <button type="button" onClick={() => remove(option._id || option.id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Delete</button>
                    </div>
                  </div>
                </article>
              ))}

              {editingId && (
                <form onSubmit={save} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black text-slate-950">{editingId === 'new' ? 'Add option' : 'Edit option'}</h2>
                    <button type="button" onClick={() => setEditingId(null)} className="text-sm font-bold text-slate-600">Close</button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Option name *</span>
                      <input required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Example: Premium room" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Price (RWF) *</span>
                      <input required type="number" min="1" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} placeholder="85000" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
                    </label>
                  </div>
                  <div className="mt-4">
                    <InventoryFields
                      category={service}
                      values={form.attributes}
                      errors={errors}
                      onChange={(attributes) => setForm((prev) => ({ ...prev, attributes }))}
                    />
                  </div>
                  <div className="mt-4">
                    <AvailabilityEditor
                      title={requireOptionAvailability ? 'Option availability (required by admin)' : 'Option availability'}
                      value={availabilityForm}
                      onChange={setAvailabilityForm}
                      modes={availabilityPolicy?.modes}
                      trackCapacity={availabilityPolicy?.trackCapacity !== false}
                    />
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold">Cancel</button>
                    <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save option'}</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
