import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { publicApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import SeoHead from '../components/SeoHead';
import { noindexSeo } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function VerificationPage() {
  const { token } = useParams();
  const { language } = useLanguage();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setResult(await publicApi.verifyBooking(token));
      } catch (requestError) {
        setError(requestError.message);
      }
    };
    load();
  }, [token]);

  const booking = result?.booking;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SeoHead
        {...noindexSeo({
          title: t('verify.seoTitle', language),
          description: t('verify.seoDescription', language),
          path: `/verify/${token || ''}`,
        })}
      />
      <Navbar />
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-3xl px-4">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <p className={`text-sm font-bold uppercase ${result?.verified ? 'text-green-700' : 'text-red-700'}`}>
              {result ? (result.verified ? t('verify.verified', language) : result.result || t('verify.invalid', language)) : t('verify.checking', language)}
            </p>
            <h1 className="mt-2 text-3xl font-black text-gray-950">{t('verify.title', language)}</h1>
            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{t('verify.invalidPrefix', language, { error })}</p>}
            {booking && (
              <dl className="mt-6 grid gap-4 md:grid-cols-2">
                <Item label={t('verify.bookingId', language)} value={booking.bookingCode} />
                <Item label={t('verify.user', language)} value={booking.user?.name || booking.user?.email} />
                <Item label={t('verify.businessBooked', language)} value={booking.business?.name} />
                <Item label={t('verify.seller', language)} value={booking.business?.sellerContactEmail || booking.business?.ownerEmail} />
                <Item label={t('verify.quantity', language)} value={booking.quantity} />
                <Item label={t('verify.paymentStatus', language)} value={booking.paymentStatus} />
                <Item label={t('verify.bookingStatus', language)} value={booking.bookingStatus} />
                <Item label={t('verify.amountPaid', language)} value={formatRwf(booking.amountPaid || 0)} />
              </dl>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
      <dd className="mt-1 break-words text-lg font-bold text-gray-900">{value || '-'}</dd>
    </div>
  );
}
