import type { AdminProvider } from "./types";

let registeredProvider: AdminProvider | null = null;

export function registerProvider(provider: AdminProvider) {
  registeredProvider = provider;
}

export function getRegisteredProvider(): AdminProvider | null {
  return registeredProvider;
}
