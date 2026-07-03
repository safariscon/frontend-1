export default function PaymentMethods({ compact = false }) {
  const size = compact ? 'px-2 py-1 text-[9px]' : 'px-3 py-1.5 text-[10px]';
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Accepted payment methods">
      <span className={`rounded bg-white font-black italic text-blue-700 ${size}`}>VISA</span>
      <span className={`rounded bg-white font-bold text-slate-800 ${size}`}><span className="text-red-500">●</span><span className="-ml-1 text-amber-400">●</span></span>
      <span className={`rounded bg-yellow-400 font-black text-red-700 ${size}`}>Airtel Money</span>
      <span className={`rounded bg-blue-700 font-black text-yellow-300 ${size}`}>MoMo Pay</span>
    </div>
  );
}
