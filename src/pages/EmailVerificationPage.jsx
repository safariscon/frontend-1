import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getPostAuthRoute } from '../lib/dashboard';
import SeoHead from '../components/SeoHead';
import { noindexSeo } from '../lib/seo';

export default function EmailVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, verifyEmailOtp, resendEmailVerificationOtp } = useAuth();
  const [email, setEmail] = useState(location.state?.email || user?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user?.emailVerified) {
      navigate(getPostAuthRoute(user), { replace: true, state: { requireAcceptance: true } });
    }
  }, [navigate, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = await verifyEmailOtp(email.trim(), otp.trim());
    if (result.success) {
      navigate(getPostAuthRoute(result.user), { replace: true, state: { requireAcceptance: true } });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setResending(true);

    const result = await resendEmailVerificationOtp(email.trim());
    if (result.success) {
      if (result.emailVerified) {
        navigate('/login', {
          replace: true,
          state: { email, message: result.message || 'Email is already verified. Please sign in.' },
        });
      } else {
        setMessage(result.message || 'Verification code sent.');
      }
    } else {
      setError(result.error);
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SeoHead
        {...noindexSeo({
          title: 'Verify email | SafarisCon',
          description: 'Enter the email verification code to activate your SafarisCon account.',
          path: '/verify-email',
        })}
      />
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Email verification</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Enter your code</h1>
            <p className="mt-2 text-gray-600">We sent a one-time code to your email address.</p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
                minLength={4}
                maxLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-primary focus:border-primary transition"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify email'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center text-sm">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email.trim()}
              className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Send a new code'}
            </button>
            <Link to={location.state?.loginSearch ? `/login?${location.state.loginSearch}` : '/login'} className="text-gray-600 hover:text-primary">
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
