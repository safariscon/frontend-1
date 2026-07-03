const slug = (label) => label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const groups = [
  ['Accommodation', [
    'Hotel rooms', 'Resort', 'Motel', 'Hostel', 'Bed & Breakfast / B&B', 'Inn', 'Boutique Hotel',
    'Apartment Hotel / Serviced Apartment', 'Villa / Chalet / Cabin', 'Glamping Site', 'Campsite / RV Park',
    'Capsule Hotel', 'Eco-Lodge', 'Farm Stay', 'Casino Hotel', 'Guesthouse / Pension', 'Apartments',
    'Homestay', 'Tent Rentals',
  ]],
  ['Destination Experiences', [
    'Coffee Experience', 'Tea Experience', 'Traditional Food Experience', 'Traditional Beer Experience',
    'Culture Center', 'Banana Beer Experience', 'Museums', 'Art Gallery', 'City Tour', 'Street Food Tour',
    'Wine Tasting / Vineyard Tour', 'Distillery / Brewery Tour', 'Hop-On Hop-Off Bus Tour',
    'Boat Charter / Canal Cruise', 'Wildlife Safari / Game Drive', 'Eco-parks',
    'Scuba Diving / Snorkeling Charter', 'Adventure Experiences', 'Historical / Archeological Site',
    'Theme Park / Water Park', 'Performance / Theater Show', 'Wellness / Yoga Retreat', 'Village Walks',
    'Hiking Experiences', 'Voluntourism', 'Cow Milking Experiences',
  ]],
  ['Transport Services', [
    'Commercial Airline', 'Charter / Private Jet', 'Airport Shuttle / Transfer', 'Car Rental',
    'Campervan / RV Rental', 'Rideshare / Taxi Stand', 'Scooter / Bicycle Share', 'Intercity Coach Bus',
    'Scenic / Heritage Train', 'Ferry / Hydrofoil', 'Water Boat Taxi', 'Motorbike Rentals',
  ]],
  ['Venue Rentals', [
    'Convention / Exhibition Center', 'Hotel Ballroom / Banquet Hall', 'Co-working / Meeting Room',
    'Rooftop Terrace', 'Historic Estate / Castle', 'Retreat Center',
  ]],
  ['Food Services', [
    'Fine Dining Restaurant', 'Casual Dining Restaurant', 'Bistro / Brasserie', 'Cafe / Coffee Shop',
    'Bakery / Patisserie', 'Food Truck / Mobile Kiosk', 'Food Court / Food Hall', 'Pizzeria',
    'Steakhouse', 'Buffet / Cafeteria', 'Sandwich Shop',
  ]],
  ['Bar Services', [
    'Pub / Tavern', 'Cocktail Lounge', 'Speakeasy', 'Rooftop Bar', 'Wine Bar', 'Sports Bar',
    'Nightclub / Discotheque', 'Beach Club / Tiki Bar', 'Microbrewery / Taproom', 'Dive Bar',
    'Karaoke Bar', 'Arcade / Board Game Bar', 'Liquor Store',
  ]],
  ['Other Main Tourist-Related Services', [
    'Travel Agency Storefront', 'Destination Management Company / DMC', 'Souvenir / Gift Shop',
    'Artisan / Craft Market', 'Duty-Free Airport Shop', 'Day Spa / Wellness Center',
    'Luggage Storage Shop / Locker', 'Information Desks', 'Foreign Exchange / FX Booth',
    'Gear Rental Shop', 'Freelancer Guides', 'Travel Insurance Agency',
  ]],
];

export const SERVICE_CATEGORY_GROUPS = groups.map(([label, labels]) => ({
  label,
  options: labels.map((item) => [slug(item), item]),
}));

export const SERVICE_CATEGORY_TUPLES = SERVICE_CATEGORY_GROUPS.map((group) => [group.label, group.options]);
