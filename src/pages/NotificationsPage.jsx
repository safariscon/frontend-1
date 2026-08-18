import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const EMPTY_NOTIFICATIONS = [];

export default function NotificationsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [navigate, user]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">{t('notificationsPage.inbox', language)}</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">{t('notificationsPage.title', language)}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('notificationsPage.lead', language)}</p>
          {!EMPTY_NOTIFICATIONS.length && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-black text-slate-900">{t('notificationsPage.empty', language)}</p>
              <p className="mt-2 text-sm text-slate-600">{t('notificationsPage.emptyLead', language)}</p>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
