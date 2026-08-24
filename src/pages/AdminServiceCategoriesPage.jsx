import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi, getAuthData } from '../lib/api';
import { categorySupportsOptions } from '../lib/serviceSchema';

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
    if (!window.confirm('Deactivate this category? Existing listings keep their domain, but new providers cannot select it.')) return;
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
          <div className="mb-6">
            <h1 className="text-3xl font-black text-slate-950">Service categories</h1>
            <p className="mt-1 text-sm text-slate-600">
              Categories are platform-defined. Listing, inventory, and booking contracts live in code — not in admin field builders.
            </p>
          </div>
          {loading ? <p className="rounded-2xl bg-white p-6">Loading…</p> : (
            <div className="grid gap-3">
              {categories.map((category) => (
                <article key={category._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <h2 className="font-black text-slate-950">{category.name}</h2>
                    <p className="text-sm text-slate-500">
                      {category.domainLabel || category.group} · {category.slug}
                      {' · '}
                      {categorySupportsOptions(category.supportsOptions) ? (category.inventoryLabelPlural || 'inventory') : 'single price'}
                      {' · '}
                      {category.isActive === false ? 'inactive' : 'active'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/admin-dashboard/service-categories/${category._id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">View</Link>
                    {category.isActive !== false ? (
                      <button type="button" onClick={() => deactivate(category._id)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Deactivate</button>
                    ) : null}
                  </div>
                </article>
              ))}
              {!categories.length && (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                  No categories yet. Restart the API so the platform catalog can seed.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

export function AdminServiceCategoryEditorPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const token = getAuthData()?.token;
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return undefined;
    }
    if (!id || id === 'new') {
      navigate('/admin-dashboard/service-categories', { replace: true });
      return undefined;
    }
    let cancelled = false;
    adminApi.getServiceCategory(token, id).then((response) => {
      if (cancelled) return;
      const next = response.category || response;
      setCategory(next);
      setIsActive(next.isActive !== false);
      setDescription(next.description || '');
    }).catch((error) => {
      if (!cancelled) toast.error(error.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, navigate, toast, token, user]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateServiceCategory(token, id, { isActive, description });
      toast.success('Category updated.');
      navigate('/admin-dashboard/service-categories');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') return null;

  const fields = [
    ['Listing', category?.listingFieldSchema],
    ['Inventory', category?.optionFieldSchema],
    ['Booking', category?.bookingFieldSchema],
  ];

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link to="/admin-dashboard/service-categories" className="text-sm font-semibold text-primary">← Back to categories</Link>
          <h1 className="mt-3 text-3xl font-black text-slate-950">{category?.name || 'Category'}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Domain {category?.domain || '—'} · subtype {category?.subtype || category?.slug}. Field contracts are read-only.
          </p>
          {loading ? <p className="mt-6 rounded-2xl bg-white p-6">Loading…</p> : (
            <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                <span className="text-sm font-semibold text-slate-700">Active for new listings</span>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Internal description</span>
                <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
              </label>
              {fields.map(([title, schema]) => (
                <section key={title} className="rounded-xl border border-slate-200 p-4">
                  <h2 className="font-black text-slate-950">{title} contract</h2>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(schema || []).map((field) => (
                      <li key={field.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-800">{field.label}</span>
                        <span className="ml-2 text-slate-500">{field.type}{field.required ? ' · required' : ''}</span>
                      </li>
                    ))}
                    {!(schema || []).length ? <li className="text-sm text-slate-500">No extra fields.</li> : null}
                  </ul>
                </section>
              ))}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => navigate('/admin-dashboard/service-categories')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
