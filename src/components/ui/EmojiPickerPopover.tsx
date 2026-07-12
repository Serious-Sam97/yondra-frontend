"use client";

import { useEffect, useRef } from "react";

// Full emoji picker behind the reactions ➕ — lazy-loads emoji-picker-element
// (a self-contained web component) so its data never weighs on the main bundle.
export function EmojiPickerPopover({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    import("emoji-picker-element").then(() => {
      if (cancelled || !host) return;
      const picker = document.createElement("emoji-picker");
      picker.classList.add("cm-emoji-picker");
      picker.addEventListener("emoji-click", (event) => {
        const unicode = event.detail?.unicode;
        if (unicode) onPick(unicode);
      });
      host.replaceChildren(picker);
    });

    const onDown = (e: MouseEvent) => {
      if (host && !host.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onPick, onClose]);

  return (
    <div ref={hostRef} className="cm-emoji-host" role="dialog" aria-label="Emoji picker">
      <p className="cm-gif__note cf-mono">LOADING…</p>
    </div>
  );
}
