import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ServiceDetailsView from '../components/ServiceDetailsView';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { adminApi, getAuthData } from '../lib/api';
import { serviceApprovalStatus } from '../lib/dashboard';
import { t } from '../lib/translations';

export default function AdminServiceReviewPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const toast = useToast();
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const token = getAuthData()?.token;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [terms, setTerms] = useState({
    cancelWindowHours: 6,
    cancelPenaltyPercent: 20,
    platformCommissionPercent: 10,
    notes: '',
    reason: '',
  });

  const loadService = async ({ silent = false } = {}) => {
    if (!token || !serviceId) return;
    if (!silent) setLoading(true);
    try {
      const response = await adminApi.getService(token, serviceId);
      const next = response.service || response;
      setService(next);
      setTerms((prev) => ({
        ...prev,
        cancelWindowHours: Number(next.cancelWindowHours ?? next.agreementTerms?.cancelWindowHours ?? 6),
        cancelPenaltyPercent: Number(next.cancelPenaltyPercent ?? next.agreementTerms?.cancelPenaltyPercent ?? 20),
        platformCommissionPercent: Number(next.platformCommissionPercent ?? next.commissionPercentage ?? 10),
        notes: next.agreementTerms?.notes || '',
      }));
    } catch (requestError) {
      toast.error(requestError.message);
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
    if (status === 'approved') {
      if (!(Number(terms.cancelPenaltyPercent) >= 0) || !(Number(terms.platformCommissionPercent) >= 0)) {
        toast.error('Cancel penalty % and platform commission % are required to approve.');
        return;
      }
    }
    if (status === 'rejected' && !terms.reason.trim()) {
      toast.error('Add a rejection reason.');
      return;
    }
    setSaving(true);
    try {
      const payload = status === 'approved'
        ? {
            status: 'approved',
            cancelWindowHours: Number(terms.cancelWindowHours),
            cancelPenaltyPercent: Number(terms.cancelPenaltyPercent),
            platformCommissionPercent: Number(terms.platformCommissionPercent),
            notes: terms.notes.trim(),
          }
        : { status: 'rejected', reason: terms.reason.trim() };
      const response = await adminApi.updateServiceApproval(token, serviceId, payload);
      toast.success(response.message || (status === 'approved' ? t('admin.approved', language) : t('admin.rejected', language)));
      await loadService({ silent: true });
    } catch (requestError) {
      toast.error(requestError.message);
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
            {t('admin.backToServices', language)}
          </button>
          <div className="mt-3 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{service?.title || service?.name || t('admin.serviceDetails', language)}</h1>
            <p className="text-gray-600">{t('admin.reviewLead', language)}</p>
          </div>
          {loading ? (
            <p className="rounded-2xl bg-white p-6 text-slate-600">{t('admin.loadingService', language)}</p>
          ) : !service ? (
            <p className="rounded-2xl bg-white p-6 text-slate-600">{t('admin.loadFailed', language)}</p>
          ) : (
            <div className="space-y-5">
              {missing.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">{t('admin.missingApproval', language)}</p>
                  <p className="mt-1">{missing.join(', ')}</p>
                </div>
              )}
              <ServiceDetailsView service={service} showPrivateFields />

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">Agreement terms (set on approval)</h2>
                <p className="mt-1 text-sm text-slate-600">Cancel penalty and platform commission come from the signed agreement — not from the seller form.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Cancel window (hours)</span>
                    <input type="number" min="0" value={terms.cancelWindowHours} onChange={(event) => setTerms((prev) => ({ ...prev, cancelWindowHours: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Cancel penalty %</span>
                    <input type="number" min="0" max="100" value={terms.cancelPenaltyPercent} onChange={(event) => setTerms((prev) => ({ ...prev, cancelPenaltyPercent: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Platform commission %</span>
                    <input type="number" min="0" max="100" value={terms.platformCommissionPercent} onChange={(event) => setTerms((prev) => ({ ...prev, platformCommissionPercent: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </label>
                  <label className="block md:col-span-3">
                    <span className="text-sm font-semibold text-slate-700">Approval notes</span>
                    <textarea rows={2} value={terms.notes} onChange={(event) => setTerms((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Agreement reference, special terms…" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </label>
                  <label className="block md:col-span-3">
                    <span className="text-sm font-semibold text-slate-700">Rejection reason</span>
                    <input value={terms.reason} onChange={(event) => setTerms((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Required when rejecting" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </label>
                </div>
              </section>

              <div className="sticky bottom-4 flex flex-wrap justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <button type="button" disabled={saving || approval === 'rejected'} onClick={() => review('rejected')} className="rounded-xl bg-red-50 px-5 py-3 text-sm font-black text-red-700 disabled:opacity-50">
                  {t('admin.reject', language)}
                </button>
                <button type="button" disabled={saving || approval === 'approved'} onClick={() => review('approved')} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                  {t('admin.approve', language)}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
