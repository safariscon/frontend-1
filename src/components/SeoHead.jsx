import { useEffect } from 'react';
import { SEO_DEFAULT_IMAGE, SEO_SITE_NAME, absoluteUrl, getOrigin } from '../lib/seo';

const MARK = 'data-seo';
const MARK_VALUE = 'safariscon';

const upsertMeta = (attr, key, content) => {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"][${MARK}="${MARK_VALUE}"]`);
  if (!el) {
    el = document.head.querySelector(`meta[${attr}="${key}"]`);
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(MARK, MARK_VALUE);
  el.setAttribute('content', content);
};

const upsertLink = (rel, href) => {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"][${MARK}="${MARK_VALUE}"]`);
  if (!el) {
    el = document.head.querySelector(`link[rel="${rel}"]`);
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute(MARK, MARK_VALUE);
  el.setAttribute('href', href);
};

const upsertJsonLd = (jsonLd) => {
  const id = 'safariscon-jsonld';
  let el = document.getElementById(id);
  if (!jsonLd) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(jsonLd);
};

export default function SeoHead({
  title,
  description,
  path,
  image = SEO_DEFAULT_IMAGE,
  robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  type = 'website',
  jsonLd = null,
}) {
  const jsonLdKey = JSON.stringify(jsonLd);

  useEffect(() => {
    const origin = getOrigin();
    const fullTitle = title || SEO_SITE_NAME;
    const canonical = absoluteUrl(path || window.location.pathname, origin);
    const imageUrl = absoluteUrl(image || SEO_DEFAULT_IMAGE, origin);

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'author', SEO_SITE_NAME);
    upsertMeta('name', 'application-name', SEO_SITE_NAME);
    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', SEO_SITE_NAME);
    const OG_LOCALES = { en: 'en_RW', rw: 'rw_RW', fr: 'fr_RW', sw: 'sw_RW' };
    const htmlLang = document.documentElement.lang || 'en';
    upsertMeta('property', 'og:locale', OG_LOCALES[htmlLang] || 'en_RW');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:alt', fullTitle);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);

    upsertJsonLd(jsonLd);
  }, [title, description, path, image, robots, type, jsonLd, jsonLdKey]);

  return null;
}
