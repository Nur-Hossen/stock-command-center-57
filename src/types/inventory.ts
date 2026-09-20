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
  /** How the order reaches the customer (by hand or courier). */
  delivery: DeliveryInfo;
  /** Unit ids already returned through a refund. */
  refundedUnitIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** A (possibly partial) return of units from a sale. */
export interface SaleRefund {
  id: string;
  saleId: string;
  refundNumber: string;
  itemUnitIds: string[];
  amount: number;
  reason: string;
  /** How the returned goods travel back (by hand or courier). */
  delivery: DeliveryInfo;
  refundedAt: string;
  createdAt: string;
}

export type WarrantyClaimStatus = "pending" | "in_progress" | "resolved" | "rejected";

export interface WarrantyClaim {
  id: string;
  itemUnitId: string;
  saleId: string | null;
  claimType: WarrantyType;
  status: WarrantyClaimStatus;
  notes: string;
  /** How the claimed unit travels (drop-off by hand or courier). */
  delivery: DeliveryInfo;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

// ─── Service management ──────────────────────────────────

export type ServiceType = "paid" | "non_paid";

export type ServiceStatus = "pending" | "repairing" | "solved" | "damaged" | "delivered";

export type ServicePaymentStatus = "pending" | "partial" | "paid";

export type ReceivingMethod = "customer_brought" | "courier" | "pickup_service" | "third_party";

export type ProductCondition = "excellent" | "good" | "fair" | "poor" | "damaged";

export type VendorWarrantyStatus =
  | "pending_review"
  | "sent"
  | "processing"
  | "received"
  | "rejected"
  | "replaced";

export type QualityCheckStatus = "pending" | "passed" | "failed";

export type ServicePaymentMethod = "cash" | "bank" | "mfs";

/** A part or piece of equipment billed on a service. */
export interface ServiceItem {
  id: string;
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ServiceStatusEvent {
  id: string;
  serviceId: string;
  status: ServiceStatus;
  notes: string;
  by: string;
  at: string;
}

export interface ServicePayment {
  id: string;
  serviceId: string;
  method: ServicePaymentMethod;
  amount: number;
  paidAt: string;
  receivedBy: string;
  /** Bank deposits */
  bankName: string;
  branchName: string;
  accountNumber: string;
  /** Mandatory for bank, optional for MFS. */
  referenceNumber: string;
  /** Mobile financial services */
  mobileNumber: string;
  transactionId: string;
  /** Data URL of an uploaded receipt / screenshot. */
  proofUrl: string;
  notes: string;
}

/** How the product reached us and how it went back. */
export interface ServiceTracking {
  receivingMethod: ReceivingMethod;
  courierName: string;
  courierContact: string;
  trackingNumber: string;
  courierCharge: number;
  receiptNumber: string;
  pickupAddress: string;
  pickupPerson: string;
  pickupPhone: string;
  pickupDate: string;
  condition: ProductCondition;
  /** Data URLs of condition photos. */
  photoUrls: string[];
  deliveryDate: string;
  deliveryPerson: string;
  receiverName: string;
  deliveryNotes: string;
}

export const EMPTY_SERVICE_TRACKING: ServiceTracking = {
  receivingMethod: "customer_brought",
  courierName: "",
  courierContact: "",
  trackingNumber: "",
  courierCharge: 0,
  receiptNumber: "",
  pickupAddress: "",
  pickupPerson: "",
  pickupPhone: "",
  pickupDate: "",
  condition: "good",
  photoUrls: [],
  deliveryDate: "",
  deliveryPerson: "",
  receiverName: "",
  deliveryNotes: "",
};

/** Warranty replacement routed through a vendor (existing supplier). */
export interface VendorWarrantyTracking {
  vendorId: string;
  status: VendorWarrantyStatus;
  sentDate: string;
  expectedReturnDate: string;
  receivedDate: string;
  courierName: string;
  trackingNumber: string;
  qualityCheck: QualityCheckStatus;
  notes: string;
}

export interface Service {
  id: string;
  /** SRV-YYYYMMDD-NNNN */
  serviceNumber: string;
  customerId: string;
  serviceType: ServiceType;
  status: ServiceStatus;
  /** Set when the product came from our catalog. */
  itemId: string | null;
  itemUnitId: string | null;
  isInHouseProduct: boolean;
  productName: string;
  productSerial: string;
  productModel: string;
  problemDescription: string;
  serviceNotes: string;
  technicianName: string;
  receivedDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate: string | null;
  serviceCharge: number;
  discount: number;
  vatTax: number;
  items: ServiceItem[];
  payments: ServicePayment[];
  statusHistory: ServiceStatusEvent[];
  tracking: ServiceTracking;
  vendorWarranty: VendorWarrantyTracking | null;
  /** Linked warranty claim when the service came from a claim. */
  warrantyClaimId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
