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

const LABELS = {
  pending: 'Pending review',
  approved: 'Approved',
  rebook_id_generated: 'Re-book ID generated',
  used: 'Used',
  cancel_requested: 'Cancel requested',
  refund_requested: 'Refund requested',
  refund_approved: 'Refund approved',
  expired: 'Expired',
  rejected: 'Rejected',
};

export default function RebookStatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STYLES[status] || 'bg-gray-100 text-gray-700'}`}>{LABELS[status] || status}</span>;
}

export { LABELS as REBOOK_STATUS_LABELS };
