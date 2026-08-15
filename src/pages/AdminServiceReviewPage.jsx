import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ServiceDetailsView from '../components/ServiceDetailsView';
import { useAuth } from '../context/AuthContext';
import { adminApi, getAuthData } from '../lib/api';
import { serviceApprovalStatus } from '../lib/dashboard';

export default function AdminServiceReviewPage() {
  const { user } = useAuth();
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const token = getAuthData()?.token;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const loadService = async ({ silent = false } = {}) => {
    if (!token || !serviceId) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await adminApi.getService(token, serviceId);
      setService(response.service || response);
    } catch (requestError) {
      setError(requestError.message);
      setService(null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    Promise.resolve().then(() => loadService());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, serviceId, token]);

  const review = async (status) => {
    if (!token || !serviceId) return;
    setSaving(true);
    setError('');
    setInfo('');
    try {
      const response = await adminApi.updateServiceApproval(token, serviceId, { status });
      setInfo(response.message || (status === 'approved' ? 'Service approved.' : 'Service rejected.'));
      await loadService({ silent: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'admin') return null;
  const approval = serviceApprovalStatus(service);
  const missing = service?.review?.missing || [];

  return (
    <DashboardLayout>
      <main className="py-6 sm:py-8">
        <div className="mx-auto max-w-5xl px-4">
          <button type="button" onClick={() => navigate('/admin-dashboard/services')} className="text-sm font-semibold text-primary">
            Back to services
          </button>
          <div className="mt-3 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{service?.title || service?.name || 'Service details'}</h1>
            <p className="text-gray-600">Review the listing as the provider submitted it. Admin can only approve or reject.</p>
          </div>
          {(error || info) && (
            <div className="mb-4 space-y-2">
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              {info && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{info}</p>}
            </div>
          )}
          {loading ? (
            <p className="rounded-2xl bg-white p-6 text-slate-600">Loading service details...</p>
          ) : !service ? (
            <p className="rounded-2xl bg-white p-6 text-slate-600">This service could not be loaded.</p>
          ) : (
            <div className="space-y-5">
              {missing.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Missing before a clean approval</p>
                  <p className="mt-1">{missing.join(', ')}</p>
                </div>
              )}
              <ServiceDetailsView service={service} />
              <div className="sticky bottom-4 flex flex-wrap justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <button type="button" disabled={saving || approval === 'rejected'} onClick={() => review('rejected')} className="rounded-xl bg-red-50 px-5 py-3 text-sm font-black text-red-700 disabled:opacity-50">
                  Reject
                </button>
                <button type="button" disabled={saving || approval === 'approved'} onClick={() => review('approved')} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                  Approve
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
