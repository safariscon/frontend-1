import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute } from '../lib/dashboard';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, user } = useAuth();
    const navigate = useNavigate();
    const { language } = useLanguage();

   useEffect(() => {
     if (user) {
       navigate(getDashboardRoute(user));
     }
   }, [user, navigate]);

   const handleChange = (e) => {
     if (e.target.name === 'role') return;
     setFormData({ ...formData, [e.target.name]: e.target.value });
   };

   const handleSubmit = async (e) => {
     e.preventDefault();
     setError('');

     if (formData.password !== formData.confirmPassword) {
       setError(t('passwordMismatch', language));
       return;
     }
     if (formData.password.length < 6) {
       setError(t('passwordMinLength', language));
       return;
     }

     setLoading(true);
     const result = await register({
       name: formData.name,
       email: formData.email,
       password: formData.password,
       role: formData.role,
     });

     if (!result.success) {
       setError(result.error);
     } else {
       navigate('/login', {
         state: { message: 'Account created successfully. Please login.' },
       });
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('createAccount', language)}</h1>
                <p className="text-gray-600">{t('joinToday', language)}</p>
              </div>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Customers can register here. Business owners use /business-register. */}
                <div className="mb-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className={`flex items-center justify-center p-3 border-2 rounded-xl bg-primary bg-opacity-5 border-primary`}>
                      <div className="text-center">
                        <svg className="w-6 h-6 mx-auto mb-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{t('traveler', language)}</span>
                        <p className="text-xs text-gray-500 mt-1">{t('hotelsRegistered', language)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fullName', language)}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="John Doe"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('email', language)}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('password', language)}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="••••••••"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('confirmPassword', language)}
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {loading ? `${t('createAccountBtn', language)}...` : t('createAccountBtn', language)}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  {t('haveAccount', language)}{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    {t('signInLink', language)}
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
