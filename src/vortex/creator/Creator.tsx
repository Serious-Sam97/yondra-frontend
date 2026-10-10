"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type VortexMood, vortexSvg } from "@/lib/vortexArt";
import { subscribeVortex, type VortexEvent } from "@/lib/vortexBus";
import { animNames } from "@/vortex/body/anims";
import { useSoul } from "@/vortex/core/soul";
import { customCostumeSvg } from "@/vortex/econ/costumes";
import { body, pick, say, wait } from "@/vortex/weird/bridge";
import { type Behavior, behaviorApi, behaviorsFor } from "./behaviors";
import { type Genome, visitorLines } from "./genome";
import "./creator.css";

// LADO S · the runtime half of the creator tools: plays the tricks you taught
// him (S-01, sometimes wrong on purpose), runs registered behaviors (S-10),
// and stages a visit from a pasted genome (S-09).

const TRIGGER_OF = (e: VortexEvent): string | null => {
  switch (e.type) {
    case "card.moved":
      return e.done ? "done" : "moved";
    case "card.opened":
      return "opened";
    case "card.archived":
      return "archived";
    case "card.jammed":
      return "jammed";
    case "card.edited":
      return e.renamed ? "renamed" : null;
    default:
      return null;
  }
};

export default function Creator() {
  const soul = useSoul();
  const pathname = usePathname() ?? "";
  const tricks = useRef(soul?.tricks ?? []);
  tricks.current = soul?.tricks ?? [];
  const [visitor, setVisitor] = useState<Genome | null>(null);

  /* S-01 · tricks */
  useEffect(() => {
    let last = 0;
    const perform = async (trigger: string) => {
      const t = tricks.current.filter((x) => x.trigger === trigger);
      const now = Date.now();
      if (t.length === 0 || now - last < 8000) return;
      last = now;
      const trick = pick(t);
      if (Math.random() < 0.12) {
        // wrong on purpose, so you remember who's in charge
        const wrong = pick(animNames().filter((a) => a !== trick.anim));
        body({ cmd: "anim", name: wrong });
        await wait(1400);
        say(
          pick([
            "…wait. that's not it.",
            "wrong trick. on purpose. obviously.",
            "that was a different trick. a better one.",
          ]),
        );
        await wait(1200);
      }
      body({ cmd: "anim", name: trick.anim });
      if (trick.line) say(trick.line);
    };
    const off = subscribeVortex((e) => {
      const trig = TRIGGER_OF(e);
      if (trig) void perform(trig);
    });
    const hello = setTimeout(() => void perform("hello"), 8000);
    return () => {
      off();
      clearTimeout(hello);
    };
  }, []);

  /* S-10 · behaviors on this page */
  const active = useRef<Behavior[]>([]);
  useEffect(() => {
    const list = behaviorsFor(pathname);
    active.current = list;
    const t = setTimeout(() => {
      for (const b of list) {
        try {
          b.enter?.(behaviorApi, pathname);
        } catch {}
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [pathname]);
  useEffect(() => {
    const lastBy = new Map<string, number>();
    return subscribeVortex((e) => {
      for (const b of active.current) {
        const fn = b.on?.[e.type] as
          | ((ev: VortexEvent, v: typeof behaviorApi) => void)
          | undefined;
        if (!fn) continue;
        const now = Date.now();
        if (now - (lastBy.get(b.id) ?? 0) < (b.cooldownMs ?? 15_000)) continue;
        lastBy.set(b.id, now);
        try {
          fn(e, behaviorApi);
        } catch {}
      }
    });
  }, []);

  /* S-09 · a visitor */
  useEffect(() => {
    const on = (e: Event) => setVisitor((e as CustomEvent<Genome>).detail);
    window.addEventListener("vortex:visitor", on);
    return () => window.removeEventListener("vortex:visitor", on);
  }, []);

  if (!visitor) return null;
  return <Visitor g={visitor} onDone={() => setVisitor(null)} />;
}

function Visitor({ g, onDone }: { g: Genome; onDone: () => void }) {
  const [line, setLine] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const face = { __html: vortexSvg(g.mood as VortexMood, "visitor") };
  const hat = { __html: customCostumeSvg(g.costume) };
  useEffect(() => {
    let alive = true;
    (async () => {
      await wait(1600);
      say(
        pick([
          "who let THAT in.",
          "oh no. a tourist.",
          "another one of me. worse, somehow.",
        ]),
        "sideeye",
      );
      const lines = visitorLines(g);
      for (const l of lines.slice(0, 4)) {
        if (!alive) return;
        await wait(2400);
        setLine(l);
        await wait(2600);
        setLine(null);
        if (Math.random() < 0.6)
          say(
            pick([
              "fascinating. no it isn't.",
              "we're nothing alike.",
              "ok that one was good.",
              "*pretends to check the time*",
            ]),
          );
      }
      await wait(1500);
      setLeaving(true);
      say("…bye. don't come back. (come back.)", "sulking");
      await wait(1800);
      if (alive) onDone();
    })();
    return () => {
      alive = false;
    };
  }, [g, onDone]);
  return (
    <div className={`vxcr-visitor${leaving ? " is-leaving" : ""}`} aria-hidden>
      <div
        className="vxcr-visitor-body"
        style={{ "--tint": g.color } as React.CSSProperties}
      >
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated SVG */}
        <div className="face" dangerouslySetInnerHTML={face} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: re-validated costume SVG */}
        <div className="hat" dangerouslySetInnerHTML={hat} />
      </div>
      {line && <output className="vxcr-visitor-line">{line}</output>}
    </div>
  );
}
