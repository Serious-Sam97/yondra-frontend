"use client";

import { useEffect } from "react";
import { installGlobalErrorReporter } from "@/lib/telemetry";

/**
 * Installs the global window error / unhandledrejection reporters once on mount
 * (YON-74). Renders nothing. No-op when NEXT_PUBLIC_TELEMETRY_TOKEN is unset.
 */
export default function ErrorReporter() {
  useEffect(() => {
    installGlobalErrorReporter();
  }, []);

  return null;
}
