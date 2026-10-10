"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  buy,
  type Case,
  CURRENCY_ICON,
  type Currency,
  craft,
  equip,
  type Item,
  learn,
  loadCase,
  offer,
  type Slot,
  stock,
  useCase,
} from "./econ";
import "./econ.css";
import { tr, useVxLang } from "@/vortex/core/i18n";

// N-01 · THE CASE: a studio tape-transport case with foam cut-outs, one niche
// per thing he owns. Tabs: the case itself, the wardrobe (equip mods and
// costumes), the workbench (N-12), the collections (N-11), his level and the
// circuit-board skill tree (N-08/N-09), trades with the team (N-14). The shops
// (counter, splicer, archivist, the dead-hour stall) open in the same case.
// Anyone can open it with: window.dispatchEvent(new CustomEvent("vortex:case", { detail: { tab?, shop? } }))

type Tab = "case" | "wardrobe" | "bench" | "sets" | "level" | "trades";
type Shop = "counter" | "splicer" | "archivist" | "black";
const SHOP_NAME: Record<Shop, string> = {
  counter: "the token counter",
  splicer: "the splicer's mods",
  archivist: "the archivist's rare shelf",
  black: "a hooded stall",
};
const SLOTS: Slot[] = ["costume", "eye", "border", "voice", "trail"];

function Price({ p }: { p: [Currency, number] | null }) {
  if (!p) return null;
  return (
    <span className={`vxi-price c-${p[0]}`}>
      {CURRENCY_ICON[p[0]]} {p[1]}
    </span>
  );
}

function Balance({ b }: { b: Case["balance"] | undefined }) {
  return (
    <div className="vxi-balance">
      {(["tokens", "minutes", "echoes"] as Currency[]).map((c) => (
        <span key={c} className={`c-${c}`} title={c}>
          {CURRENCY_ICON[c]} {b?.[c] ?? 0}
        </span>
      ))}
    </div>
  );
}

