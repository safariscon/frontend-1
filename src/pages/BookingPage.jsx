import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingForm from '../components/BookingForm';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function BookingPage() {
   const { hotelId } = useParams();
   const navigate = useNavigate();
   const { user } = useAuth();
   const [step] = useState(1);
   const { language } = useLanguage();

   const handleBookingSuccess = () => {
     alert(t('bookingSuccess', language));
     navigate('/dashboard');
   };

   if (!user) {
     return (
       <div className="min-h-screen flex flex-col">
         <Navbar />
         <main className="flex-1 flex items-center justify-center">
           <div className="text-center p-8">
             <h2 className="text-2xl font-bold mb-4">{t('pleaseLoginToBook', language)}</h2>
             <button
               onClick={() => navigate('/login')}
               className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
             >
               {t('goLogin', language)}
             </button>
           </div>
         </main>
         <Footer />
       </div>
     );
   }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                    step >= s
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 md:w-24 h-1 transition ${
                      step > s ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

<div className="text-center mb-8">
           <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('completeBooking', language)}</h1>
           <p className="text-gray-600">
             {step === 1 && (t('selectServiceAndDate', language) || 'Enter service details and date.')}
             {step === 2 && t('reviewDetails', language)}
             {step === 3 && t('paymentComingSoon', language)}
           </p>
         </div>

          <BookingForm
            hotelId={hotelId}
            onClose={() => navigate(-1)}
            onSuccess={handleBookingSuccess}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
