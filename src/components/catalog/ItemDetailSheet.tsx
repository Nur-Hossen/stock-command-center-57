import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { X, Pencil, Archive, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { PermissionGate, usePermissions } from "@/hooks/usePermissions";
import { MovementTimeline } from "@/components/catalog/MovementTimeline";
import { BarcodeDisplay } from "@/components/catalog/BarcodeDisplay";
import { CustomFieldsTab } from "@/components/catalog/CustomFieldsTab";
import { useMovements, useUnits } from "@/hooks/useInventoryData";
import { useUpdateItem, useAddUnit, useDeleteUnit } from "@/hooks/useInventoryMutations";
import type { Item, Category, Supplier, Location, Brand, ItemUnit } from "@/types/inventory";

type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

function stockStatus(item: Item): StockStatus {
  if (item.currentStock === 0) return "out-of-stock";
  if (item.currentStock <= item.reorderPoint) return "low-stock";
  return "in-stock";
}

function stockColor(item: Item) {
  const s = stockStatus(item);
  if (s === "out-of-stock") return "text-stock-out";
  if (s === "low-stock") return "text-stock-low";
  return "text-stock-healthy";
}

function warrantyLabel(u: ItemUnit): { label: string; tone: "healthy" | "warn" | "muted" | "danger" } {
  if (!u.warrantyExpiresAt) return { label: "—", tone: "muted" };
  const days = differenceInDays(new Date(u.warrantyExpiresAt), new Date());
  if (days < 0) return { label: "Expired", tone: "danger" };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: "warn" };
  return { label: `Active · ${format(new Date(u.warrantyExpiresAt), "MMM d, yyyy")}`, tone: "healthy" };
}

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null | undefined;
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
  locations: Location[];
  onEdit?: (item: Item) => void;
  onArchive?: (item: Item) => void;
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-sm" : "text-sm"}>{value || "—"}</span>
    </div>
  );
}

function UnitsTab({ item }: { item: Item }) {
  const { data: units } = useUnits({ itemId: item.id });
  const addUnit = useAddUnit();
  const deleteUnit = useDeleteUnit();
  const { can } = usePermissions();
  const canManage = can("manage_units");

  const [serial, setSerial] = useState("");
  const [cost, setCost] = useState<string>("");

  const handleAdd = () => {
    if (!serial.trim()) { toast.error("Serial number is required"); return; }
    addUnit.mutate({
      itemId: item.id,
      serialNumber: serial.trim(),
      status: "in_stock",
      locationId: item.locationId ?? null,
      receivedAt: new Date().toISOString(),
      soldAt: null,
      warrantyMonths: item.defaultWarrantyMonths ?? 0,
      warrantyExpiresAt: null,
      cost: cost ? Number(cost) : item.costPrice,
      notes: "",
    }, {
      onSuccess: () => { toast.success("Unit added"); setSerial(""); setCost(""); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add serial number</p>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Serial number" value={serial} onChange={(e) => setSerial(e.target.value)} className="flex-1 min-w-[180px]" />
            <Input placeholder="Cost" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="w-28" />
            <Button size="sm" onClick={handleAdd} disabled={addUnit.isLoading}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No units tracked yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {units.map((u) => {
            const w = warrantyLabel(u);
            const toneCls = w.tone === "healthy" ? "text-stock-healthy" : w.tone === "warn" ? "text-stock-low" : w.tone === "danger" ? "text-stock-out" : "text-muted-foreground";
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs truncate">{u.serialNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="capitalize">{u.status.replace("_", " ")}</span>
                    {u.soldAt && <> · sold {format(new Date(u.soldAt), "MMM d, yyyy")}</>}
                  </p>
                </div>
                <div className={`text-xs ${toneCls}`}>{w.label}</div>
                {canManage && u.status !== "sold" && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => deleteUnit.mutate(u.id, {
                      onSuccess: () => toast.success("Unit removed"),
                      onError: (e) => toast.error(e.message),
                    })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {units.filter((u) => u.status === "in_stock").length} in stock · {units.filter((u) => u.status === "sold").length} sold · {units.length} total
      </p>
    </div>
  );
}

export function ItemDetailSheet({
  open,
  onOpenChange,
  item,
  categories,
  brands,
  suppliers,
  locations,
  onEdit,
  onArchive,
}: ItemDetailSheetProps) {
  const { data: allMovements } = useMovements();
  const updateItem = useUpdateItem();

  if (!item) return null;

  const category = categories.find((c) => c.id === item.categoryId);
  const brand = brands.find((b) => b.id === item.brandId);
  const supplier = suppliers.find((s) => s.id === item.supplierId);
  const location = locations.find((l) => l.id === item.locationId);
  const status = stockStatus(item);
  const tracksSerials = !!item.trackSerials;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-foreground">{item.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={status} />
                <StatusBadge status={item.status} />
                {tracksSerials && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Serialized</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <PermissionGate permission="edit_item">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(item)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onArchive?.(item)} aria-label="Archive">
                  <Archive className="h-4 w-4" />
                </Button>
              </PermissionGate>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="px-6 pt-4 pb-8">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            {tracksSerials && <TabsTrigger value="units" className="flex-1">Units</TabsTrigger>}
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <Package className="h-10 w-10 text-muted-foreground/40" />
            </div>

            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Quantity on Hand</p>
              <p className={`mt-1 font-mono text-3xl font-bold ${stockColor(item)}`}>{item.currentStock}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.unit}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailRow label="SKU" value={item.sku} mono />
              <DetailRow label="Category" value={category?.name} />
              <DetailRow label="Brand" value={brand?.name} />
              <DetailRow label="Model" value={item.model || "—"} />
              <DetailRow label="Model Year" value={item.modelYear ?? "—"} />
              <DetailRow label="Unit of Measure" value={item.unit} />
              <DetailRow label="Reorder Threshold" value={item.reorderPoint} />
              <DetailRow label="Reorder Quantity" value={item.reorderQuantity} />
              <DetailRow label="Preferred Supplier" value={supplier?.name} />
              <DetailRow label="Location" value={location?.name} />
              <DetailRow label="Cost Per Unit" value={`$${item.costPrice.toFixed(2)}`} mono />
              <DetailRow label="Sale Price" value={`$${item.sellingPrice.toFixed(2)}`} mono />
              <DetailRow label="Default Warranty" value={item.defaultWarrantyMonths ? `${item.defaultWarrantyMonths} mo` : "—"} />
              <DetailRow label="Description" value={item.description} />
              <DetailRow label="Created" value={format(new Date(item.createdAt), "MMM d, yyyy")} />
              <DetailRow label="Updated" value={format(new Date(item.updatedAt), "MMM d, yyyy")} />
            </div>

            <BarcodeDisplay
              barcode={item.barcode}
              itemName={item.name}
              sku={item.sku}
              location={location?.name}
              onBarcodeChange={(value) => updateItem.mutate({ id: item.id, updates: { barcode: value } })}
            />
          </TabsContent>

          {tracksSerials && (
            <TabsContent value="units" className="mt-6">
              <UnitsTab item={item} />
            </TabsContent>
          )}

          <TabsContent value="history" className="mt-6">
            <MovementTimeline movements={allMovements} itemId={item.id} />
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <CustomFieldsTab
              customFields={item.customFields}
              onUpdate={(fields) => updateItem.mutate({ id: item.id, updates: { customFields: fields } })}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
