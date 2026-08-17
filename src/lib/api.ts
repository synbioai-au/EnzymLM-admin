// Admin API client for the usage-limits dashboard.
// Mirrors the main client's conventions: `auth_token` in localStorage, Bearer
// header, same-origin `/api` (proxied by next.config.ts) unless NEXT_PUBLIC_API_URL.

const defaultApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? "/api"
    : `${process.env.BACKEND_ORIGIN || "http://127.0.0.1:5000"}/api`);

export const API_URL = defaultApiUrl;

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("auth_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function onUnauthorized() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_data");
  if (window.location.pathname !== "/login") window.location.href = "/login";
}

export class AdminAccessDeniedError extends Error {
  constructor() {
    super("Admin access required");
    this.name = "AdminAccessDeniedError";
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeader(), ...(init?.headers || {}) },
  });
  if (res.status === 401) {
    onUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }
  if (res.status === 403) throw new AdminAccessDeniedError();
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const b = (await res.json()) as { detail?: string; message?: string };
      msg = b.detail || b.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- auth ----
export interface LoginResult {
  token?: string | null;
  _id?: string;
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  isApproved?: boolean;
  message?: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as LoginResult & { detail?: string };
  if (!res.ok) throw new Error(data.detail || data.message || "Login failed");
  return data;
}

// ---- models ----
export interface Model {
  modelId: string;
  displayName: string;
}
export const getModels = () => req<Model[]>("/admin/models");

// ---- limits ----
export interface Limit {
  _id: string;
  scope: "global" | "default" | "user";
  userId: string | null;
  modelId: string;
  maxReqs: number;
  prevMaxReqs: number | null;
  updatedBy: { id: string; email?: string } | null;
  updatedAt?: string;
}
export const getLimits = () => req<Limit[]>("/admin/limits");

export const setLimit = (body: {
  scope: "global" | "default" | "user";
  modelId: string;
  maxReqs: number;
  userId?: string;
}) => req<{ message: string; limit: Limit }>("/admin/limits", { method: "PUT", body: JSON.stringify(body) });

export const deleteLimit = (q: { scope: "default" | "user"; modelId: string; userId?: string }) => {
  const p = new URLSearchParams({ scope: q.scope, modelId: q.modelId });
  if (q.userId) p.set("userId", q.userId);
  return req<{ deleted: number }>(`/admin/limits?${p.toString()}`, { method: "DELETE" });
};

// ---- usage ----
export interface UsageRow {
  userId: string;
  email: string | null;
  modelId: string;
  used: number;
  limit: number;
}
export const getUsage = (period?: string, userId?: string) => {
  const p = new URLSearchParams();
  if (period) p.set("period", period);
  if (userId) p.set("userId", userId);
  const qs = p.toString();
  return req<{ period: string; rows: UsageRow[] }>(`/admin/usage${qs ? `?${qs}` : ""}`);
};

export interface UserUsageRow {
  modelId: string;
  displayName: string;
  used: number;
  limit: number;
}
export const getUserUsage = (userId: string, period?: string) => {
  const p = new URLSearchParams();
  if (period) p.set("period", period);
  const qs = p.toString();
  return req<{ userId: string; email: string | null; period: string; rows: UserUsageRow[] }>(
    `/admin/users/${encodeURIComponent(userId)}/usage${qs ? `?${qs}` : ""}`,
  );
};

// ---- users (existing admin route) ----
export interface AdminUserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt?: string;
}
export const getUsers = () => req<AdminUserRecord[]>("/admin/users");
