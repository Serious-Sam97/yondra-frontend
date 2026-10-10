"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import { vxSound } from "@/components/vortex/vortexSound";
import { apiFetch } from "@/lib/api";
import { vortexSvg } from "@/lib/vortexArt";
import { report } from "@/vortex/core/soul";
import { announceNew, fetchFragments } from "@/vortex/mysteries/fragments";
import { playHum, stopHum } from "./ambience";
import { BelowPanel } from "./Panels";
import { MAP, ROOMS, type Spot, type Verb } from "./rooms";
import "./below.css";

/**
 * I · THE UNIVERSE BELOW — a point-and-click world inside a CRT television.
 * The scene is drawn here; every action goes to the server (BelowService),
 * which decides what happens, what you get, and which fragments open.
 */

export interface World {
  visited: string[];
  taken: string[];
  inventory: string[];
  items: Record<string, string>;
  flags: Record<string, unknown>;
  quests: { id: string; title: string; step: string }[];
  blackout: boolean;
  carrying_tea: boolean;
  /** I-28 · temporary rooms that exist today */
  temporary?: string[];
  /** P-09 · the team's weather */
  weather?: "rain" | "sun" | "clear";
}

const VERB_LABEL: Record<Verb, string> = {
  look: "look",
  take: "take",
  use: "use",
  talk: "talk",
  read: "read",
  collect: "collect",
};

