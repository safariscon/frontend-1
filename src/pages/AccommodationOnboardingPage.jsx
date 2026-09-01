import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import WizardShell from '../features/accommodation/WizardShell';
import {
  AmenitiesStep,
  AvailabilityStep,
  BasicsStep,
  IdentityStep,
  LocationStep,
  PhotosStep,
  PricingStep,
  ReviewStep,
  RulesStep,
  TypeStep,
  UnitsStep,
} from '../features/accommodation/steps';
import {
  WIZARD_STEPS,
  availabilityWindow,
  buildListingAttributes,
  buildUnitPayload,
  draftFromService,
  emptyStayDraft,
  kindMeta,
  validateStayStep,
} from '../features/accommodation/contract';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { categoriesApi, getAuthData, hotelApi } from '../lib/api';
import { detectPhoneCountry } from '../lib/phone';
import { buildLocationPayload, resolveCategoryId } from '../lib/serviceSchema';
import { isSellerRole } from '../lib/dashboard';

const DRAFT_KEY = 'safariscon_stay_draft';

const STEP_VIEWS = {
  type: TypeStep,
  basics: BasicsStep,
  location: LocationStep,
  rules: RulesStep,
  amenities: AmenitiesStep,
  units: UnitsStep,
  photos: PhotosStep,
  pricing: PricingStep,
  availability: AvailabilityStep,
  identity: IdentityStep,
  review: ReviewStep,
};

