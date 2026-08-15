import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute, needsTermsAcceptance } from '../lib/dashboard';
import { HOW_IT_WORKS_STEPS, SUPPORT_EMAIL, SUPPORT_PHONE } from '../lib/policyCopy';
import { useState } from 'react';

const NAV = [
  ['How it works', '/how-it-works'],
  ['Terms of use', '/terms'],
  ['Privacy policy', '/privacy'],
  ['Payments & refunds', '/payments'],
];

export function HowItWorksPage() {
  return (
    <PolicyShell title="How SafarisCon works" lead="SafarisCon is a booking marketplace. You pay in the app. We hold the money, protect provider details until you pay, and only then you get what you need to travel.">
      <ol className="space-y-4">
        {HOW_IT_WORKS_STEPS.map(([title, body], index) => (
          <li key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-wide text-primary">Step {index + 1}</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </li>
        ))}
      </ol>
      <AuthSection />
      <p className="mt-6 text-sm text-slate-600">Each listing shows its own cancel window and fee. Defaults are 6 hours and 20%.</p>
    </PolicyShell>
  );
}

export function TermsPage() {
  return (
    <PolicyShell title="Terms of use" lead="These terms describe the current SafarisCon product for guests and providers.">
      <TermsAcceptancePanel />
      <Section title="For guests">
        <ul className="list-disc space-y-2 pl-5">
          <li>You must enter a valid email and complete OTP verification.</li>
          <li>You are responsible for the accuracy of booking dates, times, guest counts, and the location fields you submit.</li>
          <li>A booking is a contract to pay the displayed full price. Promotions apply only if the listing still has them when you book.</li>
          <li>Provider identity is hidden until you pay. Using the app to harvest contacts before payment is not allowed.</li>
          <li>After payment you receive a booking code. Bring it (or the QR / receipt) to the venue.</li>
          <li>Cancellation is only inside the window on that booking. After that, no refund through this cancel button.</li>
          <li>SafarisCon is the marketplace and payment holder. The stay / activity is performed by the listed provider.</li>
        </ul>
      </Section>
      <Section title="For providers">
        <ul className="list-disc space-y-2 pl-5">
          <li>Listings go public after SafarisCon approval. Admin sets your commission; guests never see that number.</li>
          <li>You must save MoMo or bank payout details before customers can pay you.</li>
          <li>You may set cancel window hours and cancel penalty % on the listing (defaults 6 hours / 20%).</li>
          <li>Guest money is held until the cancel window ends (or the guest cancels in time). You are not paid the moment they pay.</li>
          <li>If the guest cancels in time, you receive your share of the cancellation fee, not the full booking.</li>
          <li>If they do not cancel, you receive your share of the full booking after the window, once SafarisCon confirms the payout.</li>
          <li>Completing a booking means verifying the code only — do not collect a second cash amount.</li>
          <li>Do not put payout account numbers on the public service form.</li>
        </ul>
      </Section>
      <Section title="Platform">
        <ul className="list-disc space-y-2 pl-5">
          <li>We may refuse or suspend accounts that abuse OTP, payments, or listings.</li>
          <li>Payment methods come from the live catalog. Do not assume a single telco.</li>
          <li>Commission, default cancel window, and default penalty can differ per listing / business.</li>
        </ul>
      </Section>
      <AuthSection />
      <SupportLine />
    </PolicyShell>
  );
}

