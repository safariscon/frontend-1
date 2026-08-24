import PhoneNumberField from '../../components/PhoneNumberField';
import ServiceImagesEditor from '../../components/ServiceImagesEditor';
import ServiceLocationPicker from '../../components/ServiceLocationPicker';
import PolicyFields from '../domain/PolicyFields';
import {
  BATHROOM_AMENITIES,
  BED_TYPES,
  ID_TYPES,
  PROPERTY_AMENITIES,
  ROOM_AMENITY_GROUPS,
  STANDARD_UNIT_NAMES,
  STAR_RATINGS,
  STAY_FAMILIES,
  UNIT_TYPES,
  amenityLabel,
  emptyUnit,
  familyForKind,
  kindMeta,
  occupancyDefaults,
  stayNeedsStarRating,
} from './contract';
import { ChipGroup, ChoiceCard, ErrorText, Stepper } from './WizardShell';

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-primary';

function toggleList(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function TypeStep({ draft, setDraft, errors, categories = [] }) {
  const family = STAY_FAMILIES.find((item) => item.id === draft.familyId) || STAY_FAMILIES[0];
  const kinds = family.kinds.map(kindMeta);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-950">What kind of stay is this?</h2>
        <p className="mt-1 text-sm text-slate-600">Start with the family, then pick the closest match. This unlocks stay-specific questions later.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {STAY_FAMILIES.map((item) => (
            <ChoiceCard
              key={item.id}
              selected={draft.familyId === item.id}
              title={item.title}
              description={item.description}
              badge={item.id === 'apartment' ? 'Most common' : ''}
              onClick={() => {
                const nextKind = kindMeta(item.kinds[0]);
                setDraft({ ...draft, familyId: item.id, propertyKind: nextKind.id, categorySlug: nextKind.categorySlug });
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-black text-slate-950">Closest category</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {kinds.map((kind) => (
            <label key={kind.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${draft.propertyKind === kind.id ? 'border-primary bg-blue-50' : 'border-slate-200'}`}>
              <input
                type="radio"
                name="propertyKind"
                checked={draft.propertyKind === kind.id}
                onChange={() => setDraft({ ...draft, propertyKind: kind.id, categorySlug: kind.categorySlug, familyId: kind.family })}
              />
              <span className="text-sm font-semibold text-slate-800">{kind.label}</span>
            </label>
          ))}
        </div>
        <ErrorText error={errors.propertyKind} />
      </div>
      <div>
        <h3 className="font-black text-slate-950">How many properties are you listing?</h3>
        <p className="mt-1 text-sm text-slate-500">You can still add more stays later from your dashboard. This only sets up the current listing.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ChoiceCard
            selected={draft.listingScale === 'single'}
            title="One property"
            description="One hotel, apartment, or home with one or more rooms."
            onClick={() => setDraft({ ...draft, listingScale: 'single' })}
          />
          <ChoiceCard
            selected={draft.listingScale === 'multiple'}
            title="A portfolio"
            description="You manage more than one stay under this account."
            onClick={() => setDraft({ ...draft, listingScale: 'multiple' })}
          />
        </div>
      </div>
      <div>
        <h3 className="font-black text-slate-950">Are you a property manager or part of a group?</h3>
        <div className="mt-3 flex gap-3">
          {[['no', false], ['yes', true]].map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => setDraft({ ...draft, isManagementCompany: value })}
              className={`rounded-xl border px-5 py-2.5 text-sm font-bold capitalize ${draft.isManagementCompany === value ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {categories.length ? (
        <p className="text-xs text-slate-500">This listing will be saved under {kindMeta(draft.propertyKind).label}.</p>
      ) : null}
    </div>
  );
}

export function BasicsStep({ draft, setDraft, errors }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Property name *</span>
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={inputClass} placeholder="Guests will see this name in search" />
        <p className="mt-1 text-xs text-slate-500">Use the name on the building or the apartment listing, not a marketing slogan.</p>
        <ErrorText error={errors.title} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Description *</span>
        <textarea rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={inputClass} placeholder="What makes this stay comfortable? Mention location, who it suits, and what is included." />
        <ErrorText error={errors.description} />
      </label>
      {stayNeedsStarRating(draft.propertyKind) ? (
        <div>
          <p className="text-sm font-semibold text-slate-700">Star rating</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {STAR_RATINGS.map((item) => (
              <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${draft.starRating === item.id ? 'border-primary bg-blue-50' : 'border-slate-200'}`}>
                <input type="radio" name="starRating" checked={draft.starRating === item.id} onChange={() => setDraft({ ...draft, starRating: item.id })} />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LocationStep({ draft, setDraft, errors }) {
  return (
    <div className="space-y-5">
      <ServiceLocationPicker value={draft.location} onChange={(location) => setDraft({ ...draft, location })} />
      <ErrorText error={errors.location} />
      <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-2">
        <p className="md:col-span-2 text-sm font-bold text-emerald-950">Contact shown after the guest pays the deposit</p>
        <PhoneNumberField label="Primary phone *" value={draft.phoneE164} onChange={(phoneE164) => setDraft({ ...draft, phoneE164 })} required />
        <PhoneNumberField label="WhatsApp / second phone" value={draft.whatsappE164} onChange={(whatsappE164) => setDraft({ ...draft, whatsappE164 })} />
        <ErrorText error={errors.phoneE164} />
      </div>
    </div>
  );
}

export function RulesStep({ draft, setDraft, errors }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black text-slate-950">Check-in and check-out</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Check-in from *</span>
            <input type="time" value={draft.checkInFrom} onChange={(event) => setDraft({ ...draft, checkInFrom: event.target.value })} className={inputClass} />
            <ErrorText error={errors.checkInFrom} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Check-in until</span>
            <input type="time" value={draft.checkInUntil} onChange={(event) => setDraft({ ...draft, checkInUntil: event.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Check-out from</span>
            <input type="time" value={draft.checkOutFrom} onChange={(event) => setDraft({ ...draft, checkOutFrom: event.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Check-out until *</span>
            <input type="time" value={draft.checkOutUntil} onChange={(event) => setDraft({ ...draft, checkOutUntil: event.target.value })} className={inputClass} />
            <ErrorText error={errors.checkOutUntil} />
          </label>
        </div>
      </div>
      <div>
        <h3 className="font-black text-slate-950">Do you allow children?</h3>
        <div className="mt-3 flex gap-3">
          {['yes', 'no'].map((value) => (
            <button key={value} type="button" onClick={() => setDraft({ ...draft, allowsChildren: value })} className={`rounded-xl border px-5 py-2.5 text-sm font-bold capitalize ${draft.allowsChildren === value ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>{value}</button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-black text-slate-950">Do you allow pets?</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {[['yes', 'Yes'], ['upon_request', 'Upon request'], ['no', 'No']].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setDraft({ ...draft, allowsPets: value })} className={`rounded-xl border px-5 py-2.5 text-sm font-bold ${draft.allowsPets === value ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AmenitiesStep({ draft, setDraft }) {
  return (
    <div>
      <h3 className="font-black text-slate-950">What can guests use at this property?</h3>
      <p className="mt-1 text-sm text-slate-500">Pick the facilities people search for most. You can refine the full list later.</p>
      <div className="mt-4">
        <ChipGroup
          options={PROPERTY_AMENITIES}
          values={draft.amenities}
          onToggle={(id) => setDraft({ ...draft, amenities: toggleList(draft.amenities, id) })}
        />
      </div>
    </div>
  );
}

function UnitCard({ unit, index, errors, onChange, onRemove, canRemove }) {
  const set = (patch) => onChange({ ...unit, ...patch });
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-black text-slate-950">Unit {index + 1}</h3>
        {canRemove ? (
          <button type="button" onClick={onRemove} className="text-sm font-bold text-red-600">Remove</button>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Room / unit name guests will see</span>
          <select value={unit.name} onChange={(event) => set({ name: event.target.value })} className={inputClass}>
            {STANDARD_UNIT_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <ErrorText error={errors[`unitName${index}`]} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Unit type</span>
          <select value={unit.unitType} onChange={(event) => set({ unitType: event.target.value })} className={inputClass}>
            {UNIT_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">How many of this type?</span>
          <div className="mt-2"><Stepper value={unit.quantity} min={1} onChange={(quantity) => set({ quantity })} /></div>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Bedrooms</span>
          <div className="mt-2"><Stepper value={unit.bedrooms} min={0} onChange={(bedrooms) => set({ bedrooms })} /></div>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Max guests</span>
          <div className="mt-2">
            <Stepper
              value={unit.maxGuests}
              min={1}
              max={16}
              onChange={(maxGuests) => set({ maxGuests, occupancyPrices: occupancyDefaults(maxGuests, unit.occupancyPrices?.[maxGuests] || unit.price) })}
            />
          </div>
          <ErrorText error={errors[`maxGuests${index}`]} />
        </label>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={unit.excludeInfants} onChange={(event) => set({ excludeInfants: event.target.checked })} />
        Exclude infants (0–2 years) from the guest count
      </label>
      <h4 className="mt-5 font-black text-slate-950">Beds in this unit</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {BED_TYPES.map((bed) => (
          <div key={bed.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
            <div>
              <p className="text-sm font-bold text-slate-900">{bed.label}</p>
              <p className="text-xs text-slate-500">{bed.hint}</p>
            </div>
            <Stepper value={unit.beds?.[bed.id] || 0} min={0} max={8} onChange={(count) => set({ beds: { ...unit.beds, [bed.id]: count } })} />
          </div>
        ))}
      </div>
      <ErrorText error={errors[`beds${index}`]} />
      <h4 className="mt-5 font-black text-slate-950">Bathroom</h4>
      <div className="mt-2 flex gap-3">
        {[['Private', true], ['Shared', false]].map(([label, value]) => (
          <button key={label} type="button" onClick={() => set({ bathroomPrivate: value })} className={`rounded-xl border px-4 py-2 text-sm font-bold ${unit.bathroomPrivate === value ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>{label}</button>
        ))}
      </div>
      <div className="mt-3">
        <ChipGroup options={BATHROOM_AMENITIES} values={unit.bathroomAmenities} onToggle={(id) => set({ bathroomAmenities: toggleList(unit.bathroomAmenities, id) })} />
      </div>
      <h4 className="mt-5 font-black text-slate-950">What guests can use in this room</h4>
      <div className="mt-3 space-y-4">
        {ROOM_AMENITY_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-sm font-bold text-slate-700">{group.title}</p>
            <ChipGroup options={group.items} values={unit.roomAmenities} onToggle={(id) => set({ roomAmenities: toggleList(unit.roomAmenities, id) })} />
          </div>
        ))}
      </div>
      <h4 className="mt-5 font-black text-slate-950">Nightly price by occupancy (RWF)</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: Number(unit.maxGuests) || 1 }, (_, i) => i + 1).map((guests) => (
          <label key={guests} className="block">
            <span className="text-sm font-semibold text-slate-700">{guests} guest{guests > 1 ? 's' : ''}</span>
            <input
              type="number"
              min="1"
              value={unit.occupancyPrices?.[guests] ?? ''}
              onChange={(event) => set({ occupancyPrices: { ...unit.occupancyPrices, [guests]: event.target.value }, price: event.target.value })}
              className={inputClass}
              placeholder="45000"
            />
          </label>
        ))}
      </div>
      <ErrorText error={errors[`price${index}`]} />
    </div>
  );
}

export function UnitsStep({ draft, setDraft, errors }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Standardized names help guests compare rooms. You can keep an internal nickname later.</p>
      {draft.units.map((unit, index) => (
        <UnitCard
          key={unit.clientId}
          unit={unit}
          index={index}
          errors={errors}
          canRemove={draft.units.length > 1}
          onChange={(next) => setDraft({ ...draft, units: draft.units.map((item) => (item.clientId === unit.clientId ? next : item)) })}
          onRemove={() => setDraft({ ...draft, units: draft.units.filter((item) => item.clientId !== unit.clientId) })}
        />
      ))}
      <button type="button" onClick={() => setDraft({ ...draft, units: [...draft.units, emptyUnit({ name: 'Double Room', unitType: 'double' })] })} className="rounded-xl border border-dashed border-primary px-4 py-3 text-sm font-bold text-primary">
        Add another room type
      </button>
      <ErrorText error={errors.units} />
    </div>
  );
}

export function PhotosStep({ draft, setDraft, errors }) {
  return (
    <div>
      <ServiceImagesEditor
        primaryImage={draft.images.primaryImage}
        primaryImageFile={draft.images.primaryImageFile}
        galleryImages={draft.images.galleryImages}
        galleryFiles={draft.images.galleryFiles}
        onChange={(images) => setDraft({ ...draft, images })}
      />
      <ErrorText error={errors.photos} />
    </div>
  );
}

export function PricingStep({ draft, setDraft }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        Guests pay a <strong>50% deposit</strong> through SafarisCon (XentriPay). Platform commission is <strong>10%</strong> and is not set by you. The remaining balance is collected on arrival or checkout.
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
        <input type="checkbox" className="mt-1" checked={draft.childrenStayFree} onChange={(event) => setDraft({ ...draft, childrenStayFree: event.target.checked })} />
        <span>
          <span className="block font-bold text-slate-950">Children stay for free</span>
          <span className="text-sm text-slate-600">Applies to the whole property. Competitive child rates often increase family bookings.</span>
        </span>
      </label>
      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={draft.nonRefundableEnabled} onChange={(event) => setDraft({ ...draft, nonRefundableEnabled: event.target.checked })} />
          <span>
            <span className="block font-bold text-slate-950">Non-refundable rate</span>
            <span className="text-sm text-slate-600">Guests pay less and cannot cancel for free.</span>
          </span>
        </label>
        {draft.nonRefundableEnabled ? (
          <label className="mt-3 block max-w-xs">
            <span className="text-sm font-semibold text-slate-700">Discount vs standard rate (%)</span>
            <input type="number" min="1" max="50" value={draft.nonRefundablePercent} onChange={(event) => setDraft({ ...draft, nonRefundablePercent: event.target.value })} className={inputClass} />
          </label>
        ) : null}
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={draft.weeklyEnabled} onChange={(event) => setDraft({ ...draft, weeklyEnabled: event.target.checked })} />
          <span>
            <span className="block font-bold text-slate-950">Weekly rate</span>
            <span className="text-sm text-slate-600">Discount when guests book a longer stay.</span>
          </span>
        </label>
        {draft.weeklyEnabled ? (
          <div className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Discount (%)</span>
              <input type="number" min="1" max="50" value={draft.weeklyPercent} onChange={(event) => setDraft({ ...draft, weeklyPercent: event.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Minimum nights</span>
              <input type="number" min="2" max="30" value={draft.weeklyMinNights} onChange={(event) => setDraft({ ...draft, weeklyMinNights: event.target.value })} className={inputClass} />
            </label>
          </div>
        ) : null}
      </div>
      <PolicyFields
        paymentPolicy={draft.paymentPolicy}
        cancellationPolicy={draft.cancellationPolicy}
        onPaymentChange={(paymentPolicy) => setDraft({ ...draft, paymentPolicy: { ...paymentPolicy, depositPercentage: 50 } })}
        onCancellationChange={(cancellationPolicy) => setDraft({ ...draft, cancellationPolicy })}
      />
    </div>
  );
}

export function AvailabilityStep({ draft, setDraft, errors }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black text-slate-950">When can guests first check in?</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ChoiceCard selected={draft.firstCheckInMode === 'asap'} title="As soon as possible" description="Open the calendar from today." onClick={() => setDraft({ ...draft, firstCheckInMode: 'asap', firstCheckInDate: '' })} />
          <ChoiceCard selected={draft.firstCheckInMode === 'date'} title="On a specific date" description="Useful if the property is not ready yet." onClick={() => setDraft({ ...draft, firstCheckInMode: 'date' })} />
        </div>
        {draft.firstCheckInMode === 'date' ? (
          <label className="mt-3 block max-w-xs">
            <span className="text-sm font-semibold text-slate-700">First check-in date</span>
            <input type="date" value={draft.firstCheckInDate} onChange={(event) => setDraft({ ...draft, firstCheckInDate: event.target.value })} className={inputClass} />
            <ErrorText error={errors.firstCheckInDate} />
          </label>
        ) : null}
      </div>
      <div>
        <h3 className="font-black text-slate-950">How far ahead can guests book?</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ChoiceCard selected={Number(draft.availabilityHorizonDays) === 365} title="365 days" description="Continuously extend availability for a year." onClick={() => setDraft({ ...draft, availabilityHorizonDays: 365 })} />
          <ChoiceCard selected={Number(draft.availabilityHorizonDays) === 548} title="18 months" description="Open the first 18 months for booking." onClick={() => setDraft({ ...draft, availabilityHorizonDays: 548 })} />
        </div>
      </div>
      <div>
        <h3 className="font-black text-slate-950">Will you accept stays over 30 nights?</h3>
        <p className="mt-1 text-sm text-slate-500">Longer stays can fill empty calendar gaps for remote workers.</p>
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={() => setDraft({ ...draft, allowLongStays: true })} className={`rounded-xl border px-5 py-2.5 text-sm font-bold ${draft.allowLongStays ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>Yes, up to 90 nights</button>
          <button type="button" onClick={() => setDraft({ ...draft, allowLongStays: false })} className={`rounded-xl border px-5 py-2.5 text-sm font-bold ${!draft.allowLongStays ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>No</button>
        </div>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Optional calendar import URL</span>
        <input value={draft.calendarImportUrl} onChange={(event) => setDraft({ ...draft, calendarImportUrl: event.target.value })} className={inputClass} placeholder="Paste an iCal link from Airbnb, Agoda, Expedia, or VRBO" />
        <p className="mt-1 text-xs text-slate-500">Saved on the listing so you can sync later. It does not import automatically yet.</p>
      </label>
    </div>
  );
}

export function IdentityStep({ draft, setDraft, errors }) {
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Used for invoicing and host verification. Identity numbers are never shown to guests.</p>
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Name on the invoice *</span>
        <input value={draft.hostLegalName} onChange={(event) => setDraft({ ...draft, hostLegalName: event.target.value })} className={inputClass} />
        <ErrorText error={errors.hostLegalName} />
      </label>
      <div>
        <p className="text-sm font-semibold text-slate-700">Is this a company?</p>
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={() => setDraft({ ...draft, hostIsCompany: false })} className={`rounded-xl border px-4 py-2 text-sm font-bold ${!draft.hostIsCompany ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>Individual</button>
          <button type="button" onClick={() => setDraft({ ...draft, hostIsCompany: true })} className={`rounded-xl border px-4 py-2 text-sm font-bold ${draft.hostIsCompany ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>Legal company</button>
        </div>
      </div>
      {draft.hostIsCompany ? (
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Legal company name *</span>
          <input value={draft.hostCompanyName} onChange={(event) => setDraft({ ...draft, hostCompanyName: event.target.value })} className={inputClass} />
          <ErrorText error={errors.hostCompanyName} />
        </label>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">ID type *</span>
          <select value={draft.hostIdType} onChange={(event) => setDraft({ ...draft, hostIdType: event.target.value })} className={inputClass}>
            {ID_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">ID / registration number *</span>
          <input value={draft.hostIdNumber} onChange={(event) => setDraft({ ...draft, hostIdNumber: event.target.value })} className={inputClass} />
          <ErrorText error={errors.hostIdNumber} />
        </label>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">Does this recipient use the same address as the property?</p>
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={() => setDraft({ ...draft, billingSameAsProperty: true })} className={`rounded-xl border px-4 py-2 text-sm font-bold ${draft.billingSameAsProperty ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>Yes</button>
          <button type="button" onClick={() => setDraft({ ...draft, billingSameAsProperty: false })} className={`rounded-xl border px-4 py-2 text-sm font-bold ${!draft.billingSameAsProperty ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200'}`}>No</button>
        </div>
      </div>
      {!draft.billingSameAsProperty ? (
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Billing address *</span>
          <textarea rows={3} value={draft.billingAddress} onChange={(event) => setDraft({ ...draft, billingAddress: event.target.value })} className={inputClass} />
          <ErrorText error={errors.billingAddress} />
        </label>
      ) : null}
    </div>
  );
}

export function ReviewStep({ draft, errors, onJump }) {
  const kind = kindMeta(draft.propertyKind);
  const family = familyForKind(draft.propertyKind);
  const windowLabel = draft.firstCheckInMode === 'date' ? draft.firstCheckInDate : 'As soon as possible';
  return (
    <div className="space-y-4">
      {errors && Object.keys(errors).length ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Some required details are still missing. Use Edit on a section below, or go back through the steps.
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          Review everything, then submit. The stay is sent for approval and marked available so it can open for booking once approved.
        </div>
      )}
      {[
        ['Stay type', `${family.title} · ${kind.label} · ${draft.listingScale === 'multiple' ? 'Portfolio' : 'One property'}`, 0],
        ['Property', draft.title, 1],
        ['Location', draft.location?.formattedAddress || draft.location?.fullAddress || 'Map pin set', 2],
        ['House rules', `In ${draft.checkInFrom}–${draft.checkInUntil} · Out until ${draft.checkOutUntil} · Children ${draft.allowsChildren} · Pets ${draft.allowsPets.replace('_', ' ')}`, 3],
        ['Facilities', (draft.amenities || []).map(amenityLabel).join(', ') || 'None selected', 4],
        ['Units', `${draft.units.length} room type${draft.units.length === 1 ? '' : 's'}`, 5],
        ['Photos', draft.images?.primaryImage || draft.images?.primaryImageFile ? 'Cover photo added' : 'No photos yet', 6],
        ['Rates', `Children ${draft.childrenStayFree ? 'stay free' : 'pay'} · Non-refundable ${draft.nonRefundableEnabled ? 'on' : 'off'} · Weekly ${draft.weeklyEnabled ? 'on' : 'off'}`, 7],
        ['Availability', `${windowLabel} · ${draft.availabilityHorizonDays} days · ${draft.allowLongStays ? '30+ nights yes' : 'max 30 nights'}`, 8],
        ['Invoicing', draft.hostLegalName || 'Missing legal name', 9],
      ].map(([title, value, stepIndex]) => (
        <div key={title} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div>
            <p className="text-sm font-black text-slate-950">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{value}</p>
          </div>
          <button type="button" onClick={() => onJump(stepIndex)} className="text-sm font-bold text-primary">Edit</button>
        </div>
      ))}
    </div>
  );
}
