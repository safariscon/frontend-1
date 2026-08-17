import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { publicApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import SeoHead from '../components/SeoHead';
import { noindexSeo } from '../lib/seo';

export default function VerificationPage() {
  const { token } = useParams();
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
          title: 'Booking verification | SafarisCon',
          description: 'Verify a SafarisCon booking code. This page is for confirmed bookings and is not indexed.',
          path: `/verify/${token || ''}`,
        })}
      />
      <Navbar />
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-3xl px-4">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <p className={`text-sm font-bold uppercase ${result?.verified ? 'text-green-700' : 'text-red-700'}`}>
              {result ? (result.verified ? 'VERIFIED' : result.result || 'INVALID') : 'Checking'}
            </p>
            <h1 className="mt-2 text-3xl font-black text-gray-950">Booking Verification</h1>
            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">INVALID - {error}</p>}
            {booking && (
              <dl className="mt-6 grid gap-4 md:grid-cols-2">
                <Item label="Booking ID" value={booking.bookingCode} />
                <Item label="User" value={booking.user?.name || booking.user?.email} />
                <Item label="Business Booked" value={booking.business?.name} />
                <Item label="Seller" value={booking.business?.sellerContactEmail || booking.business?.ownerEmail} />
                <Item label="Quantity" value={booking.quantity} />
                <Item label="Payment Status" value={booking.paymentStatus} />
                <Item label="Booking Status" value={booking.bookingStatus} />
                <Item label="Amount Paid" value={formatRwf(booking.amountPaid || 0)} />
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
