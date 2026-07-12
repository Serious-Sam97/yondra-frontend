"use client";

import type { BoardSummaryInterface } from "@/interfaces/BoardInterface";
import type { UserInterface } from "@/interfaces/UserInterface";
import { apiFetch, clearAuth } from "./api";

// Payload of POST /api/register and /api/login (AuthController).
interface AuthResponse {
  token: string;
  user: UserInterface;
}

export async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  const data = await apiFetch<AuthResponse>(`/api/register`, {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });
  localStorage.setItem("token", data.token);
  localStorage.setItem("isLogged", "true");
}

export async function login(email: string, password: string): Promise<void> {
  const data = await apiFetch<AuthResponse>(`/api/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.token);
  localStorage.setItem("isLogged", "true");
}

// Where to land after a successful login/registration. Honors the `?next=` param
// set by the 401 redirect in api.ts, but ONLY for same-origin relative paths —
// absolute URLs ("https://evil.com") and protocol-relative ones ("//evil.com")
// are rejected so the login page can't be abused as an open redirect.
export function postAuthRedirectPath(fallback = "/dashboard"): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  if (next?.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

export async function fetchUser(signal?: AbortSignal): Promise<UserInterface> {
  return await apiFetch(`/api/user`, { method: "GET", signal });
}

export async function fetchBoards(): Promise<{
  owned: BoardSummaryInterface[];
  shared: BoardSummaryInterface[];
}> {
  return await apiFetch(`/api/boards`, { method: "GET" });
}

export async function updateProfile(data: {
  name: string;
  email: string;
  whatsapp_number?: string | null;
}): Promise<UserInterface> {
  return await apiFetch("/api/user", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updatePassword(data: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  return await apiFetch("/api/user/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/logout", { method: "POST" });
  } catch {
    // The token may already be expired or revoked — clearing local state is what matters.
  } finally {
    clearAuth();
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch("/api/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  await apiFetch("/api/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });
}
