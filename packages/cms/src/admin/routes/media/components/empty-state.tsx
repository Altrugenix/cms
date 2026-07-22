import { Upload, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
      <UploadCloud className="h-8 w-8 text-muted-foreground" />
      <p className="text-lg text-muted-foreground">Drop files here or click to upload</p>
      <p className="text-sm text-muted-foreground">Drag and drop images or files to get started</p>
      <Button variant="outline" onClick={onUploadClick}>
        <Upload className="mr-2 h-4 w-4" /> Choose Files
      </Button>
    </div>
  );
}
