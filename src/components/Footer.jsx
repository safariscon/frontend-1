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
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-black text-blue-300">
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-blue-300">S</span>
            safariscon
          </Link>
          <p className="mt-2 text-xs text-blue-100/75">Book trusted services anywhere across Rwanda.</p>
        </div>

        <div className="footer-main-grid grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1.1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-black text-blue-300">
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-blue-300">S</span>
              safariscon
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-blue-100/80">
              A Rwanda service marketplace for hotels, cafes, car rentals, tours, venues, and travel-related providers.
            </p>
          </div>

          <FooterColumn title="Quick Links" links={[
            ['Home', '/'],
            ['Services', '/services'],
            ['About Us', '/about'],
            ['Contact', '/contact'],
            ['FAQs', '/#faqs'],
            ['Become a Provider', '/provider-register'],
          ]} />

          <div>
            <h3 className="font-bold text-white">Destinations</h3>
            <div className={`mt-4 grid gap-x-6 gap-y-2 text-sm ${showMoreDestinations ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {[...MAIN_DESTINATIONS, ...(showMoreDestinations ? MORE_DESTINATIONS : [])].map((destination) => (
                <Link key={destination} to={`/services?location=${encodeURIComponent(destination)}`} className="text-blue-100/75 hover:text-blue-300">
                  {destination}
                </Link>
              ))}
            </div>
            <button type="button" onClick={() => setShowMoreDestinations((value) => !value)} className="mt-3 text-xs font-black text-blue-300">
              {showMoreDestinations ? 'Show fewer districts' : 'More districts'}
            </button>
          </div>

          <FooterColumn title="Support" links={[
            ['Help Center', '/contact'],
            ['Terms and Conditions', '/#terms'],
            ['Privacy Policy', '/#privacy'],
            ['Refund Policy', '/#refunds'],
            ['Contact Support', 'mailto:info@safariscon.rw'],
          ]} />

          <div>
            <h3 className="font-bold text-white">Contact Us</h3>
            <ul className="mt-4 space-y-3 text-sm text-blue-100/80">
              <li><a href="tel:+250788000000" className="hover:text-blue-300">+250 788 000 000</a></li>
              <li><a href="mailto:info@safariscon.rw" className="hover:text-blue-300">info@safariscon.rw</a></li>
              <li>Kigali, Rwanda</li>
            </ul>
          </div>
        </div>

        <div className="footer-trust-row mt-8 grid gap-4 border-y border-blue-300/20 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <TrustItem title="Secure Booking" description="Clear records for each request" />
          <TrustItem title="Customer Support" description="Help for booking questions" />
          <TrustItem title="Verified Providers" description="Organized provider profiles" />
          <TrustItem title="Service Variety" description="Hospitality, travel, food, and more" />
        </div>

        <div className="footer-bottom mt-6 flex flex-col items-center justify-between gap-4 text-xs text-blue-100/65 sm:flex-row">
          <p>Copyright {new Date().getFullYear()} SafarisCon. All rights reserved.</p>
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
        {links.map(([label, to]) => (
          <li key={label}>
            {to.startsWith('mailto:') ? (
              <a href={to} className="text-blue-100/75 hover:text-blue-300">{label}</a>
            ) : (
              <Link to={to} className="text-blue-100/75 hover:text-blue-300">{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrustItem({ title, description }) {
  return (
    <div className="footer-trust-item flex items-center justify-center gap-3 sm:justify-start">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-blue-300/30 bg-blue-500/10 text-xs font-black text-blue-200">OK</span>
      <span>
        <strong className="block text-xs text-white">{title}</strong>
        <small className="text-blue-100/60">{description}</small>
      </span>
    </div>
  );
}
