"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export type Toast = {
  id: number;
  type?: string | null;
  message: string;
  deepLink?: string | null;
};

type ToastContextType = {
  /** Show a transient toast. Auto-dismisses; click navigates to `deepLink`. */
  pushToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const router = useRouter();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++idRef.current;
      // Keep at most 4 stacked; drop the oldest.
      setToasts((prev) => [...prev, { ...toast, id }].slice(-4));
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          top: "calc(var(--app-header-h, 60px) + 12px)",
          right: 16,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: 340,
          maxWidth: "calc(100vw - 32px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => {
              if (t.deepLink) router.push(t.deepLink);
              dismiss(t.id);
            }}
            className="modal-content aero-menu"
            style={{
              pointerEvents: "auto",
              cursor: t.deepLink ? "pointer" : "default",
              padding: "12px 14px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              animation: "toast-in 220ms ease",
            }}
          >
            <span
              className="cf-led"
              aria-hidden
              style={{
                marginTop: 4,
                width: 8,
                height: 8,
                flexShrink: 0,
                background: "var(--cf-amber)",
                boxShadow: "0 0 6px var(--cf-amber)",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="cf-label"
                style={{
                  color: "var(--cf-phosphor)",
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                New notification
              </p>
              <p className="text-xs" style={{ color: "var(--cf-text)" }}>
                {t.message}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.id);
              }}
              className="btn-physical text-xs cursor-pointer"
              style={{ color: "var(--cf-text-muted)", flexShrink: 0 }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
