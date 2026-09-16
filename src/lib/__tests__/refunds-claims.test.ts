import { describe, it, expect, beforeEach } from "vitest";
import { DemoStore } from "@/lib/demo-store";
import { ItemStatus, type DeliveryInfo } from "@/types/inventory";

const COURIER: DeliveryInfo = {
  method: "courier",
  courierName: "Sundarban",
  trackingNumber: "TRK-991",
  address: "12 Gulshan Ave",
  notes: "Call before delivery",
};

function addItem(store: DemoStore, sellingPrice = 100) {
  const now = new Date().toISOString();
  return store.createItem({
    id: crypto.randomUUID(), sku: "SKU-" + Math.random().toString(36).slice(2, 8),
    barcode: null, name: "Test Item", description: "", categoryId: null, brandId: null,
    model: "", modelYear: null, status: ItemStatus.Active, unit: "ea",
    currentStock: 0, reorderPoint: 5, reorderQuantity: 10,
    costPrice: 50, sellingPrice,
    locationId: null, supplierId: null, imageUrl: null,
    trackSerials: true, defaultWarrantyMonths: 12,
    customFields: {}, createdAt: now, updatedAt: now,
  });
}

function addUnit(store: DemoStore, itemId: string, sn: string) {
  const u = store.addUnit({
    itemId, serialNumber: sn, status: "in_stock", locationId: null,
    receivedAt: new Date().toISOString(), soldAt: null, warrantyMonths: 12,
    warrantyExpiresAt: null, cost: 50, notes: "",
  });
  if ("error" in u) throw new Error(u.error);
  return u;
}

let store: DemoStore;
beforeEach(() => { store = new DemoStore(); });

function saleOfTwo(channel: "retail" | "dealer" = "retail") {
  const item = addItem(store);
  const a = addUnit(store, item.id, "SN-R1");
  const b = addUnit(store, item.id, "SN-R2");
  const customer = store.getCustomers().find(c => c.type === channel) ?? store.getCustomers()[0];
  const sale = store.createPosSale({
    channel, customerId: customer.id, soldBy: "u",
    lineItems: [{ itemUnitId: a.id, unitPrice: 100 }, { itemUnitId: b.id, unitPrice: 100 }],
    amountPaid: channel === "retail" ? 200 : 0,
    delivery: COURIER,
  });
  if ("error" in sale) throw new Error(sale.error);
  return { item, a, b, sale, customer };
}

describe("Partial refunds", () => {
  it("returns only the selected unit to stock and keeps the rest sold", () => {
    const { a, b, sale } = saleOfTwo();
    const res = store.refundSaleUnits(sale.id, [a.id], COURIER, "Damaged box");
    expect("error" in res).toBe(false);
    if ("error" in res) return;
    expect(res.sale.status).toBe("partially_refunded");
    expect(store.getUnits().find(u => u.id === a.id)?.status).toBe("in_stock");
    expect(store.getUnits().find(u => u.id === b.id)?.status).toBe("sold");
  });

  it("computes the refund amount from the selected lines only", () => {
    const { a, sale } = saleOfTwo();
    const res = store.refundSaleUnits(sale.id, [a.id]);
    if ("error" in res) throw new Error(res.error);
    expect(res.refund.amount).toBeCloseTo(sale.total / 2, 2);
  });

  it("refunds the remaining unit later and marks the order fully refunded", () => {
    const { a, b, sale } = saleOfTwo();
    store.refundSaleUnits(sale.id, [a.id]);
    const res = store.refundSaleUnits(sale.id, [b.id]);
    if ("error" in res) throw new Error(res.error);
    expect(res.sale.status).toBe("refunded");
    expect(store.getSaleRefunds(sale.id)).toHaveLength(2);
  });

  it("never refunds the same unit twice", () => {
    const { a, sale } = saleOfTwo();
    store.refundSaleUnits(sale.id, [a.id]);
    const again = store.refundSaleUnits(sale.id, [a.id]);
    expect("error" in again).toBe(true);
  });

  it("adjusts dealer credit proportionally to the refunded lines", () => {
    const { a, sale, customer } = saleOfTwo("dealer");
    const before = store.getCustomers().find(c => c.id === customer.id)!.balance;
    store.refundSaleUnits(sale.id, [a.id]);
    const after = store.getCustomers().find(c => c.id === customer.id)!.balance;
    expect(before - after).toBeCloseTo(sale.total / 2, 2);
  });

  it("stores delivery information on the sale and on the refund", () => {
    const { a, sale } = saleOfTwo();
    expect(sale.delivery).toMatchObject({ method: "courier", trackingNumber: "TRK-991" });
    const res = store.refundSaleUnits(sale.id, [a.id], COURIER, "Damaged box");
    if ("error" in res) throw new Error(res.error);
    expect(res.refund.delivery.courierName).toBe("Sundarban");
    expect(res.refund.reason).toBe("Damaged box");
  });
});

describe("Warranty claims", () => {
  it("appears in the claim list with delivery info and the linked order", () => {
    const { a, sale } = saleOfTwo();
    const claim = store.createWarrantyClaim({
      itemUnitId: a.id, claimType: "service", notes: "No power", delivery: COURIER,
    });
    if ("error" in claim) throw new Error(claim.error);
    const list = store.getWarrantyClaims();
    expect(list.map(c => c.id)).toContain(claim.id);
    expect(claim.saleId).toBe(sale.id);
    expect(claim.delivery.method).toBe("courier");
    expect(store.getWarrantyClaims({ status: "pending" })).toHaveLength(1);
  });

  it("advances a claim through its statuses", () => {
    const { a } = saleOfTwo();
    const claim = store.createWarrantyClaim({ itemUnitId: a.id, claimType: "replacement", notes: "" });
    if ("error" in claim) throw new Error(claim.error);
    const updated = store.updateWarrantyClaim(claim.id, "resolved", "Replaced unit");
    if ("error" in updated) throw new Error(updated.error);
    expect(updated.status).toBe("resolved");
    expect(updated.resolvedAt).toBeTruthy();
    expect(store.getWarrantyClaims({ status: "pending" })).toHaveLength(0);
  });
});
