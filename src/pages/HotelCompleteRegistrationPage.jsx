import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi } from '../lib/api';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
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
            'Hotel registration completed. Login with your email and password.',
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
            Hotel Owner Registration
          </h1>
          <p className="text-gray-600 mb-6">
            Use the name and email given by admin, then set your password.
          </p>
          {(form.name || form.email) && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-900 rounded-lg text-sm">
              Admin details were filled in for you. Create your password to finish hotel account setup.
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
              placeholder="Owner Name (given by admin)"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
            <input
              type="email"
              required
              placeholder="Hotel Email (given by admin)"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
            <input
              type="password"
              required
              placeholder="Create Password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            />
            <input
              type="password"
              required
              placeholder="Confirm Password"
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
              {loading ? 'Submitting...' : 'Complete Registration'}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-4">
            Already completed?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
