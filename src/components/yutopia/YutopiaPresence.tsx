"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getEcho } from "@/lib/echo";
import { openYutopia } from "./open";

interface Presence {
  spaceId: number | null;
  projectId: number | null;
  people: {
    userId: number;
    name: string;
    area: string | null;
    areaName: string | null;
    status: string;
  }[];
  clientUrl?: string;
}

// "Who's in Yutopia, and where" on project and board pages, live over the
// project channel. One click opens Yutopia (no second login) or walks you to someone.
export function YutopiaPresence() {
  const path = usePathname();
  const m = /^\/(projects|boards)\/(\d+)(\/|$)/.exec(path ?? "");
  const kind = m?.[1];
  const id = m ? Number(m[2]) : 0;
  const [p, setP] = useState<Presence | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setP(null);
    if (!kind || !id) return;
    let dead = false;
    let channel: string | null = null;
    apiFetch<Presence>(`/api/yutopia/${kind}/${id}/presence`)
      .then((data) => {
        if (dead) return;
        setP(data);
        if (data.projectId) {
          channel = `project.${data.projectId}`;
          getEcho()
            .private(channel)
            .listen(
              ".project.event",
              (e: { type: string; payload: Presence }) => {
                if (e.type === "yutopia.presence")
                  setP((cur) => ({
                    ...(cur ?? data),
                    people: e.payload.people,
                  }));
              },
            );
        }
      })
      .catch(() => {});
    return () => {
      dead = true;
      // the project page shares this channel: only stop listening to our event
      if (channel) getEcho().private(channel).stopListening(".project.event");
    };
  }, [kind, id]);

  if (!p?.spaceId) return null;

  async function go(to?: string) {
    if (!p?.spaceId) return;
    setBusy(true);
    await openYutopia(
      `/s/${p.spaceId}${to ? `?to=${encodeURIComponent(to)}` : ""}`,
    );
    setBusy(false);
  }

  const n = p.people.length;
  return (
    <div className="yd-yutopia" data-open={open || undefined}>
      <button
        type="button"
        className="yd-yutopia__chip"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="yd-yutopia__stripes" aria-hidden />
        <span className="yd-yutopia__vfd">YUTOPIA</span>
        <span className="yd-yutopia__count">
          {n > 0 ? `● ${n} in the studio` : "○ studio empty"}
        </span>
      </button>
      {open && (
        <div className="yd-yutopia__panel" role="dialog" aria-label="Yutopia">
          <ul>
            {p.people.map((x) => (
              <li key={x.userId}>
                <span
                  className={`yd-yutopia__dot yd-yutopia__dot--${x.status}`}
                  aria-hidden
                />
                <span className="yd-yutopia__name">{x.name}</span>
                <span className="yd-yutopia__where">
                  {x.areaName ??
                    (x.status === "dnd" ? "focus" : "in the studio")}
                </span>
                <button
                  type="button"
                  onClick={() => go(`user:${x.userId}`)}
                  disabled={busy}
                >
                  Join →
                </button>
              </li>
            ))}
            {n === 0 && (
              <li className="yd-yutopia__empty">
                Nobody's in yet. Be the first.
              </li>
            )}
          </ul>
          <button
            type="button"
            className="yd-yutopia__open"
            onClick={() => go()}
            disabled={busy}
          >
            Open Yutopia ↗
          </button>
        </div>
      )}
    </div>
  );
}
