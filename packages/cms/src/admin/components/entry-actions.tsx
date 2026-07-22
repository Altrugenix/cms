import { Link } from "@tanstack/react-router";
import { CheckCircle, XCircle, RefreshCw, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EntryActionsProps {
  entry: { id: string; _deletedAt?: string; _status?: string };
  hasDrafts: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  slug: string;
}

export function EntryActions({
  entry,
  hasDrafts,
  onDelete,
  onPublish,
  onRestore,
  onUnpublish,
  slug,
}: EntryActionsProps) {
  const deleted = Boolean(entry._deletedAt);
  if (deleted) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" onClick={() => onRestore(entry.id)} title="Restore">
          <RefreshCw className="h-4 w-4 text-info" />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      {hasDrafts && entry._status !== "published" && (
        <Button variant="ghost" size="icon" onClick={() => onPublish(entry.id)} title="Publish">
          <CheckCircle className="h-4 w-4 text-success" />
        </Button>
      )}
      {hasDrafts && entry._status === "published" && (
        <Button variant="ghost" size="icon" onClick={() => onUnpublish(entry.id)} title="Unpublish">
          <XCircle className="h-4 w-4 text-warning" />
        </Button>
      )}
      <Link to="/collections/$slug/$id" params={{ id: entry.id, slug }}>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
      <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
