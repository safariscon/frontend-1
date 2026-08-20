export const normalizeHotel = (hotel) => {
  if (!hotel) return null;

  const id = hotel._id || hotel.id;
  const name = hotel.name || hotel.title || hotel.serviceName || '';
  const uploadedImages = Array.isArray(hotel.images)
    ? hotel.images.filter((item) => /^https?:\/\//.test(String(item || ''))).slice(0, 5)
    : [];
  const legacyImage = /^https?:\/\//.test(String(hotel.image || '')) ? hotel.image : '';
  const primaryImage = /^https?:\/\//.test(String(hotel.primaryImage || ''))
    ? hotel.primaryImage
    : '';
  const image = primaryImage || uploadedImages[0] || legacyImage;
  const orderedImages = image
    ? [image, ...uploadedImages.filter((url) => url !== image)].slice(0, 5)
    : uploadedImages;
  const basePrice = Number(hotel.basePrice ?? hotel.price ?? 0);
  const rating = Number(hotel.rating ?? 4.5);
  const reviewCount = Number(hotel.reviewCount ?? 0);
  const categorySlug = hotel.category?.slug || hotel.categorySlug || hotel.type || hotel.category || 'service';
  const categoryName = hotel.category?.name || hotel.categoryName || categorySlug;

  return {
    ...hotel,
    id,
    name,
    type: categorySlug,
    contactInfo: hotel.contactInfo || '',
    image,
    primaryImage: image,
    images: orderedImages.length ? orderedImages : (image ? [image] : []),
    services: Array.isArray(hotel.services) ? hotel.services : [],
    serviceCategory: categorySlug,
    businessType: categorySlug,
    categoryId: hotel.categoryId || hotel.category?._id || '',
    schemaSnapshot: hotel.schemaSnapshot || null,
    platformCommissionPercent: hotel.platformCommissionPercent ?? hotel.commissionPercentage,
    primaryService: {
      ...hotel,
      _id: id,
      title: name,
      name,
      category: categorySlug,
      categoryName,
      serviceType: categorySlug,
      location: hotel.location || hotel.serviceLocation,
      status: hotel.status || 'available',
      priceText: hotel.priceText || (basePrice ? `${basePrice}` : ''),
      pricing: { amount: basePrice, currency: 'RWF', unit: 'service' },
      availableQuantity: hotel.quantityRemaining ?? hotel.availableQuantity ?? 1,
      primaryImage: image,
      images: orderedImages,
      bookingForm: hotel.bookingForm,
      bookingMode: hotel.bookingMode || 'manual',
      schemaSnapshot: hotel.schemaSnapshot || null,
      availabilityTable: hotel.availabilityTable,
      listingAttributes: hotel.listingAttributes,
      cancelPenaltyPercent: hotel.cancelPenaltyPercent,
      platformCommissionPercent: hotel.platformCommissionPercent ?? hotel.commissionPercentage,
      cancelWindowHours: hotel.cancelWindowHours,
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
