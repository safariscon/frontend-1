import { t } from './translations';

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

export const websiteSchema = (origin = getOrigin(), language = 'en') => ({
  '@type': 'WebSite',
  '@id': `${origin}/#website`,
  name: SEO_SITE_NAME,
  url: `${origin}/`,
  inLanguage: language || 'en',
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
  { test: /safari|wildlife|game.?drive/i, key: 'safari' },
  { test: /hotel|accommodation|lodge|guest.?house|stay|resort/i, key: 'hotel' },
  { test: /car.?rental|taxi|airport|transport|transfer/i, key: 'transport' },
  { test: /tour|activit|experience|things to do/i, key: 'tours' },
  { test: /cafe|restaurant|food|bakery/i, key: 'food' },
];

const intentCopy = (key, language) => ({
  title: t(`seo.${key}Title`, language),
  description: t(`seo.${key}Description`, language),
  h1: t(`seo.${key}H1`, language),
});

export const matchServiceIntent = (query = '') =>
  SERVICE_INTENTS.find((intent) => intent.test.test(String(query || ''))) || null;

export const getHomeSeo = (language) => {
  const origin = getOrigin();
  return {
    title: t('seo.homeTitle', language),
    description: t('seo.homeDescription', language),
    path: '/',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), {
      '@type': 'FAQPage',
      mainEntity: [1, 2, 3, 4].map((n) => ({
        '@type': 'Question',
        name: t(`home.faq${n}q`, language),
        acceptedAnswer: {
          '@type': 'Answer',
          text: t(`home.faq${n}a`, language),
        },
      })),
    }),
  };
};

export const getServicesSeo = ({ location = '', search = '', language } = {}) => {
  const origin = getOrigin();
  const loc = String(location || '').trim();
  const query = String(search || '').trim();
  const matched = matchServiceIntent(query);
  const intent = matched ? intentCopy(matched.key, language) : null;
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (loc) params.set('location', loc);
  const suffix = params.toString();
  const path = suffix ? `/services?${suffix}` : '/services';
  const crumbs = [
    { label: t('navigation.home', language), to: '/' },
    { label: t('navigation.services', language), to: '/services' },
  ];

  if (loc && intent) {
    const h1 = t('seo.intentInLocationH1', language, { h1: intent.h1.replace(/ in Rwanda$/i, ''), location: loc });
    crumbs.push({ label: h1 });
    return {
      title: t('seo.intentInLocationTitle', language, { h1: intent.h1.replace(/ in Rwanda$/i, ''), location: loc }),
      description: truncateMeta(t('seo.intentInLocationDescription', language, { query, location: loc })),
      path,
      h1,
      jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
    };
  }

  if (loc) {
    crumbs.push({ label: t('seo.servicesInLocationH1', language, { location: loc }) });
    return {
      title: t('seo.servicesInLocationTitle', language, { location: loc }),
      description: truncateMeta(t('seo.servicesInLocationDescription', language, { location: loc })),
      path,
      h1: t('seo.servicesInLocationH1', language, { location: loc }),
      jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
    };
  }

  if (intent) {
    crumbs.push({ label: intent.h1 });
    return {
      title: intent.title,
      description: intent.description,
      path,
      h1: intent.h1,
      jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
    };
  }

  if (query) {
    crumbs.push({ label: query });
    return {
      title: t('seo.queryTitle', language, { query }),
      description: truncateMeta(t('seo.queryDescription', language, { query })),
      path,
      h1: t('seo.queryH1', language, { query }),
      jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
    };
  }

  crumbs.push({ label: t('seo.allServices', language) });
  return {
    title: t('seo.servicesTitle', language),
    description: t('seo.servicesDescription', language),
    path: '/services',
    h1: t('seo.servicesH1', language),
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
  };
};

export const getAboutSeo = (language) => {
  const origin = getOrigin();
  const crumbs = [
    { label: t('navigation.home', language), to: '/' },
    { label: t('seo.aboutSafariscon', language) },
  ];
  return {
    title: t('seo.aboutTitle', language),
    description: t('seo.aboutDescription', language),
    path: '/about',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
  };
};

export const getContactSeo = (language) => {
  const origin = getOrigin();
  const crumbs = [
    { label: t('navigation.home', language), to: '/' },
    { label: t('navigation.contact', language) },
  ];
  return {
    title: t('seo.contactTitle', language),
    description: t('seo.contactDescription', language),
    path: '/contact',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
  };
};

export const getPolicySeo = (pathname = '', language) => {
  const origin = getOrigin();
  const pages = {
    '/how-it-works': {
      title: t('seo.howTitle', language),
      description: t('seo.howDescription', language),
    },
    '/terms': {
      title: t('seo.termsTitle', language),
      description: t('seo.termsDescription', language),
    },
    '/privacy': {
      title: t('seo.privacyTitle', language),
      description: t('seo.privacyDescription', language),
    },
    '/payments': {
      title: t('seo.paymentsTitle', language),
      description: t('seo.paymentsDescription', language),
    },
  };
  const page = pages[pathname] || pages['/how-it-works'];
  const crumbs = [
    { label: t('navigation.home', language), to: '/' },
    { label: page.title.split('|')[0].trim() },
  ];
  return {
    ...page,
    path: pathname,
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
  };
};

export const getProviderRegisterSeo = (language) => {
  const origin = getOrigin();
  const crumbs = [
    { label: t('navigation.home', language), to: '/' },
    { label: t('seo.providerCrumbs', language) },
  ];
  return {
    title: t('seo.providerTitle', language),
    description: t('seo.providerDescription', language),
    path: '/provider-register',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
  };
};

export const getBusinessRegisterSeo = (language) => {
  const origin = getOrigin();
  const crumbs = [
    { label: t('navigation.home', language), to: '/' },
    { label: t('seo.businessCrumbs', language) },
  ];
  return {
    title: t('seo.businessTitle', language),
    description: t('seo.businessDescription', language),
    path: '/business-register',
    jsonLd: withGraph(organizationSchema(origin), websiteSchema(origin, language), breadcrumbSchema(crumbs, origin)),
  };
};

export const getServiceDetailSeo = (hotel = {}, language) => {
  const origin = getOrigin();
  const name = hotel.name || t('verify.service', language);
  const location = hotel.location || hotel.destinationLocation || 'Rwanda';
  const category = hotel.serviceCategory || hotel.type || 'service';
  const description = truncateMeta(
    hotel.description ||
      t('seo.serviceDetailDescription', language, { name, location, category })
  );
  const path = `/business/${hotel.id || hotel._id || ''}`;
  const crumbs = [
    { label: t('navigation.home', language), to: '/' },
    { label: t('navigation.services', language), to: '/services' },
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
    title: truncateMeta(t('seo.serviceDetailTitle', language, { name, location }), 60),
    description,
    path,
    image: hotel.image || hotel.images?.[0] || SEO_DEFAULT_IMAGE,
    jsonLd: withGraph(
      organizationSchema(origin),
      websiteSchema(origin, language),
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
