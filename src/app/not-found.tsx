import Link from "next/link";

// 404 page — any unmatched route (or a notFound() call) lands here, rendered
// inside the root layout so the control-room backdrop and app bar stay up.
export default function NotFound() {
  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4">
      <div className="glass-panel flex flex-col items-center gap-4 px-8 py-10 text-center max-w-sm w-full">
        <span
          className="cf-led"
          style={{
            background: "var(--cf-amber)",
            boxShadow: "0 0 8px var(--cf-amber)",
          }}
        />
        <p className="chrome-text text-2xl font-bold">404</p>
        <p
          className="cf-mono text-sm font-bold uppercase tracking-widest"
          style={{ color: "var(--cf-text)" }}
        >
          Page not found
        </p>
        <p
          className="cf-mono text-xs"
          style={{ color: "var(--cf-text-muted)" }}
        >
          This address doesn&apos;t match anything in the system. It may have
          been moved or never existed.
        </p>
        <Link
          href="/dashboard"
          className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 mt-1"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
