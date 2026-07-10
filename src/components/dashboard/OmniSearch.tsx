'use client'

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchWorkspace } from "@/lib/api";

type SBoard = { id: number; name: string; project_id: number | null; type: string };
type SCard = {
  id: number;
  name: string;
  board_id: number;
  board_name: string | null;
  section: string | null;
  is_deal: boolean;
  ticket_key: string;
};

type Flat =
  | { kind: "board"; id: number }
  | { kind: "card"; id: number; board_id: number };

export default function OmniSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [boards, setBoards] = useState<SBoard[]>([]);
  const [cards, setCards] = useState<SCard[]>([]);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced fetch as you type.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setBoards([]);
      setCards([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchWorkspace(term);
        setBoards(r?.boards ?? []);
        setCards(r?.cards ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        // ignore — 401 handled centrally
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const flat: Flat[] = [
    ...boards.map((b) => ({ kind: "board" as const, id: b.id })),
    ...cards.map((c) => ({ kind: "card" as const, id: c.id, board_id: c.board_id })),
  ];

  const go = (item: Flat) => {
    setOpen(false);
    setQ("");
    if (item.kind === "board") router.push(`/boards/${item.id}`);
    else router.push(`/boards/${item.board_id}?card=${item.id}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open || flat.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const it = flat[active]; if (it) go(it); }
  };

  const hasResults = boards.length > 0 || cards.length > 0;

  return (
    <div className="yd-omni" ref={boxRef}>
      <input
        className="yd-screen yd-search"
        placeholder="⌕  Search cards, boards, deals…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (hasResults) setOpen(true); }}
        onKeyDown={onKey}
      />
      {open && (
        <div className="yd-omni-pop">
          {!hasResults && !loading && <div className="yd-omni-empty">No matches for “{q.trim()}”</div>}
          {boards.length > 0 && <div className="yd-omni-grp">Boards</div>}
          {boards.map((b, i) => (
            <button
              key={`b${b.id}`}
              type="button"
              className={`yd-omni-row ${active === i ? "on" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go({ kind: "board", id: b.id })}
            >
              <span className="yd-omni-ic">▦</span>
              <span className="yd-omni-nm">{b.name}</span>
              <span className="yd-omni-tag">board</span>
            </button>
          ))}
          {cards.length > 0 && <div className="yd-omni-grp">Cards</div>}
          {cards.map((c, i) => {
            const idx = boards.length + i;
            return (
              <button
                key={`c${c.id}`}
                type="button"
                className={`yd-omni-row ${active === idx ? "on" : ""}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => go({ kind: "card", id: c.id, board_id: c.board_id })}
              >
                <span className="yd-omni-ic" style={c.is_deal ? { color: "var(--yd-gold)" } : undefined}>{c.is_deal ? "$" : "•"}</span>
                <span className="yd-omni-nm">{c.name}</span>
                <span className="yd-omni-sub">{c.ticket_key ? `${c.ticket_key} · ` : ""}{c.board_name}{c.section ? ` · ${c.section}` : ""}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
