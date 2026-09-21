import { describe, it, expect } from "vitest";
import { DemoStore } from "@/lib/demo-store";
import {
  canTransition,
  formatServiceNumber,
  serviceTotals,
  validatePayment,
} from "@/lib/service-logic";

function newService(store: DemoStore, overrides: Record<string, unknown> = {}) {
  const res = store.createService({
    customerId: "cust-001",
    serviceType: "paid",
    productName: "Test device",
    problemDescription: "Does not start",
    serviceCharge: 1000,
    ...overrides,
  });
  if ("error" in res) throw new Error(res.error);
  return res;
}

describe("service numbering", () => {
  it("formats SRV-YYYYMMDD-0001", () => {
    expect(formatServiceNumber(new Date(2026, 8, 21), 1)).toBe("SRV-20260921-0001");
    expect(formatServiceNumber(new Date(2026, 8, 21), 42)).toBe("SRV-20260921-0042");
  });

  it("increments per day and resets on a new day", () => {
    const store = new DemoStore();
    const a = newService(store, { now: new Date(2026, 0, 2) });
    const b = newService(store, { now: new Date(2026, 0, 2) });
    const c = newService(store, { now: new Date(2026, 0, 3) });
    expect(a.serviceNumber).toBe("SRV-20260102-0001");
    expect(b.serviceNumber).toBe("SRV-20260102-0002");
    expect(c.serviceNumber).toBe("SRV-20260103-0001");
  });
});

describe("service totals", () => {
  it("sums parts, charge, discount and VAT", () => {
    const t = serviceTotals({
      serviceType: "paid",
      serviceCharge: 500,
      discount: 100,
      vatTax: 50,
      items: [{ quantity: 2, unitPrice: 250 }],
      payments: [{ amount: 200 }],
    });
    expect(t.partsCharge).toBe(500);
    expect(t.totalCharge).toBe(1000);
    expect(t.netAmount).toBe(950);
    expect(t.dueAmount).toBe(750);
    expect(t.paymentStatus).toBe("partial");
  });

  it("drops the service charge for non-paid services", () => {
    const t = serviceTotals({
      serviceType: "non_paid",
      serviceCharge: 900,
      discount: 0,
      vatTax: 0,
      items: [],
      payments: [],
    });
    expect(t.serviceCharge).toBe(0);
    expect(t.netAmount).toBe(0);
    expect(t.paymentStatus).toBe("paid");
  });
});

describe("status transitions", () => {
  it("allows only the SRS graph", () => {
    expect(canTransition("pending", "repairing")).toBe(true);
    expect(canTransition("pending", "delivered")).toBe(false);
    expect(canTransition("solved", "delivered")).toBe(true);
    expect(canTransition("delivered", "pending")).toBe(false);
  });

  it("rejects an illegal jump in the store", () => {
    const store = new DemoStore();
    const s = newService(store);
    const res = store.updateServiceStatus(s.id, "solved");
    expect(res).toHaveProperty("error");
  });

  it("blocks delivery until the due amount is cleared, then locks the record", () => {
    const store = new DemoStore();
    const s = newService(store);
    store.updateServiceStatus(s.id, "repairing");
    store.updateServiceStatus(s.id, "solved");
    expect(store.updateServiceStatus(s.id, "delivered")).toHaveProperty("error");
    store.addServicePayment(s.id, { method: "cash", amount: 1000 });
    const delivered = store.deliverService(s.id, { deliveryPerson: "Hasan", receiverName: "Acme rep" });
    expect(delivered).not.toHaveProperty("error");
    expect(store.getServiceById(s.id)?.status).toBe("delivered");
    expect(store.updateService(s.id, { serviceNotes: "late edit" })).toHaveProperty("error");
  });
});

describe("payments", () => {
  it("validates method-specific fields and the due cap", () => {
    expect(validatePayment({ method: "cash", amount: 0 }, 100)).toMatch(/greater than zero/);
    expect(validatePayment({ method: "cash", amount: 200 }, 100)).toMatch(/exceed/);
    expect(validatePayment({ method: "bank", amount: 50 }, 100)).toMatch(/Bank name/);
    expect(validatePayment({ method: "mfs", amount: 50, mobileNumber: "017" }, 100)).toMatch(/Transaction ID/);
    expect(validatePayment({ method: "cash", amount: 50 }, 100)).toBeNull();
  });

  it("tracks running paid and due amounts", () => {
    const store = new DemoStore();
    const s = newService(store, { serviceCharge: 600 });
    store.addServicePayment(s.id, { method: "cash", amount: 250 });
    const t = store.getServiceTotals(s.id)!;
    expect(t.totalPaid).toBe(250);
    expect(t.dueAmount).toBe(350);
    expect(t.paymentStatus).toBe("partial");
  });
});

describe("seeded demo services", () => {
  it("covers pending, repairing and delivered", () => {
    const store = new DemoStore();
    const statuses = store.getServices().map((s) => s.status);
    expect(statuses).toContain("pending");
    expect(statuses).toContain("repairing");
    expect(statuses).toContain("delivered");
  });

  it("search finds a service by number", () => {
    const store = new DemoStore();
    const first = store.getServices()[0];
    expect(store.getServices({ search: first.serviceNumber }).length).toBe(1);
  });
});
