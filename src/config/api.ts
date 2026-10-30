/**
 * Centralized API & WebSocket configuration for LinkUp frontend.
 *
 * Handles cross-origin concerns for both Expo Native (iOS/Android) and Expo Web.
 *
 * Environment variables (set via .env):
 *   EXPO_PUBLIC_APP_URL        Base API URL (e.g. https://217b7332d13d.ngrok-free.app)
 *   EXPO_PUBLIC_WS_URL         WebSocket host (e.g. 217b7332d13d.ngrok-free.app) OR full ws(s) URL
 *   EXPO_PUBLIC_WS_FULL_URL    (Optional) Full WebSocket URL, overrides WS_URL construction
 *   EXPO_PUBLIC_API_BASE_URL   (Optional) Full API base URL, overrides APP_URL construction
 */

const getEnv = (key: string, fallback: string = ""): string => {
  const value = process.env[key];
  return value !== undefined ? value : fallback;
};

// ---------------------------------------------------------------------------
// API Base URL
// ---------------------------------------------------------------------------

export const API_BASE_URL = getEnv("EXPO_PUBLIC_API_BASE_URL") ||
  (() => {
    const base = getEnv("EXPO_PUBLIC_APP_URL");
    if (!base) return "";
    // Strip trailing slash
    return base.replace(/\/$/, "");
  })();

// Append context path if not already present
export const API_ROOT =
  API_BASE_URL && !API_BASE_URL.endsWith("/LinkUp")
    ? `${API_BASE_URL}/LinkUp`
    : API_BASE_URL;

// ---------------------------------------------------------------------------
// WebSocket URL
// ---------------------------------------------------------------------------

export const WS_URL = (() => {
  const full = getEnv("EXPO_PUBLIC_WS_FULL_URL");
  if (full) return full.replace(/\/$/, "");

  const host = getEnv("EXPO_PUBLIC_WS_URL");
  if (!host) return "";

  // If user already provided a protocol (ws:// or wss://), use as-is
  if (/^wss?:\/\//i.test(host)) {
    return host.replace(/\/$/, "");
  }

  // Otherwise construct wss://<host>/LinkUp
  return `wss://${host.replace(/^https?:\/\//i, "")}/LinkUp`;
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const isWeb = typeof window !== "undefined" && typeof document !== "undefined";

export const fetchOptions = (init: RequestInit = {}): RequestInit => {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  // Do NOT set Content-Type for FormData — let the browser/RN set it with boundary
  const isFormData = init.body instanceof FormData;

  return {
    ...init,
    // Always request CORS mode for cross-origin requests
    mode: "cors",
    // Send cookies / authorization headers cross-origin
    credentials: "include",
    headers: isFormData
      ? headers
      : { "Accept": "application/json", ...headers },
  };
};

export default {
  API_BASE_URL,
  API_ROOT,
  WS_URL,
  isWeb,
  fetchOptions,
};
