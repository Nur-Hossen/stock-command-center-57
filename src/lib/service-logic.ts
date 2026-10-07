import type {
  ProductCondition,
  ReceivingMethod,
  Service,
  ServiceItem,
  ServicePayment,
  ServicePaymentMethod,
  ServicePaymentStatus,
  ServiceStatus,
  ServiceType,
} from "@/types/inventory";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** BR-01/BR-02: SRV-YYYYMMDD-XXXX, sequence resets every day. */
export function formatServiceNumber(date: Date, sequence: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `SRV-${y}${m}${d}-${String(sequence).padStart(4, "0")}`;
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface ServiceTotals {
  partsCharge: number;
  serviceCharge: number;
  totalCharge: number;
  discount: number;
  vatTax: number;
  netAmount: number;
  totalPaid: number;
  dueAmount: number;
  paymentStatus: ServicePaymentStatus;
}

type TotalsInput = Pick<Service, "serviceType" | "serviceCharge" | "discount" | "vatTax"> & {
  items: Pick<ServiceItem, "quantity" | "unitPrice">[];
  payments: Pick<ServicePayment, "amount">[];
};

/** FR-06: single source of truth for every service money figure. */
export function serviceTotals(service: TotalsInput): ServiceTotals {
  const partsCharge = round2(service.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  // BR-03: non-paid services never carry a service charge.
  const serviceCharge = service.serviceType === "non_paid" ? 0 : round2(Math.max(0, service.serviceCharge));
  const totalCharge = round2(partsCharge + serviceCharge);
  const discount = round2(Math.min(Math.max(0, service.discount), totalCharge));
  const vatTax = round2(Math.max(0, service.vatTax));
  const netAmount = round2(Math.max(0, totalCharge - discount + vatTax));
  const totalPaid = round2(service.payments.reduce((s, p) => s + p.amount, 0));
  const dueAmount = round2(Math.max(0, netAmount - totalPaid));
  const paymentStatus: ServicePaymentStatus =
    netAmount === 0 || dueAmount === 0 ? (totalPaid > 0 || netAmount === 0 ? "paid" : "pending")
      : totalPaid > 0 ? "partial" : "pending";
  return { partsCharge, serviceCharge, totalCharge, discount, vatTax, netAmount, totalPaid, dueAmount, paymentStatus };
}

/** FR-14 status transition graph. */
export const SERVICE_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  pending: ["repairing", "damaged"],
  repairing: ["solved", "damaged"],
  solved: ["delivered"],
  damaged: ["delivered"],
  delivered: [],
};

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  pending: "Pending",
  repairing: "Repairing",
  solved: "Solved",
  damaged: "Damaged",
  delivered: "Delivered",
};

export function canTransition(from: ServiceStatus, to: ServiceStatus): boolean {
  return SERVICE_TRANSITIONS[from].includes(to);
}

export interface PaymentDraft {
  method: ServicePaymentMethod;
  amount: number;
  referenceNumber?: string;
  bankName?: string;
  transactionId?: string;
  mobileNumber?: string;
}

/** BR-07 / VAL-08 payment validation. Returns an error message or null. */
export function validatePayment(draft: PaymentDraft, dueAmount: number): string | null {
  if (!(draft.amount > 0)) return "Payment amount must be greater than zero";
  if (round2(draft.amount) > round2(dueAmount)) return "Payment cannot exceed the due amount";
  if (draft.method === "bank") {
    if (!draft.bankName?.trim()) return "Bank name is required";
    if (!draft.referenceNumber?.trim()) return "Reference number is required for bank payments";
  }
  if (draft.method === "mfs") {
    if (!draft.mobileNumber?.trim()) return "Mobile number is required";
    if (!draft.transactionId?.trim()) return "Transaction ID is required for mobile payments";
  }
  return null;
}

export const PAYMENT_METHOD_LABELS: Record<ServicePaymentMethod, string> = {
  cash: "Cash",
  bank: "Bank deposit",
  mfs: "Mobile financial service",
};


export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  paid: "Paid service",
  non_paid: "Non-paid (warranty)",
};

export const RECEIVING_METHOD_LABELS: Record<ReceivingMethod, string> = {
  customer_brought: "Customer brought",
  courier: "Courier",
  pickup_service: "Pickup service",
  third_party: "Third party",
};

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
};

/** FR-17/FR-18 vendor warranty workflow. */
export const VENDOR_TRANSITIONS: Record<import("@/types/inventory").VendorWarrantyStatus, import("@/types/inventory").VendorWarrantyStatus[]> = {
  pending_review: ["sent", "rejected"],
  sent: ["processing", "rejected"],
  processing: ["received", "rejected"],
  received: ["replaced"],
  rejected: [],
  replaced: [],
};

export const VENDOR_STATUS_LABELS: Record<import("@/types/inventory").VendorWarrantyStatus, string> = {
  pending_review: "Pending review",
  sent: "Sent to vendor",
  processing: "Vendor processing",
  received: "Received from vendor",
  rejected: "Rejected",
  replaced: "Replaced",
};

export const QUALITY_CHECK_LABELS: Record<import("@/types/inventory").QualityCheckStatus, string> = {
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
};
