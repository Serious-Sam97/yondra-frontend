// Client-side port of app/Services/CardImport/ImportModelMapper.php, used to preview
// a model's output live in the patchbay editor (YON-122) without a round-trip. Kept
// deliberately small and defensive; the server remains the source of truth.

import type {
  ImportFieldRule,
  ImportModelInterface,
  ImportTransform,
} from "@/interfaces/ImportModelInterface";

export interface PreviewCard {
  name?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  story_points?: unknown;
  value?: unknown;
  tags?: string[];
  column?: string;
  contact?: { name?: unknown; email?: unknown; phone?: unknown };
}

type ModelShape = Pick<ImportModelInterface, "mode" | "item_path" | "fields">;

const CONTACT_KEY: Record<string, "name" | "email" | "phone"> = {
  contact_name: "name",
  contact_email: "email",
  contact_phone: "phone",
};

// Walk a dot-path (a.b.c or items.0.x) through nested objects/arrays.
function dotGet(data: unknown, path: string): unknown {
  let node: unknown = data;
  for (const seg of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    if (Array.isArray(node)) {
      const i = Number(seg);
      if (!Number.isInteger(i) || i < 0 || i >= node.length) return undefined;
      node = node[i];
    } else if (seg in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return node;
}

function applyTransform(raw: unknown, t?: ImportTransform | null): unknown {
  switch (t?.type ?? "none") {
    case "const":
      return t?.type === "const" ? t.value : undefined;
    case "split": {
      const delim = t?.type === "split" && t.delimiter ? t.delimiter : ",";
      if (Array.isArray(raw)) return raw;
      if (typeof raw !== "string") return [];
      const out: string[] = [];
      for (const part of raw.split(delim)) {
        const s = part.trim();
        if (s && !out.includes(s)) out.push(s);
      }
      return out;
    }
    case "scale": {
      const map = (t?.type === "scale" ? t.map : undefined) ?? {};
      if (raw == null || typeof raw === "object") return undefined;
      return map[String(raw).trim()] ?? undefined;
    }
    case "date": {
      if (typeof raw !== "string" || raw.trim() === "") return undefined;
      const d = new Date(raw);
      return Number.isNaN(d.getTime())
        ? undefined
        : d.toISOString().slice(0, 10);
    }
    case "number": {
      if (typeof raw === "number") return raw;
      if (
        typeof raw === "string" &&
        raw.trim() !== "" &&
        !Number.isNaN(Number(raw))
      )
        return Number(raw);
      return undefined;
    }
    default:
      return raw;
  }
}

function locateItems(model: ModelShape, json: unknown): unknown[] {
  const path = model.item_path;
  const node = !path ? json : dotGet(json, path);
  if (node == null) return [];
  if (model.mode === "one") {
    return typeof node === "object" && !Array.isArray(node) ? [node] : [];
  }
  if (Array.isArray(node)) return node;
  if (typeof node === "object") return [node];
  return [];
}

function buildCard(item: unknown, rules: ImportFieldRule[]): PreviewCard {
  const card: Record<string, unknown> = {};
  if (item == null || typeof item !== "object") return card;

  for (const rule of rules) {
    if (!rule.target) continue;
    const raw = rule.source ? dotGet(item, rule.source) : undefined;
    const val = applyTransform(raw, rule.transform);
    const isConst = rule.transform?.type === "const";
    if (val === undefined && !isConst) continue;

    const contact = CONTACT_KEY[rule.target];
    if (contact) {
      if (!card.contact || typeof card.contact !== "object") card.contact = {};
      (card.contact as Record<string, unknown>)[contact] = val;
    } else {
      card[rule.target] = val;
    }
  }
  return card;
}

/** The card the model produces from the first located item, or null if none. */
export function previewFirstCard(
  model: ModelShape,
  json: unknown,
): PreviewCard | null {
  const items = locateItems(model, json);
  return items.length ? buildCard(items[0], model.fields) : null;
}

/** How many cards the model would produce from the sample (for the "N cards" hint). */
export function previewCount(model: ModelShape, json: unknown): number {
  return locateItems(model, json).length;
}

/** Flat dot-path keys of the first located item — the patchbay's left-rack jacks. */
export function sampleKeys(model: ModelShape, json: unknown): string[] {
  const item = locateItems(model, json)[0];
  if (!item || typeof item !== "object" || Array.isArray(item)) return [];
  return flatKeys(item as Record<string, unknown>);
}

function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    // Descend into plain objects; arrays and scalars are leaf jacks.
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatKeys(v as Record<string, unknown>, key));
    } else {
      out.push(key);
    }
  }
  return out;
}
