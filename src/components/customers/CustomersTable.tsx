import { useState, useMemo } from "react";
import { Search } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Customer } from "@/types/inventory";

interface CustomersTableProps {
  customers: Customer[];
  onRowClick?: (c: Customer) => void;
}

const PER_PAGE = 20;

export function CustomersTable({ customers, onRowClick }: CustomersTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const result = q
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q),
        )
      : customers;
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);
  const start = safePage * PER_PAGE + 1;
  const end = Math.min((safePage + 1) * PER_PAGE, filtered.length);

  const pagination = filtered.length > 0 && (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Showing {start}–{end} of {filtered.length} customers
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage === 0}
          onClick={() => setPage(safePage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages - 1}
          onClick={() => setPage(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers…"
          className="h-9 pl-8 text-sm bg-white"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {search ? "No customers match your search" : "No customers added yet"}
        </p>
      ) : isMobile ? (
        <>
          <div className="space-y-3">
            {paged.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onRowClick?.(c)}
              >
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{c.name}</CardTitle>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.type === "dealer"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-violet-500/10 text-violet-600"
                      }`}
                    >
                      {c.type === "dealer" ? "Dealer" : "Retail"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{c.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{c.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-mono">{c.balance.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {pagination}
        </>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-white">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[120px]">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onRowClick?.(c)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.type === "dealer"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-violet-500/10 text-violet-600"
                        }`}
                      >
                        {c.type === "dealer" ? "Dealer" : "Retail"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.address || "—"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{c.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination}
        </>
      )}
    </div>
  );
}
