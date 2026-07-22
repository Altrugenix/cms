import { Folder } from "lucide-react";
import { useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NewFolderInputProps {
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

export function NewFolderInput({ onCancel, onChange, onCreate, value }: NewFolderInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <Folder className="h-5 w-5 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCreate();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Folder name"
        className="h-8 flex-1"
      />
      <Button size="sm" onClick={onCreate}>
        Create
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
