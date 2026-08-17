export const SEO_SITE_NAME = 'SafarisCon';
export const SEO_DEFAULT_ORIGIN = 'https://safariscon.eserveconn.com';
export const SEO_DEFAULT_IMAGE = '/safariscon-hero-services.png';
export const SEO_EMAIL = 'info@safariscon.rw';
export const SEO_PHONE = '+250 788 000 000';
export const SEO_LOCALITY = 'Kigali';
export const SEO_COUNTRY = 'RW';

export const getOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return SEO_DEFAULT_ORIGIN;
};

export const absoluteUrl = (path = '/', origin = getOrigin()) => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized}`;
};

export const truncateMeta = (value, max = 158) => {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
};

export const organizationSchema = (origin = getOrigin()) => ({
  '@type': 'Organization',
  '@id': `${origin}/#organization`,
  name: SEO_SITE_NAME,
  alternateName: ['Safaris Con', 'SafarisConnect', 'Safaris Connect', 'Safari Connect', 'SafariCon'],
  url: `${origin}/`,
  sameAs: ['https://eserveconn.com/products'],
  logo: absoluteUrl('/favicon.svg', origin),
  email: SEO_EMAIL,
  telephone: SEO_PHONE,
  address: {
    '@type': 'PostalAddress',
    addressLocality: SEO_LOCALITY,
    addressCountry: SEO_COUNTRY,
  },
  areaServed: {
    '@type': 'Country',
    name: 'Rwanda',
  },
});