export function PrivacyPage() {
  return (
    <PolicyShell title="Privacy policy — how we handle your data" lead="We use your details to run accounts, bookings, receipts, and payments. We do not sell personal data.">
      <Section title="What we collect">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-2 pr-4">Data</th><th className="py-2">Why</th></tr></thead>
            <tbody className="align-top text-slate-700">
              {[
                ['Name, email, phone', 'Account, booking contact, receipts, OTP login'],
                ['Password', 'Sign-in only (stored hashed)'],
                ['Booking dates, times, guest counts, destination', 'To create and fulfil the booking'],
                ['Your location fields', 'Required on booking requests so the provider can plan the service'],
                ['Payment name, email, and MoMo number (or card checkout)', 'To collect the booking amount'],
                ['Provider MoMo / bank payout details', 'To pay the provider after the cancel window — not shown to guests'],
                ['Listing photos', 'Shown on the marketplace'],
                ['Product analytics', 'Page views and booking events. We store a hashed IP, device type, and browser — not a raw IP in the event record'],
              ].map(([data, why]) => (
                <tr key={data} className="border-b border-slate-100"><td className="py-2 pr-4 font-semibold">{data}</td><td className="py-2">{why}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="What we do not do">
        <ul className="list-disc space-y-2 pl-5">
          <li>We do not sell your personal data.</li>
          <li>We do not show other customers your email, phone, or booking.</li>
          <li>We do not put the provider’s phone, exact address, or map pin on the public home page.</li>
          <li>We do not store your card PIN or MoMo PIN. Card checkout happens on the payment provider’s page. MoMo approval happens on your phone.</li>
        </ul>
      </Section>
      <Section title="When provider details are hidden vs unlocked">
        <p>Before you pay, listings use an anonymous name. You may see district / area and photos. Phone, exact address, and directions stay locked. After you pay in full, that booking unlocks provider identity, contact, and location for you. Other users still see the anonymous listing.</p>
      </Section>
      <Section title="Who else processes data">
        <ul className="list-disc space-y-2 pl-5">
          <li>XentriPay — collects MoMo/card payments into the SafarisCon merchant wallet and later pays providers / refunds guests.</li>
          <li>Email delivery — OTP and booking messages.</li>
          <li>Image hosting — listing and receipt files.</li>
        </ul>
      </Section>
      <Section title="Your controls">
        <p>Update profile name / phone where the account screen already allows it. Log out to end the remembered session. Providers update payout details on the payout-details page. For account deletion or a data export, contact {SUPPORT_EMAIL}.</p>
      </Section>
      <Section title="Security measures">
        <p>HTTPS, hashed passwords, hashed OTPs, Bearer tokens, role checks, CORS, and security headers. Private booking and pay routes require a signed-in user. You can only pay or cancel your bookings.</p>
      </Section>
      <SupportLine />
    </PolicyShell>
  );
}

export function PaymentsPolicyPage() {
  return (
    <PolicyShell title="Payments, cancellations, and refunds" lead="You pay the full listing price in the app. Money is held in the SafarisCon wallet until the cancel window ends.">
      <Section title="Paying for a booking">
        <ul className="list-disc space-y-2 pl-5">
          <li>Currency is RWF. Methods: Mobile Money or card.</li>
          <li>You pay the full listing price. There is no 30% deposit and no remaining 70% at the venue.</li>
          <li>Money is collected into the SafarisCon wallet. The hotel is not paid at that moment.</li>
          <li>A listing cannot be paid until the provider has saved valid MoMo or bank payout details.</li>
        </ul>
      </Section>
      <Section title="After a successful payment">
        <p>The booking is paid in full. Provider details and your booking code / QR / receipt unlock. You can cancel only until the booking’s cancel deadline.</p>
        <blockquote className="mt-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-950">Paid in full. Show your booking code at the venue. You can cancel until the listed deadline. If you cancel before then, you get your refund minus the listing’s cancellation fee.</blockquote>
      </Section>
      <Section title="Cancellation">
        <p>Only paid bookings can be cancelled for a refund. The listing sets hours before the service when cancel closes (default 6) and the percent of what you paid that you lose (default 20). Always use the numbers shown on your booking. Refunds usually arrive after a short processing time.</p>
      </Section>
      <Section title="What happens to the money">
        <ul className="list-disc space-y-2 pl-5">
          <li>Paid, no cancel: after the cancel deadline, SafarisCon pays the provider their share. You visit with your booking code.</li>
          <li>Cancel in time: refund = paid − cancellation fee. The refund returns through the payment partner.</li>
          <li>Cancel too late: no refund. The booking remains usable at the venue.</li>
        </ul>
      </Section>
      <Section title="At the venue">
        <p>The provider verifies the booking code. Completing the booking does not charge anything extra.</p>
      </Section>
      <SupportLine />
    </PolicyShell>
  );
}

function PolicyShell({ title, lead, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-black uppercase tracking-wide text-primary">SafarisCon policies</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{lead}</p>
          <nav className="mt-6 flex flex-wrap gap-2">
            {NAV.map(([label, to]) => (
              <Link key={to} to={to} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary">
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 space-y-6 text-sm leading-6 text-slate-700">{children}</div>
        </div>
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
  return (
    <Section title="Accounts and sign-in">
      <p className="font-semibold text-slate-900">Who can register</p>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>Guests create their own account with name, email, and password.</li>
        <li>Hotels and other providers do not self-register. SafarisCon invites them; they finish onboarding, set a password, and add payout details before they can collect payments.</li>
      </ul>
      <p className="mt-4 font-semibold text-slate-900">Email verification and login</p>
      <p className="mt-2">After sign-up we email a 6-digit code (about 10 minutes). Login is email + password, then a one-time login code. We protect accounts with email verification and a login code, not password-only access. Passwords are stored hashed. Remember me issues a refresh token for about one day. Log out ends that session.</p>
    </Section>
  );
}

function SupportLine() {
  return (
    <p className="text-sm text-slate-600">
      Support: <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · {SUPPORT_PHONE}
    </p>
  );
}

function TermsAcceptancePanel() {
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
    navigate(getDashboardRoute(result.user || user), { replace: true });
  };

  const decline = async () => {
    setBusy(true);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-lg font-black text-amber-950">Accept to continue</h2>
      <p className="mt-2 text-sm text-amber-900">You must accept the Terms of use and Privacy policy before using bookings, payments, or dashboards.</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={accept} className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white disabled:opacity-50">
          {busy ? 'Saving...' : 'I accept Terms and Privacy'}
        </button>
        <button type="button" disabled={busy} onClick={decline} className="rounded-xl border border-amber-300 bg-white px-5 py-3 text-sm font-bold text-amber-900">
          Decline and sign out
        </button>
      </div>
    </section>
  );
}
