// ─── Enums ───────────────────────────────────────────────

export enum MovementType {
  Received = "received",
  Shipped = "shipped",
  Adjusted = "adjusted",
  Transferred = "transferred",
}

export enum OrderStatus {
  Draft = "draft",
  Submitted = "submitted",
  Partial = "partial",
  Received = "received",
  Cancelled = "cancelled",
}

export enum RequestStatus {
  Pending = "pending",
  Approved = "approved",
  PartiallyFulfilled = "partially_fulfilled",
  Fulfilled = "fulfilled",
  Declined = "declined",
  Cancelled = "cancelled",
}

export enum ItemStatus {
  Active = "active",
  Discontinued = "discontinued",
  Archived = "archived",
}

export enum UserRoleType {
  Admin = "admin",
  Manager = "manager",
  Requestor = "requestor",
}

// ─── Interfaces ──────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  fieldType: "text" | "number" | "boolean" | "date" | "select";
  options: string[];
  required: boolean;
  createdAt: string;
}

export interface Item {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  model: string;
  modelYear: number | null;
  status: ItemStatus;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  costPrice: number;
  sellingPrice: number;
  locationId: string | null;
  supplierId: string | null;
  imageUrl: string | null;
  trackSerials: boolean;
  defaultWarrantyMonths: number;
  customFields: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl: string;
  website: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ItemUnitStatus =
  | "in_stock"
  | "reserved"
  | "sold"
  | "returned"
  | "warranty_service"
  | "retired";

export interface ItemUnit {
  id: string;
  itemId: string;
  serialNumber: string;
  status: ItemUnitStatus;
  locationId: string | null;
  receivedAt: string;
  soldAt: string | null;
  warrantyMonths: number;
  /** ISO date; null when not yet sold */
  warrantyExpiresAt: string | null;
  cost: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomerType = "retail" | "dealer";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  /** retail = walk-in end user; dealer = wholesale account with credit. */
  type: CustomerType;
  /** Outstanding accounts-receivable balance (dealer credit). Positive = owes us. */
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export type SaleStatus = "draft" | "completed" | "partially_refunded" | "refunded";

export type DeliveryMethod = "hand" | "courier";

/** Delivery / logistics details attached to a sale, refund, or warranty claim. */
export interface DeliveryInfo {
  method: DeliveryMethod;
  courierName: string;
  trackingNumber: string;
  address: string;
  notes: string;
}

export const EMPTY_DELIVERY: DeliveryInfo = {
  method: "hand",
  courierName: "",
  trackingNumber: "",
  address: "",
  notes: "",
};
export type SaleChannel = "retail" | "dealer";
export type WarrantyType = "service" | "replacement";

export interface SaleLineItem {
  id: string;
  itemUnitId: string;
  itemId: string;
  serialNumber: string;
  unitPrice: number;
  /** Per-line discount in currency (subtracted from unitPrice). */
  lineDiscount: number;
  warrantyMonths: number;
  warrantyType: WarrantyType;
}

export interface Sale {
  id: string;
  saleNumber: string;
  /** Retail = INV-YYYY-NNNN. Dealer = DC-YYYY-NNNN (Delivery Challan). */
  documentNumber: string;
  channel: SaleChannel;
  customerId: string;
  status: SaleStatus;
  items: SaleLineItem[];
  subtotal: number;
  lineDiscountTotal: number;
  /** Additional gross (invoice-level) discount amount. */
  grossDiscount: number;
  tax: number;
  total: number;
  amountPaid: number;
  /** total - amountPaid; positive = customer owes. */
  balanceDue: number;
  /** Snapshot of the "print discount on invoice" flag at time of sale. */
  showDiscountOnInvoice: boolean;
  soldAt: string;
  soldBy: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type WarrantyClaimStatus = "pending" | "in_progress" | "resolved" | "rejected";

export interface WarrantyClaim {
  id: string;
  itemUnitId: string;
  saleId: string | null;
  claimType: WarrantyType;
  status: WarrantyClaimStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface SalesSettings {
  /** Show discount column on printed invoices. */
  showDiscountOnInvoice: boolean;
  /** Default tax rate (e.g. 0.05 = 5%). */
  defaultTaxRate: number;
  /** Business name printed on invoices. */
  businessName: string;
}

export type LocationType = "warehouse" | "zone" | "aisle" | "shelf" | "bin";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  parentId: string | null;
  description: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  rating: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  reference: string;
  notes: string;
  performedBy: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  /** Serial numbers received for this line (serialized items only). */
  receivedSerials?: string[];
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: OrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  expectedDelivery: string | null;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestItem {
  id: string;
  requestId: string;
  itemId: string;
  quantity: number;
  notes: string;
}

export interface InventoryRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: RequestStatus;
  priority: "normal" | "urgent";
  items: RequestItem[];
  requestedBy: string;
  approvedBy: string | null;
  reason: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | "low_stock"
  | "zero_stock"
  | "po_reminder"
  | "po_overdue"
  | "request_update"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  role: UserRoleType;
}
