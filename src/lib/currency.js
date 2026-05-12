const rwfFormatter = new Intl.NumberFormat('en-RW', {
  maximumFractionDigits: 0,
});

export function formatRwf(value) {
  return `RWF ${rwfFormatter.format(Number(value) || 0)}`;
}
