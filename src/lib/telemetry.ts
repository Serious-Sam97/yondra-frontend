// Client error reporting → Vortex "Anomalies" monitor (YON-74).
//
// Best-effort and self-contained: it must never throw or interrupt the app. If
// NEXT_PUBLIC_TELEMETRY_TOKEN is unset (dev, or ingest disabled) every call is a
// no-op. Duplicate and runaway reports are suppressed so a render loop can't
// hammer the endpoint.

const TOKEN = process.env.NEXT_PUBLIC_TELEMETRY_TOKEN;
const API = process.env.NEXT_PUBLIC_API ?? "";

const seen = new Set<string>();
let sent = 0;
const MAX_PER_SESSION = 25;

export interface ClientErrorPayload {
  name?: string;
  message?: string;
  stack?: string;
  url?: string;
  level?: "error" | "warning" | "info";
  context?: Record<string, unknown>;
}

export function reportClientError(payload: ClientErrorPayload): void {
  try {
    if (!TOKEN || typeof window === "undefined") return;
    if (sent >= MAX_PER_SESSION) return;

    const sig = `${payload.name ?? ""}|${payload.message ?? ""}|${(
      payload.stack ?? ""
    ).slice(0, 120)}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    sent += 1;

    const body = JSON.stringify({
      name: payload.name?.slice(0, 255),
      message: payload.message?.slice(0, 4000),
      stack: payload.stack?.slice(0, 16000),
      url: payload.url ?? window.location.href,
      level: payload.level ?? "error",
      context: {
        ...payload.context,
        userAgent: navigator.userAgent,
      },
    });

    // keepalive lets the POST outlive a navigation/unload triggered by the crash.
    void fetch(`${API}/api/webhooks/errors/${TOKEN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never make a bad situation worse.
  }
}

/** Turn an unknown thrown value into a reportable shape. */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (error instanceof Error) {
    reportClientError({
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  } else {
    reportClientError({ name: "Error", message: String(error), context });
  }
}

let installed = false;

/** Install global handlers for uncaught errors + unhandled promise rejections. */
export function installGlobalErrorReporter(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    reportClientError({
      name: e.error?.name ?? "Error",
      message: e.message,
      stack: e.error?.stack,
      url: window.location.href,
      context: { source: e.filename, line: e.lineno, col: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const r = e.reason;
    reportClientError({
      name: r?.name ?? "UnhandledRejection",
      message: r?.message ?? String(r),
      stack: r?.stack,
      url: window.location.href,
      context: { kind: "unhandledrejection" },
    });
  });
}
