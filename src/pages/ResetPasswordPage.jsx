import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi } from '../lib/api';
import PasswordInput from '../components/PasswordInput';
import SeoHead from '../components/SeoHead';
import { noindexSeo } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch', language));
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.resetPassword(email.trim(), otp.trim(), newPassword);
      navigate('/login', {
        replace: true,
        state: {
          email: email.trim(),
          message: result.message || t('passwordResetSuccess', language),
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
      <SeoHead
        {...noindexSeo({
          title: t('seo.resetTitle', language),
          description: t('seo.resetDescription', language),
          path: '/reset-password',
        })}
      />
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('resetPassword', language)}</h1>
            <p className="text-gray-600">{t('resetPasswordLead', language)}</p>
          </div>

          {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>}
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
              placeholder="your@email.com"
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-primary focus:border-primary transition"
              placeholder="123456"
            />
            <PasswordInput
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              inputClassName="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
              placeholder={t('newPassword', language)}
            />
            <PasswordInput
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              inputClassName="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
              placeholder={t('confirmNewPassword', language)}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading ? t('resetting', language) : t('resetPassword', language)}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t('needNewCode', language)}{' '}
            <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
              {t('requestAnother', language)}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
