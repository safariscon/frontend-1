import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute } from '../lib/dashboard';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(location.state?.message || '');
  const { language } = useLanguage();

  useEffect(() => {
    if (user) {
      navigate(getDashboardRoute(user));
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      if (result.status === 403 && result.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', {
          state: {
            email: result.payload?.email || email,
            message: result.error || 'Please verify your email before logging in.',
          },
        });
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('welcomeBack', language)}</h1>
              <p className="text-gray-600">{t('signInAccount', language)}</p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  {message}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('email', language)}</label>
                <input
                  type="email"
                  name="login-email"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder="your@email.com"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('password', language)}</label>
                <PasswordInput
                  name="login-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  inputClassName="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder="********"
                />
              </div>

              <div className="mb-6 text-right">
                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

<button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50"
              >
                {loading ? t('signIn', language) + '...' : t('signIn', language)}
            </button>
             </form>

             <div className="mt-6 text-center">
               <p className="text-gray-600">
                 {t('noAccount', language)}{' '}
                 <Link to="/register" className="text-primary hover:underline font-medium">
                   {t('signUp', language)}
                 </Link>
               </p>
               <p className="text-gray-600 mt-2 text-sm">
                 {t('providerOnboardingPrompt', language)}{' '}
                 <Link to="/provider-register" className="text-primary hover:underline font-medium">
                   {t('completeProviderRegistration', language)}
                 </Link>
               </p>
             </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
