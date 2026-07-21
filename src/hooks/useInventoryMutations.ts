import { useCallback, useState } from "react";
import { useDemo } from "@/hooks/useDemo";
import type {
  Item,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
  Brand,
  ItemUnit,
  Customer,
} from "@/types/inventory";
import type { DemoStore } from "@/lib/demo-store";
import { generateStockAlerts } from "@/lib/notification-generators";

interface MutationResult<TData> {
  mutate: (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  isLoading: boolean;
  error: Error | null;
}

function useDemoMutation<TData>(
  handler: (store: DemoStore, data: TData) => void,
): MutationResult<TData> {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      if (!isDemo || !demoStore) {
        opts?.onError?.(new Error("Not in demo mode"));
        return;
      }
      setIsLoading(true);
      try {
        handler(demoStore, data);
        bumpVersion();
        setError(null);
        opts?.onSuccess?.();
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        opts?.onError?.(err);
      } finally {
        setIsLoading(false);
      }
    },
    [isDemo, demoStore, handler, bumpVersion],
  );

  return { mutate, isLoading, error };
}

export function useCreateItem() {
  return useDemoMutation<Item>((store, data) => store.createItem(data));
}

export function useUpdateItem() {
  return useDemoMutation<{ id: string; updates: Partial<Item> }>((store, { id, updates }) =>
    store.updateItem(id, updates),
  );
}

export function useDeleteItem() {
  return useDemoMutation<string>((store, id) => store.deleteItem(id));
}

export function useCreateMovement() {
  return useDemoMutation<StockMovement>((store, data) => {
    store.createMovement(data);
    generateStockAlerts(store);
  });
}

export function useCreatePurchaseOrder() {
  return useDemoMutation<PurchaseOrder>((store, data) => store.createPurchaseOrder(data));
}

export function useUpdatePurchaseOrder() {
  return useDemoMutation<{ id: string; updates: Partial<PurchaseOrder> }>((store, { id, updates }) =>
    store.updatePurchaseOrder(id, updates),
  );
}

export function useDeletePurchaseOrder() {
  return useDemoMutation<string>((store, id) => store.deletePurchaseOrder(id));
}

export function useCreateSupplier() {
  return useDemoMutation<Supplier>((store, data) => store.createSupplier(data));
}

export function useUpdateSupplier() {
  return useDemoMutation<{ id: string; updates: Partial<Supplier> }>((store, { id, updates }) =>
    store.updateSupplier(id, updates),
  );
}

export function useDeleteSupplier() {
  return useDemoMutation<string>((store, id) => store.deleteSupplier(id));
}

export function useCreateRequest() {
  return useDemoMutation<InventoryRequest>((store, data) => store.createRequest(data));
}

export function useUpdateRequest() {
  return useDemoMutation<{ id: string; updates: Partial<InventoryRequest> }>((store, { id, updates }) =>
    store.updateRequest(id, updates),
  );
}

export function useCreateLocation() {
  return useDemoMutation<Location>((store, data) => store.createLocation(data));
}

export function useUpdateLocation() {
  return useDemoMutation<{ id: string; updates: Partial<Location> }>((store, { id, updates }) =>
    store.updateLocation(id, updates),
  );
}

export function useDeleteLocation() {
  return useDemoMutation<string>((store, id) => store.deleteLocation(id));
}

// ─── Category mutations ─────────────────────────────────
export function useCreateCategory() {
  return useDemoMutation<import("@/types/inventory").Category>((store, data) => store.createCategory(data));
}

export function useUpdateCategory() {
  return useDemoMutation<{ id: string; updates: Partial<import("@/types/inventory").Category> }>((store, { id, updates }) =>
    store.updateCategory(id, updates),
  );
}

export function useDeleteCategory() {
  return useDemoMutation<string>((store, id) => store.deleteCategory(id));
}

// ─── Brand mutations ────────────────────────────────────
function throwOnError<T>(result: T | { error: string }): T {
  if (result && typeof result === "object" && "error" in (result as object)) {
    throw new Error((result as { error: string }).error);
  }
  return result as T;
}

export function useCreateBrand() {
  return useDemoMutation<Brand>((store, data) => { throwOnError(store.createBrand(data)); });
}
export function useUpdateBrand() {
  return useDemoMutation<{ id: string; updates: Partial<Brand> }>((store, { id, updates }) => {
    throwOnError(store.updateBrand(id, updates));
  });
}
export function useDeleteBrand() {
  return useDemoMutation<string>((store, id) => { throwOnError(store.deleteBrand(id)); });
}

// ─── Item unit (serial) mutations ───────────────────────
export function useAddUnit() {
  return useDemoMutation<Omit<ItemUnit, "id" | "createdAt" | "updatedAt">>((store, data) => {
    throwOnError(store.addUnit(data));
  });
}
export function useUpdateUnit() {
  return useDemoMutation<{ id: string; updates: Partial<ItemUnit> }>((store, { id, updates }) => {
    throwOnError(store.updateUnit(id, updates));
  });
}
export function useDeleteUnit() {
  return useDemoMutation<string>((store, id) => {
    if (!store.deleteUnit(id)) throw new Error("Cannot delete a sold unit");
  });
}

// ─── Customer mutations ─────────────────────────────────
export function useCreateCustomer() {
  return useDemoMutation<Customer>((store, data) => { store.createCustomer(data); });
}
export function useUpdateCustomer() {
  return useDemoMutation<{ id: string; updates: Partial<Customer> }>((store, { id, updates }) => {
    if (!store.updateCustomer(id, updates)) throw new Error("Customer not found");
  });
}
export function useDeleteCustomer() {
  return useDemoMutation<string>((store, id) => { throwOnError(store.deleteCustomer(id)); });
}

// ─── Sale mutations ─────────────────────────────────────
export function useCreateSale() {
  return useDemoMutation<Parameters<typeof import("@/lib/demo-store").DemoStore.prototype.createSale>[0]>(
    (store, data) => { throwOnError(store.createSale(data)); },
  );
}
export function useRefundSale() {
  return useDemoMutation<string>((store, id) => { throwOnError(store.refundSale(id)); });
}
