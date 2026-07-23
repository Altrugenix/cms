import type { BackendMode } from "@arche-cms/types";

const SUPPORTED_MODES: BackendMode[] = ["rest", "firebase"];

export function getBackendMode(): BackendMode {
  const raw = (import.meta.env.VITE_BACKEND_MODE as string) ?? "rest";
  return SUPPORTED_MODES.includes(raw as BackendMode) ? (raw as BackendMode) : "rest";
}

export function isFirebaseMode(): boolean {
  return getBackendMode() === "firebase";
}

export function isRestMode(): boolean {
  return getBackendMode() === "rest";
}
