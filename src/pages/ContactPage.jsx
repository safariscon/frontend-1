import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SeoHead from '../components/SeoHead';
import SeoBreadcrumbs from '../components/SeoBreadcrumbs';
import { getContactSeo } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const CONTACT_OPTIONS = [
  ['contactPage.customerSupport', 'contactPage.customerSupportDesc', 'info@safariscon.rw'],
  ['contactPage.providerOnboarding', 'contactPage.providerOnboardingDesc', 'providers@safariscon.rw'],
  ['contactPage.partnerships', 'contactPage.partnershipsDesc', 'partners@safariscon.rw'],
];

export default function ContactPage() {
  const { language } = useLanguage();
  const seo = getContactSeo(language);
  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <SeoHead {...seo} />
      <Navbar />
      <SeoBreadcrumbs items={[{ label: t('navigation.home', language), to: '/' }, { label: t('contact', language) }]} />
      <main>
        <section className="bg-slate-50 dark:bg-slate-900">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">{t('contactPage.eyebrow', language)}</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-6xl">{t('contactPage.title', language)}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {t('contactPage.lead', language)}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/services" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary-dark">{t('contactPage.browse', language)}</Link>
                <Link to="/register" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{t('contactPage.createAccount', language)}</Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-950">
              <div className="grid gap-4">
                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('contactPage.yourName', language)}</span>
                  <input className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" placeholder={t('contactPage.fullNamePlaceholder', language)} />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('contactPage.emailAddress', language)}</span>
                  <input type="email" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" placeholder={t('contactPage.emailPlaceholder', language)} />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('contactPage.message', language)}</span>
                  <textarea className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" placeholder={t('contactPage.messagePlaceholder', language)} />
                </label>
                <a href="mailto:info@safariscon.rw" className="rounded-xl bg-primary px-5 py-3 text-center text-sm font-black text-white hover:bg-primary-dark">
                  {t('contactPage.emailSafariscon', language)}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block bg-white dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid gap-4 md:grid-cols-3">
              {CONTACT_OPTIONS.map(([titleKey, descriptionKey, email]) => (
                <a key={email} href={`mailto:${email}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:border-primary hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-800">
                  <h2 className="font-black text-slate-950 dark:text-white">{t(titleKey, language)}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{t(descriptionKey, language)}</p>
                  <p className="mt-4 text-sm font-black text-primary dark:text-blue-300">{email}</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
