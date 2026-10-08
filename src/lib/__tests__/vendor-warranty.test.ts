import { describe, it, expect } from "vitest";
import { DemoStore } from "@/lib/demo-store";
import { ItemStatus } from "@/types/inventory";

function setup() {
  const store = new DemoStore();
  const s = store.getServices().find((x) => x.status !== "delivered")!;
  const vendor = store.getSuppliers()[0];
  return { store, s, vendor };
}

describe("vendor warranty workflow", () => {
  it("requires a valid vendor", () => {
    const { store, s } = setup();
    expect(store.sendServiceToVendor(s.id, { vendorId: "nope" })).toHaveProperty("error");
  });

  it("walks sent → processing → received → QC pass → replaced", () => {
    const { store, s, vendor } = setup();
    expect(store.sendServiceToVendor(s.id, { vendorId: vendor.id })).not.toHaveProperty("error");
    expect(store.updateVendorWarranty(s.id, { status: "processing" })).not.toHaveProperty("error");
    const r = store.updateVendorWarranty(s.id, { status: "received" });
    if ("error" in r) throw new Error(r.error);
    expect(r.vendorWarranty?.receivedDate).not.toBe("");
    expect(store.updateVendorWarranty(s.id, { status: "replaced" })).toHaveProperty("error");
    expect(store.updateVendorWarranty(s.id, { qualityCheck: "passed" })).not.toHaveProperty("error");
    const done = store.updateVendorWarranty(s.id, { status: "replaced" });
    if ("error" in done) throw new Error(done.error);
    expect(done.vendorWarranty?.status).toBe("replaced");
  });

  it("rejects skipped steps and early quality checks", () => {
    const { store, s, vendor } = setup();
    store.sendServiceToVendor(s.id, { vendorId: vendor.id });
    expect(store.updateVendorWarranty(s.id, { status: "received" })).toHaveProperty("error");
    expect(store.updateVendorWarranty(s.id, { qualityCheck: "passed" })).toHaveProperty("error");
  });
});

describe("claim escalation", () => {
  it("creates one non-paid service per open claim, linked to the buyer", () => {
    const store = new DemoStore();
    const now = new Date().toISOString();
    const item = store.createItem({
      id: crypto.randomUUID(), sku: "SKU-ESC1", barcode: null, name: "Test Phone", description: "",
      categoryId: null, brandId: null, model: "", modelYear: null, status: ItemStatus.Active, unit: "ea",
      currentStock: 0, reorderPoint: 5, reorderQuantity: 10, costPrice: 50, sellingPrice: 100,
      locationId: null, supplierId: null, imageUrl: null, trackSerials: true, defaultWarrantyMonths: 12,
      customFields: {}, createdAt: now, updatedAt: now,
    });
    const unit = store.addUnit({
      itemId: item.id, serialNumber: "SN-ESC-1", status: "in_stock", locationId: null, receivedAt: now,
      soldAt: null, warrantyMonths: 12, warrantyExpiresAt: null, cost: 50, notes: "",
    });
    if ("error" in unit) throw new Error(unit.error);
    const customer = store.getCustomers().find((c) => c.type === "retail")!;
    const sale = store.createPosSale({
      channel: "retail", customerId: customer.id, soldBy: "u",
      lineItems: [{ itemUnitId: unit.id, unitPrice: 100 }], amountPaid: 100,
    } as never);
    if ("error" in sale) throw new Error(sale.error);
    const claim = store.createWarrantyClaim({ itemUnitId: unit.id, claimType: "service", notes: "Dead screen" } as never);
    if ("error" in claim) throw new Error(claim.error);

    const svc = store.createServiceFromClaim(claim.id);
    if ("error" in svc) throw new Error(svc.error);
    expect(svc.serviceType).toBe("non_paid");
    expect(svc.warrantyClaimId).toBe(claim.id);
    expect(svc.customerId).toBe(customer.id);
    expect(svc.productSerial).toBe("SN-ESC-1");
    expect(svc.problemDescription).toBe("Dead screen");
    expect(store.createServiceFromClaim(claim.id)).toHaveProperty("error");
  });
});
