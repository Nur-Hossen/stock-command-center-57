import { useEffect } from "react";
import { HelpTooltip } from "@/components/shared/HelpTooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Item, Category, Supplier, Location, Brand } from "@/types/inventory";
import { ItemStatus } from "@/types/inventory";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string(),
  categoryId: z.string(),
  brandId: z.string(),
  model: z.string(),
  modelYear: z.coerce.number().optional(),
  supplierId: z.string(),
  locationId: z.string(),
  unit: z.string(),
  currentStock: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0),
  reorderQuantity: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  status: z.nativeEnum(ItemStatus),
  trackSerials: z.boolean(),
  defaultWarrantyMonths: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

interface ItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
  locations: Location[];
  existingSkus: string[];
  onSave: (data: Partial<Item>) => void;
  loading?: boolean;
}

export function ItemFormSheet({
  open,
  onOpenChange,
  item,
  categories,
  brands,
  suppliers,
  locations,
  existingSkus,
  onSave,
  loading,
}: ItemFormSheetProps) {
  const isEdit = !!item;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors }, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      brandId: "",
      model: "",
      modelYear: undefined,
      supplierId: "",
      locationId: "",
      unit: "each",
      currentStock: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      status: ItemStatus.Active,
      trackSerials: false,
      defaultWarrantyMonths: 0,
    },
  });

  useEffect(() => {
    if (open && item) {
      reset({
        name: item.name,
        sku: item.sku,
        description: item.description,
        categoryId: item.categoryId ?? "",
        brandId: item.brandId ?? "",
        model: item.model ?? "",
        modelYear: item.modelYear ?? undefined,
        supplierId: item.supplierId ?? "",
        locationId: item.locationId ?? "",
        unit: item.unit,
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        status: item.status,
        trackSerials: item.trackSerials ?? false,
        defaultWarrantyMonths: item.defaultWarrantyMonths ?? 0,
      });
    } else if (open) {
      reset();
    }
  }, [open, item, reset]);

  const onSubmit = (data: FormValues) => {
    const skuConflict = existingSkus.filter((s) => s === data.sku);
    const allowed = isEdit && item?.sku === data.sku ? 1 : 0;
    if (skuConflict.length > allowed) {
      setError("sku", { message: "SKU already exists" });
      return;
    }
    onSave({
      ...data,
      categoryId: data.categoryId || null,
      brandId: data.brandId || null,
      supplierId: data.supplierId || null,
      locationId: data.locationId || null,
      modelYear: data.modelYear ?? null,
    });
  };

  const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";
  const labelCls = "text-sm font-medium";
  const errCls = "text-xs text-destructive";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetTitle>{isEdit ? "Edit Item" : "New Item"}</SheetTitle>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {/* Basic Info */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Basic Info</legend>
            <div>
              <label className={labelCls}>Name *</label>
              <input {...register("name")} className={inputCls} />
              {errors.name && <p className={errCls}>{errors.name.message}</p>}
            </div>
            <div>
              <label className={`${labelCls} flex items-center gap-1`}>SKU * <HelpTooltip text="Unique identifier for this item. Must be different from all other items." /></label>
              <input {...register("sku")} className={inputCls} placeholder="STK-XXXX" />
              {errors.sku && <p className={errCls}>{errors.sku.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea {...register("description")} rows={2} className={`${inputCls} h-auto py-2`} />
            </div>
          </fieldset>

          {/* Classification */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Classification</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Category</label>
                <Select value={watch("categoryId") ?? ""} onValueChange={(v) => setValue("categoryId", v || "")}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelCls}>Brand</label>
                <Select value={watch("brandId") ?? ""} onValueChange={(v) => setValue("brandId", v || "")}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Model</label>
                <input {...register("model")} className={inputCls} placeholder="e.g. Galaxy Buds Pro" />
              </div>
              <div>
                <label className={labelCls}>Model Year</label>
                <input type="number" {...register("modelYear")} className={inputCls} placeholder="e.g. 2024" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Unit of Measure</label>
              <input {...register("unit")} className={inputCls} placeholder="each, kg, box…" />
            </div>
          </fieldset>

          {/* Serial tracking */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Serial Tracking</legend>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register("trackSerials")} className="mt-0.5" />
              <span>
                <span className="font-medium">Track individual serial numbers</span>
                <span className="block text-xs text-muted-foreground">Each physical unit is tracked separately for warranty and sales history.</span>
              </span>
            </label>
            <div>
              <label className={`${labelCls} flex items-center gap-1`}>Default Warranty (months) <HelpTooltip text="Applied to each sold unit unless overridden at sale time." /></label>
              <input type="number" min={0} {...register("defaultWarrantyMonths")} className={inputCls} />
            </div>
          </fieldset>

          {/* Stock Settings */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stock Settings</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Current Stock</label>
                <input type="number" {...register("currentStock")} className={inputCls} />
              </div>
              <div>
                <label className={`${labelCls} flex items-center gap-1`}>Reorder Point <HelpTooltip text="Minimum quantity before a low-stock alert is triggered. Set based on your typical usage rate." /></label>
                <input type="number" {...register("reorderPoint")} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Reorder Quantity</label>
              <input type="number" {...register("reorderQuantity")} className={inputCls} />
            </div>
          </fieldset>

          {/* Pricing */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pricing</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Cost Price</label>
                <input type="number" step="0.01" {...register("costPrice")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Selling Price</label>
                <input type="number" step="0.01" {...register("sellingPrice")} className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* Assignment */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assignment</legend>
            <div>
              <label className={labelCls}>Supplier</label>
              <Select value={watch("supplierId") ?? ""} onValueChange={(v) => setValue("supplierId", v || "")}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <Select value={watch("locationId") ?? ""} onValueChange={(v) => setValue("locationId", v || "")}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          {/* Status */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</legend>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as ItemStatus)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ItemStatus.Active}>Active</SelectItem>
                <SelectItem value={ItemStatus.Discontinued}>Discontinued</SelectItem>
                <SelectItem value={ItemStatus.Archived}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </fieldset>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
