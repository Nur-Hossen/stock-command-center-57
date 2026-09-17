import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import type { Customer } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface Props {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

/** Searchable customer picker (name / phone). */
export function CustomerCombobox({ customers, value, onChange, placeholder = "Select customer" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => customers.find((c) => c.id === value), [customers, value]);

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
          <span className="truncate">
            {selected ? `${selected.name}${selected.phone ? ` · ${selected.phone}` : ""}` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search name or phone…" />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            {customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.phone ?? ""}`}
                onSelect={() => { onChange(c.id); setOpen(false); }}
              >
                <Check className={cn("mr-2 h-4 w-4", c.id === value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">
                  {c.name}{c.phone ? ` · ${c.phone}` : ""} — {c.type}
                  {c.type === "dealer" && c.balance > 0 ? ` ($${c.balance.toFixed(2)})` : ""}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
