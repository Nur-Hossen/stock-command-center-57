import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_PHOTOS = 4;

interface ServicePhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

/** Condition photos stored as data URLs in demo mode. */
export function ServicePhotoUpload({ photos, onChange }: ServicePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    Array.from(files).slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChange([...photos, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((url, idx) => (
          <div key={idx} className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
            <img src={url} alt={`Condition photo ${idx + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${idx + 1}`}
              className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"
              onClick={() => onChange(photos.filter((_, i) => i !== idx))}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <Button
            type="button"
            variant="outline"
            className="h-16 w-16 flex-col gap-1"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="text-[10px]">Add</span>
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Up to {MAX_PHOTOS} photos of the product condition.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
