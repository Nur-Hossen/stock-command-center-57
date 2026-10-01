import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceStatus } from "@/types/inventory";
import { SERVICE_STATUS_LABELS } from "@/lib/service-logic";
import type { ServiceFilters } from "./service-filter-types";
import { EMPTY_SERVICE_FILTERS } from "./service-filter-types";

const STATUSES = Object.keys(SERVICE_STATUS_LABELS) as ServiceStatus[];

interface ServicesFiltersProps {
  filters: ServiceFilters;
  onChange: (filters: ServiceFilters) => void;
}

export function ServicesFilters({ filters, onChange }: ServicesFiltersProps) {
  const hasFilters =
    !!filters.search || !!filters.status || !!filters.from || !!filters.to;

  function toggleStatus(status: ServiceStatus) {
    onChange({ ...filters, status: filters.status === status ? undefined : status });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search number, product, serial, customer…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-8 w-64 pl-8"
        />
      </div>
      {STATUSES.map((s) => (
        <Badge
          key={s}
          variant={filters.status === s ? "default" : "outline"}
          className="cursor-pointer select-none"
          onClick={() => toggleStatus(s)}
        >
          {SERVICE_STATUS_LABELS[s]}
        </Badge>
      ))}
      <Input
        type="date"
        value={filters.from}
        onChange={(e) => onChange({ ...filters, from: e.target.value })}
        className="h-8 w-36"
        aria-label="Received from"
      />
      <Input
        type="date"
        value={filters.to}
        onChange={(e) => onChange({ ...filters, to: e.target.value })}
        className="h-8 w-36"
        aria-label="Received to"
      />
      {hasFilters && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1 text-xs"
          onClick={() => onChange(EMPTY_SERVICE_FILTERS)}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
