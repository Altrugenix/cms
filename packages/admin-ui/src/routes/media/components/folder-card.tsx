import { Folder, FolderPen } from "lucide-react";

import type { MediaFolder } from "@/lib/providers/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FolderCardProps {
  folder: MediaFolder;
  isEditing: boolean;
  editingName: string;
  onNavigate: () => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onNameChange: (name: string) => void;
}

export function FolderCard({
  editingName,
  folder,
  isEditing,
  onCancelRename,
  onNameChange,
  onNavigate,
  onSaveRename,
  onStartRename,
}: FolderCardProps) {
  return (
    <div
      className="group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
      onClick={() => !isEditing && onNavigate()}
    >
      {isEditing ? (
        <div
          className="flex w-full flex-col items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Folder className="h-10 w-10 text-primary/70" />
          <Input
            value={editingName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveRename();
              if (e.key === "Escape") onCancelRename();
            }}
            onBlur={onSaveRename}
            className="h-7 text-center text-xs"
            autoFocus
          />
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onSaveRename}>
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onCancelRename}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Folder className="h-10 w-10 text-primary/70" />
          <p className="truncate text-center text-sm font-medium">{folder.name}</p>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
          >
            <FolderPen className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
