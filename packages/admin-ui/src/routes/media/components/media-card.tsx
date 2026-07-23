import { Trash2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMediaUrl, type MediaMeta } from "@/lib/api";

interface MediaCardProps {
  item: MediaMeta;
  isEditing: boolean;
  editName: string;
  editAlt: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onNameChange: (name: string) => void;
  onAltChange: (alt: string) => void;
}

export function MediaCard({
  editAlt,
  editName,
  isEditing,
  item,
  onAltChange,
  onCancelEdit,
  onDelete,
  onNameChange,
  onSaveEdit,
  onStartEdit,
}: MediaCardProps) {
  const isImage = item.mimeType.startsWith("image/");

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      {isImage ? (
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={getMediaUrl(item.id)}
            alt={item.alt || item.originalName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-muted p-4">
          <p className="truncate text-center text-xs text-muted-foreground">{item.mimeType}</p>
        </div>
      )}
      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={onStartEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="destructive" size="icon" className="h-7 w-7" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1 p-2">
        {isEditing ? (
          <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              onBlur={onSaveEdit}
              className="h-6 px-1 py-0 text-xs"
              placeholder="Filename"
            />
            <Input
              value={editAlt}
              onChange={(e) => onAltChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              onBlur={onSaveEdit}
              className="h-6 px-1 py-0 text-xs"
              placeholder="Alt text"
            />
            <p className="text-[10px] text-muted-foreground">{(item.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <>
            <p
              className="cursor-pointer truncate text-xs font-medium transition-colors hover:text-primary"
              title={item.originalName}
              onClick={onStartEdit}
            >
              {item.originalName}
            </p>
            {item.alt && (
              <p className="truncate text-[10px] text-muted-foreground" title={item.alt}>
                {item.alt}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">{(item.size / 1024).toFixed(1)} KB</p>
          </>
        )}
      </div>
    </div>
  );
}
