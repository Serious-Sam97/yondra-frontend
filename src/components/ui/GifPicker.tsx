"use client";

import { useEffect, useRef, useState } from "react";
import { type GifResult, searchGifs } from "@/lib/api";

// GIF search popover for the comment composer (Tenor, proxied server-side).
// Opens on the featured feed; picking inserts the full-size GIF into the editor.
export function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string, alt: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search; empty query = Tenor's featured feed.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    const t = setTimeout(
      () => {
        searchGifs(query)
          .then((r) => {
            if (!cancelled) setResults(r);
          })
          .catch(() => {
            if (!cancelled) setFailed(true);
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      },
      query ? 350 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // Click-away + Escape close the popover.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div ref={boxRef} className="cm-gif" role="dialog" aria-label="GIF picker">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Tenor…"
        className="cm-gif__search cf-mono"
      />
      <div className="cm-gif__grid">
        {loading && <p className="cm-gif__note cf-mono">SEARCHING…</p>}
        {!loading && failed && (
          <p className="cm-gif__note cf-mono">GIF SEARCH FAILED — TRY AGAIN</p>
        )}
        {!loading && !failed && results.length === 0 && (
          <p className="cm-gif__note cf-mono">NO RESULTS</p>
        )}
        {!loading &&
          !failed &&
          results.map((g) => (
            <button
              key={g.id}
              type="button"
              className="cm-gif__item"
              title={g.description}
              onClick={() => onPick(g.gif_url, g.description)}
            >
              {/* Tiny preview keeps the grid light; the full GIF is inserted. */}
              <img src={g.preview_url} alt={g.description} loading="lazy" />
            </button>
          ))}
      </div>
      <p className="cm-gif__credit cf-mono">VIA TENOR</p>
    </div>
  );
}