export default function AccommodationOnboardingPage() {
  const { serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const editing = Boolean(serviceId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const token = getAuthData()?.token;
  const [categories, setCategories] = useState([]);
  const [draft, setDraft] = useState(() => emptyStayDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialOptionIds, setInitialOptionIds] = useState([]);

  const step = WIZARD_STEPS[stepIndex] || WIZARD_STEPS[0];
  const StepView = STEP_VIEWS[step.id];

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isSellerRole(user.role)) navigate('/');
  }, [navigate, user]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [categoriesResp, serviceResp, optionsResp] = await Promise.all([
          hotelApi.getServiceCategories(token).catch(() => categoriesApi.list()),
          editing ? hotelApi.getService(token, serviceId) : Promise.resolve(null),
          editing ? hotelApi.getServiceOptions(token, serviceId).catch(() => ({ options: [] })) : Promise.resolve({ options: [] }),
        ]);
        if (!active) return;
        const list = categoriesResp.categories || [];
        setCategories(list);
        if (serviceResp) {
          const service = serviceResp.service || serviceResp;
          const options = optionsResp.options || optionsResp || [];
          setInitialOptionIds(options.map((item) => String(item._id || item.id)).filter(Boolean));
          setDraft(draftFromService(service, options));
        } else {
          let next = emptyStayDraft({
            hostLegalName: user?.name || '',
          });
          try {
            const stored = sessionStorage.getItem(DRAFT_KEY);
            if (stored) next = { ...next, ...JSON.parse(stored) };
          } catch {
            /* ignore broken drafts */
          }
          const rawKey = searchParams.get('categoryId') || searchParams.get('categorySlug') || '';
          if (rawKey) {
            const bound = list.find((item) => String(item._id) === String(rawKey) || item.slug === rawKey);
            const slug = bound?.slug || rawKey;
            const kind = kindMeta(slug) || kindMeta(list.find((item) => item.slug === slug)?.subtype);
            if (kind) {
              next = { ...next, familyId: kind.family, propertyKind: kind.id, categorySlug: kind.categorySlug };
            }
          }
          setDraft(next);
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [editing, searchParams, serviceId, toast, token, user?.name]);

  useEffect(() => {
    if (editing || loading) return undefined;
    const timer = window.setTimeout(() => {
      try {
        const { images, ...rest } = draft;
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          ...rest,
          images: { primaryImage: images.primaryImage, galleryImages: images.galleryImages, primaryImageFile: null, galleryFiles: [] },
        }));
      } catch {
        /* ignore quota */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, editing, loading]);

  const categoryId = useMemo(() => {
    const slug = kindMeta(draft.propertyKind).categorySlug;
    return resolveCategoryId(categories, slug);
  }, [categories, draft.propertyKind]);

  const goNext = () => {
    const result = validateStayStep(step.id, draft);
    setErrors(result.errors);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setStepIndex((index) => Math.min(WIZARD_STEPS.length - 1, index + 1));
  };

  const goBack = () => setStepIndex((index) => Math.max(0, index - 1));

  const submit = async () => {
    const result = validateStayStep('review', draft);
    setErrors(result.errors);
    if (!result.ok) {
      toast.error(result.message || 'Complete the required stay details first.');
      return;
    }
    if (!token) return;
    if (!categoryId) {
      toast.error('This stay type is not available yet. Refresh and try again.');
      return;
    }
    setSaving(true);
    try {
      let uploadedPrimary = '';
      let uploadedGallery = [];
      const uploadFiles = [
        ...(draft.images.primaryImageFile ? [draft.images.primaryImageFile] : []),
        ...draft.images.galleryFiles,
      ];
      if (uploadFiles.length) {
        const upload = await hotelApi.uploadServiceImages(token, uploadFiles);
        const urls = upload.urls || [];
        if (draft.images.primaryImageFile) {
          uploadedPrimary = urls[0] || '';
          uploadedGallery = urls.slice(1);
        } else {
          uploadedGallery = urls;
        }
      }
      const primaryImage = uploadedPrimary || draft.images.primaryImage || '';
      const gallery = [
        ...draft.images.galleryImages.filter((url) => url && url !== primaryImage),
        ...uploadedGallery,
      ].slice(0, 5);
      const orderedImages = primaryImage
        ? [primaryImage, ...gallery.filter((url) => url !== primaryImage)].slice(0, 5)
        : gallery;

      const phoneIso = detectPhoneCountry(draft.phoneE164).iso;
      const whatsappIso = draft.whatsappE164 ? detectPhoneCountry(draft.whatsappE164).iso : '';
      const payload = {
        categoryId,
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: draft.status,
        primaryImage: primaryImage || orderedImages[0] || '',
        images: orderedImages,
        location: buildLocationPayload(draft.location),
        serviceLocation: buildLocationPayload(draft.location),
        contactDetails: {
          phoneE164: draft.phoneE164,
          phoneIso,
          whatsappE164: draft.whatsappE164 || undefined,
          whatsappIso: whatsappIso || undefined,
          phone: draft.phoneE164,
          whatsapp: draft.whatsappE164 || undefined,
        },
        listingAttributes: buildListingAttributes(draft),
        paymentPolicy: draft.paymentPolicy,
        cancellationPolicy: draft.cancellationPolicy,
      };

      const response = editing
        ? await hotelApi.updateService(token, serviceId, payload)
        : await hotelApi.createService(token, payload);
      const saved = response.service || response;
      const id = saved._id || saved.id || serviceId;
      const stayWindow = availabilityWindow(draft);
      const keptIds = [];

      for (const unit of draft.units) {
        const unitPayload = buildUnitPayload(unit);
        const optionResponse = unit.optionId
          ? await hotelApi.updateServiceOption(token, id, unit.optionId, unitPayload)
          : await hotelApi.createServiceOption(token, id, unitPayload);
        const optionId = optionResponse.option?._id || optionResponse.option?.id || unit.optionId;
        if (optionId) {
          keptIds.push(String(optionId));
          await hotelApi.saveOptionAvailability(token, id, optionId, {
            isAnytime: false,
            windowStartDate: stayWindow.windowStartDate,
            windowEndDate: stayWindow.windowEndDate,
            daysOfWeek: [],
            dayStartTime: '',
            dayEndTime: '',
            capacityTotal: Number(unit.quantity || 1),
          });
        }
      }

      const removed = initialOptionIds.filter((optionId) => !keptIds.includes(String(optionId)));
      for (const optionId of removed) {
        await hotelApi.deleteServiceOption(token, id, optionId).catch(() => null);
      }

      sessionStorage.removeItem(DRAFT_KEY);
      toast.success(response.message || (editing ? 'Stay updated and sent for review.' : 'Stay submitted. Admin approval opens it for booking.'));
      navigate('/dashboard/seller/services');
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
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link to="/dashboard/seller/services" className="text-sm font-semibold text-primary">← Back to services</Link>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {editing ? 'Editing stay' : 'New stay'}
            </span>
          </div>
          {loading ? (
            <p className="rounded-2xl bg-white p-6 text-slate-600">Loading stay wizard…</p>
          ) : (
            <WizardShell
              title={draft.title || 'List a stay'}
              stepIndex={stepIndex}
              onStepClick={(index) => {
                if (index <= stepIndex) setStepIndex(index);
              }}
              footer={(
                <>
                  <button type="button" onClick={goBack} disabled={stepIndex === 0 || saving} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">
                    Back
                  </button>
                  {step.id === 'review' ? (
                    <button type="button" disabled={saving} onClick={submit} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                      {saving ? 'Submitting…' : editing ? 'Save and submit for booking' : 'Submit and open for booking'}
                    </button>
                  ) : (
                    <button type="button" onClick={goNext} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">
                      Continue
                    </button>
                  )}
                </>
              )}
            >
              {step.id === 'review' ? (
                <ReviewStep draft={draft} errors={errors} onJump={setStepIndex} />
              ) : (
                <StepView
                  draft={draft}
                  setDraft={(next) => {
                    setDraft(next);
                    setErrors({});
                  }}
                  errors={errors}
                  categories={categories}
                />
              )}
            </WizardShell>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
