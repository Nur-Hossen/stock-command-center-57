import { describe, it, expect } from "vitest";
import { DemoStore } from "@/lib/demo-store";

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
  it("creates one non-paid service per open claim", () => {
    const store = new DemoStore();
    const unit = store.getUnits().find((u) => u.status === "sold");
    if (!unit) return;
    const claim = store.createWarrantyClaim({ itemUnitId: unit.id, claimType: "service", notes: "Dead screen" } as never);
    if ("error" in claim) return;
    const svc = store.createServiceFromClaim(claim.id);
    if ("error" in svc) throw new Error(svc.error);
    expect(svc.serviceType).toBe("non_paid");
    expect(svc.warrantyClaimId).toBe(claim.id);
    expect(svc.productSerial).toBe(unit.serialNumber);
    expect(store.createServiceFromClaim(claim.id)).toHaveProperty("error");
  });
});
