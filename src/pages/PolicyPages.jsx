import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute, getSafeRedirectPath, needsTermsAcceptance } from '../lib/dashboard';
import { HOW_IT_WORKS_STEPS, SUPPORT_EMAIL, SUPPORT_PHONE } from '../lib/policyCopy';
import { useState } from 'react';
import SeoHead from '../components/SeoHead';
import SeoBreadcrumbs from '../components/SeoBreadcrumbs';
import { getPolicySeo } from '../lib/seo';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

const NAV = [
  ['legal.navHow', '/how-it-works'],
  ['legal.navTerms', '/terms'],
  ['legal.navPrivacy', '/privacy'],
  ['legal.navPayments', '/payments'],
];

export function HowItWorksPage({ embedded = false }) {
  const { language } = useLanguage();
  return (
    <PolicyShell embedded={embedded} title={t('legal.howTitle', language)} lead={t('legal.howLead', language)}>
      <ol className="space-y-4">
        {HOW_IT_WORKS_STEPS.map((_, index) => {
          const n = index + 1;
          return (
            <li key={n} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-wide text-primary">{t('legal.step', language, { n })}</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{t(`howSteps.${n}title`, language)}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t(`howSteps.${n}body`, language)}</p>
            </li>
          );
        })}
      </ol>
      <AuthSection />
      <p className="mt-6 text-sm text-slate-600">{t('legal.defaultCancelNote', language)}</p>
    </PolicyShell>
  );
}

export function TermsPage({ embedded = false }) {
  const { language } = useLanguage();
  return (
    <PolicyShell embedded={embedded} title={t('legal.termsTitle', language)} lead={t('legal.termsLead', language)}>
      <TermsAcceptancePanel />
      <Section title={t('legal.forGuests', language)}>
        <ul className="list-disc space-y-2 pl-5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <li key={n}>{t(`guestTerms${n}`, language)}</li>
          ))}
        </ul>
      </Section>
      <Section title={t('legal.forProviders', language)}>
        <ul className="list-disc space-y-2 pl-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <li key={n}>{t(`legal.provider${n}`, language)}</li>
          ))}
        </ul>
      </Section>
      <Section title={t('legal.platform', language)}>
        <ul className="list-disc space-y-2 pl-5">
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`legal.platform${n}`, language)}</li>
          ))}
        </ul>
      </Section>
      <AuthSection />
      <SupportLine />
    </PolicyShell>
  );
}

export function PrivacyPage({ embedded = false }) {
  const { language } = useLanguage();
  return (
    <PolicyShell embedded={embedded} title={t('legal.privacyTitle', language)} lead={t('legal.privacyLead', language)}>
      <Section title={t('legal.whatWeCollect', language)}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-2 pr-4">{t('legal.data', language)}</th><th className="py-2">{t('legal.why', language)}</th></tr></thead>
            <tbody className="align-top text-slate-700">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <tr key={n} className="border-b border-slate-100"><td className="py-2 pr-4 font-semibold">{t(`legal.collect${n}data`, language)}</td><td className="py-2">{t(`legal.collect${n}why`, language)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title={t('legal.whatWeDoNot', language)}>
        <ul className="list-disc space-y-2 pl-5">
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>{t(`legal.not${n}`, language)}</li>
          ))}
        </ul>
      </Section>
      <Section title={t('legal.hiddenVsUnlocked', language)}>
        <p>{t('legal.hiddenBody', language)}</p>
      </Section>
      <Section title={t('legal.whoProcesses', language)}>
        <ul className="list-disc space-y-2 pl-5">
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`legal.processor${n}`, language)}</li>
          ))}
        </ul>
      </Section>
      <Section title={t('legal.yourControls', language)}>
        <p>{t('legal.controlsBody', language, { email: SUPPORT_EMAIL })}</p>
      </Section>
      <Section title={t('legal.security', language)}>
        <p>{t('legal.securityBody', language)}</p>
      </Section>
      <SupportLine />
    </PolicyShell>
  );
}