export default function BelowGame({ room: roomId }: { room: string }) {
  const router = useRouter();
  const room = ROOMS[roomId] ?? ROOMS.porao;
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const [world, setWorld] = useState<World | null>(null);
  const [line, setLine] = useState(room.enter);
  const [typed, setTyped] = useState(0);
  const [menu, setMenu] = useState<{ spot: Spot; x: number; y: number } | null>(
    null,
  );
  const [holding, setHolding] = useState<string | null>(null);
  const [panel, setPanel] = useState<{
    kind: NonNullable<Spot["panel"]>;
    npc?: string;
  } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [child, setChild] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [childSaid, setChildSaid] = useState<string | null>(null);
  const [lamp, setLamp] = useState({ x: 50, y: 50 });
  const [teaLeft, setTeaLeft] = useState(0);
  const screen = useRef<HTMLDivElement>(null);
  const guideMood =
    room.id === "leader"
      ? "terror"
      : room.id === "estudio"
        ? "sideeye"
        : "curious";
  const guide = useMemo(
    () => vortexSvg(guideMood, `bg${uid}`, "none"),
    [guideMood, uid],
  );
  const art = useMemo(() => room.art(), [room]);

  const say = useCallback((t: string) => {
    setLine(t);
    setTyped(0);
  }, []);
  useEffect(() => {
    if (typed >= line.length) return;
    const t = setTimeout(() => setTyped((n) => n + 2), 18);
    return () => clearTimeout(t);
  }, [typed, line]);

  /* I-26 · teammates down here at the same time: silhouettes, and waves */
  const [visitors, setVisitors] = useState<{ id: number; name: string }[]>([]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: say is a stable setter wrapper
  useEffect(() => {
    let alive = true;
    const poll = () =>
      apiFetch<{ visitors: { id: number; name: string }[]; waves: string[] }>(
        `/api/mascot/below/presence?room=${room.id}`,
      )
        .then((r) => {
          if (!alive) return;
          setVisitors(r.visitors.slice(0, 4));
          for (const w of r.waves)
            say(`${w} waved at you from somewhere down here.`);
        })
        .catch(() => {});
    void poll();
    const iv = setInterval(poll, 15_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [room.id]);

  /* entering: tell the server, roll the blackout / the child, start the hum */
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per room; router is stable
  useEffect(() => {
    say(room.enter);
    setMenu(null);
    setPanel(null);
    playHum(room.hum);
    report("lore");
    apiFetch<{
      events: string[];
      child?: string | null;
      world: World;
      closed?: boolean;
    }>("/api/mascot/below/visit", {
      method: "POST",
      body: JSON.stringify({ room: room.id }),
    })
      .then((r) => {
        setWorld(r.world);
        if (r.closed) {
          // I-28 · that room isn't there today
          say("that door's gone. it was a door yesterday. or tomorrow.");
          setTimeout(() => router.push("/below/porao"), 1600);
          return;
        }
        if (r.events.includes("blackout"))
          say(
            "the lights went out. stay close. i'll be your light. move me with your cursor.",
          );
        if (r.child)
          setTimeout(
            () => {
              // I-21 · one frame, somewhere in the room
              setChild({
                text: r.child as string,
                x: 15 + Math.random() * 70,
                y: 25 + Math.random() * 45,
              });
              setTimeout(() => setChild(null), 1200);
            },
            1500 + Math.random() * 4000,
          );
      })
      .catch(() =>
        say("the tape won't play down here. (you need to be logged in.)"),
      );
    return () => stopHum();
  }, [room, say]);

  /* the tea burns: a countdown while you carry it */
  useEffect(() => {
    if (!world?.carrying_tea) {
      setTeaLeft(0);
      return;
    }
    setTeaLeft(25);
    const iv = setInterval(() => setTeaLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(iv);
  }, [world?.carrying_tea]);

  const go = (to: string) => {
    if (!ROOMS[to]) return;
    setLeaving(true);
    vxSound("whisper");
    setTimeout(() => router.push(`/below/${to}`), 380);
  };

  const act = async (spot: Spot, verb: Verb) => {
    setMenu(null);
    const target = spot.act ?? { spot: spot.id, verb };
    const item = target.verb === "use" ? holding : null;
    try {
      const r = await apiFetch<{
        say: string;
        give?: string;
        granted?: string[];
        open?: string;
        world: World;
      }>("/api/mascot/below/act", {
        method: "POST",
        body: JSON.stringify({
          room: room.id,
          spot: target.spot,
          verb: target.verb,
          item,
        }),
      });
      setWorld(r.world);
      say(r.say);
      if (r.give) vxSound("click");
      if (item) setHolding(null);
      if (r.granted?.length) {
        vxSound("rewind");
        void fetchFragments().then((f) =>
          announceNew(r.granted ?? [], f.owned),
        );
      }
      if (r.open === "armario") setTimeout(() => go("armario"), 1400);
      else if (r.open === "shortwave") setPanel({ kind: "shortwave" });
      else if (r.open === "gate") setPanel({ kind: "gate" });
    } catch {
      say(spot.vx ?? "nothing happens. the tape hisses.");
    }
  };

  const openShop = (shop: NonNullable<Spot["shop"]>) =>
    window.dispatchEvent(new CustomEvent("vortex:case", { detail: { shop } }));

  const click = (spot: Spot, e: React.MouseEvent) => {
    if (spot.go) return go(spot.go);
    if (spot.shop && spot.verbs.length === 0) {
      if (spot.vx) say(spot.vx);
      return openShop(spot.shop);
    }
    const rect = screen.current?.getBoundingClientRect();
    const x = rect ? ((e.clientX - rect.left) / rect.width) * 100 : 50;
    const y = rect ? ((e.clientY - rect.top) / rect.height) * 100 : 50;
    if (holding) return void act(spot, "use");
    const verbs = spot.verbs;
    if (spot.panel && verbs.length <= 1) {
      setPanel({ kind: spot.panel, npc: spot.npc });
      if (
        verbs[0] &&
        verbs[0] !== "talk" &&
        spot.panel !== "graves" &&
        spot.panel !== "purify" &&
        spot.panel !== "tv"
      )
        void act(spot, verbs[0]);
      else if (spot.vx) say(spot.vx);
      return;
    }
    if (verbs.length === 1) return void act(spot, verbs[0]);
    setMenu({ spot, x, y });
  };

  const dark = room.dark || !!world?.blackout;
  const lit = (s: Spot) =>
    !s.dark ||
    (dark &&
      Math.hypot(lamp.x - (s.x + s.w / 2), lamp.y - (s.y + s.h / 2)) < 18);

  return (
    <main
      className={`vxb${leaving ? " is-leaving" : ""}${room.id === "leader" ? " is-leader" : ""}`}
    >
      <div className="vxb-tv">
        <div
          className={`vxb-screen${dark ? " is-dark" : ""}${world?.weather && world.weather !== "clear" ? ` is-${world.weather}` : ""}`}
          ref={screen}
          style={
            { "--lx": `${lamp.x}%`, "--ly": `${lamp.y}%` } as CSSProperties
          }
          onPointerMove={(e) => {
            if (!dark) return;
            const r = e.currentTarget.getBoundingClientRect();
            setLamp({
              x: ((e.clientX - r.left) / r.width) * 100,
              y: ((e.clientY - r.top) / r.height) * 100,
            });
          }}
        >
          <SvgArt svg={art} className="vxb-art" />
          {room.spots
            .filter(
              (s) =>
                (!s.onlyIf || (world?.temporary ?? []).includes(s.onlyIf)) &&
                (s.hour === undefined || new Date().getHours() === s.hour),
            )
            .filter(lit)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                className={`vxb-spot${s.go ? " is-exit" : ""}${s.onlyIf ? " is-temp" : ""}${s.dark ? " is-hidden-thing" : ""}${holding && !s.go ? " is-target" : ""}`}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: `${s.w}%`,
                  height: `${s.h}%`,
                }}
                onClick={(e) => click(s, e)}
                onPointerEnter={() => s.vx && say(s.vx)}
                aria-label={s.label}
                title={s.label}
              >
                <span className="lbl">
                  {holding && !s.go
                    ? `use ${holding.replace(/-/g, " ")} on ${s.label}`
                    : s.label}
                </span>
              </button>
            ))}
          {menu && (
            <div
              className="vxb-verbs"
              style={{ left: `${menu.x}%`, top: `${menu.y}%` }}
            >
              <b>{menu.spot.label}</b>
              {menu.spot.verbs.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    if (
                      menu.spot.panel &&
                      (v === "talk" || v === "look" || v === "collect")
                    ) {
                      setPanel({ kind: menu.spot.panel, npc: menu.spot.npc });
                      setMenu(null);
                      if (v !== "talk") void act(menu.spot, v);
                      return;
                    }
                    void act(menu.spot, v);
                  }}
                >
                  {VERB_LABEL[v]}
                </button>
              ))}
              {menu.spot.lab && (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    window.dispatchEvent(new CustomEvent("vortex:lab"));
                  }}
                >
                  tinker
                </button>
              )}
              {menu.spot.shop && (
                <button
                  type="button"
                  onClick={() => {
                    const sh = menu.spot.shop;
                    setMenu(null);
                    if (sh) openShop(sh);
                  }}
                >
                  browse
                </button>
              )}
              <button type="button" className="x" onClick={() => setMenu(null)}>
                ×
              </button>
            </div>
          )}
          {child && (
            <button
              type="button"
              className="vxb-child"
              style={{ left: `${child.x}%`, top: `${child.y}%` }}
              onClick={() => {
                setChildSaid(child.text);
                setChild(null);
                vxSound("whisper");
              }}
              aria-label="a child made of static"
            />
          )}
          <div className="vxb-scan" aria-hidden />
          {visitors.map((v, i) => (
            <div
              key={v.id}
              className="vxb-visitor"
              style={{ right: `${6 + i * 11}%` }}
            >
              <SvgArt
                svg={vortexSvg("curious", `vis${v.id}`, "none")}
                className="vv"
              />
              <span>{v.name}</span>
              <button
                type="button"
                onClick={() => {
                  void apiFetch("/api/mascot/below/wave", {
                    method: "POST",
                    body: JSON.stringify({ to: v.id, room: room.id }),
                  }).catch(() => {});
                  say(
                    `you wave at ${v.name}. their vortex pretends not to see. it saw.`,
                  );
                }}
              >
                wave
              </button>
            </div>
          ))}
          <div
            className={`vxb-guide${room.id === "velorio" ? " is-ghost" : ""}`}
          >
            <SvgArt svg={guide} className="face" />
          </div>
          {teaLeft > 0 && (
            <div className="vxb-tea" role="timer">
              ☕ the tea is cooling · {teaLeft}s · get it to the studio
            </div>
          )}
        </div>
        <div className="vxb-vfd" aria-live="polite">
          <span className="room">{room.name}</span>
          <span className="txt">{line.slice(0, typed)}</span>
        </div>
        <div className="vxb-controls">
          <section className="vxb-bag" aria-label="your bag of tapes">
            <button
              type="button"
              className="case"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("vortex:case", { detail: {} }),
                )
              }
              title="open his case"
            >
              ▤ case
            </button>
            {(world?.inventory ?? []).length === 0 && (
              <span className="empty">your bag is empty</span>
            )}
            {(world?.inventory ?? []).map((it, i) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: items repeat
                key={`${it}${i}`}
                type="button"
                className={holding === it ? "is-on" : ""}
                title={world?.items[it]}
                onClick={() => {
                  setHolding((h) => (h === it ? null : it));
                  say(world?.items[it] ?? it);
                }}
              >
                {it.replace(/-/g, " ")}
              </button>
            ))}
          </section>
          <div className="vxb-keys">
            <Link href="/gazette" className="vxb-paper">
              gazette
            </Link>
            <button type="button" onClick={() => setMapOpen((v) => !v)}>
              map
            </button>
            <button type="button" onClick={() => setPanel({ kind: "library" })}>
              quests
            </button>
            <Link href="/dashboard" className="eject" onClick={() => stopHum()}>
              ⏏ back to the tape
            </Link>
          </div>
        </div>
      </div>

      {mapOpen && (
        <div className="vxb-map" role="dialog" aria-label="map of below">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {MAP.flatMap((n) =>
              n.links.map((l) => {
                const m = MAP.find((x) => x.id === l);
                return m ? (
                  <line
                    key={`${n.id}-${l}`}
                    x1={n.x}
                    y1={n.y}
                    x2={m.x}
                    y2={m.y}
                  />
                ) : null;
              }),
            )}
          </svg>
          {MAP.map((n) => {
            const seen = world?.visited.includes(n.id) || n.id === room.id;
            return (
              <button
                key={n.id}
                type="button"
                className={`node${n.id === room.id ? " is-here" : ""}${seen ? "" : " is-dark"}`}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                onClick={() => seen && go(n.id)}
              >
                {seen ? ROOMS[n.id]?.name : "???"}
              </button>
            );
          })}
          <span className="sidec" title="this shouldn't be on the circuit">
            side c
          </span>
          <button
            type="button"
            className="close"
            onClick={() => setMapOpen(false)}
          >
            close the map
          </button>
        </div>
      )}

      {childSaid && (
        <div className="vxb-childsaid" role="dialog">
          <p>a child made of static. no face. it said, very quietly:</p>
          <b>{childSaid}</b>
          <p className="hint">
            it only speaks backwards. say it to him the right way round.
          </p>
          <button type="button" onClick={() => setChildSaid(null)}>
            ok
          </button>
        </div>
      )}

      {panel && world && (
        <BelowPanel
          kind={panel.kind}
          npc={panel.npc}
          world={world}
          onWorld={setWorld}
          onSay={say}
          onClose={() => setPanel(null)}
          room={room.id}
        />
      )}
    </main>
  );
}
