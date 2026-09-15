import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { DeliveryInfo } from '@/types/inventory';
export function DeliveryFields({ value, onChange }: { value: DeliveryInfo; onChange: (v: DeliveryInfo) => void }) {
  return <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Delivery information</legend>
    <div className="flex gap-2">{(['hand', 'courier'] as const).map(method => <Button key={method} type="button" size="sm" variant={value.method === method ? 'default' : 'outline'} onClick={() => onChange({ ...value, method })}>{method === 'hand' ? 'By hand' : 'Courier'}</Button>)}</div>
    {value.method === 'courier' && <div className="grid gap-2">{(['courierName', 'trackingNumber', 'address'] as const).map((key, i) => <label key={key} className="text-xs">{['Courier name', 'Tracking number', 'Delivery address'][i]}<Input value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })} /></label>)}</div>}
    <label className="block text-xs">Delivery notes<Input value={value.notes} onChange={e => onChange({ ...value, notes: e.target.value })} /></label>
  </fieldset>;
}
export function DeliverySummary({ value }: { value?: DeliveryInfo }) {
  return <div className="break-words text-xs text-muted-foreground">{value?.method === 'courier' ? ['Courier', value.courierName, value.trackingNumber, value.address, value.notes].filter(Boolean).join(' · ') : ['By hand', value?.notes].filter(Boolean).join(' · ')}</div>;
}
