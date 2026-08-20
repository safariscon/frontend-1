export const normalizeHotel = (hotel) => {
  if (!hotel) return null;

  const id = hotel._id || hotel.id;
  const name = hotel.name || hotel.title || hotel.serviceName || '';
  const uploadedImages = Array.isArray(hotel.images)
    ? hotel.images.filter((item) => /^https?:\/\//.test(String(item || ""))).slice(0, 3)
    : [];
  const legacyImage = /^https?:\/\//.test(String(hotel.image || '')) ? hotel.image : '';
  const primaryImage = /^https?:\/\//.test(String(hotel.primaryImage || ''))
    ? hotel.primaryImage
    : '';
  const image = primaryImage || uploadedImages[0] || legacyImage;
  const orderedImages = image
    ? [image, ...uploadedImages.filter((url) => url !== image)].slice(0, 3)
    : uploadedImages;
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
    primaryImage: image,
    images: orderedImages.length ? orderedImages : (image ? [image] : []),
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
      primaryImage: image,
      images: orderedImages,
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
    provider: hotel.provider || ((hotel.providerName || hotel.sellerName || hotel.sellerId || hotel.providerId)
      ? {
          id: hotel.providerId || hotel.sellerUserId || hotel.userId?._id || hotel.userId || hotel.businessId?._id || hotel.businessId,
          name: hotel.providerName || hotel.sellerName || hotel.provider?.name || '',
          sellerId: hotel.sellerId || hotel.provider?.sellerId || '',
        }
      : null),
  };
};

export const normalizeHotels = (hotels = []) => hotels.map(normalizeHotel);
