import { describe, it, expect } from "vitest";
import { DemoStore } from "@/lib/demo-store";
import { serviceTotals } from "@/lib/service-logic";

function firstEditable(store: DemoStore) {
  const s = store.getServices().find((x) => x.status !== "delivered" && x.serviceType === "paid");
  if (!s) throw new Error("no seeded paid service");
  return s;
}

describe("service billing", () => {
  it("adds and removes parts and recomputes net/due", () => {
    const store = new DemoStore();
    const s = firstEditable(store);
    const before = serviceTotals(s).partsCharge;
    const r = store.addServiceItem(s.id, { name: "Fan", quantity: 2, unitPrice: 100 });
    if ("error" in r) throw new Error(r.error);
    expect(serviceTotals(r).partsCharge).toBe(before + 200);
    const added = r.items[r.items.length - 1];
    const r2 = store.removeServiceItem(s.id, added.id);
    if ("error" in r2) throw new Error(r2.error);
    expect(serviceTotals(r2).partsCharge).toBe(before);
  });

  it("rejects invalid parts", () => {
    const store = new DemoStore();
    const s = firstEditable(store);
    expect(store.addServiceItem(s.id, { name: "", quantity: 1, unitPrice: 1 })).toHaveProperty("error");
    expect(store.addServiceItem(s.id, { name: "X", quantity: 0, unitPrice: 1 })).toHaveProperty("error");
    expect(store.addServiceItem(s.id, { name: "X", quantity: 1, unitPrice: -1 })).toHaveProperty("error");
  });

  it("drops the service charge when switched to non-paid", () => {
    const store = new DemoStore();
    const s = firstEditable(store);
    const r = store.updateService(s.id, { serviceType: "non_paid", serviceCharge: 500 });
    if ("error" in r) throw new Error(r.error);
    expect(r.serviceCharge).toBe(0);
  });

  it("applies discount and VAT to net amount", () => {
    const store = new DemoStore();
    const s = firstEditable(store);
    const r = store.updateService(s.id, { serviceCharge: 100, discount: 20, vatTax: 10 });
    if ("error" in r) throw new Error(r.error);
    const t = serviceTotals(r);
    expect(t.netAmount).toBeCloseTo(t.partsCharge + 100 - 20 + 10);
  });
});
