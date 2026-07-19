import type { HttpClient } from "./client.js";
import type { AuthResponse, RefreshResponse, User, SetupStatus } from "./types.js";

export interface AuthClient {
  login(email: string, password: string): Promise<AuthResponse>;
  register(email: string, password: string): Promise<AuthResponse>;
  refresh(refreshToken: string): Promise<RefreshResponse>;
  forgotPassword(email: string): Promise<{ message: string }>;
  resetPassword(token: string, password: string): Promise<{ message: string }>;
  me(): Promise<User>;
  setupStatus(): Promise<SetupStatus>;
}

export function createAuthClient(http: HttpClient): AuthClient {
  return {
    forgotPassword(email) {
      return http.request("POST", "/api/auth/forgot-password", { email });
    },
    login(email, password) {
      return http.request("POST", "/api/auth/login", { email, password });
    },
    me() {
      return http.request("GET", "/api/auth/me");
    },
    refresh(refreshToken) {
      return http.request("POST", "/api/auth/refresh", { refreshToken });
    },
    register(email, password) {
      return http.request("POST", "/api/auth/register", { email, password });
    },
    resetPassword(token, password) {
      return http.request("POST", "/api/auth/reset-password", { password, token });
    },
    setupStatus() {
      return http.request("GET", "/api/auth/setup-status");
    },
  };
}