export function PaymentsPolicyPage({ embedded = false }) {
  const { language } = useLanguage();
  return (
    <PolicyShell embedded={embedded} title={t('legal.paymentsPageTitle', language)} lead={t('legal.paymentsPageLead', language)}>
      <Section title={t('legal.payingTitle', language)}>
        <ul className="list-disc space-y-2 pl-5">
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>{t(`legal.pay${n}`, language)}</li>
          ))}
        </ul>
      </Section>
      <Section title={t('legal.afterPayTitle', language)}>
        <p>{t('legal.afterPayBody', language)}</p>
        <blockquote className="mt-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-950">{t('legal.afterPayQuote', language)}</blockquote>
      </Section>
      <Section title={t('legal.cancellationTitle', language)}>
        <p>{t('legal.cancellationBody', language)}</p>
      </Section>
      <Section title={t('legal.moneyTitle', language)}>
        <ul className="list-disc space-y-2 pl-5">
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`legal.money${n}`, language)}</li>
          ))}
        </ul>
      </Section>
      <Section title={t('legal.atVenue', language)}>
        <p>{t('legal.atVenueBody', language)}</p>
      </Section>
      <SupportLine />
    </PolicyShell>
  );
}

function PolicyShell({ title, lead, children, embedded = false }) {
  const { language } = useLanguage();
  const location = useLocation();
  const seo = getPolicySeo(location.pathname, language);
  const body = (
    <>
      {!embedded && <p className="text-xs font-black uppercase tracking-wide text-primary">{t('legal.policies', language)}</p>}
      <h1 className={`${embedded ? 'text-xl' : 'mt-2 text-3xl'} font-black text-slate-950`}>{title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{lead}</p>
      {!embedded && (
        <nav className="mt-6 flex flex-wrap gap-2">
          {NAV.map(([labelKey, to]) => (
            <Link key={to} to={to} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary">
              {t(labelKey, language)}
            </Link>
          ))}
        </nav>
      )}
      <div className="mt-8 space-y-6 text-sm leading-6 text-slate-700">{children}</div>
    </>
  );

  if (embedded) return <div>{body}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SeoHead {...seo} />
      <Navbar />
      <SeoBreadcrumbs items={[{ label: t('navigation.home', language), to: '/' }, { label: title }]} />
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-3xl">{body}</div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AuthSection() {
  const { language } = useLanguage();
  return (
    <Section title={t('legal.accountsSignIn', language)}>
      <p className="font-semibold text-slate-900">{t('legal.whoCanRegister', language)}</p>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>{t('legal.guestRegister', language)}</li>
        <li>{t('legal.providerRegister', language)}</li>
      </ul>
      <p className="mt-4 font-semibold text-slate-900">{t('legal.emailLoginTitle', language)}</p>
      <p className="mt-2">{t('legal.emailLoginBody', language)}</p>
    </Section>
  );
}

function SupportLine() {
  const { language } = useLanguage();
  return (
    <p className="text-sm text-slate-600">
      {t('legal.supportLine', language)} <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · {SUPPORT_PHONE}
    </p>
  );
}

function TermsAcceptancePanel() {
  const { language } = useLanguage();
  const { user, acceptTerms, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const required = needsTermsAcceptance(user) || location.state?.requireAcceptance;

  if (!required) return null;

  const accept = async () => {
    setBusy(true);
    setError('');
    const result = await acceptTerms();
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    const nextPath = getSafeRedirectPath(location.state?.afterRedirect) || getDashboardRoute(result.user || user);
    navigate(nextPath, { replace: true });
  };

  const decline = async () => {
    setBusy(true);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-lg font-black text-amber-950">{t('legal.acceptContinue', language)}</h2>
      <p className="mt-2 text-sm text-amber-900">{t('legal.mustAccept', language)}</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={accept} className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white disabled:opacity-50">
          {busy ? t('legal.saving', language) : t('legal.acceptButton', language)}
        </button>
        <button type="button" disabled={busy} onClick={decline} className="rounded-xl border border-amber-300 bg-white px-5 py-3 text-sm font-bold text-amber-900">
          {t('legal.decline', language)}
        </button>
      </div>
    </section>
  );
}
