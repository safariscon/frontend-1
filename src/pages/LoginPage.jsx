import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getPostAuthRoute, getSafeRedirectPath, needsTermsAcceptance, withQueryParam } from '../lib/dashboard';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const DEFAULT_OTP_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 30;

const formatCountdown = (totalSeconds) => {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function LoginPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const safeRedirect = withQueryParam(
    getSafeRedirectPath(searchParams.get('redirect') || searchParams.get('next')),
    'bookingId',
    searchParams.get('bookingId'),
  );
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [step, setStep] = useState('credentials');
  const [otp, setOtp] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(DEFAULT_OTP_MINUTES * 60);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { login, verifyLoginOtp, resendLoginOtp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(location.state?.message || '');
  const { language } = useLanguage();

  useEffect(() => {
    if (!user) return;
    if (needsTermsAcceptance(user)) {
      navigate('/terms', { replace: true, state: { requireAcceptance: true, afterRedirect: safeRedirect } });
      return;
    }
    navigate(safeRedirect || getPostAuthRoute(user), { replace: true, state: { requireAcceptance: true } });
  }, [user, navigate, safeRedirect]);

  useEffect(() => {
    if (step !== 'otp') return undefined;
    const timer = window.setInterval(() => {
      setOtpSecondsLeft((value) => (value > 0 ? value - 1 : 0));
      setResendSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  const startOtpStep = (expiresInMinutes, nextMessage = '') => {
    setStep('otp');
    setOtp('');
    setOtpSecondsLeft(Math.max(1, expiresInMinutes || DEFAULT_OTP_MINUTES) * 60);
    setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    setMessage(nextMessage);
  };

  const handleUnverifiedEmail = (resultEmail, resultError) => {
    navigate('/verify-email', {
      state: {
        email: resultEmail || email,
        message: resultError || 'Please verify your email before logging in.',
        loginSearch: searchParams.toString(),
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await login(email, password, rememberMe);
    if (!result.success) {
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        handleUnverifiedEmail(result.payload?.email, result.error);
      } else {
        setError(result.error);
      }
    } else if (result.requiresOtp) {
      startOtpStep(result.expiresInMinutes, result.message || '');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await verifyLoginOtp(email.trim(), otp.trim(), rememberMe);
    if (!result.success) {
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        handleUnverifiedEmail(result.payload?.email, result.error);
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resending || resendSecondsLeft > 0 || !email.trim()) return;
    setError('');
    setResending(true);

    const result = await resendLoginOtp(email.trim());
    if (result.success) {
      startOtpStep(result.expiresInMinutes, result.message || t('loginOtpResent', language));
    } else if (result.code === 'EMAIL_NOT_VERIFIED') {
      handleUnverifiedEmail(result.payload?.email, result.error);
    } else {
      setError(result.error);
    }
    setResending(false);
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtp('');
    setError('');
    setMessage('');
    setOtpSecondsLeft(DEFAULT_OTP_MINUTES * 60);
    setResendSecondsLeft(0);
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm font-semibold text-slate-600">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              {step === 'otp' ? (
                <>
                  <p className="text-sm font-bold uppercase tracking-wider text-primary">{t('loginOtpLabel', language)}</p>
                  <h1 className="mt-2 text-3xl font-bold text-gray-900">{t('enterLoginCode', language)}</h1>
                  <p className="mt-2 text-gray-600">{t('loginOtpSent', language).replace('{email}', email)}</p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('welcomeBack', language)}</h1>
                  <p className="text-gray-600">{t('signInAccount', language)}</p>
                </>
              )}
            </div>

            {step === 'otp' ? (
              <form onSubmit={handleVerifyOtp}>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('loginCode', language)}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    minLength={6}
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="123456"
                  />
                </div>

                <p className={`mb-6 text-center text-sm ${otpSecondsLeft === 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {otpSecondsLeft === 0
                    ? t('loginOtpExpired', language)
                    : t('loginOtpExpiresIn', language).replace('{time}', formatCountdown(otpSecondsLeft))}
                </p>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || otpSecondsLeft === 0}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {loading ? t('verifying', language) : t('verifyAndSignIn', language)}
                </button>

                <div className="mt-6 flex flex-col gap-3 text-center text-sm">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending || resendSecondsLeft > 0 || !email.trim()}
                    className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resending
                      ? t('sendingCode', language)
                      : resendSecondsLeft > 0
                        ? t('resendCodeIn', language).replace('{time}', formatCountdown(resendSecondsLeft))
                        : t('resendCode', language)}
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    className="text-gray-600 hover:text-primary"
                  >
                    {t('useDifferentAccount', language)}
                  </button>
                </div>
              </form>
            ) : (
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
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="login-password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-6 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>
                      {t('rememberMe', language)}
                      <span className="block text-xs text-gray-500">
                        {rememberMe ? t('rememberMeOnHint', language) : t('rememberMeOffHint', language)}
                      </span>
                    </span>
                  </label>
                  <Link to="/forgot-password" className="shrink-0 text-sm font-medium text-primary hover:underline">
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
            )}

            {step === 'credentials' && (
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
                <p className="text-gray-600 mt-2 text-xs">
                  By creating an account you agree to our{' '}
                  <Link to="/terms" className="text-primary hover:underline font-medium">Terms</Link> and{' '}
                  <Link to="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
