import { describe, it, expect, beforeEach } from "vitest";
import { DemoStore } from "@/lib/demo-store";
import { ItemStatus } from "@/types/inventory";

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
