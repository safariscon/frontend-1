import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const EMPTY_NOTIFICATIONS = [];

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [navigate, user]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Inbox</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Notifications</h1>
          <p className="mt-2 text-sm text-slate-600">Booking and payout alerts will appear here. This list is empty until we connect live notification data.</p>
          {!EMPTY_NOTIFICATIONS.length && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-black text-slate-900">No notifications yet</p>
              <p className="mt-2 text-sm text-slate-600">When a booking, payout, or account update needs your attention, it will show in this dashboard section.</p>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
