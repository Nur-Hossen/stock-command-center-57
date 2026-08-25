import { describe, it, expect, beforeEach } from "vitest";
import { DemoStore } from "@/lib/demo-store";
import { ItemStatus, MovementType } from "@/types/inventory";

function addItem(store: DemoStore, opts: { trackSerials: boolean; sellingPrice?: number; defaultWarrantyMonths?: number }) {
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(), sku: "SKU-" + Math.random().toString(36).slice(2, 8),
    barcode: null, name: "Test Item", description: "", categoryId: null, brandId: null,
    model: "", modelYear: null, status: ItemStatus.Active, unit: "ea",
    currentStock: 0, reorderPoint: 5, reorderQuantity: 10,
    costPrice: 50, sellingPrice: opts.sellingPrice ?? 100,
    locationId: null, supplierId: null, imageUrl: null,
    trackSerials: opts.trackSerials, defaultWarrantyMonths: opts.defaultWarrantyMonths ?? 12,
    customFields: {}, createdAt: now, updatedAt: now,
  };
  return store.createItem(item);
}

function addUnit(store: DemoStore, itemId: string, sn: string, receivedDaysAgo = 30) {
  const received = new Date(Date.now() - receivedDaysAgo * 86400000).toISOString();
  const u = store.addUnit({
    itemId, serialNumber: sn, status: "in_stock", locationId: null,
    receivedAt: received, soldAt: null, warrantyMonths: 12, warrantyExpiresAt: null,
    cost: 50, notes: "",
  });
  if ("error" in u) throw new Error(u.error);
  return u;
}

let store: DemoStore;
beforeEach(() => { store = new DemoStore(); });

describe("POS scan validation", () => {
  it("finds an available unit by serial", () => {
    const item = addItem(store, { trackSerials: true });
    addUnit(store, item.id, "SN-A1");
    expect(store.findUnitByScan("SN-A1")?.status).toBe("in_stock");
    expect(store.findUnitByScan("sn-a1")?.serialNumber).toBe("SN-A1"); // case-insensitive
    expect(store.findUnitByScan("SN-MISSING")).toBeUndefined();
  });

  it("blocks selling a unit that is not in stock", () => {
    const item = addItem(store, { trackSerials: true });
    const u = addUnit(store, item.id, "SN-B1");
    store.updateUnit(u.id, { status: "sold" });
    const customer = store.getCustomers()[0];
    const res = store.createPosSale({
      channel: "retail", customerId: customer.id, soldBy: "u",
      lineItems: [{ itemUnitId: u.id, unitPrice: 100 }],
    });
    expect("error" in res && res.error).toMatch(/Invalid or Already Sold/);
  });

  it("rejects duplicate unit in one cart", () => {
    const item = addItem(store, { trackSerials: true });
    const u = addUnit(store, item.id, "SN-C1");
    const customer = store.getCustomers()[0];
    const res = store.createPosSale({
      channel: "retail", customerId: customer.id, soldBy: "u",
      lineItems: [{ itemUnitId: u.id, unitPrice: 100 }, { itemUnitId: u.id, unitPrice: 100 }],
    });
    expect("error" in res && res.error).toMatch(/twice/);
  });
});

