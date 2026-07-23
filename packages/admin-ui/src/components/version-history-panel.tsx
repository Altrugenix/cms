import { Clock, History, RotateCcw } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVersions, useRestoreVersion } from "@/lib/hooks";

type VersionHistoryPanelProps = {
  slug: string;
  entryId: string;
};

export function VersionHistoryPanel({ entryId, slug }: VersionHistoryPanelProps) {
  const { toast } = useToast();
  const { data: versionsRes, isLoading } = useVersions(slug, entryId);
  const restoreVersion = useRestoreVersion(slug);
  const [confirmVersionId, setConfirmVersionId] = useState<string | null>(null);

  const versions = versionsRes?.data ?? [];

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersion.mutateAsync({ entryId, versionId });
      setConfirmVersionId(null);
      toast("Version restored", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to restore version", "error");
    }
  };

  const confirmVersion = versions.find((v) => String(v.id) === confirmVersionId);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Version History</h3>
        {versions.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {versions.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No versions yet. Versions are created automatically when you save this entry.
        </p>
      ) : (
        <div className="space-y-1">
          {versions.map((version) => {
            const parsed = parseVersionData(version.data);
            const label = extractLabel(parsed);
            return (
              <div
                key={version.id}
                className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  v{version.version}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {label || `Version ${version.version}`}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(version.createdAt)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  disabled={restoreVersion.isPending}
                  onClick={() => setConfirmVersionId(String(version.id))}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Restore
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmVersionId !== null}
        title={`Restore to v${confirmVersion?.version ?? "?"}`}
        message={
          confirmVersion
            ? `This will replace the current entry with the data from version ${confirmVersion.version} (${formatRelativeTime(confirmVersion.createdAt)}). A new version will be created.`
            : ""
        }
        confirmLabel="Restore Version"
        loadingLabel="Restoring..."
        loading={restoreVersion.isPending}
        variant="default"
        onConfirm={() => confirmVersionId && handleRestore(confirmVersionId)}
        onCancel={() => setConfirmVersionId(null)}
      />
    </div>
  );
}

function parseVersionData(data: string): Record<string, unknown> {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function extractLabel(data: Record<string, unknown>): string {
  const candidates = ["title", "name", "label", "heading", "subject"];
  for (const key of candidates) {
    const val = data[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
