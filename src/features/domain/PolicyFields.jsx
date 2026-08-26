import { Field, FieldGrid } from './Field';
import { domainCopy, remainingPaymentOptions } from './registry';

export default function PolicyFields({
  category,
  paymentPolicy = {},
  cancellationPolicy = {},
  onPaymentChange,
  onCancellationChange,
}) {
  const copy = domainCopy(category);
  const paymentOptions = remainingPaymentOptions(category);
  const remainingHint = copy.kind === 'rental'
    ? 'After the deposit, customers pay the rest when they pick up the car, when they return it, or in full when booking.'
    : 'After the deposit, customers pay the rest on arrival, at checkout, or in full when booking.';

  return (
    <div className="space-y-4">
      <FieldGrid title="Payment policy" hint="Customers pay a deposit now. Platform commission is always 10% and is set by SafarisCon, not by you.">
        <Field
          label="Deposit %"
          type="number"
          min="1"
          max="100"
          value={paymentPolicy.depositPercentage ?? 50}
          onChange={(value) => onPaymentChange({ ...paymentPolicy, depositPercentage: Number(value) })}
        />
        <Field
          label="Remaining balance"
          type="select"
          options={paymentOptions}
          value={paymentPolicy.remainingPaymentMethod || 'PAY_AT_ARRIVAL'}
          help={remainingHint}
          onChange={(value) => onPaymentChange({ ...paymentPolicy, remainingPaymentMethod: value })}
        />
      </FieldGrid>
      <FieldGrid title="Cancellation policy" hint="By default the deposit is kept if the customer cancels.">
        <Field
          label="Policy type"
          type="select"
          options={['flexible', 'moderate', 'strict']}
          value={cancellationPolicy.type || 'moderate'}
          onChange={(value) => onCancellationChange({ ...cancellationPolicy, type: value })}
        />
        <Field
          label="Free cancellation until (hours before start)"
          type="number"
          min="0"
          value={cancellationPolicy.freeCancellationUntilHours ?? 24}
          onChange={(value) => onCancellationChange({ ...cancellationPolicy, freeCancellationUntilHours: Number(value) })}
        />
        <Field
          label="Deposit refundable"
          type="boolean"
          value={Boolean(cancellationPolicy.depositRefundable)}
          onChange={(value) => onCancellationChange({ ...cancellationPolicy, depositRefundable: value })}
        />
      </FieldGrid>
    </div>
  );
}
