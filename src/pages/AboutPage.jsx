import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SeoHead from '../components/SeoHead';
import SeoBreadcrumbs from '../components/SeoBreadcrumbs';
import { getAboutSeo } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const PROVIDER_KEYS = [
  'aboutPage.hotels',
  'aboutPage.cafes',
  'aboutPage.carRentals',
  'aboutPage.tours',
  'aboutPage.venues',
  'aboutPage.travelSupport',
];

export default function AboutPage() {
  const { language } = useLanguage();
  const seo = getAboutSeo(language);
  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <SeoHead {...seo} />
      <Navbar />
      <SeoBreadcrumbs items={[{ label: t('navigation.home', language), to: '/' }, { label: t('aboutPage.eyebrow', language) }]} />
      <main>
        <section className="relative overflow-hidden bg-slate-50 dark:bg-slate-900">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">{t('aboutPage.eyebrow', language)}</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-6xl">{t('aboutPage.title', language)}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {t('aboutPage.lead', language)}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/services" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary-dark">{t('aboutPage.explore', language)}</Link>
                <Link to="/provider-register" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{t('aboutPage.becomeProvider', language)}</Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <img src="/safariscon-about-services.png" alt={t('aboutPage.title', language)} className="h-full min-h-[360px] w-full object-cover" />
            </div>
          </div>
        </section>

        <section className="section-block bg-white dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-wide text-primary">{t('aboutPage.whatWeOrganize', language)}</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t('aboutPage.marketplaceTitle', language)}</h2>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PROVIDER_KEYS.map((key) => (
                <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-sm font-black text-primary dark:bg-blue-950/70 dark:text-blue-200">SC</span>
                  <h3 className="mt-4 font-black text-slate-950 dark:text-white">{t(key, language)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{t('aboutPage.cardLead', language)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
