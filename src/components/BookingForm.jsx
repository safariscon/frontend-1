import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { bookingApi, getAuthData, publicApi } from '../lib/api';
import { formatRwf } from '../lib/currency';
import { normalizeHotels } from '../lib/hotelMapper';

export default function BookingForm({ hotelId, onClose, onSuccess }) {
  const [hotel, setHotel] = useState(null);
  const [destinationPlace, setDestinationPlace] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingHotel, setLoadingHotel] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadHotel = async () => {
      try {
        const response = await publicApi.getHotels();
        const hotels = normalizeHotels(response.hotels || []);
        const found = hotels.find((h) => String(h.id) === String(hotelId));
        setHotel(found || null);
        if (found?.location) {
          setDestinationLocation(found.location);
        }
      } finally {
        setLoadingHotel(false);
      }
    };

    loadHotel();
  }, [hotelId]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (end <= start) return 0;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  const totalPrice = (hotel?.basePrice || 0) * nights;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates.');
      return;
    }
    if (!destinationPlace || !destinationLocation) {
      setError('Please provide destination place and destination location.');
      return;
    }
    if (nights <= 0) {
      setError('Check-out must be after check-in.');
      return;
    }

    const authData = getAuthData();
    if (!authData?.token) {
      setError('Please log in again to continue.');
      return;
    }

    setLoading(true);
    try {
      const response = await bookingApi.requestBooking(authData.token, {
        hotelId: hotel?.id || null,
        destinationPlace,
        destinationLocation,
        checkIn,
        checkOut,
        guests,
        totalPrice,
      });

      onSuccess?.(response.booking);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingHotel) {
    return <LoadingSpinner />;
  }

  if (!hotel) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
        <p className="text-gray-600">Hotel not available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{hotel.name}</h2>
          <p className="text-gray-600">{hotel.location}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Place You Want To Visit</label>
          <input
            type="text"
            value={destinationPlace}
            onChange={(e) => setDestinationPlace(e.target.value)}
            placeholder="e.g. Volcanoes National Park"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination Location</label>
          <input
            type="text"
            value={destinationLocation}
            onChange={(e) => setDestinationLocation(e.target.value)}
            placeholder="e.g. Musanze"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
        <select
          value={guests}
          onChange={(e) => setGuests(parseInt(e.target.value, 10))}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
        >
          {[1, 2, 3, 4].map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? 'Guest' : 'Guests'}
            </option>
          ))}
        </select>
      </div>

      {nights > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">{formatRwf(hotel.basePrice)} x {nights} nights</span>
            <span className="font-medium">{formatRwf(totalPrice)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
            <span className="font-bold text-gray-900">Estimated Total</span>
            <span className="font-bold text-primary text-lg">{formatRwf(totalPrice)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Final room assignment is completed by admin.
          </p>
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            Sending...
          </>
        ) : (
          'Submit Booking Request'
        )}
      </button>
    </div>
  );
}
