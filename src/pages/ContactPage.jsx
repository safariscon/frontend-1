import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CONTACT_OPTIONS = [
  ['Customer support', 'Questions about booking, payments, confirmations, or provider details.', 'info@safariscon.rw'],
  ['Provider onboarding', 'Hotels, cafes, car rentals, venues, and tour teams joining SafarisCon.', 'providers@safariscon.rw'],
  ['Partnerships', 'Work with us on destinations, hospitality networks, or service programs.', 'partners@safariscon.rw'],
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <main>
        <section className="bg-slate-50 dark:bg-slate-900">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">Contact SafarisCon</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-6xl">Talk to us about services, bookings, or provider accounts</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Reach out for booking help, provider onboarding, and marketplace questions. Public visitors can browse first, then create an account when they are ready to book.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/services" className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primary-dark">Browse services</Link>
                <Link to="/register" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">Create account</Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-950">
              <div className="grid gap-4">
                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Your name</span>
                  <input className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" placeholder="Full name" />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Email address</span>
                  <input type="email" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" placeholder="you@example.com" />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Message</span>
                  <textarea className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" placeholder="How can we help?" />
                </label>
                <a href="mailto:info@safariscon.rw" className="rounded-xl bg-primary px-5 py-3 text-center text-sm font-black text-white hover:bg-primary-dark">
                  Email SafarisCon
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block bg-white dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid gap-4 md:grid-cols-3">
              {CONTACT_OPTIONS.map(([title, description, email]) => (
                <a key={title} href={`mailto:${email}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:border-primary hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-800">
                  <h2 className="font-black text-slate-950 dark:text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
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
