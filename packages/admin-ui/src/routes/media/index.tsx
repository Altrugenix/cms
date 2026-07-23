import { createRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import {
  fetchMedia,
  fetchFolders,
  createFolder,
  updateFolder,
  uploadMedia,
  updateMedia,
  deleteMedia,
  type MediaMeta,
  type MediaFolder,
} from "@/lib/api";
import { Route as rootRoute } from "@/routes/__root";

import {
  BreadcrumbNav,
  EmptyState,
  FolderCard,
  MediaCard,
  MediaHeader,
  MediaLoadingSkeleton,
  NewFolderInput,
  UploadOverlay,
} from "./components";

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
  const [page, setPage] = useState({ limit: 20, offset: 0 });
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

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

  const startRenameFolder = (folder: MediaFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const cancelRenameFolder = () => {
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const saveRenameFolder = async () => {
    if (editingFolderId === null) return;
    const trimmed = editingFolderName.trim();
    if (!trimmed) {
      toast("Folder name cannot be empty", "error");
      return;
    }
    try {
      await updateFolder(editingFolderId, { name: trimmed });
      setFolders((prev) =>
        prev.map((f) => (f.id === editingFolderId ? { ...f, name: trimmed } : f)),
      );
      setFolderPath((prev) =>
        prev.map((b) => (b.id === editingFolderId ? { ...b, name: trimmed } : b)),
      );
      setEditingFolderId(null);
      toast("Folder renamed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to rename folder", "error");
    }
  };

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      let successCount = 0;
      let failCount = 0;
      const folderIdStr = currentFolderId != null ? String(currentFolderId) : undefined;
      for (const file of Array.from(files)) {
        try {
          await uploadMedia(file, undefined, folderIdStr);
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

  const handleUpload = async (files: FileList) => {
    await uploadFiles(files);
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAlt, setEditAlt] = useState("");

  const startEditing = (item: MediaMeta) => {
    setEditingId(item.id);
    setEditName(item.originalName);
    setEditAlt(item.alt);
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

  if (loading) {
    return <MediaLoadingSkeleton />;
  }

  return (
    <div
      className="relative space-y-6"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <MediaHeader
        total={total}
        uploading={uploading}
        onNewFolder={() => setShowNewFolder(true)}
        onUpload={handleUpload}
      />

      <BreadcrumbNav
        folderPath={folderPath}
        onNavigateRoot={navigateRoot}
        onNavigateBreadcrumb={navigateBreadcrumb}
      />

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <UploadOverlay isDragging={isDragging} isUploading={uploading} />

      {showNewFolder && (
        <NewFolderInput
          value={newFolderName}
          onChange={setNewFolderName}
          onCreate={handleCreateFolder}
          onCancel={() => {
            setShowNewFolder(false);
            setNewFolderName("");
          }}
        />
      )}

      {folders.length === 0 && media.length === 0 ? (
        <EmptyState onUploadClick={() => fileInputRef.current?.click()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {folders.map((folder) => (
            <FolderCard
              key={`folder-${folder.id}`}
              folder={folder}
              isEditing={editingFolderId === folder.id}
              editingName={editingFolderName}
              onNavigate={() => navigateInto(folder)}
              onStartRename={() => startRenameFolder(folder)}
              onSaveRename={saveRenameFolder}
              onCancelRename={cancelRenameFolder}
              onNameChange={setEditingFolderName}
            />
          ))}
          {media.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              editName={editName}
              editAlt={editAlt}
              onStartEdit={() => startEditing(item)}
              onCancelEdit={cancelEditing}
              onSaveEdit={() => saveEditing(item.id)}
              onDelete={() => handleDelete(item.id)}
              onNameChange={setEditName}
              onAltChange={setEditAlt}
            />
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
