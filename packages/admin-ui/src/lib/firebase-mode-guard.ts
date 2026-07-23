import { redirect } from "@tanstack/react-router";

import { isFirebaseMode } from "@/lib/backend-mode";

/**
 * Returns a `beforeLoad` callback that redirects away from unsupported routes
 * when running in Firebase mode. Pass `to` to specify the redirect target;
 * defaults to `"/"` (home).
 *
 * Usage:
 *   createRoute({ beforeLoad: firebaseModeGuard(), ... });
 *   createRoute({ beforeLoad: firebaseModeGuard({ to: "/settings/users" }), ... });
 */
export function firebaseModeGuard({ to = "/" }: { to?: string } = {}) {
  return () => {
    if (isFirebaseMode()) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router beforeLoad convention
      throw redirect({ to });
    }
  };
}
