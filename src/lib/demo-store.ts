import type {
  Item,
  Category,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
  Notification,
  Brand,
  ItemUnit,
  ItemUnitStatus,
  Customer,
  Sale,
  SaleLineItem,
  SaleChannel,
  WarrantyType,
  WarrantyClaim,
  WarrantyClaimStatus,
  SalesSettings,
  DeliveryInfo,
  SaleRefund,
  Service,
  ServiceItem,
  ServicePayment,
  ServiceStatus,
  ServiceStatusEvent,
  ServiceTracking,
  ServiceType,
  VendorWarrantyTracking,
} from "@/types/inventory";
import { refundAmount } from "./refund-amount";
import {
  canTransition,
  VENDOR_TRANSITIONS,
  dateKey,
  formatServiceNumber,
  serviceTotals,
  validatePayment,
  type PaymentDraft,
  type ServiceTotals,
} from "./service-logic";
import { EMPTY_DELIVERY, EMPTY_SERVICE_TRACKING, MovementType } from "@/types/inventory";
import { generateSeedData, type SeedData } from "./demo/index";
import { BUILTIN_ROLES, type RoleDefinition, type PermissionAction } from "@/lib/roles";

export interface ItemFilters {
  categoryId?: string;
  supplierId?: string;
  locationId?: string;
  brandId?: string;
  status?: string;
  search?: string;
}

export interface StockSummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  /** Matches a RoleDefinition.id (built-in or custom). */
  role: string;
  status: "active" | "inactive" | "pending";
  joinedAt: string;
}

