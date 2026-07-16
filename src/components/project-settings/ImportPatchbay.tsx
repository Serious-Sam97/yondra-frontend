"use client";

import { useState } from "react";
import type {
  ImportFieldRule,
  ImportFieldTarget,
  ImportTransform,
} from "@/interfaces/ImportModelInterface";

// Card fields shown on the right rack, in display order. name is required; the
// rest are optional. Contact fields nest server-side into one contact.
const TARGETS: { key: ImportFieldTarget; label: string }[] = [
  { key: "name", label: "name" },
  { key: "description", label: "description" },
  { key: "priority", label: "priority" },
  { key: "due_date", label: "due_date" },
  { key: "story_points", label: "story_points" },
  { key: "value", label: "value" },
  { key: "tags", label: "tags" },
  { key: "column", label: "column" },
  { key: "contact_name", label: "contact.name" },
  { key: "contact_email", label: "contact.email" },
  { key: "contact_phone", label: "contact.phone" },
];

const TRANSFORM_TYPES: { key: ImportTransform["type"]; label: string }[] = [
  { key: "none", label: "Direct" },
  { key: "const", label: "Constant" },
  { key: "split", label: "Split → tags" },
  { key: "scale", label: "Map values" },
  { key: "date", label: "Date → Y-m-d" },
  { key: "number", label: "Number" },
];

const P = "var(--cf-phosphor)";
const AMBER = "var(--cf-amber)";
const DIM = "var(--cf-text-dim)";

interface Props {
  sourceKeys: string[];
  fields: ImportFieldRule[];
  onChange: (fields: ImportFieldRule[]) => void;
}

