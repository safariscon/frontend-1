import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi, saveAuthData } from '../lib/api';

const SERVICE_CATEGORIES = [
  {
    label: 'Accommodation Services',
    options: [
      ['hotels-and-resorts', 'Hotels & Resorts'],
      ['homestays-and-guesthouses', 'Homestays & Guesthouses'],
      ['tent-rentals-and-camping-sites', 'Tent Rentals & Camping Sites'],
      ['vacation-rentals-and-apartments', 'Vacation Rentals & Apartments'],
    ],
  },
  {
    label: 'Transport & Mobility Services',
    options: [
      ['car-rentals', 'Car Rentals'],
      ['motorbike-and-scooter-rentals', 'Motorbike & Scooter Rentals'],
      ['taxi-and-ride-services', 'Taxi & Ride Services'],
      ['bus-and-minivan-charters', 'Bus & Minivan Charters'],
    ],
  },
  {
    label: 'Food & Beverage Services',
    options: [
      ['restaurants', 'Restaurants'],
      ['bars-and-pubs', 'Bars & Pubs'],
      ['coffee-shops-and-cafes', 'Coffee Shops & Cafes'],
      ['food-trucks-and-street-food-stalls', 'Food Trucks & Street Food'],
    ],
  },
  {
    label: 'Events & Venue Services',
    options: [
      ['conference-event-halls-mice', 'Conference & Event Halls'],
      ['wedding-venues', 'Wedding Venues'],
    ],
  },
  {
    label: 'Travel & Experience Services',
    options: [
      ['tour-and-activity-operators', 'Tours & Activities'],
      ['entertainment-venues', 'Entertainment Venues'],
      ['gear-rentals', 'Gear Rentals'],
    ],
  },
  {
    label: 'Shopping & Local Market Services',
    options: [
      ['souvenir-shops-and-craft-markets', 'Souvenir Shops & Craft Markets'],
    ],
  },
  {
    label: 'Wellness & Personal Care Services',
    options: [
      ['spas-and-wellness-centers', 'Spas & Wellness Centers'],
    ],
  },
  {
    label: 'Personal Support Services',
    options: [
      ['childcare-services', 'Childcare Services'],
    ],
  },
];

const initialForm = {
  businessName: '',
  businessType: 'hotels-and-resorts',
  ownerName: '',
  email: '',
  phone: '',
  location: '',
  businessDescription: '',
  serviceName: '',
  serviceDescription: '',
  servicePrice: '',
  availabilityStatus: 'available',
  remainingQuantity: '1',
  serviceImages: '',
  password: '',
  confirmPassword: '',
};

export default function BusinessRegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authApi.registerBusiness(formData);
      saveAuthData(response);
      navigate('/dashboard/seller');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Business Owner</p>
          <h1 className="mt-2 text-3xl font-black text-gray-950 dark:text-white md:text-4xl">
            Add your business to the Rwanda marketplace
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            Create your provider account, register your business, and add the first business listing for admin review.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business Name" name="businessName" value={formData.businessName} onChange={updateField} />
              <label className="block">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Business Type</span>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={updateField}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {SERVICE_CATEGORIES.map((category) => (
                    <optgroup key={category.label} label={category.label}>
                      {category.options.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <Field label="Owner Name" name="ownerName" value={formData.ownerName} onChange={updateField} />
              <Field label="Email Address" name="email" type="email" value={formData.email} onChange={updateField} />
              <Field label="Phone Number" name="phone" value={formData.phone} onChange={updateField} />
              <Field label="Location" name="location" value={formData.location} onChange={updateField} />
              <Field label="Password" name="password" type="password" value={formData.password} onChange={updateField} />
              <Field label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={updateField} />
            </div>

            <label className="block">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Business Description</span>
              <textarea
                name="businessDescription"
                value={formData.businessDescription}
                onChange={updateField}
                rows="4"
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="Example: We rent clean cars in Kigali with a driver or self-drive option."
              />
            </label>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
              <h2 className="text-xl font-black text-gray-950 dark:text-white">First Business Listing</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">This listing is submitted with your business and becomes public after admin approval.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business Listing Name" name="serviceName" value={formData.serviceName} onChange={updateField} />
              <Field label="Price" name="servicePrice" value={formData.servicePrice} onChange={updateField} placeholder="Example: 20,000 RWF per day" />
              <label className="block">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Availability</span>
                <select
                  name="availabilityStatus"
                  value={formData.availabilityStatus}
                  onChange={updateField}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Not Available</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <Field label="Remaining Quantity / Availability Note" name="remainingQuantity" value={formData.remainingQuantity} onChange={updateField} placeholder="Example: 5 cars left or weekends only" />
            </div>

            <label className="block">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Business Listing Description</span>
              <textarea
                name="serviceDescription"
                value={formData.serviceDescription}
                onChange={updateField}
                rows="4"
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="Example: Clean car rental in Kigali with daily pricing and reliable pickup."
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Image URLs</span>
              <textarea
                name="serviceImages"
                value={formData.serviceImages}
                onChange={updateField}
                rows="3"
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="Optional: one image URL per line"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-5 py-3 text-lg font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Register Business'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        required
      />
    </label>
  );
}
