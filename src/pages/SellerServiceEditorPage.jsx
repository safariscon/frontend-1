import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import PhoneNumberField from '../components/PhoneNumberField';
import SchemaFields from '../components/SchemaFields';
import ServiceImagesEditor from '../components/ServiceImagesEditor';
import ServiceLocationPicker from '../components/ServiceLocationPicker';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { categoriesApi, getAuthData, hotelApi } from '../lib/api';
import { detectPhoneCountry } from '../lib/phone';
import {
  buildLocationPayload,
  categorySupportsOptions,
  emptyListingAttributes,
  getServiceCover,
  resolveCategoryId,
  validateSchemaValues,
} from '../lib/serviceSchema';
import { isSellerRole } from '../lib/dashboard';

const emptyLocation = {
  country: '',
  countryCode: '',
  state: '',
  city: '',
  area: '',
  placeName: '',
  referenceName: '',
  formattedAddress: '',
  fullAddress: '',
  latitude: null,
  longitude: null,
  latitudeRaw: '',
  longitudeRaw: '',
  placeId: '',
  locationSource: 'search',
  isExactLocationVerified: false,
};

export default function SellerServiceEditorPage() {
  const { serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const editing = Boolean(serviceId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const token = getAuthData()?.token;
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [category, setCategory] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('available');
  const [basePrice, setBasePrice] = useState('');
  const [location, setLocation] = useState(emptyLocation);
  const [phoneE164, setPhoneE164] = useState('');
  const [whatsappE164, setWhatsappE164] = useState('');
  const [listingAttributes, setListingAttributes] = useState({});
  const [attributeErrors, setAttributeErrors] = useState({});
  const [images, setImages] = useState({
    primaryImage: '',
    primaryImageFile: null,
    galleryImages: [],
    galleryFiles: [],
  });
  const [rebookSettings, setRebookSettings] = useState({ requestDeadlineHours: 24, rebookIdValidityHours: 72 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item._id) === String(categoryId)) || category,
    [categories, category, categoryId]
  );
  const listingSchema = selectedCategory?.listingFieldSchema || [];
  const supportsOptions = categorySupportsOptions(
    selectedCategory?.supportsOptions,
    category?.supportsOptions
  );

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isSellerRole(user.role)) {
      navigate('/');
    }
  }, [navigate, user]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [categoriesResp, serviceResp] = await Promise.all([
          hotelApi.getServiceCategories(token).catch(() => categoriesApi.list()),
          editing ? hotelApi.getService(token, serviceId) : Promise.resolve(null),
        ]);
        if (!active) return;
        const list = categoriesResp.categories || [];
        setCategories(list);
        if (serviceResp) {
          const service = serviceResp.service || serviceResp;
          const cover = getServiceCover(service);
          const loc = service.location || service.serviceLocation || service.catalogLocation || emptyLocation;
          const boundId = resolveCategoryId(list, service.categoryId || service.category?._id || '');
          setCategoryId(boundId);
          setTitle(service.title || service.name || '');
          setDescription(service.description || '');
          setStatus(service.status === 'unavailable' ? 'unavailable' : 'available');
          setBasePrice(service.basePrice ?? service.pricing?.amount ?? '');
          setLocation({
            ...emptyLocation,
            ...loc,
            formattedAddress: loc.formattedAddress || loc.fullAddress || '',
            fullAddress: loc.fullAddress || loc.formattedAddress || '',
          });
          setPhoneE164(service.contactDetails?.phoneE164 || service.contactDetails?.phone || '');
          setWhatsappE164(service.contactDetails?.whatsappE164 || service.contactDetails?.whatsapp || '');
          setListingAttributes(service.listingAttributes || {});
          setImages({
            primaryImage: service.primaryImage || (cover && !(service.images || []).includes(cover) ? cover : service.primaryImage) || '',
            primaryImageFile: null,
            galleryImages: Array.isArray(service.images) ? service.images.filter(Boolean) : [],
            galleryFiles: [],
          });
          setRebookSettings({
            requestDeadlineHours: Number(service.rebookSettings?.requestDeadlineHours ?? 24),
            rebookIdValidityHours: Number(service.rebookSettings?.rebookIdValidityHours ?? 72),
          });
          if (boundId || service.categorySlug) {
            const detail = await categoriesApi.get(boundId || service.categorySlug).catch(() => null);
            if (active && detail?.category) {
              setCategory(detail.category);
              if (detail.category._id) setCategoryId(String(detail.category._id));
            }
          }
        } else {
          const rawKey = searchParams.get('categoryId') || searchParams.get('categorySlug') || '';
          if (rawKey) {
            const boundId = resolveCategoryId(list, rawKey);
            setCategoryId(boundId);
            const fromList = list.find((item) => String(item._id) === String(boundId));
            if (fromList) {
              setCategory(fromList);
              setListingAttributes(emptyListingAttributes(fromList.listingFieldSchema));
            } else {
              const detail = await categoriesApi.get(rawKey).catch(() => null);
              if (active && detail?.category) {
                setCategory(detail.category);
                if (detail.category._id) setCategoryId(String(detail.category._id));
                setListingAttributes(emptyListingAttributes(detail.category.listingFieldSchema));
              }
            }
          }
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [editing, navigate, searchParams, serviceId, toast, token]);

  useEffect(() => {
    if (!categoryId || editing) return undefined;
    let active = true;
    categoriesApi.get(categoryId).then((response) => {
      if (!active || !response?.category) return;
      setCategory(response.category);
      if (response.category._id) setCategoryId(String(response.category._id));
      setListingAttributes(emptyListingAttributes(response.category.listingFieldSchema));
    }).catch(() => {});
    return () => { active = false; };
  }, [categoryId, editing]);

  const save = async (event) => {
    event.preventDefault();
    if (!token) return;
    const boundCategoryId = selectedCategory?._id || resolveCategoryId(categories, categoryId);
    if (!boundCategoryId) {
      toast.error('Choose a service category.');
      return;
    }
    if (!title.trim()) {
      toast.error('Service name is required.');
      return;
    }
    if (!location.latitude || !location.longitude) {
      toast.error('Set an exact map location for this service.');
      return;
    }
    if (!phoneE164) {
      toast.error('Primary phone number is required.');
      return;
    }
    const schemaErrors = validateSchemaValues(listingSchema, listingAttributes);
    setAttributeErrors(schemaErrors);
    if (Object.keys(schemaErrors).length) {
      toast.error('Fill all required category fields.');
      return;
    }
    if (!supportsOptions && !(Number(basePrice) > 0)) {
      toast.error('Base price is required for this category.');
      return;
    }

    setSaving(true);
    try {
      let uploadedPrimary = '';
      let uploadedGallery = [];
      const uploadFiles = [
        ...(images.primaryImageFile ? [images.primaryImageFile] : []),
        ...images.galleryFiles,
      ];
      if (uploadFiles.length) {
        const upload = await hotelApi.uploadServiceImages(token, uploadFiles);
        const urls = upload.urls || [];
        if (images.primaryImageFile) {
          uploadedPrimary = urls[0] || '';
          uploadedGallery = urls.slice(1);
        } else {
          uploadedGallery = urls;
        }
      }
      const primaryImage = uploadedPrimary || images.primaryImage || '';
      const gallery = [
        ...images.galleryImages.filter((url) => url && url !== primaryImage),
        ...uploadedGallery,
      ].slice(0, 5);
      const orderedImages = primaryImage
        ? [primaryImage, ...gallery.filter((url) => url !== primaryImage)].slice(0, 5)
        : gallery;

      const phoneIso = detectPhoneCountry(phoneE164).iso;
      const whatsappIso = whatsappE164 ? detectPhoneCountry(whatsappE164).iso : '';
      const payload = {
        categoryId: boundCategoryId,
        title: title.trim(),
        description: description.trim(),
        status,
        primaryImage: primaryImage || orderedImages[0] || '',
        images: orderedImages,
        location: buildLocationPayload(location),
        serviceLocation: buildLocationPayload(location),
        contactDetails: {
          phoneE164,
          phoneIso,
          whatsappE164: whatsappE164 || undefined,
          whatsappIso: whatsappIso || undefined,
          phone: phoneE164,
          whatsapp: whatsappE164 || undefined,
        },
        listingAttributes,
        rebookSettings: {
          requestDeadlineHours: Number(rebookSettings.requestDeadlineHours || 24),
          rebookIdValidityHours: Number(rebookSettings.rebookIdValidityHours || 72),
        },
        ...(supportsOptions ? {} : { basePrice: Number(basePrice) }),
      };

      const response = editing
        ? await hotelApi.updateService(token, serviceId, payload)
        : await hotelApi.createService(token, payload);
      const saved = response.service || response;
      const id = saved._id || saved.id || serviceId;
      toast.success(response.message || (editing ? 'Service updated.' : 'Service created.'));
      if (supportsOptions) navigate(`/dashboard/seller/services/${id}/options`);
      else navigate('/dashboard/seller/services');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user || !isSellerRole(user.role)) return null;

  return (
    <DashboardLayout>
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link to="/dashboard/seller/services" className="text-sm font-semibold text-primary">← Back to services</Link>
              <h1 className="mt-2 text-3xl font-black text-slate-950">{editing ? 'Edit service' : 'Add service'}</h1>
              <p className="mt-1 text-sm text-slate-600">Category fields come from admin. Cancel penalty and commission are set when admin approves.</p>
            </div>
            <button type="button" onClick={() => navigate('/dashboard/seller/services')} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
          </div>

          {loading ? (
            <p className="rounded-2xl bg-white p-6 text-slate-600">Loading form…</p>
          ) : (
            <form onSubmit={save} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Category *</span>
                <select
                  required
                  disabled={editing}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.group ? `${item.group} · ` : ''}{item.name}
                    </option>
                  ))}
                </select>
                {selectedCategory?.name ? (
                  <span className="mt-1 block text-xs text-slate-500">
                    Linked as {selectedCategory.name}
                    {selectedCategory.slug ? ` (${selectedCategory.slug})` : ''}
                  </span>
                ) : null}
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Service name *</span>
                  <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Airport SUV transfers" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Availability *</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3">
                    <option value="available">Available</option>
                    <option value="unavailable">Not available</option>
                  </select>
                </label>
                {!supportsOptions && (
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Base price (RWF) *</span>
                    <input required type="number" min="1" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} placeholder="Example: 25000" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                  </label>
                )}
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Description *</span>
                  <textarea required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what customers get, rules, and what’s included." className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3" />
                </label>
              </div>

              <ServiceLocationPicker value={location} onChange={setLocation} />

              <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-2">
                <p className="md:col-span-2 text-sm font-bold text-emerald-950">Contact shown after the customer pays</p>
                <PhoneNumberField label="Primary phone *" value={phoneE164} onChange={setPhoneE164} required />
                <PhoneNumberField label="WhatsApp / second phone" value={whatsappE164} onChange={setWhatsappE164} />
              </div>

              {listingSchema.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-black text-slate-950">Category details</h3>
                  <p className="mt-1 text-sm text-slate-500">Fields required for {selectedCategory?.name || 'this category'}.</p>
                  <div className="mt-4">
                    <SchemaFields
                      schema={listingSchema}
                      values={listingAttributes}
                      errors={attributeErrors}
                      onChange={setListingAttributes}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Rebook request cutoff (hours)</span>
                  <input type="number" min="1" value={rebookSettings.requestDeadlineHours} onChange={(event) => setRebookSettings((prev) => ({ ...prev, requestDeadlineHours: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Rebook ID validity (hours)</span>
                  <input type="number" min="1" value={rebookSettings.rebookIdValidityHours} onChange={(event) => setRebookSettings((prev) => ({ ...prev, rebookIdValidityHours: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" />
                </label>
                <p className="md:col-span-2 text-xs text-slate-600">Cancel window, cancel penalty %, and platform commission are set by admin when the service is approved.</p>
              </div>

              <ServiceImagesEditor
                primaryImage={images.primaryImage}
                primaryImageFile={images.primaryImageFile}
                galleryImages={images.galleryImages}
                galleryFiles={images.galleryFiles}
                onChange={setImages}
              />

              {supportsOptions && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-black text-emerald-950">Service options</h3>
                  <p className="mt-1 text-sm text-emerald-900">
                    {editing
                      ? 'Add or edit packages for this service (only admin option fields + name/price).'
                      : 'After you save this service, you will manage its bookable options next.'}
                  </p>
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/seller/services/${serviceId}/options`)}
                      className="mt-3 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Manage options
                    </button>
                  ) : null}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => navigate('/dashboard/seller/services')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Cancel</button>
                {editing && supportsOptions && (
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/seller/services/${serviceId}/options`)}
                    className="rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary"
                  >
                    Edit options
                  </button>
                )}
                <button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {saving ? 'Saving…' : editing ? 'Save service' : supportsOptions ? 'Save & manage options' : 'Save service'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
