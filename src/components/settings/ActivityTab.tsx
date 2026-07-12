"use client";

import { useEffect, useState } from "react";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import { getActivity } from "@/lib/api";
import { PanelHeading } from "./shared";

interface ActivityItem {
  id: number;
  type: string;
  description: string;
  created_at: string;
  user?: { id: number; name: string } | null;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ActivityTab({ board }: { board: BoardInterface }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    let active = true;
    getActivity(board.id)
      .then((res: ActivityItem[]) => {
        if (active) setItems(res ?? []);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [board.id]);

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <PanelHeading>Activity</PanelHeading>

      {items === null ? (
        <div className="flex justify-center py-6">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: "var(--cf-phosphor)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      ) : items.length === 0 ? (
        <p
          className="cf-mono text-center py-3"
          style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
        >
          No activity yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl px-3 py-2"
              style={{ background: "#211f1b", border: "1px solid #38352e" }}
            >
              <span
                className="cf-led mt-1.5 flex-shrink-0"
                style={{
                  background: "var(--cf-phosphor)",
                  boxShadow: "0 0 6px var(--cf-phosphor)",
                }}
              />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: "12px", color: "var(--cf-text)" }}>
                  {item.description}
                </p>
                <p
                  className="cf-mono mt-0.5"
                  style={{ fontSize: "9px", color: "var(--cf-text-muted)" }}
                >
                  {item.user?.name ?? "Someone"} · {timeAgo(item.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
