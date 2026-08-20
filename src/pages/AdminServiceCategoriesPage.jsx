import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi, getAuthData } from '../lib/api';

const EMPTY_FIELD = {
  id: '',
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  helpText: '',
  options: [],
  visibility: 'public',
  appliesTo: 'listing',
  sortOrder: 0,
};

const EMPTY_CATEGORY = {
  name: '',
  slug: '',
  group: '',
  description: '',
  supportsOptions: true,
  isActive: true,
  sortOrder: 0,
  defaults: { suggestedCancelWindowHours: 6 },
  listingFieldSchema: [],
  optionFieldSchema: [],
  bookingFieldSchema: [],
};

export default function AdminServiceCategoriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const token = getAuthData()?.token;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getServiceCategories(token);
      setCategories(response.categories || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return undefined;
    }
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const deactivate = async (categoryId) => {
    if (!window.confirm('Deactivate this category?')) return;
    try {
      await adminApi.deleteServiceCategory(token, categoryId);
      toast.success('Category deactivated.');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-slate-950">Service categories</h1>
              <p className="mt-1 text-sm text-slate-600">Define listing, option, and booking fields per category.</p>
            </div>
            <Link to="/admin-dashboard/service-categories/new" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">+ Add category</Link>
          </div>
          {loading ? <p className="rounded-2xl bg-white p-6">Loading…</p> : (
            <div className="grid gap-3">
              {categories.map((category) => (
                <article key={category._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <h2 className="font-black text-slate-950">{category.name}</h2>
                    <p className="text-sm text-slate-500">{category.group} · {category.slug} · {category.supportsOptions ? 'options enabled' : 'single price'} · {category.isActive === false ? 'inactive' : 'active'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/admin-dashboard/service-categories/${category._id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">Edit</Link>
                    <button type="button" onClick={() => deactivate(category._id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Deactivate</button>
                  </div>
                </article>
              ))}
              {!categories.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No categories yet. Seed backend or create one.</p>}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

export function AdminServiceCategoryEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new' || !id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const token = getAuthData()?.token;
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [tab, setTab] = useState('listing');
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const schemaKey = tab === 'listing' ? 'listingFieldSchema' : tab === 'option' ? 'optionFieldSchema' : 'bookingFieldSchema';
  const fields = form[schemaKey] || [];

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return undefined;
    }
    if (isNew) {
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadError('');
      adminApi.getServiceCategory(token, id).then((response) => {
        if (cancelled) return;
        const category = response.category || response;
        if (!category?._id && !category?.slug && !category?.name) {
          setLoadError('Category not found.');
          return;
        }
        setForm({ ...EMPTY_CATEGORY, ...category });
      }).catch((error) => {
        if (!cancelled) {
          setLoadError(error.message || 'Could not load category.');
          toast.error(error.message);
        }
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id, isNew, navigate, toast, token, user]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addField = () => {
    const next = {
      ...EMPTY_FIELD,
      id: `field_${Date.now()}`,
      label: 'New field',
      appliesTo: tab === 'booking' ? 'booking' : tab === 'option' ? 'option' : 'listing',
      sortOrder: fields.length + 1,
    };
    set(schemaKey, [...fields, next]);
  };

  const updateField = (fieldId, patch) => {
    set(schemaKey, fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)));
  };

  const removeField = (fieldId) => {
    set(schemaKey, fields.filter((field) => field.id !== fieldId));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        const response = await adminApi.createServiceCategory(token, form);
        toast.success(response.message || 'Category created.');
        const nextId = response.category?._id;
        navigate(nextId ? `/admin-dashboard/service-categories/${nextId}` : '/admin-dashboard/service-categories');
      } else {
        await adminApi.updateServiceCategory(token, id, {
          name: form.name,
          slug: form.slug,
          group: form.group,
          description: form.description,
          supportsOptions: form.supportsOptions,
          isActive: form.isActive,
          sortOrder: form.sortOrder,
          defaults: form.defaults,
        });
        await adminApi.updateServiceCategoryFields(token, id, {
          listingFieldSchema: form.listingFieldSchema,
          optionFieldSchema: form.optionFieldSchema,
          bookingFieldSchema: form.bookingFieldSchema,
        });
        toast.success('Category saved.');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link to="/admin-dashboard/service-categories" className="text-sm font-semibold text-primary">← Categories</Link>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{isNew ? 'New category' : 'Edit category'}</h1>
          {loading ? <p className="mt-6 rounded-2xl bg-white p-6">Loading…</p> : loadError ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
              <p className="font-bold">Could not open this category</p>
              <p className="mt-1 text-sm">{loadError}</p>
              <Link to="/admin-dashboard/service-categories" className="mt-4 inline-flex text-sm font-bold text-primary">← Back to categories</Link>
            </div>
          ) : (
            <form onSubmit={save} className="mt-6 space-y-5">
              <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2">
                <Field label="Name" value={form.name} onChange={(value) => set('name', value)} required />
                <Field label="Slug" value={form.slug} onChange={(value) => set('slug', value)} placeholder="car-rental" />
                <Field label="Group" value={form.group} onChange={(value) => set('group', value)} placeholder="Transport Services" />
                <Field label="Sort order" type="number" value={form.sortOrder} onChange={(value) => set('sortOrder', Number(value))} />
                <label className="flex items-center gap-3 md:col-span-2">
                  <input type="checkbox" checked={form.supportsOptions} onChange={(event) => set('supportsOptions', event.target.checked)} />
                  <span className="text-sm font-semibold">Supports options (rooms, packages, vehicle classes)</span>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Description</span>
                  <textarea rows={3} value={form.description || ''} onChange={(event) => set('description', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap gap-2">
                  {[['listing', 'Listing fields'], ['option', 'Option fields'], ['booking', 'Booking fields']].map(([tabId, label]) => (
                    <button key={tabId} type="button" onClick={() => setTab(tabId)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === tabId ? 'bg-primary text-white' : 'border border-slate-200 text-slate-700'}`}>{label}</button>
                  ))}
                  <button type="button" onClick={addField} className="ml-auto rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary">+ Add field</button>
                </div>
                {tab === 'option' && (
                  <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
                    <p className="font-bold">Built-in option fields (always available)</p>
                    <p className="mt-1">Sellers always enter <strong>Option name</strong> and <strong>Price (RWF)</strong>. Add only the extra fields you want below (for example Seats, Transmission). Those are the only extra fields shown on the option form and public option cards.</p>
                  </div>
                )}
                <div className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-4">
                      <input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} placeholder="Label" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <input value={field.id} onChange={(event) => updateField(field.id, { id: event.target.value })} placeholder="field_id" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
                      <select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                        {['text', 'textarea', 'number', 'tel', 'email', 'url', 'date', 'time', 'datetime-local', 'select', 'radio', 'checkbox', 'boolean', 'file'].map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                      <select value={field.visibility || 'public'} onChange={(event) => updateField(field.id, { visibility: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                        <option value="public">public</option>
                        <option value="after_payment">after_payment</option>
                        <option value="internal">internal</option>
                      </select>
                      <input value={field.placeholder || ''} onChange={(event) => updateField(field.id, { placeholder: event.target.value })} placeholder="Placeholder" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
                      <input value={(field.options || []).join(', ')} onChange={(event) => updateField(field.id, { options: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="Options (comma separated)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
                      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(field.id, { required: event.target.checked })} /> Required</label>
                      <button type="button" onClick={() => removeField(field.id)} className="justify-self-end text-sm font-bold text-red-700">Remove</button>
                    </div>
                  ))}
                  {!fields.length && <p className="text-sm text-slate-500">{tab === 'option' ? 'No extra option fields yet. Add fields sellers should fill for each package.' : 'No fields in this tab yet.'}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => navigate('/admin-dashboard/service-categories')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save category'}</button>
              </div>
            </form>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input required={required} type={type} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
    </label>
  );
}
