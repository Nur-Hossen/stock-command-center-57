import type { Sale } from '@/types/inventory';
/** Allocate invoice cents to lines deterministically, including discounts and tax. */
export function refundAmount(sale: Sale, ids: string[]): number {
  const weights = sale.items.map(l => Math.max(0, l.unitPrice - l.lineDiscount));
  const sum = weights.reduce((a, b) => a + b, 0);
  const cents = Math.round(sale.total * 100);
  let cumulative = 0;
  let allocated = 0;
  let result = 0;
  sale.items.forEach((line, i) => {
    cumulative += sum > 0 ? weights[i] / sum : 1 / sale.items.length;
    const next = i === sale.items.length - 1 ? cents : Math.round(cents * cumulative);
    if (ids.includes(line.itemUnitId)) result += next - allocated;
    allocated = next;
  });
  return result / 100;
}