// The patch-cable mapping editor (YON-122). Left rack = the sample's source keys,
// right rack = card fields; a cable is one field rule. Click a source jack to arm
// it, then a field jack to wire them; click a field jack with nothing armed to edit
// its transform (or give it a constant with no source).
export default function ImportPatchbay({
  sourceKeys,
  fields,
  onChange,
}: Props) {
  const [armed, setArmed] = useState<string | null>(null);
  const [selected, setSelected] = useState<ImportFieldTarget | null>(null);

  const ruleFor = (t: ImportFieldTarget) => fields.find((f) => f.target === t);

  function upsert(target: ImportFieldTarget, patch: Partial<ImportFieldRule>) {
    const next = [...fields];
    const i = next.findIndex((f) => f.target === target);
    if (i >= 0) next[i] = { ...next[i], ...patch };
    else next.push({ target, source: null, ...patch });
    onChange(next);
  }

  function removeRule(target: ImportFieldTarget) {
    onChange(fields.filter((f) => f.target !== target));
    if (selected === target) setSelected(null);
  }

  function clickSource(key: string) {
    setArmed((a) => (a === key ? null : key));
    setSelected(null);
  }

  function clickTarget(target: ImportFieldTarget) {
    if (armed) {
      upsert(target, { source: armed });
      setArmed(null);
      setSelected(target);
    } else {
      // Toggle the transform editor for this field (wiring a const needs no source).
      setSelected((s) => (s === target ? null : target));
    }
  }

  // ── geometry ───────────────────────────────────────────────────────────────
  const padTop = 26;
  const rowH = 32;
  const leftX = 250;
  const rightX = 400;
  const rows = Math.max(sourceKeys.length, TARGETS.length);
  const height = padTop + rows * rowH + 14;
  const width = 650;
  const ySrc = (i: number) => padTop + i * rowH;
  const yTgt = (i: number) => padTop + i * rowH;

  const cable = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
  ) => {
    const sag = 26;
    const d = `M ${x1} ${y1} C ${x1 + 70} ${y1 + sag}, ${x2 - 70} ${y2 + sag}, ${x2} ${y2}`;
    return (
      <>
        <path
          d={d}
          fill="none"
          stroke="#0c0f0a"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.95}
        />
      </>
    );
  };

  const srcIndex = (key: string) => sourceKeys.indexOf(key);

  const selectedRule = selected ? ruleFor(selected) : undefined;

  return (
    <div className="flex flex-col gap-3">
      {sourceKeys.length === 0 && (
        <p className="cf-mono text-[10px]" style={{ color: DIM }}>
          Paste a sample above to load its keys onto the left rack.
        </p>
      )}

      <div
        className="rounded-lg overflow-x-auto"
        style={{
          background: "linear-gradient(180deg,#1b1a16,#141310)",
          border: "1px solid #35332c",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,.5)",
        }}
      >
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative wiring; the jacks below carry accessible labels */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            minWidth: 560,
            height: "auto",
            display: "block",
          }}
        >
          {/* rack backing */}
          <rect
            x={10}
            y={10}
            width={252}
            height={height - 20}
            rx={7}
            fill="#201f1a"
            stroke="#34322c"
          />
          <rect
            x={388}
            y={10}
            width={252}
            height={height - 20}
            rx={7}
            fill="#201f1a"
            stroke="#34322c"
          />

          {/* cables */}
          {fields.map((f) => {
            const ti = TARGETS.findIndex((t) => t.key === f.target);
            if (ti < 0) return null;
            const hasTransform = f.transform && f.transform.type !== "none";
            const color = hasTransform ? AMBER : P;
            const si = f.source ? srcIndex(f.source) : -1;
            const y2 = yTgt(ti);
            if (si < 0) {
              // Const / sourceless: a short stub from the left edge of the field jack.
              return (
                <g key={f.target}>
                  {cable(rightX - 40, y2, rightX, y2, color)}
                </g>
              );
            }
            return (
              <g key={f.target}>{cable(leftX, ySrc(si), rightX, y2, color)}</g>
            );
          })}

          {/* source jacks + labels */}
          {sourceKeys.map((key, i) => {
            const y = ySrc(i);
            const isArmed = armed === key;
            const wired = fields.some((f) => f.source === key);
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG <g> can't be a native <button>; role+keydown make the jack accessible
              <g
                key={key}
                role="button"
                tabIndex={0}
                aria-label={`Source key ${key}${isArmed ? " (armed)" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => clickSource(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    clickSource(key);
                  }
                }}
              >
                {/* transparent full-row hit area so the whole jack is clickable */}
                <rect
                  x={14}
                  y={y - rowH / 2}
                  width={244}
                  height={rowH}
                  fill="transparent"
                />
                <text
                  x={236}
                  y={y + 4}
                  fill="#e8e4d6"
                  fontSize={12}
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {key}
                </text>
                <circle
                  cx={leftX}
                  cy={y}
                  r={isArmed ? 8 : 6.5}
                  fill="#0b0f0a"
                  stroke={isArmed ? AMBER : P}
                  strokeWidth={isArmed ? 2.4 : 1.6}
                />
                {(wired || isArmed) && (
                  <circle
                    cx={leftX}
                    cy={y}
                    r={3.2}
                    fill={isArmed ? AMBER : P}
                  />
                )}
              </g>
            );
          })}

          {/* target jacks + labels */}
          {TARGETS.map((t, i) => {
            const y = yTgt(i);
            const rule = ruleFor(t.key);
            const on = !!rule;
            const isSel = selected === t.key;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG <g> can't be a native <button>; role+keydown make the jack accessible
              <g
                key={t.key}
                role="button"
                tabIndex={0}
                aria-label={`Card field ${t.label}${on ? " (wired)" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => clickTarget(t.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    clickTarget(t.key);
                  }
                }}
              >
                {/* transparent full-row hit area so the whole jack is clickable */}
                <rect
                  x={392}
                  y={y - rowH / 2}
                  width={244}
                  height={rowH}
                  fill="transparent"
                />
                <circle
                  cx={rightX}
                  cy={y}
                  r={isSel ? 8 : 6.5}
                  fill="#0b0f0a"
                  stroke={on ? P : DIM}
                  strokeWidth={isSel ? 2.4 : 1.6}
                />
                {on && <circle cx={rightX} cy={y} r={3.2} fill={P} />}
                <text
                  x={412}
                  y={y + 4}
                  fill={on ? "#e8e4d6" : DIM}
                  fontSize={12}
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  {t.label}
                  {t.key === "name" ? " *" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="cf-mono text-[10px]" style={{ color: DIM }}>
        {armed
          ? `Wiring “${armed}” — click a card field to connect it.`
          : "Click a source key, then a card field, to wire them. Click a field to set a transform or constant."}
      </p>

      {selected && (
        <TransformEditor
          target={selected}
          rule={selectedRule}
          sourceKeys={sourceKeys}
          onPatch={(patch) => upsert(selected, patch)}
          onRemove={() => removeRule(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// The per-field control panel: which source feeds it, and the transform applied.
function TransformEditor({
  target,
  rule,
  sourceKeys,
  onPatch,
  onRemove,
  onClose,
}: {
  target: ImportFieldTarget;
  rule?: ImportFieldRule;
  sourceKeys: string[];
  onPatch: (patch: Partial<ImportFieldRule>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const transform = rule?.transform ?? { type: "none" };

  function setType(type: ImportTransform["type"]) {
    if (type === "none") onPatch({ transform: { type: "none" } });
    else if (type === "const")
      onPatch({ transform: { type: "const", value: "" } });
    else if (type === "split")
      onPatch({ transform: { type: "split", delimiter: "," } });
    else if (type === "scale")
      onPatch({ transform: { type: "scale", map: {} } });
    else onPatch({ transform: { type } });
  }

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2.5"
      style={{
        background: "var(--cf-graphite)",
        border: "1px solid var(--cf-edge)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="cf-mono text-[11px]"
          style={{ color: "var(--cf-phosphor)" }}
        >
          {target.replace("contact_", "contact.")}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto cf-mono text-[10px] uppercase tracking-widest cursor-pointer"
          style={{ color: "var(--cf-red)" }}
        >
          Unwire
        </button>
        <button
          type="button"
          onClick={onClose}
          className="cf-mono text-[11px] cursor-pointer"
          style={{ color: "var(--cf-text-muted)" }}
        >
          ✕
        </button>
      </div>

      {/* source picker */}
      <label className="flex items-center gap-2">
        <span
          className="cf-mono text-[9px] uppercase tracking-widest w-16"
          style={{ color: "var(--cf-text-dim)" }}
        >
          Source
        </span>
        <select
          value={rule?.source ?? ""}
          onChange={(e) => onPatch({ source: e.target.value || null })}
          className="glass-input cf-mono text-[11px] flex-1"
          style={{ padding: "6px 8px" }}
        >
          <option value="">(none / constant)</option>
          {sourceKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>

      {/* transform type */}
      <label className="flex items-center gap-2">
        <span
          className="cf-mono text-[9px] uppercase tracking-widest w-16"
          style={{ color: "var(--cf-text-dim)" }}
        >
          Transform
        </span>
        <select
          value={transform.type}
          onChange={(e) => setType(e.target.value as ImportTransform["type"])}
          className="glass-input cf-mono text-[11px] flex-1"
          style={{ padding: "6px 8px" }}
        >
          {TRANSFORM_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {/* transform params */}
      {transform.type === "const" && (
        <input
          value={transform.value ?? ""}
          onChange={(e) =>
            onPatch({ transform: { type: "const", value: e.target.value } })
          }
          placeholder="Constant value (e.g. Triage)"
          className="glass-input cf-mono text-[11px]"
          style={{ padding: "6px 8px" }}
        />
      )}
      {transform.type === "split" && (
        <input
          value={transform.delimiter ?? ""}
          onChange={(e) =>
            onPatch({ transform: { type: "split", delimiter: e.target.value } })
          }
          placeholder="Delimiter (default ,)"
          className="glass-input cf-mono text-[11px]"
          style={{ padding: "6px 8px", maxWidth: 140 }}
        />
      )}
      {transform.type === "scale" && (
        <ScaleEditor
          map={transform.map ?? {}}
          onChange={(map) => onPatch({ transform: { type: "scale", map } })}
        />
      )}
    </div>
  );
}

// A compact editor for a scale/lookup map: raw value → mapped value rows.
function ScaleEditor({
  map,
  onChange,
}: {
  map: Record<string, string>;
  onChange: (map: Record<string, string>) => void;
}) {
  const entries = Object.entries(map ?? {});

  function setEntry(oldKey: string, key: string, value: string) {
    const next: Record<string, string> = {};
    for (const [k, v] of entries)
      next[k === oldKey ? key : k] = k === oldKey ? value : v;
    onChange(next);
  }
  function add() {
    onChange({ ...map, "": "" });
  }
  function remove(key: string) {
    const next = { ...map };
    delete next[key];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(([k, v], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: map keys can be blank/duplicate mid-edit; row index is the only stable handle
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={k}
            onChange={(e) => setEntry(k, e.target.value, v)}
            placeholder="from"
            className="glass-input cf-mono text-[11px]"
            style={{ padding: "5px 7px", width: 90 }}
          />
          <span style={{ color: "var(--cf-text-dim)" }}>→</span>
          <input
            value={v}
            onChange={(e) => setEntry(k, k, e.target.value)}
            placeholder="to"
            className="glass-input cf-mono text-[11px]"
            style={{ padding: "5px 7px", width: 110 }}
          />
          <button
            type="button"
            onClick={() => remove(k)}
            className="cf-mono text-[11px] cursor-pointer"
            style={{ color: "var(--cf-red)" }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="cf-mono text-[10px] uppercase tracking-widest self-start cursor-pointer"
        style={{ color: "var(--cf-phosphor)" }}
      >
        + Add mapping
      </button>
    </div>
  );
}
