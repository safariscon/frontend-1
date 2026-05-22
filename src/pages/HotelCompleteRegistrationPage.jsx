import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function HotelCompleteRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const [form, setForm] = useState({
    name: location.state?.ownerName || searchParams.get('name') || '',
    email: location.state?.hotelEmail || searchParams.get('email') || '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { language } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError(t('passwordMismatch', language));
      return;
    }

    setLoading(true);
    try {
      await authApi.completeHotelRegistration({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      navigate('/login', {
        state: {
          message:
            t('hotelRegistrationCompleted', language),
          email: form.email,
        },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('hotelOwnerRegistration', language)}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('hotelOwnerInstructions', language)}
          </p>
          {(form.name || form.email) && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-900 rounded-lg text-sm">
              {t('adminDetailsFilled', language)}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              required
              placeholder={t('ownerNameGiven', language)}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
            <input
              type="email"
              required
              placeholder={t('hotelEmailGiven', language)}
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
            <input
              type="password"
              required
              placeholder={t('createPassword', language)}
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
            <input
              type="password"
              required
              placeholder={t('confirmPassword', language)}
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? t('submitting', language) : t('completeRegistration', language)}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-4">
            {t('alreadyCompleted', language)}{' '}
            <Link to="/login" className="text-primary hover:underline">
              {t('loginHere', language)}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
