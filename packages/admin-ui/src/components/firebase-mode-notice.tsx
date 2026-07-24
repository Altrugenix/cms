import { Info } from "lucide-react";

import { isFirebaseMode } from "@/lib/backend-mode";

export function FirebaseModeNotice() {
  if (!isFirebaseMode()) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">Firebase Mode</p>
        <p className="text-xs">
          Some features are unavailable: API Tokens, Webhooks, Schema Builder, and Plugins. These
          are managed via Firebase console and CLI.
        </p>
      </div>
    </div>
  );
}