describe("Warranty calculation", () => {
  it("retail warranty = sale date + N months", () => {
    const item = addItem(store, { trackSerials: true, defaultWarrantyMonths: 24 });
    const u = addUnit(store, item.id, "SN-D1", 10);
    const customer = store.getCustomers().find((c) => c.type === "retail")!;
    const now = new Date("2026-01-15T00:00:00Z");
    const sale = store.createPosSale({
      channel: "retail", customerId: customer.id, soldBy: "u",
      lineItems: [{ itemUnitId: u.id, unitPrice: 100 }],
      now,
    });
    if ("error" in sale) throw new Error(sale.error);
    const expiry = new Date(store.getUnitById(u.id)!.warrantyExpiresAt!);
    expect(expiry.getUTCFullYear()).toBe(2028);
    expect(expiry.getUTCMonth()).toBe(0); // Jan
  });

  it("dealer warranty uses purchase (received) date, not sale date", () => {
    const item = addItem(store, { trackSerials: true, defaultWarrantyMonths: 12 });
    const receivedIso = new Date("2025-06-01T00:00:00Z").toISOString();
    const u = store.addUnit({
      itemId: item.id, serialNumber: "SN-E1", status: "in_stock", locationId: null,
      receivedAt: receivedIso, soldAt: null, warrantyMonths: 12, warrantyExpiresAt: null,
      cost: 50, notes: "",
    });
    if ("error" in u) throw new Error(u.error);
    const dealer = store.getCustomers().find((c) => c.type === "dealer")!;
    const sale = store.createPosSale({
      channel: "dealer", customerId: dealer.id, soldBy: "u",
      lineItems: [{ itemUnitId: u.id, unitPrice: 100 }],
      now: new Date("2026-03-01T00:00:00Z"),
    });
    if ("error" in sale) throw new Error(sale.error);
    const expiry = new Date(store.getUnitById(u.id)!.warrantyExpiresAt!);
    expect(expiry.getUTCFullYear()).toBe(2026);
    expect(expiry.getUTCMonth()).toBe(5); // June
  });
});

describe("Invoice / challan numbering", () => {
  it("retail = INV-YYYY-NNNN, dealer = DC-YYYY-NNNN, per-year reset", () => {
    const item = addItem(store, { trackSerials: true });
    const retail = store.getCustomers().find((c) => c.type === "retail")!;
    const dealer = store.getCustomers().find((c) => c.type === "dealer")!;
    for (let i = 0; i < 3; i++) {
      const u = addUnit(store, item.id, `SN-Y1-${i}`);
      const s = store.createPosSale({
        channel: "retail", customerId: retail.id, soldBy: "u",
        lineItems: [{ itemUnitId: u.id, unitPrice: 100 }],
        now: new Date("2026-05-10T00:00:00Z"),
      });
      if ("error" in s) throw new Error(s.error);
    }
    const u2 = addUnit(store, item.id, "SN-Y2-1");
    const dealerSale = store.createPosSale({
      channel: "dealer", customerId: dealer.id, soldBy: "u",
      lineItems: [{ itemUnitId: u2.id, unitPrice: 100 }],
      now: new Date("2027-01-01T00:00:00Z"),
    });
    if ("error" in dealerSale) throw new Error(dealerSale.error);

    const sales = store.getSales();
    const retailNums = sales.filter((s) => s.channel === "retail").map((s) => s.documentNumber).sort();
    expect(retailNums).toEqual(["INV-2026-0001", "INV-2026-0002", "INV-2026-0003"]);
    expect(dealerSale.documentNumber).toBe("DC-2027-0001");
  });
});

describe("Discounts and totals", () => {
  it("applies line + gross discount and tax", () => {
    store.setSalesSettings({ defaultTaxRate: 0.1 });
    const item = addItem(store, { trackSerials: true, sellingPrice: 100 });
    const u1 = addUnit(store, item.id, "SN-T1");
    const u2 = addUnit(store, item.id, "SN-T2");
    const c = store.getCustomers()[0];
    const s = store.createPosSale({
      channel: "retail", customerId: c.id, soldBy: "u",
      lineItems: [
        { itemUnitId: u1.id, unitPrice: 100, lineDiscount: 10 },
        { itemUnitId: u2.id, unitPrice: 100, lineDiscount: 0 },
      ],
      grossDiscount: 20,
    });
    if ("error" in s) throw new Error(s.error);
    // subtotal 200, discounts 30, after 170, tax 17, total 187
    expect(s.subtotal).toBe(200);
    expect(s.lineDiscountTotal).toBe(10);
    expect(s.grossDiscount).toBe(20);
    expect(s.tax).toBeCloseTo(17, 2);
    expect(s.total).toBeCloseTo(187, 2);
  });
});

