import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Customer, Service, ServiceStatus } from "@/types/inventory";
import { SERVICE_STATUS_LABELS, SERVICE_TYPE_LABELS, serviceTotals } from "@/lib/service-logic";

const STATUS_VARIANT: Record<ServiceStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  repairing: "secondary",
  solved: "default",
  damaged: "destructive",
  delivered: "default",
};

interface ServicesTableProps {
  services: Service[];
  customers: Customer[];
  onRowClick?: (service: Service) => void;
}

export function ServicesTable({ services, customers, onRowClick }: ServicesTableProps) {
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-right">Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((s) => {
            const totals = serviceTotals(s);
            return (
              <TableRow
                key={s.id}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={() => onRowClick?.(s)}
              >
                <TableCell className="font-mono text-xs">{s.serviceNumber}</TableCell>
                <TableCell className="font-medium">{customerName(s.customerId)}</TableCell>
                <TableCell>
                  <div className="text-sm">{s.productName}</div>
                  {s.productSerial && (
                    <div className="font-mono text-xs text-muted-foreground">{s.productSerial}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={s.serviceType === "non_paid" ? "secondary" : "outline"}>
                    {SERVICE_TYPE_LABELS[s.serviceType]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(s.receivedDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[s.status]}>
                    {SERVICE_STATUS_LABELS[s.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  ${totals.netAmount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {totals.dueAmount > 0 ? (
                    <span className="text-destructive">${totals.dueAmount.toFixed(2)}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
