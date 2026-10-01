import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import type { Item, ItemUnit } from "@/types/inventory";
import { cn } from "@/lib/utils";

export interface ProductSelection {
  itemId: string;
  itemUnitId: string | null;
  productName: string;
  productSerial: string;
  productModel: string;
}

interface ProductPickerProps {
  items: Item[];
  units: ItemUnit[];
  value: string | null; // itemUnitId or itemId
  onSelect: (selection: ProductSelection) => void;
}

/** Searchable picker over catalog units (serial) and non-serialized items. */
export function ProductPicker({ items, units, value, onSelect }: ProductPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const unit = units.find((u) => u.id === value);
    if (unit) {
      const item = items.find((i) => i.id === unit.itemId);
      return item ? `${item.name} · ${unit.serialNumber}` : unit.serialNumber;
    }
    const item = items.find((i) => i.id === value);
    return item ? `${item.name} · ${item.sku}` : null;
  }, [value, items, units]);

  const pickItem = (item: Item, unit: ItemUnit | null) => {
    onSelect({
      itemId: item.id,
      itemUnitId: unit?.id ?? null,
      productName: item.name,
      productSerial: unit?.serialNumber ?? "",
      productModel: item.model || item.sku,
    });
    setOpen(false);
  };

  const serialItems = items.filter((i) => i.trackSerials);
  const plainItems = items.filter((i) => !i.trackSerials);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selectedLabel ?? "Search product or serial…"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search name, SKU or serial…" />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup heading="Serial numbers">
              {units.map((u) => {
                const item = items.find((i) => i.id === u.itemId);
                if (!item) return null;
                return (
                  <CommandItem
                    key={u.id}
                    value={`${item.name} ${item.sku} ${u.serialNumber}`}
                    onSelect={() => pickItem(item, u)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", u.id === value ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">
                      {item.name} · <span className="font-mono text-xs">{u.serialNumber}</span>
                      <span className="text-muted-foreground"> — {u.status.replace(/_/g, " ")}</span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading="Products">
              {[...serialItems, ...plainItems].map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.sku}`}
                  onSelect={() => pickItem(item, null)}
                >
                  <Check className={cn("mr-2 h-4 w-4", item.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">
                    {item.name} · <span className="font-mono text-xs">{item.sku}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