export const websiteSchema = (origin = getOrigin()) => ({
  '@type': 'WebSite',
  '@id': `${origin}/#website`,
  name: SEO_SITE_NAME,
  url: `${origin}/`,
  inLanguage: 'en',
  publisher: { '@id': `${origin}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${origin}/services?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbSchema = (items = [], origin = getOrigin()) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    item: item.to ? absoluteUrl(item.to, origin) : undefined,
  })),
});

export const withGraph = (...nodes) => ({
  '@context': 'https://schema.org',
  '@graph': nodes.filter(Boolean),
});

const SERVICE_INTENTS = [
  {
    test: /safari|wildlife|game.?drive/i,
    title: 'Rwanda safari booking | SafarisCon',
    description:
      'Browse Rwanda safari tours and travel experiences on SafarisCon. Compare providers and book safari services online in Rwanda.',
    h1: 'Rwanda safari tours and bookings',
  },
  {
    test: /hotel|accommodation|lodge|guest.?house|stay|resort/i,
    title: 'Hotel booking Rwanda | SafarisCon',
    description:
      'Find hotels, lodges, and accommodation in Rwanda and Kigali. Compare stays and book accommodation online with SafarisCon.',
    h1: 'Hotels and accommodation in Rwanda',
  },
  {
    test: /car.?rental|taxi|airport|transport|transfer/i,
    title: 'Transport booking Rwanda | SafarisCon',
    description:
      'Book transport in Rwanda including car hire, taxi booking, and Kigali airport transfers through verified SafarisCon providers.',
    h1: 'Transport and car hire in Rwanda',
  },
  {
    test: /tour|activit|experience|things to do/i,
    title: 'Tours and activities in Rwanda | SafarisCon',
    description:
      'Discover things to do in Rwanda and Kigali. Book tours, activities, and local experiences online with SafarisCon.',
    h1: 'Tours and activities in Rwanda',
  },
  {
    test: /cafe|restaurant|food|bakery/i,
    title: 'Food and cafe services in Rwanda | SafarisCon',
    description:
      'Find cafes, restaurants, and food services in Rwanda. Browse local providers and book through SafarisCon.',
    h1: 'Cafes and food services in Rwanda',
  },
];

export const matchServiceIntent = (query = '') =>
  SERVICE_INTENTS.find((intent) => intent.test.test(String(query || ''))) || null;

export const getHomeSeo = () => {
  const origin = getOrigin();
  return {
    title: 'SafarisCon | Official Rwanda booking platform',
    description:
      'SafarisCon is the official Rwanda service marketplace at safariscon.eserveconn.com. Find hotels, tours, transport, and local providers in Kigali, then book online.',
    path: '/',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Can visitors browse services without an account?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Public visitors can search and view available service providers before deciding to log in or register.',
          },
        },
        {
          '@type': 'Question',
          name: 'When do I need an account?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You need an account when you want to book, pay, manage requests, or unlock provider contact details.',
          },
        },
        {
          '@type': 'Question',
          name: 'Who can join as a provider?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Hotels, cafes, restaurants, car rental teams, tour operators, venues, and other travel-related service providers can register.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does SafarisCon protect bookings?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The booking flow keeps provider details structured, records payment steps, and gives customers confirmation documents for their service.',
          },
        },
      ],
    }),
  };
};

export const getServicesSeo = ({ location = '', search = '' } = {}) => {
  const origin = getOrigin();
  const loc = String(location || '').trim();
  const query = String(search || '').trim();
  const intent = matchServiceIntent(query);
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (loc) params.set('location', loc);
  const suffix = params.toString();
  const path = suffix ? `/services?${suffix}` : '/services';
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Services', to: '/services' },
  ];

  if (loc && intent) {
    crumbs.push({ label: `${intent.h1} in ${loc}` });
    return {
      title: `${intent.h1.replace(' in Rwanda', '')} in ${loc} | SafarisCon`,
      description: truncateMeta(
        `Find ${query} services in ${loc}, Rwanda. Browse verified providers and book online with SafarisCon.`
      ),
      path,
      h1: `${intent.h1.replace(' in Rwanda', '')} in ${loc}`,
      jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
    };
  }

  if (loc) {
    crumbs.push({ label: `Services in ${loc}` });
    return {
      title: `Services in ${loc} | SafarisCon`,
      description: truncateMeta(
        `Find and book hotels, tours, transport, and local services in ${loc} on SafarisCon, the Rwanda service marketplace.`
      ),
      path,
      h1: `Services in ${loc}`,
      jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
    };
  }

  if (intent) {
    crumbs.push({ label: intent.h1 });
    return {
      title: intent.title,
      description: intent.description,
      path,
      h1: intent.h1,
      jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
    };
  }

  if (query) {
    crumbs.push({ label: query });
    return {
      title: `${query} services in Rwanda | SafarisCon`,
      description: truncateMeta(
        `Search ${query} services in Rwanda on SafarisCon. Compare providers and book online across Kigali and other destinations.`
      ),
      path,
      h1: `Find ${query} services in Rwanda`,
      jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
    };
  }

  crumbs.push({ label: 'All services' });
  return {
    title: 'Find services in Rwanda | SafarisCon',
    description:
      'Browse hotels, tours, transport, cafes, and local service providers on SafarisCon. Book services online across Rwanda and Kigali.',
    path: '/services',
    h1: 'Find and book services in Rwanda',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
  };
};

export const getAboutSeo = () => {
  const origin = getOrigin();
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'About SafarisCon' },
  ];
  return {
    title: 'About SafarisCon | Rwanda service marketplace',
    description:
      'SafarisCon connects travelers with hotels, tours, transport, and local service providers in Rwanda. Learn how the marketplace helps customers and businesses book in one place.',
    path: '/about',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
  };
};

export const getContactSeo = () => {
  const origin = getOrigin();
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Contact' },
  ];
  return {
    title: 'Contact SafarisCon | Booking and provider support',
    description:
      'Contact SafarisCon for booking help, provider onboarding, and marketplace questions in Rwanda. Reach the Kigali team about services, payments, and accounts.',
    path: '/contact',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
  };
};

export const getPolicySeo = (pathname = '') => {
  const origin = getOrigin();
  const pages = {
    '/how-it-works': {
      title: 'How SafarisCon booking works | Online booking Rwanda',
      description:
        'Learn how SafarisCon online booking works in Rwanda: browse services, request a booking, pay in the app, and unlock provider details after payment.',
    },
    '/terms': {
      title: 'Terms of use | SafarisCon',
      description:
        'Read the SafarisCon terms of use for guests and service providers booking hotels, tours, transport, and other services in Rwanda.',
    },
    '/privacy': {
      title: 'Privacy policy | SafarisCon',
      description:
        'See how SafarisCon handles account, booking, and payment data for customers and service providers in Rwanda.',
    },
    '/payments': {
      title: 'Payments and cancellations | SafarisCon',
      description:
        'Understand SafarisCon payments, refunds, and cancellation windows for service bookings in Rwanda.',
    },
  };
  const page = pages[pathname] || pages['/how-it-works'];
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: page.title.split('|')[0].trim() },
  ];
  return {
    ...page,
    path: pathname,
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
  };
};

export const getProviderRegisterSeo = () => {
  const origin = getOrigin();
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Become a provider' },
  ];
  return {
    title: 'Offer services on SafarisCon | Providers in Rwanda',
    description:
      'Complete your SafarisCon provider account to list hotels, tours, transport, or local services in Rwanda and connect with customers online.',
    path: '/provider-register',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
  };
};

export const getBusinessRegisterSeo = () => {
  const origin = getOrigin();
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Register a business' },
  ];
  return {
    title: 'Register your business | SafarisCon Rwanda',
    description:
      'Add your business to SafarisCon and offer services online in Rwanda. Publish listings for hotels, tours, transport, food, and other local services.',
    path: '/business-register',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin), breadcrumbSchema(crumbs, origin)),
  };
};

export const getServiceDetailSeo = (hotel = {}) => {
  const origin = getOrigin();
  const name = hotel.name || 'Service';
  const location = hotel.location || hotel.destinationLocation || 'Rwanda';
  const category = hotel.serviceCategory || hotel.type || 'service';
  const description = truncateMeta(
    hotel.description ||
      `Book ${name} in ${location} on SafarisCon. Compare ${category} providers and complete your booking online in Rwanda.`
  );
  const path = `/business/${hotel.id || hotel._id || ''}`;
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Services', to: '/services' },
    { label: name },
  ];
  const offer = Number(hotel.price || hotel.basePrice)
    ? {
        '@type': 'Offer',
        priceCurrency: 'RWF',
        price: Number(hotel.price || hotel.basePrice),
        availability: hotel.status === 'unavailable' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      }
    : undefined;

  return {
    title: truncateMeta(`${name} in ${location} | Book on SafarisCon`, 60),
    description,
    path,
    image: hotel.image || hotel.images?.[0] || SEO_DEFAULT_IMAGE,
    jsonLd: withGraph(
      organizationSchema(origin),
      websiteSchema(origin),
      breadcrumbSchema(crumbs, origin),
      {
        '@type': 'Service',
        name,
        description,
        serviceType: category,
        areaServed: location,
        image: hotel.image ? absoluteUrl(hotel.image, origin) : undefined,
        provider: {
          '@type': 'LocalBusiness',
          name,
          address: {
            '@type': 'PostalAddress',
            addressLocality: location,
            addressCountry: SEO_COUNTRY,
          },
        },
        offers: offer,
        url: absoluteUrl(path, origin),
      }
    ),
  };
};

export const noindexSeo = ({ title, description, path }) => ({
  title,
  description,
  path,
  robots: 'noindex, nofollow',
});
