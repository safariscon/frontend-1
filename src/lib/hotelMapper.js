import { decorateBusiness } from './marketplaceTypes';

export const normalizeHotel = (hotel) => {
  if (!hotel) return null;

  const id = hotel._id || hotel.id;
  const images = Array.isArray(hotel.images) ? hotel.images.filter(Boolean) : [];
  const image = hotel.image || images[0] || "";
  const basePrice = Number(hotel.basePrice ?? hotel.price ?? 0);
  const priceText = hotel.priceText || hotel.primaryService?.priceText || "";
  const rating = Number(hotel.rating ?? 4.5);
  const reviewCount = Number(hotel.reviewCount ?? 0);

  return decorateBusiness({
    ...hotel,
    id,
    type: hotel.type || 'hotel',
    contactInfo: hotel.contactInfo || '',
    image,
    images,
    services: Array.isArray(hotel.services) ? hotel.services : [],
    price: basePrice,
    basePrice,
    priceText,
    primaryService: hotel.primaryService || null,
    serviceItems: Array.isArray(hotel.serviceItems) ? hotel.serviceItems : [],
    rating,
    reviewCount,
    amenities: Array.isArray(hotel.amenities) ? hotel.amenities : [],
    isFeatured: Boolean(hotel.isFeatured),
  });
};

export const normalizeHotels = (hotels = []) => hotels.map(normalizeHotel);
