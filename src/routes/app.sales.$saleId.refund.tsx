import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDemo } from '@/hooks/useDemo';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeliveryFields, DeliverySummary } from '@/components/shared/DeliveryFields';
import { ConfirmAction } from '@/components/shared/ConfirmAction';
import { EMPTY_DELIVERY } from '@/types/inventory';
import { refundAmount } from '@/lib/refund-amount';
export const Route = createFileRoute('/app/sales/$saleId/refund')({ component: RefundPage });
function RefundPage() {
  const { saleId } = Route.useParams();
  const { demoStore, bumpVersion } = useDemo();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [ids, setIds] = useState<string[]>([]);
  const [delivery, setDelivery] = useState({ ...EMPTY_DELIVERY });
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const sale = demoStore?.getSales().find(s => s.id === saleId);
  if (!sale) return <div><h1>Order not found</h1><Link to="/app/sales">Sales orders</Link></div>;
  const amount = refundAmount(sale, ids);
  const submit = () => {
    if (!can('manage_sales') || !demoStore) return;
    const result = demoStore.refundSaleUnits(saleId, ids, delivery, reason);
    if ('error' in result) { toast.error(result.error); return; }
    bumpVersion(); toast.success('Refund recorded — selected units returned to stock');
    void navigate({ to: '/app/sales', hash: saleId });
  };
  return <div className="mx-auto max-w-[800px] space-y-5"><Link to="/app/sales" className="text-sm underline">Back to sales orders</Link><h1 className="text-2xl font-semibold">Refund {sale.documentNumber}</h1>
    <div className="divide-y divide-border">{sale.items.map(l => <label key={l.id} className="flex items-center gap-3 py-3"><input type="checkbox" disabled={sale.refundedUnitIds.includes(l.itemUnitId) || !can('manage_sales')} checked={ids.includes(l.itemUnitId)} onChange={e => setIds(e.target.checked ? [...ids, l.itemUnitId] : ids.filter(id => id !== l.itemUnitId))} /><span>{demoStore?.getItemById(l.itemId)?.name} · {l.serialNumber}{sale.refundedUnitIds.includes(l.itemUnitId) ? ' — Refunded' : ''}</span></label>)}</div>
    <DeliveryFields value={delivery} onChange={setDelivery} /><label className="block text-sm">Reason for return<Input value={reason} onChange={e => setReason(e.target.value)} /></label>
    <div className="font-semibold">Refund total: ${amount.toFixed(2)}</div><Button disabled={!ids.length || !can('manage_sales')} onClick={() => setConfirm(true)}>Review refund</Button>
    <ConfirmAction open={confirm} onOpenChange={setConfirm} title="Confirm refund" description={`${sale.items.filter(l => ids.includes(l.itemUnitId)).map(l => `${demoStore?.getItemById(l.itemId)?.name} · ${l.serialNumber}`).join('\n')}\nRefund total: $${amount.toFixed(2)}`} onConfirm={submit} />
    {demoStore?.getSaleRefunds(saleId).map(r => <div key={r.id} className="border-t border-border pt-3"><div>{r.refundNumber} · ${r.amount.toFixed(2)}</div><DeliverySummary value={r.delivery} /><p className="text-sm">{r.reason}</p></div>)}
  </div>;
}
