import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { isFirebaseMode } from "@/lib/backend-mode";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const showBanner = isFirebaseMode() && isOffline;

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
      <WifiOff className="h-3.5 w-3.5" />
      <span>You are offline. Changes will sync when reconnected.</span>
    </div>
  );
}
