export const normalizeHotel = (hotel) => {
  if (!hotel) return null;

  const id = hotel._id || hotel.id;
  const name = hotel.name || hotel.title || hotel.serviceName || '';
  const uploadedImages = Array.isArray(hotel.images)
    ? hotel.images.filter((item) => /^https?:\/\//.test(String(item || ""))).slice(0, 3)
    : [];
  const legacyImage = /^https?:\/\//.test(String(hotel.image || '')) ? hotel.image : '';
  const image = uploadedImages[0] || legacyImage;
  const basePrice = Number(hotel.basePrice ?? hotel.price ?? 0);
  const rating = Number(hotel.rating ?? 4.5);
  const reviewCount = Number(hotel.reviewCount ?? 0);

  return {
    ...hotel,
    id,
    name,
    type: hotel.type || hotel.category || hotel.serviceType || 'service',
    contactInfo: hotel.contactInfo || '',
    image,
    images: uploadedImages.length ? uploadedImages : (image ? [image] : []),
    services: Array.isArray(hotel.services) ? hotel.services : [],
    serviceCategory: hotel.type || hotel.category || 'service',
    businessType: hotel.type || hotel.category || 'service',
    primaryService: {
      _id: id,
      title: name,
      name,
      category: hotel.type || hotel.category || 'service',
      serviceType: hotel.type || hotel.category || 'service',
      location: hotel.location,
      status: hotel.status || 'available',
      priceText: hotel.priceText || (basePrice ? `${basePrice}` : ''),
      pricing: { amount: basePrice, currency: 'RWF', unit: 'service' },
      availableQuantity: hotel.quantityRemaining ?? hotel.availableQuantity ?? 1,
      images: uploadedImages,
      bookingForm: hotel.bookingForm,
      bookingMode: hotel.bookingMode || 'manual',
    },
    price: basePrice,
    basePrice,
    rating,
    reviewCount,
    amenities: Array.isArray(hotel.amenities) ? hotel.amenities : [],
    rooms: Array.isArray(hotel.rooms) ? hotel.rooms : [],
    isFeatured: Boolean(hotel.isFeatured),
    provider: hotel.provider || null,
  };
};

export const normalizeHotels = (hotels = []) => hotels.map(normalizeHotel);
