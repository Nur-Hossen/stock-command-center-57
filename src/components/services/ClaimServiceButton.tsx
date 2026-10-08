import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/hooks/useDemo";

/** Opens the linked service job, or escalates an open claim into a new warranty service. */
export function ClaimServiceButton({ claimId, open }: { claimId: string; open: boolean }) {
  const { demoStore, bumpVersion } = useDemo();
  const navigate = useNavigate();
  const linked = demoStore?.getServices().find((s) => s.warrantyClaimId === claimId);

  if (linked) {
    return (
      <Button asChild size="sm" variant="secondary">
        <Link to="/app/services/$serviceId" params={{ serviceId: linked.id }}>{linked.serviceNumber}</Link>
      </Button>
    );
  }
  if (!open || !demoStore) return null;

  const create = () => {
    const result = demoStore.createServiceFromClaim(claimId);
    if ("error" in result) { toast.error(result.error); return; }
    bumpVersion();
    toast.success(`Service ${result.serviceNumber} created`);
    navigate({ to: "/app/services/$serviceId", params: { serviceId: result.id } });
  };

  return <Button size="sm" onClick={create}>Open service job</Button>;
}
