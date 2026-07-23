import { useMemo, useCallback } from "react";
import { useDemo } from "@/hooks/useDemo";
import type { Sale, SalesSettings, WarrantyClaim, WarrantyClaimStatus, WarrantyType, SaleChannel } from "@/types/inventory";
import type { DemoStore } from "@/lib/demo-store";

type PosSaleInput = Parameters<DemoStore["createPosSale"]>[0];
type CreateClaimInput = Parameters<DemoStore["createWarrantyClaim"]>[0];

function throwOnError<T>(v: T | { error: string }): T {
  if (v && typeof v === "object" && "error" in (v as object)) throw new Error((v as { error: string }).error);
  return v as T;
}

export function useSalesSettings(): SalesSettings {
  const { demoStore, version } = useDemo();
  return useMemo(
    () => demoStore?.getSalesSettings() ?? { showDiscountOnInvoice: true, defaultTaxRate: 0, businessName: "Store" },
    [demoStore, version],
  );
}

export function useUpdateSalesSettings() {
  const { demoStore, bumpVersion } = useDemo();
  return useCallback((updates: Partial<SalesSettings>) => {
    if (!demoStore) return;
    demoStore.setSalesSettings(updates);
    bumpVersion();
  }, [demoStore, bumpVersion]);
}

export function useCreatePosSale() {
  const { demoStore, bumpVersion } = useDemo();
  return useCallback(
    (input: PosSaleInput): Sale => {
      if (!demoStore) throw new Error("Demo store not ready");
      const result = throwOnError(demoStore.createPosSale(input));
      bumpVersion();
      return result;
    },
    [demoStore, bumpVersion],
  );
}

export function useUnitByScan() {
  const { demoStore, version } = useDemo();
  return useCallback((code: string) => demoStore?.findUnitByScan(code),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demoStore, version]);
}

export function usePeekDocumentNumber(channel: SaleChannel): string {
  const { demoStore, version } = useDemo();
  return useMemo(() => demoStore?.peekDocumentNumber(channel) ?? "", [demoStore, version, channel]);
}

export function useWarrantyClaims(status?: WarrantyClaimStatus): WarrantyClaim[] {
  const { demoStore, version } = useDemo();
  return useMemo(() => demoStore?.getWarrantyClaims(status ? { status } : undefined) ?? [], [demoStore, version, status]);
}

export function useCreateWarrantyClaim() {
  const { demoStore, bumpVersion } = useDemo();
  return useCallback((input: CreateClaimInput) => {
    if (!demoStore) throw new Error("Demo store not ready");
    const c = throwOnError(demoStore.createWarrantyClaim(input));
    bumpVersion();
    return c;
  }, [demoStore, bumpVersion]);
}

export function useUpdateWarrantyClaim() {
  const { demoStore, bumpVersion } = useDemo();
  return useCallback((id: string, status: WarrantyClaimStatus, notes?: string) => {
    if (!demoStore) throw new Error("Demo store not ready");
    const c = throwOnError(demoStore.updateWarrantyClaim(id, status, notes));
    bumpVersion();
    return c;
  }, [demoStore, bumpVersion]);
}

export type { PosSaleInput, WarrantyType };
