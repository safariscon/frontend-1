import { useState } from 'react';
import { Link } from 'react-router-dom';
import PaymentMethods from './PaymentMethods';

const MAIN_DESTINATIONS = ['Kigali', 'Musanze', 'Rubavu', 'Rusizi', 'Huye'];
const MORE_DESTINATIONS = ['Gicumbi', 'Nyagatare', 'Muhanga', 'Rwamagana', 'Karongi'];

export default function Footer() {
  const [showMoreDestinations, setShowMoreDestinations] = useState(false);
  return (
    <footer className="site-footer text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="footer-mobile-summary mb-5 text-center md:hidden">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-black text-blue-400"><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-blue-400">S</span>safariscon</Link>
          <p className="mt-2 text-xs text-blue-100/70">Book trusted services anywhere across Rwanda.</p>
        </div>
        <div className="footer-main-grid grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1.1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-black text-blue-400">
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-blue-400">S</span>safariscon
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-blue-100/80">Everything you need for travel, in one place. Book hotels, transport, experiences, and guest services across Rwanda with ease and confidence.</p>
            <div className="mt-4 flex gap-2">
              {['X', '◎', 'f', '▶'].map((icon, index) => <a key={`${icon}-${index}`} href="#" aria-label={['Twitter', 'Instagram', 'Facebook', 'YouTube'][index]} className="grid h-8 w-8 place-items-center rounded border border-blue-300/30 text-xs font-bold text-blue-100 hover:bg-blue-500/20">{icon}</a>)}
            </div>
          </div>

          <FooterColumn title="Quick Links" links={[
            ['Home', '/'], ['Services', '/services'], ['Become a Supplier', '/provider-register'], ['How It Works', '/#how-it-works'], ['FAQs', '/#faqs'], ['Login / Register', '/login'],
          ]} />

          <div>
            <h3 className="font-bold text-white">Destinations</h3>
            <div className={`mt-4 grid gap-x-6 gap-y-2 text-sm ${showMoreDestinations ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {[...MAIN_DESTINATIONS, ...(showMoreDestinations ? MORE_DESTINATIONS : [])].map((destination) => (
                <Link key={destination} to={`/services?location=${encodeURIComponent(destination)}`} className="text-blue-100/75 hover:text-blue-300">› {destination}</Link>
              ))}
            </div>
            <button type="button" onClick={() => setShowMoreDestinations((value) => !value)} className="mt-3 text-xs font-bold text-blue-400">
              {showMoreDestinations ? 'Show less ↑' : 'More districts ↓'}
            </button>
          </div>

          <FooterColumn title="Support" links={[
            ['Help Center', '/#help'], ['Terms & Conditions', '/#terms'], ['Privacy Policy', '/#privacy'], ['Refund Policy', '/#refunds'], ['Contact Support', 'mailto:info@safariscon.rw'],
          ]} />

          <div>
            <h3 className="font-bold text-white">Contact Us</h3>
            <ul className="mt-4 space-y-3 text-sm text-blue-100/80">
              <li><a href="tel:+250788000000" className="hover:text-blue-300">☎ +250 788 000 000</a></li>
              <li><a href="mailto:info@safariscon.rw" className="hover:text-blue-300">✉ info@safariscon.rw</a></li>
              <li>⌖ Kigali, Rwanda</li>
            </ul>
          </div>
        </div>

        <div className="footer-trust-row mt-8 grid gap-4 border-y border-blue-300/20 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <TrustItem icon="♢" title="Secure Booking" description="Your data is safe with us" />
          <TrustItem icon="♧" title="24/7 Support" description="We are here to help" />
          <TrustItem icon="♙" title="Verified Providers" description="Trusted & verified services" />
          <TrustItem icon="♙" title="Best Price Guarantee" description="Get the best value always" />
        </div>

        <div className="footer-bottom mt-6 flex flex-col items-center justify-between gap-4 text-xs text-blue-100/65 sm:flex-row">
          <p>© {new Date().getFullYear()} SafarisCon. All rights reserved.</p>
          <PaymentMethods />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="font-bold text-white">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map(([label, to]) => <li key={label}>{to.startsWith('mailto:') ? <a href={to} className="text-blue-100/75 hover:text-blue-300">› {label}</a> : <Link to={to} className="text-blue-100/75 hover:text-blue-300">› {label}</Link>}</li>)}
      </ul>
    </div>
  );
}

function TrustItem({ icon, title, description }) {
  return <div className="footer-trust-item flex items-center justify-center gap-3 sm:justify-start"><span className="text-2xl text-blue-400">{icon}</span><span><strong className="block text-xs text-white">{title}</strong><small className="text-blue-100/60">{description}</small></span></div>;
}
