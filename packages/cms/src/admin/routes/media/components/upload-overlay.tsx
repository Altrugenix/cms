import { UploadCloud } from "lucide-react";

interface UploadOverlayProps {
  isDragging: boolean;
  isUploading: boolean;
}

export function UploadOverlay({ isDragging, isUploading }: UploadOverlayProps) {
  return (
    <>
      {isDragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary bg-background/95">
          <UploadCloud className="h-10 w-10 text-primary" />
          <p className="text-lg font-medium">Drop files to upload</p>
          <p className="text-sm text-muted-foreground">Release to start uploading</p>
        </div>
      )}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/50 p-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Uploading files...</p>
        </div>
      )}
    </>
  );
}
