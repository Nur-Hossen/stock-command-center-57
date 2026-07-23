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
} from "@/types/inventory";
import { MovementType } from "@/types/inventory";
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
  private saleCounter = 1000;
  private invoiceCounterByYear: Record<number, number> = {};
  private challanCounterByYear: Record<number, number> = {};
  private warrantyClaims: WarrantyClaim[] = [];
  private salesSettings: SalesSettings = { ...DEFAULT_SALES_SETTINGS };

  constructor() {
    this.data = generateSeedData();
  }

  getVersion() {
    return this.version;
  }

  reset() {
    this.data = generateSeedData();
    this.users = SEED_USERS.map((u) => ({ ...u }));
    this.roles = BUILTIN_ROLES.map((r) => ({ ...r, permissions: [...r.permissions] }));
    this.brands = seedBrands();
    this.units = [];
    this.customers = seedCustomers();
    this.sales = [];
    this.saleCounter = 1000;
    this.invoiceCounterByYear = {};
    this.challanCounterByYear = {};
    this.warrantyClaims = [];
    this.salesSettings = { ...DEFAULT_SALES_SETTINGS };
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
      if (movement.type === MovementType.Received) {
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
  }): Sale | { error: string } {
    return this.createPosSale({
      channel: "retail",
      customerId: input.customerId,
      soldBy: input.soldBy,
      lineItems: input.lineItems,
      taxRate: input.taxRate,
      notes: input.notes,
    });
  }

  refundSale(id: string): Sale | { error: string } {
    const idx = this.sales.findIndex((s) => s.id === id);
    if (idx === -1) return { error: "Sale not found" };
    if (this.sales[idx].status === "refunded") return { error: "Already refunded" };
    const sale = this.sales[idx];
    for (const line of sale.items) {
      const uidx = this.units.findIndex((u) => u.id === line.itemUnitId);
      if (uidx !== -1) {
        this.units[uidx] = {
          ...this.units[uidx],
          status: "returned",
          soldAt: null,
          warrantyExpiresAt: null,
          updatedAt: new Date().toISOString(),
        };
        this.syncSerializedStock(this.units[uidx].itemId);
      }
    }
    // Reverse dealer credit if any balance was outstanding.
    if (sale.channel === "dealer" && sale.balanceDue > 0) {
      const cidx = this.customers.findIndex((c) => c.id === sale.customerId);
      if (cidx !== -1) {
        this.customers[cidx] = {
          ...this.customers[cidx],
          balance: Math.round((this.customers[cidx].balance - sale.balanceDue) * 100) / 100,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    this.sales[idx] = { ...sale, status: "refunded", updatedAt: new Date().toISOString() };
    this.version++;
    return this.sales[idx];
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
  }): WarrantyClaim | { error: string } {
    const unit = this.units.find((u) => u.id === input.itemUnitId);
    if (!unit) return { error: "Serial not found" };
    if (unit.status !== "sold" && unit.status !== "warranty_service") {
      return { error: "Warranty claims are only valid on sold units" };
    }
    const sale = this.sales.find((s) => s.items.some((li) => li.itemUnitId === unit.id));
    const now = new Date().toISOString();
    const claim: WarrantyClaim = {
      id: crypto.randomUUID(),
      itemUnitId: unit.id,
      saleId: sale?.id ?? null,
      claimType: input.claimType,
      status: "pending",
      notes: input.notes ?? "",
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
}
