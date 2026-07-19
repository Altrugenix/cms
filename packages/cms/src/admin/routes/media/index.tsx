import { createRoute } from "@tanstack/react-router";
import {
  Trash2,
  Upload,
  UploadCloud,
  Pencil,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchMedia,
  fetchFolders,
  createFolder,
  uploadMedia,
  updateMedia,
  deleteMedia,
  getMediaUrl,
  type MediaMeta,
  type MediaFolder,
} from "@/lib/api";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: MediaLibrary,
  getParentRoute: () => rootRoute,
  path: "/media",
});

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

function MediaLibrary() {
  const { toast } = useToast();
  const [media, setMedia] = useState<MediaMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState({ limit: 20, offset: 0 });

  const load = useCallback(async (folderId: number | null, limit: number, offset: number) => {
    setLoading(true);
    setError(null);
    const folderIdStr = folderId != null ? String(folderId) : null;
    try {
      const [mediaData, folderData] = await Promise.all([
        fetchMedia(folderIdStr, { limit, offset }),
        fetchFolders(folderIdStr),
      ]);
      setMedia(mediaData.data);
      setTotal(mediaData.total);
      setFolders(folderData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(currentFolderId, page.limit, page.offset);
  }, [currentFolderId, page, load]);

  const navigateInto = (folder: MediaFolder) => {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    setPage((p) => ({ ...p, offset: 0 }));
  };

  const navigateBreadcrumb = (index: number) => {
    const target = folderPath[index];
    setFolderPath(folderPath.slice(0, index));
    setCurrentFolderId(target?.id ?? null);
    setPage((p) => ({ ...p, offset: 0 }));
  };

  const navigateRoot = () => {
    setFolderPath([]);
    setCurrentFolderId(null);
    setPage((p) => ({ ...p, offset: 0 }));
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      toast("Folder name is required", "error");
      return;
    }
    try {
      await createFolder(name, currentFolderId);
      setNewFolderName("");
      setShowNewFolder(false);
      toast("Folder created", "success");
      setPage((p) => ({ ...p, offset: 0 }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create folder";
      toast(msg, "error");
    }
  };

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      let successCount = 0;
      let failCount = 0;
      const items: MediaMeta[] = [];
      const folderIdStr = currentFolderId != null ? String(currentFolderId) : undefined;
      for (const file of Array.from(files)) {
        try {
          const item = await uploadMedia(file, undefined, folderIdStr);
          items.push(item);
          successCount++;
        } catch {
          failCount++;
        }
      }
      if (successCount > 0) {
        setPage((p) => ({ ...p, offset: 0 }));
      }
      if (successCount > 0) {
        toast(`${successCount} file${successCount === 1 ? "" : "s"} uploaded`, "success");
      }
      if (failCount > 0) {
        toast(`${failCount} file${failCount === 1 ? "" : "s"} failed`, "error");
      }
      setUploading(false);
    },
    [toast, currentFolderId],
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCountRef.current = 0;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    try {
      await deleteMedia(id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
      setTotal((prev) => prev - 1);
      setConfirmDeleteId(null);
      toast("File deleted", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      setError(msg);
      toast(msg, "error");
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const startEditing = (item: MediaMeta) => {
    setEditingId(item.id);
    setEditName(item.originalName);
    setEditAlt(item.alt);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditAlt("");
  };

  const saveEditing = async (id: string) => {
    const trimmedName = editName.trim();
    const trimmedAlt = editAlt.trim();
    if (!trimmedName) {
      toast("Filename cannot be empty", "error");
      return;
    }
    try {
      const updated = await updateMedia(id, {
        alt: trimmedAlt,
        originalName: trimmedName,
      });
      setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
      setEditingId(null);
      toast("File updated", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      toast(msg, "error");
    }
  };

  const isImage = (mime: string) => mime.startsWith("image/");

  useEffect(() => {
    if (showNewFolder) {
      setTimeout(() => newFolderInputRef.current?.focus(), 0);
    }
  }, [showNewFolder]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-40" />
            <Skeleton className="mt-1 h-5 w-16" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card overflow-hidden">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-2 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative space-y-6"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Media Library</h1>
          <p className="text-muted-foreground">
            {total} file{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <input
            ref={fileInputRef}
            type="file"
            id="media-upload"
            className="hidden"
            multiple
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            onClick={() => setShowNewFolder(true)}
            className="w-full sm:w-auto"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      {folderPath.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <button
            onClick={navigateRoot}
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Root
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          {folderPath.map((crumb, i) => (
            <span key={crumb.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {i === folderPath.length - 1 ? (
                <span className="font-medium text-foreground">{crumb.name}</span>
              ) : (
                <button
                  onClick={() => navigateBreadcrumb(i)}
                  className="rounded px-2 py-1 hover:bg-muted hover:text-foreground transition-colors"
                >
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </nav>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {isDragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary bg-background/95">
          <UploadCloud className="h-10 w-10 text-primary" />
          <p className="text-lg font-medium">Drop files to upload</p>
          <p className="text-sm text-muted-foreground">Release to start uploading</p>
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/50 p-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Uploading files...</p>
        </div>
      )}

      {/* New Folder Input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <Folder className="h-5 w-5 text-muted-foreground" />
          <Input
            ref={newFolderInputRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") {
                setShowNewFolder(false);
                setNewFolderName("");
              }
            }}
            placeholder="Folder name"
            className="h-8 flex-1"
          />
          <Button size="sm" onClick={handleCreateFolder}>
            Create
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowNewFolder(false);
              setNewFolderName("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {folders.length === 0 && media.length === 0 ? (
        <div
          className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center transition-colors"
          onDragEnter={handleDragEnter}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Drop files here or click to upload</p>
          <p className="text-sm text-muted-foreground">
            Drag and drop images or files to get started
          </p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Choose Files
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {folders.map((folder) => (
            <div
              key={`folder-${folder.id}`}
              onClick={() => navigateInto(folder)}
              className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <Folder className="h-10 w-10 text-primary/70" />
              <p className="truncate text-center text-sm font-medium">{folder.name}</p>
            </div>
          ))}
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
            >
              {isImage(item.mimeType) ? (
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
                  <p className=" truncate text-center text-xs text-muted-foreground">
                    {item.mimeType}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(item);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="p-2 space-y-1">
                {editingId === item.id ? (
                  <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <Input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(item.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onBlur={() => saveEditing(item.id)}
                      className="h-6 text-xs px-1 py-0"
                      placeholder="Filename"
                    />
                    <Input
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(item.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onBlur={() => saveEditing(item.id)}
                      className="h-6 text-xs px-1 py-0"
                      placeholder="Alt text"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {(item.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <p
                      className="truncate text-xs font-medium cursor-pointer hover:text-primary"
                      title={item.originalName}
                      onClick={() => startEditing(item)}
                    >
                      {item.originalName}
                    </p>
                    {item.alt && (
                      <p className="truncate text-[10px] text-muted-foreground" title={item.alt}>
                        {item.alt}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {(item.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {total > 0 && (
        <Pagination
          limit={page.limit}
          offset={page.offset}
          total={total}
          onChange={(limit, offset) => setPage({ limit, offset })}
        />
      )}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete file?"
        message="This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
