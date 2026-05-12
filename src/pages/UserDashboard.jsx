import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { bookingApi, getAuthData } from '../lib/api';
import { formatRwf } from '../lib/currency';

const statusStyle = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const authData = getAuthData();
      if (!authData?.token) {
        setLoading(false);
        return;
      }

      try {
        const response = await bookingApi.getMyBookings(authData.token);
        setBookings(response.bookings || []);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-600">Track your booking requests and confirmations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard label="Confirmed" value={confirmedCount} />
            <StatCard label="Pending" value={pendingCount} />
            <StatCard label="Completed" value={completedCount} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>
            </div>

            {loading ? (
              <div className="p-8 text-gray-600">Loading bookings...</div>
            ) : bookings.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {bookings.map((booking) => {
                  const assignedHotel = booking.hotelId;
                  const preferredHotel = booking.preferredHotelId;
                  const hotelToShow = assignedHotel || preferredHotel;
                  const waiting = booking.status === 'pending' && !assignedHotel;

                  return (
                    <div key={booking._id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {hotelToShow?.name || 'Hotel pending assignment'}
                          </h3>
                          <p className="text-sm text-gray-700 mt-1">
                            Destination: {booking.destinationPlace} ({booking.destinationLocation})
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {booking.checkIn
                              ? `${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}`
                              : 'Dates not provided'}
                          </p>
                          <p className="text-sm text-gray-600">Guests: {booking.guests || 1}</p>
                          <p className="text-sm text-gray-500 mt-1">Booking ID: {booking._id}</p>
                          {waiting && (
                            <p className="text-sm text-yellow-700 mt-2">
                              Please wait for admin response.
                            </p>
                          )}
                          {booking.isAcknowledgedByAdmin && booking.status === 'pending' && (
                            <p className="text-sm text-blue-700 mt-2">
                              Admin has confirmed receipt of your request.
                            </p>
                          )}
                          {booking.adminResponseMessage && (
                            <p className="text-sm text-green-700 mt-2">
                              {booking.adminResponseMessage}
                            </p>
                          )}
                          {assignedHotel && (
                            <p className="text-sm text-gray-700 mt-2">
                              Assigned Hotel: {assignedHotel.name} - {assignedHotel.location}
                            </p>
                          )}
                          {booking.tourHelpers?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-semibold text-gray-900">Tour Helpers</p>
                              <div className="space-y-1 mt-1">
                                {booking.tourHelpers.map((helper) => (
                                  <p key={helper._id} className="text-sm text-gray-700">
                                    {helper.name} - {helper.phone || helper.email}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyle[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                            {booking.status}
                          </span>
                          <p className="text-xl font-bold text-primary mt-2">{formatRwf(booking.totalPrice || 0)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No bookings yet</h3>
                <p className="text-gray-500 mb-4">Start exploring Rwanda&apos;s best hotels</p>
                <Link to="/hotels" className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                  Browse Hotels
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
