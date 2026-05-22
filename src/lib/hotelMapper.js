import { decorateBusiness } from './marketplaceTypes';

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop";

export const normalizeHotel = (hotel) => {
  if (!hotel) return null;

  const id = hotel._id || hotel.id;
  const image = hotel.image || hotel.images?.[0] || FALLBACK_IMAGE;
  const basePrice = Number(hotel.basePrice ?? hotel.price ?? 0);
  const rating = Number(hotel.rating ?? 4.5);
  const reviewCount = Number(hotel.reviewCount ?? 0);

  return decorateBusiness({
    ...hotel,
    id,
    type: hotel.type || 'hotel',
    contactInfo: hotel.contactInfo || '',
    image,
    images: hotel.images?.length ? hotel.images : [image],
    services: Array.isArray(hotel.services) ? hotel.services : [],
    price: basePrice,
    basePrice,
    rating,
    reviewCount,
    amenities: Array.isArray(hotel.amenities) ? hotel.amenities : [],
    rooms: Array.isArray(hotel.rooms) ? hotel.rooms : [],
    isFeatured: Boolean(hotel.isFeatured),
  });
};

export const normalizeHotels = (hotels = []) => hotels.map(normalizeHotel);
