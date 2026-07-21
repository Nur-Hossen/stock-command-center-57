import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Award } from "lucide-react";
import { toast } from "sonner";
import { useBrands, useItems } from "@/hooks/useInventoryData";
import { useCreateBrand, useUpdateBrand, useDeleteBrand } from "@/hooks/useInventoryMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function BrandManager() {
  const { data: brands } = useBrands();
  const { data: items } = useItems();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; itemCount: number } | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);
  useEffect(() => { if (editingId) editRef.current?.focus(); }, [editingId]);

  const counts = new Map<string, number>();
  items.forEach((i) => { if (i.brandId) counts.set(i.brandId, (counts.get(i.brandId) ?? 0) + 1); });

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    createBrand.mutate(
      { id: crypto.randomUUID(), name, description: "", logoUrl: "", website: "", isActive: true, createdAt: now, updatedAt: now },
      {
        onSuccess: () => { toast.success("Brand created"); setNewName(""); setAdding(false); },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const handleRename = () => {
    if (!editingId) return;
    updateBrand.mutate({ id: editingId, updates: { name: editName.trim() } }, {
      onSuccess: () => { toast.success("Brand renamed"); setEditingId(null); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteBrand.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Brand deleted"); setDeleteTarget(null); },
      onError: (e) => { toast.error(e.message); setDeleteTarget(null); },
    });
  };

  if (brands.length === 0 && !adding) {
    return <EmptyState icon={Award} title="No brands yet" description="Track manufacturers of the items you stock." actionLabel="Add Brand" onAction={() => setAdding(true)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{brands.length} brands</p>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Brand
        </Button>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {adding && (
          <div className="flex items-center gap-2 p-3">
            <Input ref={addRef} value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Brand name…" className="h-8 text-sm" />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAdd}><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
          </div>
        )}

        {brands.map((b) => {
          const count = counts.get(b.id) ?? 0;
          const isEditing = editingId === b.id;
          return (
            <div key={b.id} className="flex items-center justify-between gap-2 p-3">
              {isEditing ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input ref={editRef} value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditingId(null); }}
                    className="h-8 text-sm" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleRename}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{b.name}</span>
                    <Badge variant="secondary" className="text-xs">{count} item{count !== 1 && "s"}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(b.id); setEditName(b.name); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteTarget({ id: b.id, name: b.name, itemCount: count })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {(deleteTarget?.itemCount ?? 0) > 0
                ? `${deleteTarget!.itemCount} item${deleteTarget!.itemCount !== 1 ? "s" : ""} reference this brand — delete will be blocked.`
                : "This brand has no linked items."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
