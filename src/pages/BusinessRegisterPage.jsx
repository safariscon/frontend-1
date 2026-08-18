import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { authApi, saveAuthData } from '../lib/api';
import { SERVICE_CATEGORY_GROUPS as SERVICE_CATEGORIES, getCategoryDisplayLabel, getCategoryGroupDisplayLabel } from '../data/serviceCategories';
import PasswordInput from '../components/PasswordInput';
import SeoHead from '../components/SeoHead';
import SeoBreadcrumbs from '../components/SeoBreadcrumbs';
import { getBusinessRegisterSeo } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const initialForm = {
  businessName: '',
  businessType: 'hotel-rooms',
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
  const { language } = useLanguage();
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
      <SeoHead {...getBusinessRegisterSeo(language)} />
      <Navbar />
      <SeoBreadcrumbs items={[{ label: t('navigation.home', language), to: '/' }, { label: t('registerABusiness', language) }]} />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">{t('businessRegister.eyebrow', language)}</p>
          <h1 className="mt-2 text-3xl font-black text-gray-950 dark:text-white md:text-4xl">
            {t('businessRegister.title', language)}
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            {t('businessRegister.lead', language)}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('businessRegister.businessName', language)} name="businessName" value={formData.businessName} onChange={updateField} />
              <label className="block">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t('businessRegister.businessType', language)}</span>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={updateField}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {SERVICE_CATEGORIES.map((category) => (
                    <optgroup key={category.label} label={getCategoryGroupDisplayLabel(category.label, language)}>
                      {category.options.map(([value, label]) => (
                        <option key={value} value={value}>{getCategoryDisplayLabel(value, language) || label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <Field label={t('businessRegister.ownerName', language)} name="ownerName" value={formData.ownerName} onChange={updateField} />
              <Field label={t('businessRegister.emailAddress', language)} name="email" type="email" value={formData.email} onChange={updateField} />
              <Field label={t('businessRegister.phoneNumber', language)} name="phone" value={formData.phone} onChange={updateField} />
              <Field label={t('businessRegister.location', language)} name="location" value={formData.location} onChange={updateField} />
              <Field label={t('businessRegister.password', language)} name="password" type="password" value={formData.password} onChange={updateField} />
              <Field label={t('businessRegister.confirmPassword', language)} name="confirmPassword" type="password" value={formData.confirmPassword} onChange={updateField} />
            </div>

            <label className="block">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t('businessRegister.businessDescription', language)}</span>
              <textarea
                name="businessDescription"
                value={formData.businessDescription}
                onChange={updateField}
                rows="4"
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder={t('businessRegister.businessDescPlaceholder', language)}
              />
            </label>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
              <h2 className="text-xl font-black text-gray-950 dark:text-white">{t('businessRegister.firstListing', language)}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t('businessRegister.firstListingLead', language)}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('businessRegister.listingName', language)} name="serviceName" value={formData.serviceName} onChange={updateField} />
              <Field label={t('businessRegister.servicePrice', language)} name="servicePrice" value={formData.servicePrice} onChange={updateField} placeholder={t('businessRegister.priceExample', language)} />
              <label className="block">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t('businessRegister.availability', language)}</span>
                <select
                  name="availabilityStatus"
                  value={formData.availabilityStatus}
                  onChange={updateField}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="available">{t('businessRegister.available', language)}</option>
                  <option value="unavailable">{t('businessRegister.notAvailable', language)}</option>
                  <option value="custom">{t('businessRegister.custom', language)}</option>
                </select>
              </label>
              <Field label={t('businessRegister.remainingQuantityNote', language)} name="remainingQuantity" value={formData.remainingQuantity} onChange={updateField} placeholder={t('businessRegister.remainingExample', language)} />
            </div>

            <label className="block">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t('businessRegister.listingDescription', language)}</span>
              <textarea
                name="serviceDescription"
                value={formData.serviceDescription}
                onChange={updateField}
                rows="4"
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder={t('businessRegister.listingDescPlaceholder', language)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t('businessRegister.serviceImages', language)}</span>
              <textarea
                name="serviceImages"
                value={formData.serviceImages}
                onChange={updateField}
                rows="3"
                className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder={t('businessRegister.imageUrlsOptional', language)}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-5 py-3 text-lg font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t('businessRegister.saving', language) : t('businessRegister.submit', language)}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  const inputClassName = 'mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white';

  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{label}</span>
      {type === 'password' ? (
        <PasswordInput
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inputClassName={inputClassName}
          required
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClassName}
          required
        />
      )}
    </label>
  );
}
