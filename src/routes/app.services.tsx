import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServicesTable } from "@/components/services/ServicesTable";
import { ServicesFilters } from "@/components/services/ServicesFilters";
import { EMPTY_SERVICE_FILTERS, type ServiceFilters } from "@/components/services/service-filter-types";
import { EmptyState } from "@/components/shared/EmptyState";
import { CSVExportButton, type CSVColumn } from "@/components/data/CSVExportButton";
import { useCustomers, useServices } from "@/hooks/useInventoryData";
import { SERVICE_STATUS_LABELS, SERVICE_TYPE_LABELS, serviceTotals } from "@/lib/service-logic";
import type { Service } from "@/types/inventory";

export const Route = createFileRoute("/app/services")({
  head: () => ({
    meta: [
      { title: "Services — Stackwise" },
      { name: "description", content: "All service jobs: search, filter by status and date, export." },
      { property: "og:title", content: "Services — Stackwise" },
      { property: "og:description", content: "Track every service job from intake to delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ServiceFilters>(EMPTY_SERVICE_FILTERS);
  const { data: services } = useServices({
    status: filters.status,
    search: filters.search || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });
  const { data: customers } = useCustomers();

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "Unknown";
  }, [customers]);

  const columns: CSVColumn<Service>[] = [
    { header: "Service #", accessor: (s) => s.serviceNumber },
    { header: "Customer", accessor: (s) => customerName(s.customerId) },
    { header: "Product", accessor: (s) => s.productName },
    { header: "Serial", accessor: (s) => s.productSerial },
    { header: "Type", accessor: (s) => SERVICE_TYPE_LABELS[s.serviceType] },
    { header: "Status", accessor: (s) => SERVICE_STATUS_LABELS[s.status] },
    { header: "Received", accessor: (s) => new Date(s.receivedDate).toLocaleDateString() },
    { header: "Net", accessor: (s) => serviceTotals(s).netAmount },
    { header: "Due", accessor: (s) => serviceTotals(s).dueAmount },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground">{services.length} job{services.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          <CSVExportButton data={services} columns={columns} filename="services" />
          <Button asChild size="sm">
            <Link to="/app/services/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New service
            </Link>
          </Button>
        </div>
      </div>

      <ServicesFilters filters={filters} onChange={setFilters} />

      {services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No services found"
          description="No service jobs match the current filters. Create a new service job to get started."
          actionLabel="New service"
          onAction={() => navigate({ to: "/app/services/new" })}
          secondaryActionLabel="Clear filters"
          onSecondaryAction={() => setFilters(EMPTY_SERVICE_FILTERS)}
        />
      ) : (
        <ServicesTable services={services} customers={customers} />
      )}
    </div>
  );
}
