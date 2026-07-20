import { useState } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useRole } from "@/hooks/useRole";
import { X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DemoBanner() {
  const { isDemo } = useDemo();
  const { role, roles, setDemoRole } = useRole();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  const currentLabel = roles.find((r) => r.id === role)?.name ?? "Admin";

  return (
    <div className="sticky top-0 z-50 flex h-10 w-full items-center justify-between bg-primary px-3 text-sm font-medium text-primary-foreground">
      <div className="w-8 shrink-0" />

      <div className="flex items-center gap-1.5">
        <span className="hidden sm:inline">Exploring as</span>
        <span className="sm:hidden">As</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-primary-foreground/25 bg-primary-foreground/15 px-2 py-0.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/25"
            >
              {currentLabel}
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[160px]">
            {roles.map((r) => (
              <DropdownMenuItem
                key={r.id}
                onClick={() => setDemoRole(r.id)}
                className={role === r.id ? "font-semibold" : ""}
              >
                {r.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="hidden sm:inline text-primary-foreground/70">
          · data resets each session
        </span>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="w-8 shrink-0 flex items-center justify-center rounded p-0.5 transition-colors hover:bg-primary-foreground/20"
        aria-label="Dismiss demo banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
