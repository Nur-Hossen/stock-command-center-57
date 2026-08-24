import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUnits } from "@/hooks/useInventoryData";
import type { PurchaseOrder, Item } from "@/types/inventory";

interface ReceivedLine {
  lineItemId: string;
  itemId: string;
  qty: number;
  serials?: string[];
}

interface ReceiveShipmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
  items: Item[];
  onConfirm: (receivedLines: ReceivedLine[], notes: string) => void;
}

export function ReceiveShipmentSheet({
  open,
  onOpenChange,
  purchaseOrder,
  items,
  onConfirm,
}: ReceiveShipmentSheetProps) {
  const itemMap = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items],
  );

  const initialQtys = useMemo(
    () =>
      Object.fromEntries(
        purchaseOrder.items.map((li) => [
          li.id,
          Math.max(0, li.quantityOrdered - li.quantityReceived),
        ]),
      ),
    [purchaseOrder.items],
  );

  const [qtys, setQtys] = useState<Record<string, number>>(initialQtys);
  const [serialsByLine, setSerialsByLine] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  // Reset when sheet opens with new PO
  const [lastPOId, setLastPOId] = useState(purchaseOrder.id);
  if (purchaseOrder.id !== lastPOId) {
    setLastPOId(purchaseOrder.id);
    setQtys(initialQtys);
    setSerialsByLine({});
    setNotes("");
  }

  const serialLines = purchaseOrder.items.filter((li) => itemMap.get(li.itemId)?.trackSerials);

  const { data: existingUnits } = useUnits();
  const existingSerials = useMemo(
    () => new Set(existingUnits.map((u) => u.serialNumber.toLowerCase())),
    [existingUnits],
  );

  function parseSerials(raw: string): string[] {
    return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  }

  // Count every entered serial across all lines to catch duplicates,
  // both within one line and across different lines.
  const enteredCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const li of serialLines) {
      for (const s of parseSerials(serialsByLine[li.id] ?? "")) {
        const key = s.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrder.items, itemMap, serialsByLine]);

  function getSerialProblems(lineId: string): { duplicates: string[]; existing: string[] } {
    const serials = parseSerials(serialsByLine[lineId] ?? "");
    const duplicates = [...new Set(serials.filter((s) => (enteredCounts.get(s.toLowerCase()) ?? 0) > 1))];
    const existing = [...new Set(serials.filter((s) => existingSerials.has(s.toLowerCase())))];
    return { duplicates, existing };
  }

  const serialsValid = serialLines.every((li) => {
    const qty = qtys[li.id] ?? 0;
    if (qty === 0) return true;
    if (parseSerials(serialsByLine[li.id] ?? "").length !== qty) return false;
    const { duplicates, existing } = getSerialProblems(li.id);
    return duplicates.length === 0 && existing.length === 0;
  });

  const hasAnyQty = useMemo(() => Object.values(qtys).some((q) => q > 0), [qtys]);

  function handleQtyChange(lineId: string, remaining: number, value: string) {
    const num = Math.max(0, Math.min(remaining, Math.floor(Number(value) || 0)));
    setQtys((prev) => ({ ...prev, [lineId]: num }));
  }

  function handleConfirm() {
    const lines = purchaseOrder.items
      .filter((li) => (qtys[li.id] ?? 0) > 0)
      .map((li) => {
        const item = itemMap.get(li.itemId);
        const serials = item?.trackSerials ? parseSerials(serialsByLine[li.id] ?? "") : undefined;
        return { lineItemId: li.id, itemId: li.itemId, qty: qtys[li.id], serials };
      });
    onConfirm(lines, notes);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>Receive Shipment — {purchaseOrder.orderNumber}</SheetTitle>
          <SheetDescription>
            Enter the quantity received for each line item.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="overflow-x-auto rounded-md border border-border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[60px] text-right">Ordered</TableHead>
                  <TableHead className="w-[70px] text-right">Received</TableHead>
                  <TableHead className="w-[70px] text-right">Remaining</TableHead>
                  <TableHead className="w-[90px] text-right">Receiving</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.items.map((li) => {
                  const item = itemMap.get(li.itemId);
                  const remaining = Math.max(0, li.quantityOrdered - li.quantityReceived);
                  return (
                    <TableRow key={li.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{item?.name ?? li.itemId}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item?.sku ?? "—"}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {li.quantityOrdered}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {li.quantityReceived}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {remaining}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={remaining}
                          value={qtys[li.id] ?? 0}
                          onChange={(e) => handleQtyChange(li.id, remaining, e.target.value)}
                          className="h-8 w-[70px] text-right font-mono text-sm ml-auto"
                          disabled={remaining === 0}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {serialLines.length > 0 && (
            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium">Serial numbers required</p>
                <p className="text-xs text-muted-foreground">Enter one serial per line (or separated by commas). Count must match Receiving qty.</p>
              </div>
              {serialLines.map((li) => {
                const item = itemMap.get(li.itemId);
                const qty = qtys[li.id] ?? 0;
                if (qty === 0) return null;
                const entered = parseSerials(serialsByLine[li.id] ?? "").length;
                const { duplicates, existing } = getSerialProblems(li.id);
                const ok = entered === qty && duplicates.length === 0 && existing.length === 0;
                return (
                  <div key={li.id} className="space-y-1">
                    <Label className="text-xs">
                      {item?.name} · <span className={ok ? "text-stock-healthy" : "text-stock-low"}>{entered}/{qty}</span>
                    </Label>
                    <Textarea
                      placeholder="SN-0001, SN-0002, ..."
                      value={serialsByLine[li.id] ?? ""}
                      onChange={(e) => setSerialsByLine((prev) => ({ ...prev, [li.id]: e.target.value }))}
                      rows={2}
                      className="font-mono text-xs"
                    />
                    {duplicates.length > 0 && (
                      <p className="text-xs text-destructive">
                        Duplicate serial{duplicates.length > 1 ? "s" : ""} entered: {duplicates.join(", ")}
                      </p>
                    )}
                    {existing.length > 0 && (
                      <p className="text-xs text-destructive">
                        Already in inventory: {existing.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="receive-notes">Shipment Notes</Label>
            <Textarea
              id="receive-notes"
              placeholder="Optional notes about this shipment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            disabled={!hasAnyQty || !serialsValid}
            onClick={handleConfirm}
          >
            Confirm Receipt
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  );
}
