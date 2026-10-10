"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type MascotRef, resolveMascotRefs } from "@/lib/api";
import { emitVortex } from "@/lib/vortexBus";
import type { ChipRef } from "./text";

// A-18 · the {{card:12}} chips he writes. Resolved in batches through
// /api/mascot/resolve (access-checked); anything the user can't see renders as
// a struck-out "not in my tape" chip instead of leaking or crashing.

const cache = new Map<string, MascotRef | null>();
const waiting = new Map<string, ((r: MascotRef | null) => void)[]>();
let queued: ChipRef[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const keyOf = (r: ChipRef) => `${r.type}:${r.id}`;

function flush() {
  timer = null;
  const batch = queued.slice(0, 20);
  queued = queued.slice(20);
  if (queued.length) timer = setTimeout(flush, 30);
  resolveMascotRefs(batch)
    .then((out) => {
      for (const r of batch) {
        const k = keyOf(r);
        const v = out[k] ?? null;
        cache.set(k, v);
        for (const cb of waiting.get(k) ?? []) cb(v);
        waiting.delete(k);
      }
    })
    .catch(() => {
      for (const r of batch) {
        const k = keyOf(r);
        for (const cb of waiting.get(k) ?? []) cb(null);
        waiting.delete(k);
      }
    });
}

function resolveRef(r: ChipRef): Promise<MascotRef | null> {
  const k = keyOf(r);
  if (cache.has(k)) return Promise.resolve(cache.get(k) ?? null);
  return new Promise((res) => {
    const list = waiting.get(k);
    if (list) {
      list.push(res);
      return;
    }
    waiting.set(k, [res]);
    queued.push(r);
    if (timer === null) timer = setTimeout(flush, 30);
  });
}

const GLYPH: Record<ChipRef["type"], string> = {
  card: "▣",
  board: "▦",
  project: "◫",
};

export function Chip({ chip }: { chip: ChipRef }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [ref, setRef] = useState<MascotRef | null | undefined>(() =>
    cache.has(keyOf(chip)) ? (cache.get(keyOf(chip)) ?? null) : undefined,
  );
  useEffect(() => {
    let live = true;
    if (ref === undefined)
      void resolveRef(chip).then((r) => {
        if (live) setRef(r);
      });
    return () => {
      live = false;
    };
  }, [chip, ref]);

  if (ref === undefined)
    return <span className="vxm-chip is-loading">{GLYPH[chip.type]} …</span>;
  if (ref === null)
    return (
      <span className="vxm-chip is-gone" title="not in my tape">
        {GLYPH[chip.type]} not in my tape
      </span>
    );

  const go = () => {
    if (chip.type === "card" && ref.board_id) {
      if (pathname.startsWith(`/boards/${ref.board_id}`))
        emitVortex({
          type: "vortex.open",
          boardId: ref.board_id,
          cardId: chip.id,
        });
      else router.push(`/boards/${ref.board_id}?card=${chip.id}`);
    } else if (chip.type === "board") router.push(`/boards/${chip.id}`);
    else router.push(`/projects/${chip.id}`);
  };
  return (
    <button
      type="button"
      className={`vxm-chip is-${chip.type}`}
      onClick={go}
      title={`open ${chip.type}`}
    >
      <span aria-hidden>{GLYPH[chip.type]}</span>
      {ref.key ? <b>{ref.key}</b> : null}
      <span className="nm">{ref.name}</span>
    </button>
  );
}
