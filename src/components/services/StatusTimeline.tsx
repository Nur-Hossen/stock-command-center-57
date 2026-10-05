import { SERVICE_STATUS_LABELS } from "@/lib/service-logic";
import type { ServiceStatusEvent } from "@/types/inventory";

export function StatusTimeline({ events }: { events: ServiceStatusEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No status history yet.</p>;
  }
  return (
    <ol className="space-y-4">
      {[...events].reverse().map((e, idx) => (
        <li key={e.id} className="relative pl-5">
          <span
            className={
              "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full " +
              (idx === 0 ? "bg-primary" : "bg-muted-foreground/40")
            }
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{SERVICE_STATUS_LABELS[e.status]}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(e.at).toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">by {e.by}</div>
          {e.notes && <p className="mt-0.5 text-sm">{e.notes}</p>}
        </li>
      ))}
    </ol>
  );
}
