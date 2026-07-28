import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Clock, XCircle, DollarSign } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSales, useCustomers } from "@/hooks/useInventoryData";

interface Props {
  /** When true, show the "Last 5 customer orders" list. */
  showRecent?: boolean;
  /** Optional heading override. */
  title?: string;
}

export function SalesInsights({ showRecent = true, title = "Sales orders" }: Props) {
  const { data: sales } = useSales();
  const { data: customers } = useCustomers();

  const stats = useMemo(() => {
    const total = sales.length;
    const pending = sales.filter((s) => s.status === "draft").length;
    const cancelled = sales.filter((s) => s.status === "refunded").length;
    const completed = sales.filter((s) => s.status === "completed").length;
    const cancelledPct = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    const revenue = sales
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.total ?? 0), 0);
    return { total, pending, cancelled, completed, cancelledPct, revenue };
  }, [sales]);

  const recent = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
      .slice(0, 5);
  }, [sales]);

  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Link to="/app/sales" className="text-xs text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total orders" value={stats.total} accentColor="neutral" icon={ShoppingCart} />
          <MetricCard label="Pending" value={stats.pending} accentColor="warning" icon={Clock} />
          <MetricCard label={`Cancelled (${stats.cancelledPct}%)`} value={stats.cancelled} accentColor="danger" icon={XCircle} />
          <MetricCard label="Revenue" value={Math.round(stats.revenue)} accentColor="healthy" icon={DollarSign} />
        </div>
      </div>

      {showRecent && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium text-foreground">Last 5 customer orders</h3>
          </div>
          {recent.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={ShoppingCart} title="No orders yet" description="Recorded sales will appear here." />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((s) => {
                const customer = customerById.get(s.customerId);
                const statusVariant = s.status === "refunded" ? "destructive" : s.status === "draft" ? "outline" : "secondary";
                const label = s.status === "refunded" ? "cancelled" : s.status === "draft" ? "pending" : s.status;
                return (
                  <Link
                    key={s.id}
                    to="/app/sales"
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{s.documentNumber || s.saleNumber}</span>
                        <Badge variant={statusVariant} className="capitalize">{label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {customer?.name ?? "Unknown customer"} · {new Date(s.soldAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground">
                      ${(s.total ?? 0).toFixed(2)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
