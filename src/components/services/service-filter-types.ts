import type { ServiceStatus } from "@/types/inventory";

export interface ServiceFilters {
  search: string;
  status?: ServiceStatus;
  from: string;
  to: string;
}

export const EMPTY_SERVICE_FILTERS: ServiceFilters = {
  search: "",
  status: undefined,
  from: "",
  to: "",
};
