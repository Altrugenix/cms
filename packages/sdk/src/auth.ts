import type { HttpClient } from "./client.js";
import type { AuthResponse, RefreshResponse, User, SetupStatus } from "./types.js";

/** Client for authentication operations. */
export interface AuthClient {
  /**
   * Authenticate with email and password.
   *
   * @returns Access and refresh tokens plus user info
   */
  login(email: string, password: string): Promise<AuthResponse>;
  /**
   * Exchange a refresh token for new access and refresh tokens (token rotation).
   *
   * @param refreshToken - The refresh token from a previous login or refresh
   * @returns New access and refresh tokens
   */
  refresh(refreshToken: string): Promise<RefreshResponse>;
  /**
   * Request a password reset email.
   *
   * @returns Confirmation message
   */
  forgotPassword(email: string): Promise<{ message: string }>;
  /**
   * Reset a user's password using a token from the reset email.
   *
   * @param token - Password reset token
   * @param password - New password
   * @returns Confirmation message
   */
  resetPassword(token: string, password: string): Promise<{ message: string }>;
  /**
   * Get the currently authenticated user's profile.
   *
   * Requires a valid access token to be set via `client.setToken()`.
   */
  me(): Promise<User>;
  /**
   * Check whether the system has been set up (has at least one admin user).
   */
  setupStatus(): Promise<SetupStatus>;
}

/**
 * Create an auth client.
 *
 * @internal Use `client.auth` instead of calling this directly.
 */
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
    resetPassword(token, password) {
      return http.request("POST", "/api/auth/reset-password", { password, token });
    },
    setupStatus() {
      return http.request("GET", "/api/auth/setup-status");
    },
  };
}
