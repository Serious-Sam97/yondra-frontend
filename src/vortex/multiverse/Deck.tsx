"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DIMS, home, jump, RARE_COMBOS, resume } from "./dimensions";

// J-01 · THE TAPE-TO-TAPE DECK he built for jumping: the left well is where
// you are, the right one is where you're going. Pick a tape from the rack,
// press DUB. SHUFFLE drops you somewhere random for 5 minutes (1 in 50: a rare
// dimension that isn't on the list; with five found, 1 in 100: Dimension Zero).
// Also here: the way home, the visitors from other tapes (J-15), the Council
// (J-16), the leaks of instability (J-18). Open with "vortex:deck".

interface View {
  dimensions: { id: string; name: string; found: boolean; hint: string }[];
  unstable: boolean;
  zero: boolean;
}
const say = (text: string) =>
  window.dispatchEvent(new CustomEvent("vortex:say", { detail: { text } }));

export default function Deck() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<View | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [here, setHere] = useState<{ dims: string[]; until: number } | null>(
    null,
  );
  const [now, setNow] = useState(Date.now());
  const [zero, setZero] = useState(false);
  const [visitor, setVisitor] = useState<{
    id: string;
    x: number;
    y: number;
    line: string;
  } | null>(null);
  const [council, setCouncil] = useState<string[] | null>(null);
  const [line, setLine] = useState("");
  const novortexNote = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = () => {
    if (!localStorage.getItem("token")) return;
    apiFetch<View>("/api/mascot/dimensions")
      .then(setV)
      .catch(() => {});
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only wiring; load/back are stable
  useEffect(() => {
    load();
    resume();
    const onOpen = () => {
      setOpen(true);
      load();
    };
    const onDim = (e: Event) => {
      const d = (e as CustomEvent<{ dims: string[]; until: number } | null>)
        .detail;
      setHere(d);
      if (novortexNote.current) clearTimeout(novortexNote.current);
      if (d) {
        const dim = DIMS[d.dims[0]];
        if (d.dims.length > 1)
          say(
            `…this one isn't on the list. ${d.dims.join(" + ")}. how did you get here. how do we get OUT.`,
          );
        else if (dim?.intro) say(dim.intro);
        // J-11 · after five minutes without him, a note
        if (d.dims.includes("novortex"))
          novortexNote.current = setTimeout(() => {
            const n = document.createElement("div");
            n.className = "vxq-hunt-toast";
            n.textContent = "you liked it here, didn't you.";
            document.body.appendChild(n);
            setTimeout(() => {
              n.remove();
              void back();
            }, 4000);
          }, 300_000);
      }
    };
    window.addEventListener("vortex:deck", onOpen);
    window.addEventListener("vortex:dimension", onDim);
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("vortex:deck", onOpen);
      window.removeEventListener("vortex:dimension", onDim);
      clearInterval(iv);
    };
  }, []);

  // J-18 · instability leaks the other tapes into this one
  useEffect(() => {
    document.documentElement.classList.toggle(
      "vxj-leak",
      !!v?.unstable && !here,
    );
  }, [v?.unstable, here]);

  const found = v?.dimensions.filter((d) => d.found).map((d) => d.id) ?? [];

  // J-15 · now and then a him from another tape drops by (once a session, maybe)
  // biome-ignore lint/correctness/useExhaustiveDependencies: one roll per discovered set
  useEffect(() => {
    if (found.length < 1 || here) return;
    if (sessionStorage.getItem("yd:vortex.visitor")) return;
    const t = setTimeout(() => {
      if (Math.random() > 0.15) return;
      sessionStorage.setItem("yd:vortex.visitor", "1");
      const id = found[Math.floor(Math.random() * found.length)];
      const d = DIMS[id];
      if (!d || id === "novortex") return;
      const exchange = [
        d.lines[0],
        `(him) …you again. what do you want.`,
        d.lines[1] ?? "nothing. just looking at the worse version.",
      ];
      let k = 0;
      setVisitor({
        id,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 50,
        line: exchange[0],
      });
      const iv = setInterval(() => {
        k++;
        if (k >= exchange.length) {
          clearInterval(iv);
          setVisitor(null);
          return;
        }
        if (exchange[k].startsWith("(him)")) say(exchange[k].slice(6));
        else setVisitor((vv) => (vv ? { ...vv, line: exchange[k] } : vv));
      }, 3500);
    }, 240_000);
    return () => clearTimeout(t);
  }, [found.join(","), !!here]);

  // J-16 · the Council: with four tapes found, once a week, they judge him
  // biome-ignore lint/correctness/useExhaustiveDependencies: one roll per discovered set
  useEffect(() => {
    if (found.length < 4 || here) return;
    const week = Math.floor(Date.now() / (7 * 86_400_000));
    if (localStorage.getItem("yd:vortex.council") === String(week)) return;
    const t = setTimeout(() => {
      if (Math.random() > 0.2) return;
      localStorage.setItem("yd:vortex.council", String(week));
      const judges = found.filter((f) => f !== "novortex").slice(0, 6);
      const script = [
        "THE COUNCIL OF VORTEXES IS IN SESSION.",
        `${DIMS[judges[0]]?.name ?? "1985"}: the accused ate overdue cards. many. with sauce.`,
        `${DIMS[judges[1]]?.name ?? "noir"}: he called the twin "a screensaver with feelings". in public.`,
        "the accused: i did all of it. i'd do it again. i'm doing it now.",
        "the witness (you) will now say nothing. good.",
        "VERDICT: guilty of being the most annoying of us. sentence: keep going.",
      ];
      setCouncil(judges);
      for (const [i, l] of script.entries())
        setTimeout(() => setLine(l), i * 3200);
      setTimeout(() => setCouncil(null), script.length * 3200 + 2500);
    }, 420_000);
    return () => clearTimeout(t);
  }, [found.join(","), !!here]);

  const back = async () => {
    const r = await home();
    if (r?.contraband)
      say(
        `we're back. something came with us: ${r.contraband.replace("contraband-", "").replace("-", " ")}. it's in the case. don't ask customs.`,
      );
    load();
  };

  const dub = (dims: string[], minutes = 15) => {
    setOpen(false);
    jump(dims, minutes);
  };

  const shuffle = () => {
    if (!found.length) return;
    if (found.length >= 5 && Math.random() < 0.01) {
      setOpen(false);
      setZero(true);
      return;
    }
    if (Math.random() < 0.02) {
      const combo = RARE_COMBOS[Math.floor(Math.random() * RARE_COMBOS.length)];
      dub(combo, 5);
      return;
    }
    dub([found[Math.floor(Math.random() * found.length)]], 5);
  };

  const left = here ? Math.max(0, here.until - now) : 0;

  return (
    <>
      {/* the pixel filter the 8-bit tape needs */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
      >
        <filter id="vxj-pixel" x="0" y="0">
          <feFlood x="2" y="2" height="1" width="1" />
          <feComposite width="4" height="4" />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" radius="2" />
        </filter>
      </svg>

      {here && (
        <button type="button" className="vxj-home" onClick={() => void back()}>
          ◀ back to side a ·{" "}
          {here.dims.map((d) => DIMS[d]?.name ?? d).join(" + ")} ·{" "}
          {Math.floor(left / 60000)}:
          {String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}
        </button>
      )}

      {open && v && (
        <div
          className="vxj-deck"
          role="dialog"
          aria-label="the tape-to-tape deck"
        >
          <div className="unit">
            <div className="wells">
              <div className="well">
                <div
                  className="tape"
                  style={
                    {
                      "--c0": "#2b1d12",
                      "--c1": "#ffb547",
                    } as React.CSSProperties
                  }
                >
                  <b>
                    {here
                      ? here.dims.map((d) => DIMS[d]?.name).join(" + ")
                      : "side a · home"}
                  </b>
                </div>
              </div>
              <button
                type="button"
                className="dub"
                disabled={!pick}
                onClick={() => pick && dub([pick])}
              >
                DUB ▸▸
              </button>
              <div className="well">
                {pick ? (
                  <div
                    className="tape"
                    style={
                      {
                        "--c0": DIMS[pick].cover[0],
                        "--c1": DIMS[pick].cover[1],
                      } as React.CSSProperties
                    }
                  >
                    <b>{DIMS[pick].name}</b>
                  </div>
                ) : (
                  <span>put a tape in.</span>
                )}
              </div>
            </div>
            <div className="rack">
              {v.dimensions.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`${d.found ? "" : "missing"}${pick === d.id ? " is-on" : ""}`}
                  disabled={!d.found}
                  onClick={() => setPick(d.id)}
                  title={d.found ? DIMS[d.id]?.name : `??? — ${d.hint}`}
                >
                  <div
                    className="tape"
                    style={
                      d.found
                        ? ({
                            "--c0": DIMS[d.id].cover[0],
                            "--c1": DIMS[d.id].cover[1],
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {d.found ? <b>{DIMS[d.id].name}</b> : "???"}
                  </div>
                </button>
              ))}
            </div>
            <div className="row">
              <button type="button" onClick={shuffle} disabled={!found.length}>
                ⤨ SHUFFLE (5 min)
              </button>
              {here && (
                <button type="button" onClick={() => void back()}>
                  ◀ home
                </button>
              )}
              <span>
                {found.length}/{v.dimensions.length} tapes found
                {v.unstable ? " · this tape is UNSTABLE — rest a night" : ""}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ marginLeft: "auto" }}
              >
                ⏏ close
              </button>
            </div>
          </div>
        </div>
      )}

      {zero && (
        <div className="vxj-zero" role="dialog" aria-label="dimension zero">
          <label>
            SIDE A? Y/N{" "}
            <input
              // biome-ignore lint/a11y/noAutofocus: the only thing on the screen
              autoFocus
              maxLength={1}
              onKeyDown={async (e) => {
                if (e.key !== "Enter") return;
                const answer = (e.target as HTMLInputElement).value;
                setZero(false);
                try {
                  const r = await apiFetch<{ side: string }>(
                    "/api/mascot/dimensions/zero",
                    { method: "POST", body: JSON.stringify({ answer }) },
                  );
                  if (r.side === "C") {
                    say(
                      "…you said no. you said NO to side a. the threads are open. she's right behind us. go. GO.",
                    );
                    setTimeout(() => router.push("/side-c"), 2500);
                  }
                } catch {}
              }}
            />
          </label>
        </div>
      )}

      {visitor && (
        <div
          className="vxj-visitor"
          style={{ left: `${visitor.x}%`, top: `${visitor.y}%` }}
        >
          <div
            className="tape"
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${DIMS[visitor.id].cover[0]}, ${DIMS[visitor.id].cover[1]})`,
            }}
          />
          <span className="who">vortex · {DIMS[visitor.id].name}</span>
          <span className="say">{visitor.line}</span>
        </div>
      )}

      {council && (
        <div
          className="vxj-council"
          role="dialog"
          aria-label="the council of vortexes"
        >
          <div className="court">
            <div className="bench">
              {council.map((id) => (
                <div key={id} className="judge">
                  <i
                    style={
                      {
                        "--c0": DIMS[id].cover[0],
                        "--c1": DIMS[id].cover[1],
                      } as React.CSSProperties
                    }
                  >
                    ⚖
                  </i>
                  {DIMS[id].name}
                </div>
              ))}
            </div>
            <p className="line">{line}</p>
          </div>
        </div>
      )}
    </>
  );
}
