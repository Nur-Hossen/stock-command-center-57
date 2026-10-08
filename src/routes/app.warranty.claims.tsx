import { DeliverySummary } from "@/components/shared/DeliveryFields";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { ClaimServiceButton } from "@/components/services/ClaimServiceButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { useWarrantyClaims, useUpdateWarrantyClaim } from "@/hooks/usePosData";
import { useDemo } from "@/hooks/useDemo";
import type { WarrantyClaimStatus } from "@/types/inventory";

export const Route = createFileRoute("/app/warranty/claims")({
  component: ClaimsPage,
  head: () => ({
    meta: [
      { title: "Warranty Claims — Stackwise" },
      { name: "description", content: "Track warranty claim lifecycle from pending to resolved." },
      { property: "og:title", content: "Warranty Claims — Stackwise" },
      { property: "og:description", content: "Manage warranty claims." },
    ],
  }),
});

const STATUSES: WarrantyClaimStatus[] = ["pending", "in_progress", "resolved", "rejected"];
const NEXT: Record<WarrantyClaimStatus, WarrantyClaimStatus[]> = {
  pending: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

function ClaimsPage() {
  const [filter, setFilter] = useState<WarrantyClaimStatus | "all">("all");
  const claims = useWarrantyClaims(filter === "all" ? undefined : filter);
  const update = useUpdateWarrantyClaim();
  const { demoStore } = useDemo();

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Warranty Claims</h1>
        <p className="text-sm text-muted-foreground">{claims.length} claim{claims.length !== 1 && "s"}</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-md border border-border p-1 text-sm">
        {(["all", ...STATUSES] as const).map((s) => (
          <button key={s}
            className={`rounded px-3 py-1 capitalize ${filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setFilter(s)}
          >{s.replace("_", " ")}</button>
        ))}
      </div>

      {claims.length === 0 ? (
        <EmptyState icon={Wrench} title="No claims" description="Warranty claims will appear here." />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {claims.map((c) => {
            const unit = demoStore?.getUnitById(c.itemUnitId);
            const item = unit ? demoStore?.getItemById(unit.itemId) : undefined;
            return (
              <div key={c.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item?.name ?? "Item"}</span>
                      <Badge variant="outline" className="capitalize">{c.claimType}</Badge>
                      <Badge className="capitalize" variant={c.status === "resolved" ? "secondary" : c.status === "rejected" ? "destructive" : "default"}>
                        {c.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      SN <span className="font-mono">{unit?.serialNumber}</span> · Filed {new Date(c.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs">Order: {demoStore?.getSales().find(s => s.id === c.saleId)?.documentNumber ?? "—"}</div>
                    <DeliverySummary value={c.delivery} />
                    {c.notes && <div className="mt-1 text-xs">{c.notes}</div>}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <ClaimServiceButton claimId={c.id} open={c.status === "pending" || c.status === "in_progress"} />
                    {NEXT[c.status].map((next) => (
                      <Button key={next} size="sm" variant="outline"
                        onClick={() => {
                          try { update(c.id, next); toast.success(`Marked ${next.replace("_", " ")}`); }
                          catch (e) { toast.error((e as Error).message); }
                        }}
                      >{next.replace("_", " ")}</Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
