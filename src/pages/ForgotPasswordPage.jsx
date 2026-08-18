import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi } from '../lib/api';
import SeoHead from '../components/SeoHead';
import { noindexSeo } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email.trim());
      navigate('/reset-password', {
        state: {
          email: email.trim(),
          message: t('resetCodeSent', language),
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
          title: t('seo.forgotTitle', language),
          description: t('seo.forgotDescription', language),
          path: '/forgot-password',
        })}
      />
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('forgotPassword', language)}</h1>
            <p className="text-gray-600">{t('forgotPasswordLead', language)}</p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('email', language)}</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading ? t('sending', language) : t('sendResetCode', language)}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t('rememberPassword', language)}{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {t('signInLink', language)}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