describe("Dealer credit balance", () => {
  it("increments customer balance on partial payment and reverses on refund", () => {
    const item = addItem(store, { trackSerials: true });
    const u = addUnit(store, item.id, "SN-B1");
    const dealer = store.getCustomers().find((c) => c.type === "dealer")!;
    const before = dealer.balance;
    const s = store.createPosSale({
      channel: "dealer", customerId: dealer.id, soldBy: "u",
      lineItems: [{ itemUnitId: u.id, unitPrice: 500 }],
      amountPaid: 200,
    });
    if ("error" in s) throw new Error(s.error);
    expect(s.balanceDue).toBe(300);
    expect(store.getCustomerById(dealer.id)!.balance).toBe(before + 300);
    store.refundSale(s.id);
    expect(store.getCustomerById(dealer.id)!.balance).toBe(before);
  });
});

describe("Warranty claim lifecycle", () => {
  it("moves unit to warranty_service on in_progress and back to sold on resolve", () => {
    const item = addItem(store, { trackSerials: true });
    const u = addUnit(store, item.id, "SN-W1");
    const c = store.getCustomers()[0];
    const sale = store.createPosSale({
      channel: "retail", customerId: c.id, soldBy: "u",
      lineItems: [{ itemUnitId: u.id, unitPrice: 100 }],
    });
    if ("error" in sale) throw new Error(sale.error);
    const claim = store.createWarrantyClaim({ itemUnitId: u.id, claimType: "service" });
    if ("error" in claim) throw new Error(claim.error);
    store.updateWarrantyClaim(claim.id, "in_progress");
    expect(store.getUnitById(u.id)!.status).toBe("warranty_service");
    store.updateWarrantyClaim(claim.id, "resolved");
    expect(store.getUnitById(u.id)!.status).toBe("sold");
  });

  it("rejects a claim on a never-sold unit", () => {
    const item = addItem(store, { trackSerials: true });
    const u = addUnit(store, item.id, "SN-W2");
    const res = store.createWarrantyClaim({ itemUnitId: u.id, claimType: "service" });
    expect("error" in res).toBe(true);
  });
});

describe("PO receive stock counting", () => {
  function receiveMovement(itemId: string, qty: number) {
    store.createMovement({
      id: crypto.randomUUID(), itemId, type: MovementType.Received, quantity: qty,
      fromLocationId: null, toLocationId: null, reference: "PO-1",
      notes: "", performedBy: "demo-user", createdAt: new Date().toISOString(),
    });
  }

  it("counts a non-serialized receive exactly once (40 received → 40 in stock)", () => {
    const item = addItem(store, { trackSerials: false });
    receiveMovement(item.id, 40);
    expect(store.getItemById(item.id)!.currentStock).toBe(40);
  });

  it("derives serialized stock from units only — receive movement never double-counts", () => {
    const item = addItem(store, { trackSerials: true });
    // Simulate receive of 3 serialized units: addUnit + Received movement
    addUnit(store, item.id, "SN-R1");
    addUnit(store, item.id, "SN-R2");
    addUnit(store, item.id, "SN-R3");
    receiveMovement(item.id, 3);
    expect(store.getItemById(item.id)!.currentStock).toBe(3); // not 6
  });

  it("matches the reported scenario: 3 + 2 + 40 received → 45 in stock, not 85", () => {
    const a = addItem(store, { trackSerials: true });
    const b = addItem(store, { trackSerials: true });
    const c = addItem(store, { trackSerials: false });
    addUnit(store, a.id, "SN-A1"); addUnit(store, a.id, "SN-A2"); addUnit(store, a.id, "SN-A3");
    receiveMovement(a.id, 3);
    addUnit(store, b.id, "SN-B1"); addUnit(store, b.id, "SN-B2");
    receiveMovement(b.id, 2);
    receiveMovement(c.id, 40);
    const total = [a, b, c].reduce((s, i) => s + store.getItemById(i.id)!.currentStock, 0);
    expect(total).toBe(45);
  });
});
