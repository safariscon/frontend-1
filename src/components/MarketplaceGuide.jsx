import { useRef } from 'react';
import { Link } from 'react-router-dom';

const SERVICE_CATEGORIES = [
  { label: 'Accommodation', query: 'accommodation', icon: 'bed' },
  { label: 'Transport', query: 'transport', icon: 'bus' },
  { label: 'Events & Venues', query: 'events', icon: 'calendar' },
  { label: 'Travel & Experience', query: 'travel experience', icon: 'mountain' },
  { label: 'Tours & Activities', query: 'tours activities', icon: 'compass' },
  { label: 'Shopping & Markets', query: 'shopping markets', icon: 'bag' },
  { label: 'Wellness', query: 'wellness', icon: 'wellness' },
  { label: 'More', query: '', icon: 'more' },
];

const WORKFLOW_STEPS = [
  ['Choose a Service', 'Browse verified options'],
  ['Book Instantly', 'Send your request'],
  ['Pay Securely', 'Use the payment simulation'],
  ['Details Unlocked', 'Get full provider contacts'],
  ['Enjoy the Service', 'Use your PDF and QR'],
];

export default function MarketplaceGuide() {
  const categoryTrack = useRef(null);
  const workflowTrack = useRef(null);
  const scrollTrack = (track, direction) => {
    track.current?.scrollBy({ left: direction * Math.max(220, track.current.clientWidth * 0.72), behavior: 'smooth' });
  };

  return (
    <section className="border-b border-blue-100 bg-white py-7">
      <div className="mx-auto max-w-7xl px-4">
        <div className="relative">
          <ScrollButton direction="left" label="Previous service categories" onClick={() => scrollTrack(categoryTrack, -1)} />
          <div ref={categoryTrack} className="marketplace-scroll-track overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="flex min-w-max items-stretch divide-x divide-slate-200">
            {SERVICE_CATEGORIES.map((category) => (
              <Link
                key={category.label}
                to={category.query ? `/services?service=${encodeURIComponent(category.query)}` : '/services'}
                aria-label={category.label}
                className="flex min-w-32 flex-1 flex-col items-center justify-center gap-2 px-4 py-4 text-center hover:bg-blue-50"
              >
                <CategoryIcon name={category.icon} />
                {category.icon !== 'more' && <span className="max-w-24 text-[11px] font-bold leading-tight text-blue-950">{category.label}</span>}
              </Link>
            ))}
            </div>
          </div>
          <ScrollButton direction="right" label="Next service categories" onClick={() => scrollTrack(categoryTrack, 1)} />
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-primary md:hidden">← Scroll left or right to explore more services →</p>

        <div className="mt-7 text-center">
          <h2 className="text-xl font-black text-blue-900">How SafarisCon Works</h2>
          <div className="relative mt-5">
            <ScrollButton direction="left" label="Previous booking steps" onClick={() => scrollTrack(workflowTrack, -1)} mobileOnly />
            <div ref={workflowTrack} className="marketplace-scroll-track flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
            {WORKFLOW_STEPS.map(([title, description], index) => (
              <div key={title} className="marketplace-step relative flex min-w-[12rem] snap-start flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm lg:min-w-0">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-primary"><WorkflowIcon index={index} /></span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">{index + 1}</span>
                <span><strong className="block text-xs text-slate-900">{title}</strong><small className="mt-1 block text-[11px] text-slate-500">{description}</small></span>
              </div>
            ))}
            </div>
            <ScrollButton direction="right" label="Next booking steps" onClick={() => scrollTrack(workflowTrack, 1)} mobileOnly />
          </div>
          <div className="mt-3 flex justify-center gap-2 lg:hidden">{WORKFLOW_STEPS.map((step, index) => <span key={step[0]} className={`h-1.5 w-1.5 rounded-full ${index === 0 ? 'bg-primary' : 'bg-slate-300'}`} />)}</div>
        </div>
      </div>
    </section>
  );
}

function ScrollButton({ direction, label, onClick, mobileOnly = false }) {
  return <button type="button" aria-label={label} onClick={onClick} className={`absolute ${direction === 'left' ? '-left-3' : '-right-3'} top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-primary shadow-lg hover:bg-blue-50 ${mobileOnly ? 'lg:hidden' : ''}`}>{direction === 'left' ? '‹' : '›'}</button>;
}

function WorkflowIcon({ index }) {
  const paths = [
    'M10.5 18.5a8 8 0 110-16 8 8 0 010 16zm5.5-2.5l5 5',
    'M3 11l18-8-8 18-2-7-8-3zm8 3l4-4',
    'M3 6h18v12H3V6zm0 4h18',
    'M7 11V8a5 5 0 0110 0m-11 3h12v10H6V11zm6 4v2',
    'M6 2h9l4 4v16H6V2zm9 0v5h4M9 12h7m-7 4h5',
  ];
  return <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={paths[index]} /></svg>;
}

function CategoryIcon({ name }) {
  const common = {
    className: 'h-8 w-8 text-primary',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  if (name === 'bed') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-7m18 7v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5m0-3h18M6 11V8h5a2 2 0 012 2v1" /></svg>;
  if (name === 'bus') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18h12m-11 0v2m10-2v2M5 16V6a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2zm0-6h14M8 14h.01M16 14h.01" /></svg>;
  if (name === 'calendar') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1zm7 7v5m-2-2h4" /></svg>;
  if (name === 'mountain') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M3 19l6-11 3 5 2-3 7 9H3zM16 5h.01" /></svg>;
  if (name === 'compass') return <svg {...common}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></svg>;
  if (name === 'bag') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14l-1 12H6L5 8zm4 0V6a3 3 0 016 0v2" /></svg>;
  if (name === 'wellness') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20c-5 0-8-3-8-7 3 0 5 1 8 4m0 3c5 0 8-3 8-7-3 0-5 1-8 4m0 3V9m0 3c-3-2-4-5-2-8 3 1 4 3 2 8zm0 0c3-2 4-5 2-8-3 1-4 3-2 8z" /></svg>;
  return <svg {...common}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>;
}