export default function TapeCase() {
  useVxLang(); // T-13 · re-render on language change
  const data = useCase();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("case");
  const [shop, setShop] = useState<Shop | null>(null);
  const [shelf, setShelf] = useState<Item[] | null>(null);
  const [sel, setSel] = useState<Item | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const say = (m: string | null | undefined) => setMsg(m ?? null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ tab?: Tab; shop?: Shop }>).detail ?? {};
      setOpen(true);
      setTab(d.tab ?? "case");
      setShop(d.shop ?? null);
      setSel(null);
      setMsg(null);
      void loadCase();
    };
    window.addEventListener("vortex:case", onOpen);
    return () => window.removeEventListener("vortex:case", onOpen);
  }, []);

  const refreshShelf = useCallback(async () => {
    if (!shop) return;
    try {
      const r = await stock(shop);
      setShelf(r.stock);
    } catch {
      setShelf([]);
    }
  }, [shop]);
  useEffect(() => {
    setShelf(null);
    void refreshShelf();
  }, [refreshShelf]);

  if (!open) return null;

  return (
    <div className="vxi" role="dialog" aria-label={tr("his case")}>
      <div className="vxi-case">
        <header>
          <b>{tr(shop ? SHOP_NAME[shop] : "the case")}</b>
          <Balance b={data?.balance} />
          <button
            type="button"
            className="x"
            title={tr("the tape-to-tape deck: other dimensions")}
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent("vortex:deck"));
            }}
          >
            ◎
          </button>
          <button
            type="button"
            className="x"
            onClick={() => setOpen(false)}
            aria-label={tr("Close")}
          >
            ⏏
          </button>
        </header>

        {shop ? (
          <div className="vxi-shop">
            {shop === "black" && (
              <p className="warn">
                {tr(
                  "everything here rots him a little. that's the price on top of the price.",
                )}
              </p>
            )}
            {shelf === null ? (
              <p className="empty">{tr("the shutter is going up…")}</p>
            ) : shelf.length === 0 ? (
              <p className="empty">
                {shop === "black"
                  ? "the stall is closed. it only opens at the dead hour."
                  : "nothing on the shelf."}
              </p>
            ) : (
              <div className="foam">
                {shelf.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`niche r-${i.rarity}`}
                    onClick={() => setSel(i)}
                  >
                    <span className="nm">{i.name}</span>
                    <Price p={i.price} />
                  </button>
                ))}
              </div>
            )}
            {sel && (
              <div className="detail">
                <b>{sel.name}</b>
                <p>{sel.desc}</p>
                {sel.vx && <p className="vx">“{sel.vx}”</p>}
                <button
                  type="button"
                  onClick={async () => {
                    const r = await buy(shop, sel.id);
                    say(r.ok ? `bought: ${sel.name}.` : r.reason);
                    void refreshShelf();
                  }}
                >
                  {tr("buy")} <Price p={sel.price} />
                </button>
              </div>
            )}
            <button
              type="button"
              className="link"
              onClick={() => setShop(null)}
            >
              {tr("◂ back to the case")}
            </button>
          </div>
        ) : (
          <>
            <nav className="vxi-tabs">
              {(
                [
                  "case",
                  "wardrobe",
                  "bench",
                  "sets",
                  "level",
                  "trades",
                ] as Tab[]
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tab === t ? "is-on" : ""}
                  onClick={() => setTab(t)}
                >
                  {tr(t)}
                </button>
              ))}
            </nav>
            {!data ? (
              <p className="empty">{tr("unlatching…")}</p>
            ) : tab === "case" ? (
              <>
                <div className="foam">
                  {data.inventory.length === 0 && (
                    <p className="empty">
                      {tr(
                        "empty foam. go below. win something. steal something.",
                      )}
                    </p>
                  )}
                  {data.inventory.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className={`niche r-${i.rarity}${sel?.id === i.id ? " is-sel" : ""}`}
                      onClick={() => setSel(i)}
                    >
                      <span className="nm">{i.name}</span>
                      {(i.n ?? 1) > 1 && <em>×{i.n}</em>}
                      <small>{i.cat}</small>
                    </button>
                  ))}
                </div>
                {sel && (
                  <div className="detail">
                    <b>{sel.name}</b>{" "}
                    <small className={`r-${sel.rarity}`}>{sel.rarity}</small>
                    <p>{sel.desc}</p>
                    {sel.vx && <p className="vx">“{sel.vx}”</p>}
                    <div className="acts">
                      {sel.slot && (
                        <button
                          type="button"
                          onClick={async () => {
                            const on = data.equip[sel.slot as Slot] === sel.id;
                            const r = await equip(
                              sel.slot as Slot,
                              on ? null : sel.id,
                            );
                            say(
                              r.ok
                                ? on
                                  ? "taken off."
                                  : "he's wearing it. he hates it. he loves it."
                                : "can't.",
                            );
                          }}
                        >
                          {data.equip[sel.slot] === sel.id
                            ? "take off"
                            : "put it on him"}
                        </button>
                      )}
                      {sel.rarity !== "unique" && (
                        <button
                          type="button"
                          disabled={data.offered_today}
                          onClick={async () => {
                            const r = await offer(sel.id);
                            say(
                              r.ok
                                ? r.back
                                  ? `he took it. he gave you something back: ${r.back.replace(/-/g, " ")}.`
                                  : "he took it. he says nothing. he's pleased."
                                : r.reason,
                            );
                            setSel(null);
                          }}
                        >
                          {data.offered_today
                            ? "offered today"
                            : "leave it at his altar"}
                        </button>
                      )}
                    </div>
                    {sel.cat === "cursed" && (
                      <p className="warn">
                        {tr("cursed. only the ERASE altar below takes it.")}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : tab === "wardrobe" ? (
              <div className="slots">
                {SLOTS.map((s) => {
                  const own = data.inventory.filter((i) => i.slot === s);
                  return (
                    <section key={s}>
                      <h4>{s}</h4>
                      <div className="row">
                        <button
                          type="button"
                          className={!data.equip[s] ? "is-on" : ""}
                          onClick={() => void equip(s, null)}
                        >
                          {tr("none")}
                        </button>
                        {own.map((i) => (
                          <button
                            key={i.id}
                            type="button"
                            className={data.equip[s] === i.id ? "is-on" : ""}
                            onClick={() => void equip(s, i.id)}
                            style={
                              i.color
                                ? ({ "--sw": i.color } as React.CSSProperties)
                                : undefined
                            }
                          >
                            {i.color && <i className="sw" />}
                            {i.name}
                          </button>
                        ))}
                        {own.length === 0 && (
                          <span className="empty">
                            nothing yet —{" "}
                            {s === "costume"
                              ? "the token counter"
                              : "the splicer"}
                            .
                          </span>
                        )}
                      </div>
                    </section>
                  );
                })}
                <div className="shops">
                  <button type="button" onClick={() => setShop("counter")}>
                    {tr("◉ token counter")}
                  </button>
                  <button type="button" onClick={() => setShop("splicer")}>
                    {tr("◎ the splicer")}
                  </button>
                  <button type="button" onClick={() => setShop("archivist")}>
                    {tr("✶ the archivist")}
                  </button>
                  {new Date().getHours() === 3 && (
                    <button
                      type="button"
                      className="black"
                      onClick={() => setShop("black")}
                    >
                      {tr("▓ a hooded stall")}
                    </button>
                  )}
                </div>
              </div>
            ) : tab === "bench" ? (
              <div className="bench">
                {data.recipes.map((r) => (
                  <div key={r.id} className="recipe">
                    <span>
                      {r.in.map((x) => x.replace(/-/g, " ")).join(" + ")}
                      {r.echoes ? ` + ${r.echoes} ✶` : ""}
                    </span>
                    <b>→ {r.out_name}</b>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await craft(r.id);
                        say(res.ok ? `made: ${r.out_name}.` : res.reason);
                      }}
                    >
                      {tr("solder it")}
                    </button>
                  </div>
                ))}
              </div>
            ) : tab === "sets" ? (
              <div className="sets">
                {data.collections.map((c) => (
                  <div
                    key={c.id}
                    className={`set${c.complete ? " is-done" : ""}`}
                  >
                    <b>{c.name}</b>
                    <div className="bar">
                      <i style={{ width: `${(c.have / c.size) * 100}%` }} />
                    </div>
                    <span>
                      {c.have}/{c.size}
                      {c.complete ? " · complete" : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : tab === "level" ? (
              <Level data={data} say={say} />
            ) : (
              <Trades data={data} say={say} />
            )}
          </>
        )}
        {msg && <p className="vxi-msg">{msg}</p>}
      </div>
    </div>
  );
}

/** N-08/N-09 · the level VFD and the circuit board of skills. */
function Level({
  data,
  say,
}: {
  data: Case;
  say: (m: string | null | undefined) => void;
}) {
  const lv = data.level;
  const has = (b: string, n: number) => lv.skills.includes(`${b}:${n}`);
  return (
    <div className="level">
      <div className="vfd">
        <b>LV {String(lv.level).padStart(2, "0")}</b>
        <span>
          {lv.xp} xp · next at {lv.next}
        </span>
        <span className="pts">
          {lv.points} point{lv.points === 1 ? "" : "s"} to solder
        </span>
      </div>
      <div className="board">
        {(["genius", "chaos", "soul"] as const).map((b) => (
          <div key={b} className={`trace t-${b}`}>
            <h4>{b}</h4>
            {data.skills_tree[b].map((name, i) => (
              <div
                key={name}
                className={`comp${has(b, i + 1) ? " is-on" : ""}`}
              >
                <i />
                <span>{name}</span>
              </div>
            ))}
            <button
              type="button"
              disabled={lv.points < 1}
              onClick={async () => {
                const r = await learn(b);
                say(r.ok ? `soldered: ${r.skill}.` : r.reason);
              }}
            >
              {tr("solder next")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** N-14 · offers to and from the team. */
function Trades({
  data,
  say,
}: {
  data: Case;
  say: (m: string | null | undefined) => void;
}) {
  const [list, setList] = useState<
    {
      id: number;
      incoming: boolean;
      with: string;
      give: string | null;
      give_tokens: number;
      want: string | null;
      want_tokens: number;
    }[]
  >([]);
  const [team, setTeam] = useState<{ id: number; name: string }[]>([]);
  const [to, setTo] = useState<number | null>(null);
  const [give, setGive] = useState("");
  const [tokens, setTokens] = useState(0);
  const load = useCallback(() => {
    apiFetch<{ trades: typeof list }>("/api/mascot/trades")
      .then((r) => setList(r.trades))
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
    apiFetch<{ team: { id: number; name: string }[] }>("/api/mascot/radio/team")
      .then((r) => {
        setTeam(r.team);
        setTo(r.team[0]?.id ?? null);
      })
      .catch(() => {});
  }, [load]);
  const tradeable = data.inventory.filter((i) => i.rarity !== "unique");
  return (
    <div className="trades">
      {list.map((t) => (
        <div key={t.id} className="offer">
          <span>
            {t.incoming ? `${t.with} offers` : `you offered ${t.with}`}:{" "}
            {t.give ?? ""}
            {t.give_tokens ? ` + ◉${t.give_tokens}` : ""} for{" "}
            {t.want ?? "nothing"}
            {t.want_tokens ? ` + ◉${t.want_tokens}` : ""}
          </span>
          {t.incoming && (
            <>
              <button
                type="button"
                onClick={async () => {
                  const r = await apiFetch<{ ok: boolean }>(
                    "/api/mascot/trades/respond",
                    {
                      method: "POST",
                      body: JSON.stringify({ id: t.id, accept: true }),
                    },
                  ).catch(() => ({ ok: false }));
                  say(r.ok ? "done. shake on it." : "it fell through.");
                  load();
                  void loadCase();
                }}
              >
                {tr("accept")}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await apiFetch("/api/mascot/trades/respond", {
                    method: "POST",
                    body: JSON.stringify({ id: t.id, accept: false }),
                  }).catch(() => {});
                  load();
                }}
              >
                {tr("decline")}
              </button>
            </>
          )}
        </div>
      ))}
      {team.length === 0 ? (
        <p className="empty">
          {tr("nobody to trade with. share a board with someone.")}
        </p>
      ) : (
        <form
          className="new"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!to) return;
            try {
              await apiFetch("/api/mascot/trades", {
                method: "POST",
                body: JSON.stringify({
                  to,
                  give: give || null,
                  give_tokens: tokens,
                }),
              });
              say("offer sent.");
              load();
            } catch (err) {
              try {
                say(JSON.parse((err as { body: string }).body).reason);
              } catch {
                say("no.");
              }
            }
          }}
        >
          <select
            value={to ?? ""}
            onChange={(e) => setTo(Number(e.target.value))}
            aria-label={tr("to")}
          >
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            value={give}
            onChange={(e) => setGive(e.target.value)}
            aria-label={tr("give")}
          >
            <option value="">{tr("(no item)")}</option>
            {tradeable.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={500}
            value={tokens}
            onChange={(e) => setTokens(Number(e.target.value))}
            aria-label={tr("tokens")}
          />
          <button type="submit">{tr("offer")}</button>
        </form>
      )}
    </div>
  );
}
