import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../lib/translations';

const STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rebook_id_generated: 'bg-blue-100 text-blue-800',
  used: 'bg-slate-100 text-slate-700',
  cancel_requested: 'bg-red-100 text-red-800',
  refund_requested: 'bg-violet-100 text-violet-800',
  refund_approved: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-gray-200 text-gray-700',
  rejected: 'bg-red-100 text-red-800',
};

const LABEL_KEYS = {
  pending: 'rebook.pending',
  approved: 'rebook.approved',
  rebook_id_generated: 'rebook.rebookIdGenerated',
  used: 'rebook.used',
  cancel_requested: 'rebook.cancelRequested',
  refund_requested: 'rebook.refundRequested',
  refund_approved: 'rebook.refundApproved',
  expired: 'rebook.expired',
  rejected: 'rebook.rejected',
};

export default function RebookStatusBadge({ status }) {
  const { language } = useLanguage();
  const label = LABEL_KEYS[status] ? t(LABEL_KEYS[status], language) : status;
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STYLES[status] || 'bg-gray-100 text-gray-700'}`}>{label}</span>;
}

export { LABEL_KEYS as REBOOK_STATUS_LABELS };
