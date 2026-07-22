import { Upload, FolderPlus } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

interface MediaHeaderProps {
  total: number;
  uploading: boolean;
  onNewFolder: () => void;
  onUpload: (files: FileList) => void;
}

export function MediaHeader({ onNewFolder, onUpload, total, uploading }: MediaHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onUpload(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Media Library</h1>
        <p className="text-muted-foreground">
          {total} file{total === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleChange} />
        <Button variant="outline" onClick={onNewFolder} className="w-full sm:w-auto">
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
          className="w-full sm:w-auto"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      </div>
    </div>
  );
}