const SEED_USERS: DemoUser[] = [
  { id: "user-01", name: "Alice Chen", email: "alice@stackwise.io", role: "admin", status: "active", joinedAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: "user-02", name: "Bob Martinez", email: "bob@stackwise.io", role: "admin", status: "active", joinedAt: new Date(Date.now() - 80 * 86400000).toISOString() },
  { id: "user-03", name: "Carol Kim", email: "carol@stackwise.io", role: "manager", status: "active", joinedAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: "user-04", name: "David Okafor", email: "david@stackwise.io", role: "manager", status: "active", joinedAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: "user-05", name: "Eva Novak", email: "eva@stackwise.io", role: "requestor", status: "active", joinedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

function seedBrands(): Brand[] {
  const now = new Date().toISOString();
  const mk = (id: string, name: string, description: string): Brand => ({
    id, name, description, logoUrl: "", website: "", isActive: true, createdAt: now, updatedAt: now,
  });
  return [
    mk("brand-samsung", "Samsung", "Consumer electronics — phones, audio, displays."),
    mk("brand-apple", "Apple", "Consumer electronics — Mac, iPhone, iPad, accessories."),
    mk("brand-sony", "Sony", "Consumer electronics — audio, imaging."),
    mk("brand-logitech", "Logitech", "Peripherals & accessories."),
    mk("brand-generic", "Generic", "Unbranded / house brand items."),
  ];
}

function seedCustomers(): Customer[] {
  const now = new Date().toISOString();
  const mk = (id: string, name: string, email: string, phone: string, type: "retail" | "dealer"): Customer => ({
    id, name, email, phone, address: "", notes: "", type, balance: 0, createdAt: now, updatedAt: now,
  });
  return [
    mk("cust-001", "Acme Corp", "buyer@acme.example", "+1-555-0101", "dealer"),
    mk("cust-002", "Beacon Retail", "orders@beacon.example", "+1-555-0202", "dealer"),
    mk("cust-003", "Walk-in Customer", "", "", "retail"),
  ];
}

function seedUnitsFor(items: Item[]): ItemUnit[] {
  const now = new Date().toISOString();
  const units: ItemUnit[] = [];
  const eligible = items.filter((i) => i.trackSerials);
  const targets = eligible.length > 0 ? eligible : items.slice(0, 6);
  for (const item of targets) {
    // For serialized items, seed one unit per unit of stock so currentStock
    // matches the in_stock unit count (syncSerializedStock keeps them in sync).
    const count = item.trackSerials
      ? Math.max(1, Math.min(item.currentStock || 1, 25))
      : Math.min(3, Math.max(1, Math.floor((item.currentStock ?? 3) / 2) || 3));
    const prefix = (item.sku || item.name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "SN";
    for (let i = 1; i <= count; i++) {
      const serial = `${prefix}-${String(i).padStart(4, "0")}`;
      units.push({
        id: `unit-${item.id}-${i}`,
        itemId: item.id,
        serialNumber: serial,
        status: "in_stock",
        locationId: null,
        receivedAt: now,
        soldAt: null,
        warrantyMonths: 12,
        warrantyExpiresAt: null,
        cost: item.costPrice ?? 0,
        notes: "",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return units;
}

const DEFAULT_SALES_SETTINGS: SalesSettings = {
  showDiscountOnInvoice: true,
  defaultTaxRate: 0,
  businessName: "Stackwise Store",
};

export class DemoStore {
  private data: SeedData;
  private version = 0;
  private users: DemoUser[] = SEED_USERS.map((u) => ({ ...u }));
  private roles: RoleDefinition[] = BUILTIN_ROLES.map((r) => ({ ...r, permissions: [...r.permissions] }));
  private brands: Brand[] = seedBrands();
  private units: ItemUnit[] = [];
  private customers: Customer[] = seedCustomers();
  private sales: Sale[] = [];
  private refunds: SaleRefund[] = [];
  private saleCounter = 1000;
  private invoiceCounterByYear: Record<number, number> = {};
  private challanCounterByYear: Record<number, number> = {};
  private warrantyClaims: WarrantyClaim[] = [];
  private salesSettings: SalesSettings = { ...DEFAULT_SALES_SETTINGS };
  private services: Service[] = [];
  private serviceCounterByDay: Record<string, number> = {};

  constructor() {
    this.data = generateSeedData();
    this.units = seedUnitsFor(this.data.items);
    this.seedServices();
  }

  getVersion() {
    return this.version;
  }

  reset() {
    this.data = generateSeedData();
    this.users = SEED_USERS.map((u) => ({ ...u }));
    this.roles = BUILTIN_ROLES.map((r) => ({ ...r, permissions: [...r.permissions] }));
    this.brands = seedBrands();
    this.units = seedUnitsFor(this.data.items);
    this.customers = seedCustomers();
    this.sales = [];
    this.saleCounter = 1000;
    this.invoiceCounterByYear = {};
    this.challanCounterByYear = {};
    this.warrantyClaims = [];
    this.salesSettings = { ...DEFAULT_SALES_SETTINGS };
    this.services = [];
    this.serviceCounterByDay = {};
    this.seedServices();
    this.version++;
  }

  // ─── Roles ─────────────────────────────────────────────
  getRoles(): RoleDefinition[] {
    return this.roles.map((r) => ({ ...r, permissions: [...r.permissions] }));
  }

  getRoleById(id: string): RoleDefinition | undefined {
    const r = this.roles.find((x) => x.id === id);
    return r ? { ...r, permissions: [...r.permissions] } : undefined;
  }

  createRole(role: Omit<RoleDefinition, "isSystem">): RoleDefinition | { error: string } {
    if (!role.name.trim()) return { error: "Name is required" };
    if (this.roles.some((r) => r.id === role.id)) return { error: "Role id already exists" };
    if (this.roles.some((r) => r.name.toLowerCase() === role.name.trim().toLowerCase()))
      return { error: "A role with this name already exists" };
    const created: RoleDefinition = { ...role, name: role.name.trim(), isSystem: false, permissions: [...role.permissions] };
    this.roles.push(created);
    this.version++;
    return created;
  }

  updateRole(id: string, updates: Partial<Pick<RoleDefinition, "name" | "description" | "color" | "permissions">>): RoleDefinition | { error: string } {
    const idx = this.roles.findIndex((r) => r.id === id);
    if (idx === -1) return { error: "Role not found" };
    const current = this.roles[idx];
    if (updates.name !== undefined) {
      const name = updates.name.trim();
      if (!name) return { error: "Name is required" };
      if (this.roles.some((r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase()))
        return { error: "A role with this name already exists" };
    }
    // System role permissions may be edited but keep at least one perm on admin.
    if (current.id === "admin" && updates.permissions && updates.permissions.length === 0) {
      return { error: "Admin must retain at least one permission" };
    }
    this.roles[idx] = {
      ...current,
      ...updates,
      name: updates.name?.trim() ?? current.name,
      permissions: updates.permissions ? [...updates.permissions] : current.permissions,
    };
    this.version++;
    return this.roles[idx];
  }

  deleteRole(id: string): { ok: true } | { error: string } {
    const role = this.roles.find((r) => r.id === id);
    if (!role) return { error: "Role not found" };
    if (role.isSystem) return { error: "System roles cannot be deleted" };
    const inUse = this.users.filter((u) => u.role === id).length;
    if (inUse > 0) return { error: `Cannot delete — ${inUse} user${inUse === 1 ? "" : "s"} still assigned` };
    this.roles = this.roles.filter((r) => r.id !== id);
    this.version++;
    return { ok: true };
  }

  hasPermission(roleId: string, permission: PermissionAction): boolean {
    const role = this.roles.find((r) => r.id === roleId);
    return role?.permissions.includes(permission) ?? false;
  }

  // ─── Users ─────────────────────────────────────────────
  getUsers(): DemoUser[] { return [...this.users]; }

  addUser(user: DemoUser): void { this.users.push(user); this.version++; }

  updateUser(id: string, updates: Partial<DemoUser>): void {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx !== -1) { this.users[idx] = { ...this.users[idx], ...updates }; this.version++; }
  }

  getAdminCount(): number {
    return this.users.filter((u) => u.role === "admin" && u.status === "active").length;
  }

  // ─── Categories ────────────────────────────────────────
  getCategories(): Category[] {
    return this.data.categories;
  }

  createCategory(category: Category): Category {
    this.data.categories.push(category);
    this.version++;
    return category;
  }

  updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.version++;
    return this.data.categories[idx];
  }

  deleteCategory(id: string): boolean {
    const len = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    // Unlink items from deleted category
    for (const item of this.data.items) {
      if (item.categoryId === id) item.categoryId = null;
    }
    if (this.data.categories.length < len) { this.version++; return true; }
    return false;
  }

  // ─── Settings (reorder defaults) ──────────────────────
  private reorderDefaults = { reorderPoint: 10, leadTimeDays: 7, safetyMultiplier: 1.5, orderQuantity: 25 };

  getReorderDefaults() {
    return { ...this.reorderDefaults };
  }

  setReorderDefaults(defaults: typeof this.reorderDefaults): void {
    this.reorderDefaults = { ...defaults };
    this.version++;
  }

  // ─── Custom Field Definitions ─────────────────────────
  private customFieldDefs: import("@/types/inventory").CustomFieldDefinition[] = [];

  getCustomFieldDefs() {
    return [...this.customFieldDefs];
  }

  addCustomFieldDef(def: import("@/types/inventory").CustomFieldDefinition): void {
    this.customFieldDefs.push(def);
    this.version++;
  }

  updateCustomFieldDef(id: string, updates: Partial<import("@/types/inventory").CustomFieldDefinition>): void {
    const idx = this.customFieldDefs.findIndex((d) => d.id === id);
    if (idx !== -1) { this.customFieldDefs[idx] = { ...this.customFieldDefs[idx], ...updates }; this.version++; }
  }

  deleteCustomFieldDef(id: string): void {
    this.customFieldDefs = this.customFieldDefs.filter((d) => d.id !== id);
    this.version++;
  }

  reorderCustomFieldDefs(ids: string[]): void {
    const map = new Map(this.customFieldDefs.map((d) => [d.id, d]));
    this.customFieldDefs = ids.map((id) => map.get(id)!).filter(Boolean);
    this.version++;
  }

  // ─── Items ─────────────────────────────────────────────
  getItems(filters?: ItemFilters): Item[] {
    let result = this.data.items;
    if (filters?.categoryId) result = result.filter((i) => i.categoryId === filters.categoryId);
    if (filters?.supplierId) result = result.filter((i) => i.supplierId === filters.supplierId);
    if (filters?.locationId) result = result.filter((i) => i.locationId === filters.locationId);
    if (filters?.brandId) result = result.filter((i) => i.brandId === filters.brandId);
    if (filters?.status) result = result.filter((i) => i.status === filters.status);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    return result;
  }

  getItemById(id: string): Item | undefined {
    return this.data.items.find((i) => i.id === id);
  }

  createItem(item: Item): Item {
    this.data.items.push(item);
    this.version++;
    return item;
  }

  updateItem(id: string, updates: Partial<Item>): Item | undefined {
    const idx = this.data.items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.data.items[idx] = { ...this.data.items[idx], ...updates, updatedAt: new Date().toISOString() };
    this.version++;
    return this.data.items[idx];
  }

  deleteItem(id: string): boolean {
    const len = this.data.items.length;
    this.data.items = this.data.items.filter((i) => i.id !== id);
    if (this.data.items.length < len) { this.version++; return true; }
    return false;
  }

  getStockSummary(): StockSummary {
    const items = this.data.items;
    return {
      total: items.length,
      inStock: items.filter((i) => i.currentStock > i.reorderPoint).length,
      lowStock: items.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint).length,
      outOfStock: items.filter((i) => i.currentStock === 0).length,
    };
  }

  // ─── Movements ─────────────────────────────────────────
  getMovements(): StockMovement[] {
    return this.data.movements;
  }

  getRecentMovements(limit: number): StockMovement[] {
    return [...this.data.movements]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  createMovement(movement: StockMovement): StockMovement {
    this.data.movements.push(movement);
    // Update item quantity
    const item = this.data.items.find((i) => i.id === movement.itemId);
    if (item) {
      if (item.trackSerials) {
        // Serialized stock is always derived from in_stock unit count —
        // units are added/marked sold separately, so never adjust manually here.
        this.syncSerializedStock(item.id);
      } else if (movement.type === MovementType.Received) {
        item.currentStock += Math.abs(movement.quantity);
      } else if (movement.type === MovementType.Shipped) {
        item.currentStock = Math.max(0, item.currentStock - Math.abs(movement.quantity));
      } else if (movement.type === MovementType.Adjusted) {
        item.currentStock = Math.max(0, item.currentStock + movement.quantity);
      } else if (movement.type === MovementType.Transferred) {
        // Transfer doesn't change total stock, just location
        if (movement.toLocationId) {
          item.locationId = movement.toLocationId;
        }
      }
    }
    this.version++;
    return movement;
  }

  // ─── Suppliers ─────────────────────────────────────────
  getSuppliers(): Supplier[] {
    return this.data.suppliers;
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.data.suppliers.find((s) => s.id === id);
  }

  createSupplier(supplier: Supplier): Supplier {
    this.data.suppliers.push(supplier);
    this.version++;
    return supplier;
  }

  updateSupplier(id: string, updates: Partial<Supplier>): Supplier | undefined {
    const idx = this.data.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.data.suppliers[idx] = { ...this.data.suppliers[idx], ...updates };
    this.version++;
    return this.data.suppliers[idx];
  }

  deleteSupplier(id: string): boolean {
    const len = this.data.suppliers.length;
    this.data.suppliers = this.data.suppliers.filter((s) => s.id !== id);
    if (this.data.suppliers.length < len) { this.version++; return true; }
    return false;
  }

  // ─── Locations ─────────────────────────────────────────
  getLocations(): Location[] {
    return this.data.locations;
  }

  getLocationById(id: string): Location | undefined {
    return this.data.locations.find((l) => l.id === id);
  }

  createLocation(location: Location): Location {
    this.data.locations.push(location);
    this.version++;
    return location;
  }

  updateLocation(id: string, updates: Partial<Location>): Location | undefined {
    const idx = this.data.locations.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    this.data.locations[idx] = { ...this.data.locations[idx], ...updates };
    this.version++;
    return this.data.locations[idx];
  }

  deleteLocation(id: string): boolean {
    const len = this.data.locations.length;
    this.data.locations = this.data.locations.filter((l) => l.id !== id);
    if (this.data.locations.length < len) { this.version++; return true; }
    return false;
  }

  // ─── Purchase Orders ───────────────────────────────────
  getPurchaseOrders(): PurchaseOrder[] {
    return this.data.purchaseOrders;
  }

  getPurchaseOrderById(id: string): PurchaseOrder | undefined {
    return this.data.purchaseOrders.find((po) => po.id === id);
  }

  createPurchaseOrder(po: PurchaseOrder): PurchaseOrder {
    this.data.purchaseOrders.push(po);
    this.version++;
    return po;
  }

  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): PurchaseOrder | undefined {
    const idx = this.data.purchaseOrders.findIndex((po) => po.id === id);
    if (idx === -1) return undefined;
    this.data.purchaseOrders[idx] = { ...this.data.purchaseOrders[idx], ...updates };
    this.version++;
    return this.data.purchaseOrders[idx];
  }

  deletePurchaseOrder(id: string): boolean {
    const idx = this.data.purchaseOrders.findIndex((po) => po.id === id);
    if (idx === -1) return false;
    this.data.purchaseOrders.splice(idx, 1);
    this.version++;
    return true;
  }

  // ─── Requests ──────────────────────────────────────────
  getRequests(): InventoryRequest[] {
    return this.data.requests;
  }

  getRequestById(id: string): InventoryRequest | undefined {
    return this.data.requests.find((r) => r.id === id);
  }

  createRequest(request: InventoryRequest): InventoryRequest {
    this.data.requests.push(request);
    this.version++;
    return request;
  }

  updateRequest(id: string, updates: Partial<InventoryRequest>): InventoryRequest | undefined {
    const idx = this.data.requests.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.data.requests[idx] = { ...this.data.requests[idx], ...updates };
    this.version++;
    return this.data.requests[idx];
  }

  // ─── Notifications ────────────────────────────────────
  getNotifications(): Notification[] {
    return [...this.data.notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getUnreadCount(): number {
    return this.data.notifications.filter((n) => !n.isRead).length;
  }

  markAsRead(id: string): void {
    const n = this.data.notifications.find((n) => n.id === id);
    if (n) { n.isRead = true; this.version++; }
  }

  markAllAsRead(): void {
    this.data.notifications.forEach((n) => { n.isRead = true; });
    this.version++;
  }

  dismissNotification(id: string): void {
    this.data.notifications = this.data.notifications.filter((n) => n.id !== id);
    this.version++;
  }

  addNotification(notification: Notification): void {
    this.data.notifications.push(notification);
    this.version++;
  }

  // ─── Notification Preferences ─────────────────────────
  getNotificationPrefs() {
    return this.data.notificationPrefs;
  }

  setNotificationPrefs(prefs: typeof this.data.notificationPrefs): void {
    this.data.notificationPrefs = { ...prefs };
    this.version++;
  }
  // ─── Brands ────────────────────────────────────────────
  getBrands(): Brand[] { return [...this.brands]; }
  getBrandById(id: string): Brand | undefined { return this.brands.find((b) => b.id === id); }
  createBrand(brand: Brand): Brand | { error: string } {
    if (!brand.name.trim()) return { error: "Name is required" };
    if (this.brands.some((b) => b.name.toLowerCase() === brand.name.trim().toLowerCase()))
      return { error: "A brand with this name already exists" };
    const created = { ...brand, name: brand.name.trim() };
    this.brands.push(created); this.version++; return created;
  }
  updateBrand(id: string, updates: Partial<Brand>): Brand | { error: string } {
    const idx = this.brands.findIndex((b) => b.id === id);
    if (idx === -1) return { error: "Brand not found" };
    if (updates.name !== undefined) {
      const name = updates.name.trim();
      if (!name) return { error: "Name is required" };
      if (this.brands.some((b) => b.id !== id && b.name.toLowerCase() === name.toLowerCase()))
        return { error: "A brand with this name already exists" };
      updates = { ...updates, name };
    }
    this.brands[idx] = { ...this.brands[idx], ...updates, updatedAt: new Date().toISOString() };
    this.version++;
    return this.brands[idx];
  }
  deleteBrand(id: string): { ok: true } | { error: string } {
    const inUse = this.data.items.filter((i) => i.brandId === id).length;
    if (inUse > 0) return { error: `Cannot delete — ${inUse} item${inUse === 1 ? "" : "s"} still use this brand` };
    const len = this.brands.length;
    this.brands = this.brands.filter((b) => b.id !== id);
    if (this.brands.length < len) { this.version++; return { ok: true }; }
    return { error: "Brand not found" };
  }

  // ─── Item Units (serialized) ───────────────────────────
  getUnits(filters?: { itemId?: string; status?: ItemUnitStatus }): ItemUnit[] {
    let r = this.units;
    if (filters?.itemId) r = r.filter((u) => u.itemId === filters.itemId);
    if (filters?.status) r = r.filter((u) => u.status === filters.status);
    return [...r];
  }
  getUnitById(id: string): ItemUnit | undefined { return this.units.find((u) => u.id === id); }
  getUnitsForItem(itemId: string): ItemUnit[] { return this.units.filter((u) => u.itemId === itemId); }

  addUnit(unit: Omit<ItemUnit, "id" | "createdAt" | "updatedAt">): ItemUnit | { error: string } {
    const sn = unit.serialNumber.trim();
    if (!sn) return { error: "Serial number is required" };
    if (this.units.some((u) => u.serialNumber.toLowerCase() === sn.toLowerCase()))
      return { error: `Serial number "${sn}" already exists` };
    const now = new Date().toISOString();
    const created: ItemUnit = { ...unit, serialNumber: sn, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this.units.push(created);
    // Sync item.currentStock as count of in_stock units for serialized items
    this.syncSerializedStock(unit.itemId);
    this.version++;
    return created;
  }

  updateUnit(id: string, updates: Partial<ItemUnit>): ItemUnit | { error: string } {
    const idx = this.units.findIndex((u) => u.id === id);
    if (idx === -1) return { error: "Unit not found" };
    if (updates.serialNumber !== undefined) {
      const sn = updates.serialNumber.trim();
      if (!sn) return { error: "Serial number is required" };
      if (this.units.some((u) => u.id !== id && u.serialNumber.toLowerCase() === sn.toLowerCase()))
        return { error: `Serial number "${sn}" already exists` };
      updates = { ...updates, serialNumber: sn };
    }
    this.units[idx] = { ...this.units[idx], ...updates, updatedAt: new Date().toISOString() };
    this.syncSerializedStock(this.units[idx].itemId);
    this.version++;
    return this.units[idx];
  }

  deleteUnit(id: string): boolean {
    const u = this.units.find((x) => x.id === id);
    if (!u) return false;
    if (u.status === "sold") return false;
    this.units = this.units.filter((x) => x.id !== id);
    this.syncSerializedStock(u.itemId);
    this.version++;
    return true;
  }

  private syncSerializedStock(itemId: string) {
    const item = this.data.items.find((i) => i.id === itemId);
    if (!item || !item.trackSerials) return;
    item.currentStock = this.units.filter((u) => u.itemId === itemId && u.status === "in_stock").length;
    item.updatedAt = new Date().toISOString();
  }

  // ─── Customers ─────────────────────────────────────────
  getCustomers(): Customer[] { return [...this.customers]; }
  getCustomerById(id: string): Customer | undefined { return this.customers.find((c) => c.id === id); }
  createCustomer(c: Customer): Customer { this.customers.push(c); this.version++; return c; }
  updateCustomer(id: string, updates: Partial<Customer>): Customer | undefined {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.customers[idx] = { ...this.customers[idx], ...updates, updatedAt: new Date().toISOString() };
    this.version++;
    return this.customers[idx];
  }
  deleteCustomer(id: string): { ok: true } | { error: string } {
    const inUse = this.sales.filter((s) => s.customerId === id).length;
    if (inUse > 0) return { error: `Cannot delete — ${inUse} sale${inUse === 1 ? "" : "s"} reference this customer` };
    this.customers = this.customers.filter((c) => c.id !== id);
    this.version++;
    return { ok: true };
  }

  // ─── Sales ─────────────────────────────────────────────
  getSales(): Sale[] { return [...this.sales].sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()); }
  getSaleById(id: string): Sale | undefined { return this.sales.find((s) => s.id === id); }
  getSalesForCustomer(customerId: string): Sale[] { return this.sales.filter((s) => s.customerId === customerId); }
  getSalesForUnit(unitId: string): Sale[] { return this.sales.filter((s) => s.items.some((li) => li.itemUnitId === unitId)); }
  nextSaleNumber(): string { return `SALE-${this.saleCounter + 1}`; }

  /** Preview the next invoice/challan document number for a channel + year. */
  peekDocumentNumber(channel: SaleChannel, year = new Date().getFullYear()): string {
    const prefix = channel === "dealer" ? "DC" : "INV";
    const counter = channel === "dealer"
      ? (this.challanCounterByYear[year] ?? 0)
      : (this.invoiceCounterByYear[year] ?? 0);
    return `${prefix}-${year}-${String(counter + 1).padStart(4, "0")}`;
  }

  private nextDocumentNumber(channel: SaleChannel, at: Date): string {
    const year = at.getFullYear();
    const prefix = channel === "dealer" ? "DC" : "INV";
    if (channel === "dealer") {
      this.challanCounterByYear[year] = (this.challanCounterByYear[year] ?? 0) + 1;
      return `${prefix}-${year}-${String(this.challanCounterByYear[year]).padStart(4, "0")}`;
    }
    this.invoiceCounterByYear[year] = (this.invoiceCounterByYear[year] ?? 0) + 1;
    return `${prefix}-${year}-${String(this.invoiceCounterByYear[year]).padStart(4, "0")}`;
  }

  /** Lookup a unit by serial number OR item barcode+serial for POS scan. */
  findUnitByScan(code: string): ItemUnit | undefined {
    const q = code.trim();
    if (!q) return undefined;
    const bySerial = this.units.find((u) => u.serialNumber.toLowerCase() === q.toLowerCase());
    if (bySerial) return bySerial;
    // Fallback: item barcode returns nothing serial-specific — POS needs a serial.
    return undefined;
  }

  /**
   * Create a POS sale (retail or dealer channel).
   * Atomic: re-validates units, then assigns doc number, warranty, and balance.
   */
  createPosSale(input: {
    channel: SaleChannel;
    customerId: string;
    soldBy: string;
    lineItems: {
      itemUnitId: string;
      unitPrice: number;
      lineDiscount?: number;
      warrantyMonths?: number;
      warrantyType?: WarrantyType;
    }[];
    grossDiscount?: number;
    taxRate?: number;
    amountPaid?: number;
    notes?: string;
    /** Override "show discount on invoice" for this sale; defaults to settings. */
    showDiscountOnInvoice?: boolean;
    /** How the order is delivered (by hand or courier). */
    delivery?: DeliveryInfo;
    /** Test hook — inject a fixed sale timestamp. */
    now?: Date;
  }): Sale | { error: string } {
    if (!input.customerId) return { error: "Customer is required" };
    const customer = this.customers.find((c) => c.id === input.customerId);
    if (!customer) return { error: "Customer not found" };
    if (input.lineItems.length === 0) return { error: "Add at least one item" };

    // Reject duplicate unit ids in one cart.
    const seen = new Set<string>();
    for (const li of input.lineItems) {
      if (seen.has(li.itemUnitId)) return { error: "Same unit added twice" };
      seen.add(li.itemUnitId);
    }

    const chosen: SaleLineItem[] = [];
    for (const li of input.lineItems) {
      const unit = this.units.find((u) => u.id === li.itemUnitId);
      if (!unit) return { error: "Unit not found" };
      if (unit.status !== "in_stock") {
        return { error: `Invalid or Already Sold: ${unit.serialNumber}` };
      }
      const item = this.data.items.find((i) => i.id === unit.itemId);
      const warrantyMonths = li.warrantyMonths ?? (
        input.channel === "dealer"
          ? unit.warrantyMonths // dealer policy carried on the unit / model
          : (item?.defaultWarrantyMonths ?? unit.warrantyMonths)
      );
      chosen.push({
        id: crypto.randomUUID(),
        itemUnitId: unit.id,
        itemId: unit.itemId,
        serialNumber: unit.serialNumber,
        unitPrice: li.unitPrice,
        lineDiscount: Math.max(0, li.lineDiscount ?? 0),
        warrantyMonths,
        warrantyType: li.warrantyType ?? "service",
      });
    }

    const subtotal = chosen.reduce((s, l) => s + l.unitPrice, 0);
    const lineDiscountTotal = chosen.reduce((s, l) => s + l.lineDiscount, 0);
    const grossDiscount = Math.max(0, input.grossDiscount ?? 0);
    const afterDiscount = Math.max(0, subtotal - lineDiscountTotal - grossDiscount);
    const tax = Math.round(afterDiscount * (input.taxRate ?? this.salesSettings.defaultTaxRate) * 100) / 100;
    const total = Math.round((afterDiscount + tax) * 100) / 100;
    const amountPaid = Math.max(0, input.amountPaid ?? total);
    const balanceDue = Math.round((total - amountPaid) * 100) / 100;

    const soldDate = input.now ?? new Date();
    const soldAt = soldDate.toISOString();
    this.saleCounter++;
    const documentNumber = this.nextDocumentNumber(input.channel, soldDate);

    const sale: Sale = {
      id: crypto.randomUUID(),
      saleNumber: `SALE-${this.saleCounter}`,
      documentNumber,
      channel: input.channel,
      customerId: input.customerId,
      status: "completed",
      items: chosen,
      subtotal,
      lineDiscountTotal,
      grossDiscount,
      tax,
      total,
      amountPaid,
      balanceDue,
      showDiscountOnInvoice: input.showDiscountOnInvoice ?? this.salesSettings.showDiscountOnInvoice,
      soldAt,
      soldBy: input.soldBy,
      notes: input.notes ?? "",
      delivery: { ...(input.delivery ?? EMPTY_DELIVERY) },
      refundedUnitIds: [],
      createdAt: soldAt,
      updatedAt: soldAt,
    };

    for (const line of chosen) {
      const idx = this.units.findIndex((u) => u.id === line.itemUnitId);
      if (idx === -1) continue;
      let expiryIso: string | null = null;
      if (input.channel === "retail") {
        const expiry = new Date(soldDate);
        expiry.setMonth(expiry.getMonth() + line.warrantyMonths);
        expiryIso = expiry.toISOString();
      } else {
        // Dealer: warranty runs from purchase (unit.receivedAt), not sale date.
        const base = new Date(this.units[idx].receivedAt);
        base.setMonth(base.getMonth() + line.warrantyMonths);
        expiryIso = base.toISOString();
      }
      this.units[idx] = {
        ...this.units[idx],
        status: "sold",
        soldAt,
        warrantyMonths: line.warrantyMonths,
        warrantyExpiresAt: expiryIso,
        updatedAt: soldAt,
      };
      this.syncSerializedStock(this.units[idx].itemId);
    }

    // Dealer credit: update balance for unpaid portion.
    if (input.channel === "dealer" && balanceDue > 0) {
      const cidx = this.customers.findIndex((c) => c.id === customer.id);
      if (cidx !== -1) {
        this.customers[cidx] = {
          ...this.customers[cidx],
          balance: Math.round((this.customers[cidx].balance + balanceDue) * 100) / 100,
          updatedAt: soldAt,
        };
      }
    }

    this.sales.push(sale);
    this.version++;
    return sale;
  }

  /** Legacy simple sale — delegates to POS sale on the retail channel. */
  createSale(input: {
    customerId: string;
    soldBy: string;
    lineItems: { itemUnitId: string; unitPrice: number; warrantyMonths?: number }[];
    taxRate?: number;
    notes?: string;
    delivery?: DeliveryInfo;
  }): Sale | { error: string } {
    return this.createPosSale({
      channel: "retail",
      customerId: input.customerId,
      soldBy: input.soldBy,
      lineItems: input.lineItems,
      taxRate: input.taxRate,
      notes: input.notes,
      delivery: input.delivery,
    });
  }

  getSaleRefunds(saleId: string): SaleRefund[] {
    return this.refunds.filter(r => r.saleId === saleId);
  }

  refundSaleUnits(id: string, unitIds: string[], delivery: DeliveryInfo = EMPTY_DELIVERY, reason = ""): { sale: Sale; refund: SaleRefund } | { error: string } {
    const idx = this.sales.findIndex(s => s.id === id);
    if (idx < 0) return { error: "Sale not found" };
    const sale = this.sales[idx];
    if (!["completed", "partially_refunded"].includes(sale.status)) return { error: "Sale cannot be refunded" };
    if (!unitIds.length || new Set(unitIds).size !== unitIds.length) return { error: "Select unique units to refund" };
    for (const id of unitIds) {
      if (!sale.items.some(l => l.itemUnitId === id) || sale.refundedUnitIds.includes(id)) return { error: "Unit is not eligible or already refunded" };
      if (this.warrantyClaims.some(c => c.itemUnitId === id && ["pending", "in_progress"].includes(c.status))) return { error: "Resolve the open warranty claim before refunding this unit" };
      if (this.getUnitById(id)?.status !== "sold") return { error: "Unit is not available for refund" };
    }
    const now = new Date().toISOString();
    const amount = refundAmount(sale, unitIds);
    const refundedUnitIds = [...sale.refundedUnitIds, ...unitIds];
    const full = refundedUnitIds.length === sale.items.length;
    const remainingTotal = sale.total - refundAmount(sale, sale.refundedUnitIds);
    const credit = full ? Math.max(0, sale.balanceDue) : Math.min(Math.max(0, sale.balanceDue), Math.round((remainingTotal > 0 ? amount / remainingTotal : 0) * Math.max(0, sale.balanceDue) * 100) / 100);
    for (const id of unitIds) {
      const uidx = this.units.findIndex(u => u.id === id);
      this.units[uidx] = { ...this.units[uidx], status: "in_stock", soldAt: null, warrantyExpiresAt: null, updatedAt: now };
      this.syncSerializedStock(this.units[uidx].itemId);
    }
    if (sale.channel === "dealer") {
      const cidx = this.customers.findIndex(c => c.id === sale.customerId);
      if (cidx >= 0) this.customers[cidx] = { ...this.customers[cidx], balance: Math.round((this.customers[cidx].balance - credit) * 100) / 100, updatedAt: now };
    }
    const refund: SaleRefund = { id: crypto.randomUUID(), saleId: id, refundNumber: `REF-${this.refunds.length + 1}`, itemUnitIds: [...unitIds], amount, reason, delivery: { ...delivery }, refundedAt: now, createdAt: now };
    this.sales[idx] = { ...sale, refundedUnitIds, status: full ? "refunded" : "partially_refunded", balanceDue: Math.round((sale.balanceDue - credit) * 100) / 100, updatedAt: now };
    this.refunds.push(refund);
    this.version++;
    return { sale: this.sales[idx], refund };
  }

  refundSale(id: string): Sale | { error: string } {
    const sale = this.sales.find(s => s.id === id);
    if (!sale) return { error: "Sale not found" };
    const result = this.refundSaleUnits(id, sale.items.map(l => l.itemUnitId).filter(id => !sale.refundedUnitIds.includes(id)));
    return "error" in result ? result : result.sale;
  }

  // ─── Sales settings ────────────────────────────────────
  getSalesSettings(): SalesSettings { return { ...this.salesSettings }; }
  setSalesSettings(updates: Partial<SalesSettings>): SalesSettings {
    this.salesSettings = { ...this.salesSettings, ...updates };
    this.version++;
    return { ...this.salesSettings };
  }

  // ─── Warranty claims ───────────────────────────────────
  getWarrantyClaims(filters?: { status?: WarrantyClaimStatus; itemUnitId?: string }): WarrantyClaim[] {
    let r = this.warrantyClaims;
    if (filters?.status) r = r.filter((c) => c.status === filters.status);
    if (filters?.itemUnitId) r = r.filter((c) => c.itemUnitId === filters.itemUnitId);
    return [...r].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createWarrantyClaim(input: {
    itemUnitId: string;
    claimType: WarrantyType;
    notes?: string;
    delivery?: DeliveryInfo;
  }): WarrantyClaim | { error: string } {
    const unit = this.units.find((u) => u.id === input.itemUnitId);
    if (!unit) return { error: "Serial not found" };
    if (unit.status !== "sold" && unit.status !== "warranty_service") {
      return { error: "Warranty claims are only valid on sold units" };
    }
    if (this.warrantyClaims.some(c => c.itemUnitId === unit.id && ["pending", "in_progress"].includes(c.status))) return { error: "An open claim already exists for this unit" };
    const sale = [...this.sales].reverse().find((s) => !s.refundedUnitIds.includes(unit.id) && s.items.some((li) => li.itemUnitId === unit.id));
    const now = new Date().toISOString();
    const claim: WarrantyClaim = {
      id: crypto.randomUUID(),
      itemUnitId: unit.id,
      saleId: sale?.id ?? null,
      claimType: input.claimType,
      status: "pending",
      notes: input.notes ?? "",
      delivery: { ...(input.delivery ?? EMPTY_DELIVERY) },
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };
    this.warrantyClaims.push(claim);
    this.version++;
    return claim;
  }

  updateWarrantyClaim(id: string, status: WarrantyClaimStatus, notes?: string): WarrantyClaim | { error: string } {
    const idx = this.warrantyClaims.findIndex((c) => c.id === id);
    if (idx === -1) return { error: "Claim not found" };
    const claim = this.warrantyClaims[idx];
    const now = new Date().toISOString();
    const uidx = this.units.findIndex((u) => u.id === claim.itemUnitId);
    if (uidx !== -1) {
      if (status === "in_progress" && this.units[uidx].status === "sold") {
        this.units[uidx] = { ...this.units[uidx], status: "warranty_service", updatedAt: now };
      } else if ((status === "resolved" || status === "rejected") && this.units[uidx].status === "warranty_service") {
        this.units[uidx] = { ...this.units[uidx], status: "sold", updatedAt: now };
      }
    }
    this.warrantyClaims[idx] = {
      ...claim,
      status,
      notes: notes ?? claim.notes,
      updatedAt: now,
      resolvedAt: status === "resolved" || status === "rejected" ? now : null,
    };
    this.version++;
    return this.warrantyClaims[idx];
  }

  // ─── Services ──────────────────────────────────────────
  /** Seed a small spread of demo services across the status workflow. */
  private seedServices() {
    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };
    const serialItem = this.data.items.find((i) => i.trackSerials) ?? this.data.items[0];
    const unit = this.units.find((u) => u.itemId === serialItem?.id);

    // 1. Pending, in-house product brought by the customer.
    const pending = this.createService({
      customerId: "cust-003",
      serviceType: "paid",
      itemId: serialItem?.id ?? null,
      itemUnitId: unit?.id ?? null,
      productName: serialItem?.name ?? "Customer device",
      productSerial: unit?.serialNumber ?? "",
      productModel: serialItem?.sku ?? "",
      problemDescription: "Device does not power on after a fall.",
      technicianName: "Rafiq",
      serviceCharge: 800,
      tracking: { receivingMethod: "customer_brought", condition: "fair" },
      now: daysAgo(1),
    });
    if (!("error" in pending)) {
      this.addServiceItem(pending.id, { name: "Charging port", quantity: 1, unitPrice: 450 });
    }

    // 2. Repairing, arrived by courier, part payment taken.
    const repairing = this.createService({
      customerId: "cust-001",
      serviceType: "paid",
      productName: "Bench power supply",
      productSerial: "OUT-4421",
      productModel: "PS-3005",
      problemDescription: "Output voltage unstable under load.",
      technicianName: "Sabbir",
      serviceCharge: 1500,
      vatTax: 100,
      tracking: {
        receivingMethod: "courier",
        courierName: "Sundarban",
        trackingNumber: "SRV-TRK-9001",
        courierCharge: 120,
        condition: "good",
      },
      now: daysAgo(4),
    });
    if (!("error" in repairing)) {
      this.addServiceItem(repairing.id, { name: "Regulator board", quantity: 1, unitPrice: 2200 });
      this.updateServiceStatus(repairing.id, "repairing", { notes: "Diagnosis complete, parts ordered" });
      this.addServicePayment(repairing.id, { method: "cash", amount: 1000, receivedBy: "Front desk" });
    }

    // 3. Delivered, non-paid warranty service, fully closed.
    const delivered = this.createService({
      customerId: "cust-002",
      serviceType: "non_paid",
      productName: "Wireless barcode scanner",
      productSerial: "OUT-7788",
      problemDescription: "Scanner head not reading codes.",
      technicianName: "Rafiq",
      tracking: { receivingMethod: "pickup_service", pickupAddress: "Beacon Retail, Banani", condition: "good" },
      now: daysAgo(9),
    });
    if (!("error" in delivered)) {
      this.updateServiceStatus(delivered.id, "repairing", { notes: "Cleaning and recalibration" });
      this.updateServiceStatus(delivered.id, "solved", { notes: "Scanner head replaced under warranty" });
      this.deliverService(delivered.id, { deliveryPerson: "Hasan", receiverName: "Beacon Retail store manager" });
    }
  }

  getServices(filters?: {
    status?: ServiceStatus;
    customerId?: string;
    search?: string;
    from?: string;
    to?: string;
  }): Service[] {
    let r = [...this.services];
    if (filters?.status) r = r.filter((s) => s.status === filters.status);
    if (filters?.customerId) r = r.filter((s) => s.customerId === filters.customerId);
    if (filters?.from) r = r.filter((s) => s.receivedDate >= filters.from!);
    if (filters?.to) r = r.filter((s) => s.receivedDate <= `${filters.to!}T23:59:59.999Z`);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      r = r.filter((s) =>
        s.serviceNumber.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q) ||
        s.productSerial.toLowerCase().includes(q) ||
        s.problemDescription.toLowerCase().includes(q) ||
        (this.getCustomerById(s.customerId)?.name ?? "").toLowerCase().includes(q),
      );
    }
    return r.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  }

  getServiceById(id: string): Service | undefined {
    return this.services.find((s) => s.id === id);
  }

  getServicesForCustomer(customerId: string): Service[] {
    return this.services.filter((s) => s.customerId === customerId);
  }

  /** Preview the next service number for a given day (sequence resets daily). */
  nextServiceNumber(now = new Date()): string {
    const key = dateKey(now);
    return formatServiceNumber(now, (this.serviceCounterByDay[key] ?? 0) + 1);
  }

  private takeServiceNumber(now: Date): string {
    const key = dateKey(now);
    this.serviceCounterByDay[key] = (this.serviceCounterByDay[key] ?? 0) + 1;
    return formatServiceNumber(now, this.serviceCounterByDay[key]);
  }

  createService(input: {
    customerId: string;
    serviceType: ServiceType;
    itemId?: string | null;
    itemUnitId?: string | null;
    productName: string;
    productSerial?: string;
    productModel?: string;
    problemDescription: string;
    serviceNotes?: string;
    technicianName?: string;
    expectedDeliveryDate?: string;
    serviceCharge?: number;
    discount?: number;
    vatTax?: number;
    tracking?: Partial<ServiceTracking>;
    warrantyClaimId?: string | null;
    createdBy?: string;
    now?: Date;
  }): Service | { error: string } {
    if (!input.customerId || !this.getCustomerById(input.customerId)) return { error: "Select a valid customer" };
    const productName = input.productName.trim();
    if (productName.length < 3) return { error: "Product name must be at least 3 characters" };
    if (!input.problemDescription.trim()) return { error: "Problem description is required" };
    const isInHouse = Boolean(input.itemId);
    const received = input.now ?? new Date();
    if (input.expectedDeliveryDate && input.expectedDeliveryDate < dateKey(received)) {
      return { error: "Expected delivery date cannot be before the received date" };
    }
    const nowIso = received.toISOString();
    const service: Service = {
      id: crypto.randomUUID(),
      serviceNumber: this.takeServiceNumber(received),
      customerId: input.customerId,
      serviceType: input.serviceType,
      status: "pending",
      itemId: input.itemId ?? null,
      itemUnitId: input.itemUnitId ?? null,
      isInHouseProduct: isInHouse,
      productName,
      productSerial: input.productSerial ?? "",
      productModel: input.productModel ?? "",
      problemDescription: input.problemDescription.trim(),
      serviceNotes: input.serviceNotes ?? "",
      technicianName: input.technicianName ?? "",
      receivedDate: nowIso,
      expectedDeliveryDate: input.expectedDeliveryDate ?? "",
      actualDeliveryDate: null,
      serviceCharge: input.serviceType === "non_paid" ? 0 : Math.max(0, input.serviceCharge ?? 0),
      discount: Math.max(0, input.discount ?? 0),
      vatTax: Math.max(0, input.vatTax ?? 0),
      items: [],
      payments: [],
      statusHistory: [{
        id: crypto.randomUUID(),
        serviceId: "",
        status: "pending",
        notes: "Service received",
        by: input.createdBy ?? "Demo user",
        at: nowIso,
      }],
      tracking: { ...EMPTY_SERVICE_TRACKING, ...(input.tracking ?? {}), photoUrls: [...(input.tracking?.photoUrls ?? [])] },
      vendorWarranty: null,
      warrantyClaimId: input.warrantyClaimId ?? null,
      createdBy: input.createdBy ?? "Demo user",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    service.statusHistory[0].serviceId = service.id;
    this.services.push(service);
    this.version++;
    return service;
  }

  private writeService(idx: number, updates: Partial<Service>): Service {
    this.services[idx] = { ...this.services[idx], ...updates, updatedAt: new Date().toISOString() };
    this.version++;
    return this.services[idx];
  }

  updateService(id: string, updates: Partial<Pick<Service,
    "serviceType" | "serviceCharge" | "discount" | "vatTax" | "problemDescription" | "serviceNotes" |
    "technicianName" | "expectedDeliveryDate" | "productName" | "productSerial" | "productModel" | "tracking"
  >>): Service | { error: string } {
    const idx = this.services.findIndex((s) => s.id === id);
    if (idx === -1) return { error: "Service not found" };
    if (this.services[idx].status === "delivered") return { error: "Delivered services cannot be edited" };
    const next = { ...updates };
    const type = next.serviceType ?? this.services[idx].serviceType;
    if (type === "non_paid") next.serviceCharge = 0;
    return this.writeService(idx, next);
  }

  getServiceTotals(id: string): ServiceTotals | undefined {
    const service = this.getServiceById(id);
    return service ? serviceTotals(service) : undefined;
  }

  addServiceItem(serviceId: string, input: { name: string; quantity: number; unitPrice: number }): Service | { error: string } {
    const idx = this.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) return { error: "Service not found" };
    if (this.services[idx].status === "delivered") return { error: "Delivered services cannot be edited" };
    if (!input.name.trim()) return { error: "Part name is required" };
    if (!(input.quantity > 0)) return { error: "Quantity must be greater than zero" };
    if (input.unitPrice < 0) return { error: "Unit price cannot be negative" };
    const item: ServiceItem = {
      id: crypto.randomUUID(),
      serviceId,
      name: input.name.trim(),
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      total: Math.round(input.quantity * input.unitPrice * 100) / 100,
    };
    return this.writeService(idx, { items: [...this.services[idx].items, item] });
  }

  removeServiceItem(serviceId: string, itemId: string): Service | { error: string } {
    const idx = this.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) return { error: "Service not found" };
    if (this.services[idx].status === "delivered") return { error: "Delivered services cannot be edited" };
    return this.writeService(idx, { items: this.services[idx].items.filter((i) => i.id !== itemId) });
  }

  addServicePayment(serviceId: string, draft: PaymentDraft & {
    receivedBy?: string;
    branchName?: string;
    accountNumber?: string;
    proofUrl?: string;
    notes?: string;
  }): Service | { error: string } {
    const idx = this.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) return { error: "Service not found" };
    const totals = serviceTotals(this.services[idx]);
    const error = validatePayment(draft, totals.dueAmount);
    if (error) return { error };
    const payment: ServicePayment = {
      id: crypto.randomUUID(),
      serviceId,
      method: draft.method,
      amount: Math.round(draft.amount * 100) / 100,
      paidAt: new Date().toISOString(),
      receivedBy: draft.receivedBy ?? "Demo user",
      bankName: draft.bankName ?? "",
      branchName: draft.branchName ?? "",
      accountNumber: draft.accountNumber ?? "",
      referenceNumber: draft.referenceNumber ?? "",
      mobileNumber: draft.mobileNumber ?? "",
      transactionId: draft.transactionId ?? "",
      proofUrl: draft.proofUrl ?? "",
      notes: draft.notes ?? "",
    };
    return this.writeService(idx, { payments: [...this.services[idx].payments, payment] });
  }

  /** FR-12/FR-14 + BR-06: enforce the transition graph and full payment before delivery. */
  updateServiceStatus(serviceId: string, status: ServiceStatus, input?: { notes?: string; by?: string }): Service | { error: string } {
    const idx = this.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) return { error: "Service not found" };
    const service = this.services[idx];
    if (service.status === "delivered") return { error: "Delivered services cannot change status" };
    if (!canTransition(service.status, status)) {
      return { error: `Cannot move from ${service.status} to ${status}` };
    }
    if (status === "delivered" && serviceTotals(service).dueAmount > 0) {
      return { error: "Collect the full payment before delivering" };
    }
    const now = new Date().toISOString();
    const event: ServiceStatusEvent = {
      id: crypto.randomUUID(),
      serviceId,
      status,
      notes: input?.notes ?? "",
      by: input?.by ?? "Demo user",
      at: now,
    };
    return this.writeService(idx, {
      status,
      statusHistory: [...service.statusHistory, event],
      actualDeliveryDate: status === "delivered" ? now : service.actualDeliveryDate,
      tracking: status === "delivered"
        ? { ...service.tracking, deliveryDate: service.tracking.deliveryDate || now }
        : service.tracking,
    });
  }

  /** Record handover details, then move the service to Delivered. */
  deliverService(serviceId: string, input: {
    deliveryPerson: string;
    receiverName: string;
    deliveryDate?: string;
    deliveryNotes?: string;
    by?: string;
  }): Service | { error: string } {
    const idx = this.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) return { error: "Service not found" };
    if (!input.receiverName.trim()) return { error: "Receiver name is required" };
    const now = new Date().toISOString();
    this.writeService(idx, {
      tracking: {
        ...this.services[idx].tracking,
        deliveryPerson: input.deliveryPerson,
        receiverName: input.receiverName,
        deliveryDate: input.deliveryDate || now,
        deliveryNotes: input.deliveryNotes ?? this.services[idx].tracking.deliveryNotes,
      },
    });
    return this.updateServiceStatus(serviceId, "delivered", { notes: input.deliveryNotes, by: input.by });
  }

  /** Escalate a warranty claim into a non-paid service job (one service per claim). */
  createServiceFromClaim(claimId: string): Service | { error: string } {
    const claim = this.warrantyClaims.find((c) => c.id === claimId);
    if (!claim) return { error: "Claim not found" };
    if (claim.status === "resolved" || claim.status === "rejected") return { error: "Closed claims cannot be escalated" };
    const existing = this.services.find((s) => s.warrantyClaimId === claimId);
    if (existing) return { error: `Already linked to ${existing.serviceNumber}` };
    const unit = this.getUnitById(claim.itemUnitId);
    const item = unit ? this.getItemById(unit.itemId) : undefined;
    const sale = claim.saleId ? this.getSaleById(claim.saleId) : undefined;
    const result = this.createService({
      customerId: sale?.customerId ?? "cust-003",
      serviceType: "non_paid",
      itemId: item?.id,
      itemUnitId: unit?.id,
      productName: item?.name ?? "Warranty product",
      productSerial: unit?.serialNumber ?? "",
      productModel: item?.sku ?? "",
      problemDescription: claim.notes?.trim() || `Warranty ${claim.claimType} claim`,
      warrantyClaimId: claimId,
    });
    if ("error" in result) return result;
    if (claim.status === "pending") this.updateWarrantyClaim(claimId, "in_progress");
    return result;
  }

  /** FR-17/FR-18: send a warranty product to a vendor (an existing supplier). */
  sendServiceToVendor(serviceId: string, input: {
    vendorId: string;
    expectedReturnDate?: string;
    courierName?: string;
    trackingNumber?: string;
    notes?: string;
  }): Service | { error: string } {
    const idx = this.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) return { error: "Service not found" };
    if (!this.getSupplierById(input.vendorId)) return { error: "Select a valid vendor" };
    if (this.services[idx].status === "delivered") return { error: "Delivered services cannot be sent to a vendor" };
    const now = new Date().toISOString();
    return this.writeService(idx, {
      vendorWarranty: {
        vendorId: input.vendorId,
        status: "sent",
        sentDate: now,
        expectedReturnDate: input.expectedReturnDate ?? "",
        receivedDate: "",
        courierName: input.courierName ?? "",
        trackingNumber: input.trackingNumber ?? "",
        qualityCheck: "pending",
        notes: input.notes ?? "",
      },
    });
  }

  updateVendorWarranty(serviceId: string, updates: Partial<VendorWarrantyTracking>): Service | { error: string } {
    const idx = this.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) return { error: "Service not found" };
    const current = this.services[idx].vendorWarranty;
    if (!current) return { error: "This service has not been sent to a vendor" };
    if (this.services[idx].status === "delivered") return { error: "Delivered services cannot be edited" };
    if (updates.status && updates.status !== current.status && !VENDOR_TRANSITIONS[current.status].includes(updates.status)) {
      return { error: `Cannot move vendor status from ${current.status} to ${updates.status}` };
    }
    const next: VendorWarrantyTracking = { ...current, ...updates };
    if (updates.qualityCheck && updates.qualityCheck !== "pending" && !["received", "replaced"].includes(next.status)) {
      return { error: "Quality check can only be done after the product is received from the vendor" };
    }
    if (updates.status === "replaced" && next.qualityCheck !== "passed") {
      return { error: "The replacement must pass quality check before it is marked replaced" };
    }
    if ((updates.status === "received" || updates.status === "replaced") && !next.receivedDate) {
      next.receivedDate = new Date().toISOString();
    }
    return this.writeService(idx, { vendorWarranty: next });
  }
}
