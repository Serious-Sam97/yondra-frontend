"use client";

import {
  faCircleNodes,
  faDiagramProject,
  faFloppyDisk,
  faGripVertical,
  faLayerGroup,
  faMagnifyingGlass,
  faMinus,
  faPen,
  faPlus,
  faSitemap,
  faWandMagicSparkles,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import type {
  BoardType,
  RoadmapConfig,
  RoadmapEdge,
  SectionData,
} from "@/interfaces/BoardInterface";
import type { CardInterface } from "@/interfaces/CardInterface";
import type { SprintInterface } from "@/interfaces/SprintInterface";
import { formatMoney } from "@/lib/currency";

// Node box + auto-layout spacing (logical px on the canvas). Nodes are large
// and roomy so the map reads as a full workspace, not a strip.
const NODE_W = 264;
const NODE_H = 236;
const GAP_X = 132;
const GAP_Y = 84;
const PAD = 56;
const MINI_MAX = 5; // card rows previewed inside a node

type PosMap = Record<number, { x: number; y: number }>;
type Lens = "flow" | "sprints" | "constellation";
type GroupBy = "column" | "sprint" | "assignee" | "priority";

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.4;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// Card dot radius grows with story points so heavier tickets read as bigger.
const dotSize = (c: { story_points?: number | null }) =>
  18 + Math.min(c.story_points ?? 0, 13) * 1.9;

// Phyllotaxis (sunflower) packing — golden-angle spiral gives a dense, organic
// disc where the biggest dots sit near the centre. Deterministic, no simulation.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PACK_SPACING = 20;
function packOffsets(n: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = PACK_SPACING * Math.sqrt(i + 0.5);
    const a = i * GOLDEN_ANGLE;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return pts;
}

const LENS_KEY = "yondra_roadmap_lens";
const GROUPBY_KEY = "yondra_roadmap_groupby";
function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// A drop target for the drill-in "move" rail — a column or a sprint/backlog.
interface MoveTarget {
  key: string;
  label: string;
  apply: (cardId: number | string) => void;
}

interface RoadmapViewProps {
  sections: SectionData[];
  cards: CardInterface[];
  config?: RoadmapConfig | null;
  canEdit?: boolean;
  onSave: (config: RoadmapConfig) => Promise<void> | void;
  onCardClick?: (card: CardInterface) => void;
  // Move a card to another column (flow drill-in). Absent → read-only.
  onMoveCard?: (cardId: number | string, toSectionId: number) => void;
  // Assign a card to a sprint (or backlog, null) — scrum lens. Absent → read-only.
  onMoveToSprint?: (cardId: number | string, sprintId: number | null) => void;
  boardType?: BoardType;
  sprints?: SprintInterface[];
  currency?: string;
}

function priorityColor(p?: string | null): string {
  if (p === "high") return "var(--cf-red)";
  if (p === "medium") return "var(--cf-amber)";
  return "var(--cf-phosphor)";
}

const cardPoints = (c: CardInterface) => c.story_points ?? 0;
const cardDone = (c: CardInterface) => c.is_done ?? !!c.done_at;

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

// Straight left→right chain: one row, ordered by the sections' board order.
function autoPositions(sections: SectionData[]): PosMap {
  const pos: PosMap = {};
  sections.forEach((s, i) => {
    pos[s.id] = { x: PAD + i * (NODE_W + GAP_X), y: PAD };
  });
  return pos;
}

function autoEdges(sections: SectionData[]): RoadmapEdge[] {
  const edges: RoadmapEdge[] = [];
  for (let i = 0; i < sections.length - 1; i++) {
    edges.push({ from: sections[i].id, to: sections[i + 1].id });
  }
  return edges;
}

// Resolve the saved config against the *current* sections: keep stored node
// positions/edges, auto-place columns added since the config was saved, and
// drop nodes/edges for columns that no longer exist. No config → full auto.
function resolveGraph(
  sections: SectionData[],
  config?: RoadmapConfig | null,
): { positions: PosMap; edges: RoadmapEdge[] } {
  const ids = new Set(sections.map((s) => s.id));
  if (!config?.nodes?.length) {
    return { positions: autoPositions(sections), edges: autoEdges(sections) };
  }
  const stored: PosMap = {};
  let maxY = PAD;
  for (const n of config.nodes) {
    if (ids.has(n.section_id)) {
      stored[n.section_id] = { x: n.x, y: n.y };
      maxY = Math.max(maxY, n.y);
    }
  }
  // Park any column missing from the config on a fresh row below the graph.
  let missing = 0;
  for (const s of sections) {
    if (!stored[s.id]) {
      stored[s.id] = {
        x: PAD + missing * (NODE_W + GAP_X),
        y: maxY + NODE_H + GAP_Y,
      };
      missing++;
    }
  }
  const edges = (config.edges ?? []).filter(
    (e) => ids.has(e.from) && ids.has(e.to),
  );
  return { positions: stored, edges };
}

// Directed reachability used to colour a selected card's journey: every step
// that can reach `start` is "done"; every step reachable from `start` is
// "upcoming". Works for the linear default and arbitrary branching alike.
function reachable(
  start: number,
  edges: RoadmapEdge[],
  reverse: boolean,
): Set<number> {
  const adj = new Map<number, number[]>();
  for (const e of edges) {
    const [a, b] = reverse ? [e.to, e.from] : [e.from, e.to];
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)?.push(b);
  }
  const seen = new Set<number>();
  const queue = [...(adj.get(start) ?? [])];
  while (queue.length) {
    const n = queue.shift();
    if (n === undefined || seen.has(n)) continue;
    seen.add(n);
    for (const m of adj.get(n) ?? []) if (!seen.has(m)) queue.push(m);
  }
  return seen;
}

const SPRINT_RANK: Record<string, number> = {
  completed: 0,
  active: 1,
  future: 2,
};

export function RoadmapView({
  sections,
  cards,
  config,
  canEdit = false,
  onSave,
  onCardClick,
  onMoveCard,
  onMoveToSprint,
  boardType = "kanban",
  sprints = [],
  currency = "USD",
}: RoadmapViewProps) {
  const hasSprints = boardType === "scrum" && sprints.length > 0;
  // Remember the user's last lens across sessions, falling back to the
  // board-type default. A stored "sprints" only applies to scrum boards.
  const [lens, setLens] = useState<Lens>(() => {
    const stored = readStored(LENS_KEY);
    if (stored === "constellation" || stored === "flow") return stored;
    if (stored === "sprints" && boardType === "scrum") return "sprints";
    return boardType === "scrum" ? "sprints" : "flow";
  });
  useEffect(() => {
    try {
      localStorage.setItem(LENS_KEY, lens);
    } catch {}
  }, [lens]);

  // Constellation lens: group-by dimension + zoom/pan camera.
  const [groupBy, setGroupBy] = useState<GroupBy>(() => {
    const s = readStored(GROUPBY_KEY);
    return s === "sprint" || s === "assignee" || s === "priority"
      ? (s as GroupBy)
      : "column";
  });
  useEffect(() => {
    try {
      localStorage.setItem(GROUPBY_KEY, groupBy);
    } catch {}
  }, [groupBy]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const cstRef = useRef<HTMLDivElement | null>(null);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  // Rich hover-card for a constellation dot.
  const [hovered, setHovered] = useState<{
    card: CardInterface;
    x: number;
    y: number;
  } | null>(null);

  const baseline = useMemo(
    () => resolveGraph(sections, config),
    [sections, config],
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftPos, setDraftPos] = useState<PosMap>(baseline.positions);
  const [draftEdges, setDraftEdges] = useState<RoadmapEdge[]>(baseline.edges);

  // Progress highlighting (flow lens).
  const [selectedCardId, setSelectedCardId] = useState<number | string | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Drill-in: the group whose "ambient" is open. id null = the backlog lane.
  const [focus, setFocus] = useState<{
    kind: "section" | "sprint";
    id: number | null;
  } | null>(null);

  // Layout-edit gesture state. `drag` is state (not a ref) so the gesture
  // effect below re-subscribes its window listeners the moment a drag begins.
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const hoverNodeRef = useRef<number | null>(null);
  const [drag, setDrag] = useState<{
    id: number;
    dx: number;
    dy: number;
  } | null>(null);
  const [pending, setPending] = useState<{
    from: number;
    x: number;
    y: number;
  } | null>(null);

  // Card-drag (drill-in → move to another lane) gesture state.
  const hoverChipRef = useRef<string | null>(null);
  const [cardDrag, setCardDrag] = useState<{
    id: number | string;
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const positions = editing ? draftPos : baseline.positions;
  const edges = editing ? draftEdges : baseline.edges;

  const sectionById = useMemo(() => {
    const m = new Map<number, SectionData>();
    for (const s of sections) m.set(s.id, s);
    return m;
  }, [sections]);

  // Cards grouped by column, ordered as on the board.
  const cardsBySection = useMemo(() => {
    const m = new Map<number, CardInterface[]>();
    for (const s of sections) m.set(s.id, []);
    for (const c of cards) {
      if (!m.has(c.section_id)) m.set(c.section_id, []);
      m.get(c.section_id)?.push(c);
    }
    for (const list of m.values())
      list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return m;
  }, [cards, sections]);

  // Sprints ordered as a timeline (done → active → planned), backlog lane first.
  const orderedSprints = useMemo(
    () =>
      [...sprints].sort(
        (a, b) =>
          (SPRINT_RANK[a.status] ?? 3) - (SPRINT_RANK[b.status] ?? 3) ||
          (a.start_date ?? "").localeCompare(b.start_date ?? ""),
      ),
    [sprints],
  );

  const cardsBySprint = useMemo(() => {
    const m = new Map<number | null, CardInterface[]>();
    m.set(null, []);
    for (const s of sprints) m.set(s.id, []);
    for (const c of cards) {
      const key = c.sprint_id ?? null;
      if (!m.has(key)) m.set(key, []);
      m.get(key)?.push(c);
    }
    return m;
  }, [cards, sprints]);

  // Constellation clusters for the current group-by dimension.
  const groups = useMemo(() => {
    type Group = { key: string; label: string; cards: CardInterface[] };
    const index = new Map<string, Group>();
    const out: Group[] = [];
    const ensure = (key: string, label: string) => {
      let g = index.get(key);
      if (!g) {
        g = { key, label, cards: [] };
        index.set(key, g);
        out.push(g);
      }
      return g;
    };
    if (groupBy === "column") {
      for (const s of sections) ensure(`sec:${s.id}`, s.name);
      for (const c of cards) index.get(`sec:${c.section_id}`)?.cards.push(c);
    } else if (groupBy === "sprint") {
      ensure("bl", "Backlog");
      for (const s of orderedSprints) ensure(`spr:${s.id}`, s.name);
      for (const c of cards)
        index.get(c.sprint_id ? `spr:${c.sprint_id}` : "bl")?.cards.push(c);
    } else if (groupBy === "assignee") {
      for (const c of cards) {
        const u = c.assigned_user;
        ensure(u ? `u:${u.id}` : "un", u ? u.name : "Unassigned").cards.push(c);
      }
    } else {
      const order: [string, string][] = [
        ["high", "High"],
        ["medium", "Medium"],
        ["low", "Low"],
        ["none", "No priority"],
      ];
      for (const [k, label] of order) ensure(k, label);
      for (const c of cards) index.get(c.priority ?? "none")?.cards.push(c);
    }
    // Columns/sprints keep their structure (empty lanes still shown); the ad-hoc
    // assignee/priority buckets drop empties.
    return groupBy === "column" || groupBy === "sprint"
      ? out
      : out.filter((g) => g.cards.length > 0);
  }, [groupBy, cards, sections, orderedSprints]);

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  // Steps completed / still ahead for the selected card (flow lens).
  const { done, upcoming, currentId } = useMemo(() => {
    if (!selectedCard)
      return {
        done: new Set<number>(),
        upcoming: new Set<number>(),
        currentId: null as number | null,
      };
    return {
      currentId: selectedCard.section_id,
      done: reachable(selectedCard.section_id, edges, true),
      upcoming: reachable(selectedCard.section_id, edges, false),
    };
  }, [selectedCard, edges]);

  const pickerCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? cards.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.ticket_key ?? "").toLowerCase().includes(q),
        )
      : cards;
    return list.slice(0, 40);
  }, [cards, query]);

  // Canvas bounds grow to fit whichever layout is showing.
  const bounds = useMemo(() => {
    let w = 640;
    let h = 240;
    for (const s of sections) {
      const p = positions[s.id];
      if (!p) continue;
      w = Math.max(w, p.x + NODE_W + PAD);
      h = Math.max(h, p.y + NODE_H + PAD);
    }
    return { w, h };
  }, [positions, sections]);

  // Resolve the open drill-in into a live title + card list + move targets.
  const focusData = useMemo(() => {
    if (!focus) return null;
    if (focus.kind === "section") {
      const sec = focus.id != null ? sectionById.get(focus.id) : null;
      if (!sec) return null;
      const targets: MoveTarget[] = onMoveCard
        ? sections
            .filter((s) => s.id !== sec.id)
            .map((s) => ({
              key: `sec:${s.id}`,
              label: s.name,
              apply: (cid: number | string) => onMoveCard(cid, s.id),
            }))
        : [];
      return {
        title: sec.name,
        cards: cardsBySection.get(sec.id) ?? [],
        targets,
      };
    }
    // sprint lane (id null = backlog)
    const spr =
      focus.id != null ? sprints.find((s) => s.id === focus.id) : null;
    const title = spr ? spr.name : "Backlog";
    const list = cardsBySprint.get(focus.id) ?? [];
    const targets: MoveTarget[] = onMoveToSprint
      ? [
          ...(focus.id != null
            ? [
                {
                  key: "spr:backlog",
                  label: "Backlog",
                  apply: (cid: number | string) => onMoveToSprint(cid, null),
                },
              ]
            : []),
          ...orderedSprints
            .filter((s) => s.id !== focus.id)
            .map((s) => ({
              key: `spr:${s.id}`,
              label: s.name,
              apply: (cid: number | string) => onMoveToSprint(cid, s.id),
            })),
        ]
      : [];
    return { title, cards: list, targets };
  }, [
    focus,
    sectionById,
    sections,
    sprints,
    orderedSprints,
    cardsBySection,
    cardsBySprint,
    onMoveCard,
    onMoveToSprint,
  ]);

  const enterEdit = useCallback(() => {
    setDraftPos({ ...baseline.positions });
    setDraftEdges(baseline.edges.map((e) => ({ ...e })));
    setSelectedCardId(null);
    setFocus(null);
    setEditing(true);
  }, [baseline]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setPending(null);
    setDrag(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const nodes = sections.map((s) => ({
        section_id: s.id,
        x: Math.round(draftPos[s.id]?.x ?? PAD),
        y: Math.round(draftPos[s.id]?.y ?? PAD),
      }));
      await onSave({ nodes, edges: draftEdges });
      setEditing(false);
      setPending(null);
    } finally {
      setSaving(false);
    }
  }, [sections, draftPos, draftEdges, onSave]);

  const autoArrange = useCallback(() => {
    setDraftPos(autoPositions(sections));
    setDraftEdges(autoEdges(sections));
  }, [sections]);

  const removeEdge = useCallback((from: number, to: number) => {
    setDraftEdges((es) => es.filter((e) => !(e.from === from && e.to === to)));
  }, []);

  // Cursor position in canvas-local coordinates (accounts for scroll).
  const localPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  // Layout-edit: node drag / edge-draw handling while a gesture is active.
  useEffect(() => {
    if (!editing) return;
    if (!drag && !pending) return;
    const onMove = (e: PointerEvent) => {
      const { x, y } = localPoint(e.clientX, e.clientY);
      if (drag) {
        setDraftPos((p) => ({
          ...p,
          [drag.id]: {
            x: Math.max(PAD - NODE_W / 2, x - drag.dx),
            y: Math.max(PAD - NODE_H / 2, y - drag.dy),
          },
        }));
      } else if (pending) {
        setPending((pr) => (pr ? { ...pr, x, y } : pr));
      }
    };
    const onUp = () => {
      if (pending) {
        const target = hoverNodeRef.current;
        if (
          target !== null &&
          target !== pending.from &&
          !draftEdges.some((e) => e.from === pending.from && e.to === target)
        ) {
          setDraftEdges((es) => [...es, { from: pending.from, to: target }]);
        }
        setPending(null);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [editing, drag, pending, draftEdges, localPoint]);

  // Drill-in: dragging a card row onto a "move to" chip relocates it.
  useEffect(() => {
    if (!cardDrag) return;
    const onMove = (e: PointerEvent) => {
      setCardDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };
    const onUp = () => {
      const key = hoverChipRef.current;
      const target = focusData?.targets.find((t) => t.key === key);
      if (target) target.apply(cardDrag.id);
      hoverChipRef.current = null;
      setCardDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [cardDrag, focusData]);

  // Constellation: pan the camera by dragging empty space.
  useEffect(() => {
    if (!panning) return;
    const onMove = (e: PointerEvent) => {
      const s = panStart.current;
      setPan({ x: s.px + (e.clientX - s.x), y: s.py + (e.clientY - s.y) });
    };
    const onUp = () => setPanning(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [panning]);

  // Constellation: wheel to zoom (non-passive so we can preventDefault the scroll).
  useEffect(() => {
    const el = cstRef.current;
    if (!el || lens !== "constellation") return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.12 : 0.89)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [lens]);

  const startPan = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest(".rm-dot")) return;
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      setPanning(true);
    },
    [pan],
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const startDrag = useCallback(
    (e: React.PointerEvent, id: number) => {
      if (!editing) return;
      e.preventDefault();
      const { x, y } = localPoint(e.clientX, e.clientY);
      const p = draftPos[id] ?? { x: PAD, y: PAD };
      setDrag({ id, dx: x - p.x, dy: y - p.y });
    },
    [editing, draftPos, localPoint],
  );

  const startConnect = useCallback(
    (e: React.PointerEvent, id: number) => {
      if (!editing) return;
      e.preventDefault();
      e.stopPropagation();
      const p = draftPos[id];
      if (!p) return;
      setPending({ from: id, x: p.x + NODE_W, y: p.y + NODE_H / 2 });
    },
    [editing, draftPos],
  );

  const startCardDrag = useCallback(
    (e: React.PointerEvent, card: CardInterface) => {
      e.preventDefault();
      e.stopPropagation();
      setCardDrag({
        id: card.id,
        label: card.ticket_key
          ? `${card.ticket_key} · ${card.name}`
          : card.name,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [],
  );

  const anchorOut = (id: number) => {
    const p = positions[id];
    return { x: (p?.x ?? 0) + NODE_W, y: (p?.y ?? 0) + NODE_H / 2 };
  };
  const anchorIn = (id: number) => {
    const p = positions[id];
    return { x: p?.x ?? 0, y: (p?.y ?? 0) + NODE_H / 2 };
  };

  const edgePath = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => {
    const mx = (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  };

  const edgeState = (e: RoadmapEdge): "done" | "upcoming" | "idle" => {
    if (!selectedCard) return "idle";
    if (done.has(e.to) || (e.to === currentId && done.has(e.from)))
      return "done";
    if (e.from === currentId || upcoming.has(e.from)) return "upcoming";
    return "idle";
  };

  const nodeState = (id: number): "current" | "done" | "upcoming" | "idle" => {
    if (!selectedCard) return "idle";
    if (id === currentId) return "current";
    if (done.has(id)) return "done";
    if (upcoming.has(id)) return "upcoming";
    return "idle";
  };

  if (sections.length === 0) {
    return (
      <div className="rm-empty cf-mono">
        <Icon icon={faDiagramProject} />
        <p>Add columns to this board to map out a roadmap.</p>
      </div>
    );
  }

  const showSprintLens = lens === "sprints" && boardType === "scrum";
  const showConstellation = lens === "constellation";
  const showFlow = !showSprintLens && !showConstellation;

  const groupByOptions: { key: GroupBy; label: string }[] = [
    { key: "column", label: "Column" },
    ...(hasSprints ? [{ key: "sprint" as GroupBy, label: "Sprint" }] : []),
    { key: "assignee", label: "Assignee" },
    { key: "priority", label: "Priority" },
  ];

  const renderMiniCards = (list: CardInterface[]) => {
    const preview = list.slice(0, MINI_MAX);
    return (
      <div className="rm-node-cards">
        {preview.map((c) => (
          <div key={c.id} className="rm-mini">
            <span
              className="rm-mini-dot"
              style={{ background: priorityColor(c.priority) }}
            />
            {c.ticket_key && (
              <span className="rm-mini-key">{c.ticket_key}</span>
            )}
            <span className="rm-mini-name">{c.name}</span>
          </div>
        ))}
        {list.length > MINI_MAX && (
          <div className="rm-mini rm-mini--more cf-mono">
            +{list.length - MINI_MAX} more
          </div>
        )}
        {list.length === 0 && (
          <div className="rm-mini rm-mini--empty cf-mono">empty</div>
        )}
      </div>
    );
  };

  return (
    <div className="rm-wrap">
      {/* toolbar */}
      <div className="rm-toolbar">
        <div className="rm-lens" role="tablist" aria-label="Roadmap lens">
          <button
            type="button"
            role="tab"
            aria-selected={lens === "flow"}
            className={`rm-lens-key cf-mono${lens === "flow" ? " on" : ""}`}
            onClick={() => {
              setLens("flow");
              setFocus(null);
            }}
          >
            <Icon icon={faSitemap} /> Flow
          </button>
          {hasSprints && (
            <button
              type="button"
              role="tab"
              aria-selected={lens === "sprints"}
              className={`rm-lens-key cf-mono${lens === "sprints" ? " on" : ""}`}
              onClick={() => {
                setLens("sprints");
                setEditing(false);
                setFocus(null);
              }}
            >
              <Icon icon={faLayerGroup} /> Sprints
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={lens === "constellation"}
            className={`rm-lens-key cf-mono${
              lens === "constellation" ? " on" : ""
            }`}
            onClick={() => {
              setLens("constellation");
              setEditing(false);
              setFocus(null);
            }}
          >
            <Icon icon={faCircleNodes} /> Constellation
          </button>
        </div>

        {showFlow && (
          <div className="rm-picker">
            <button
              type="button"
              className="rm-picker-btn cf-mono"
              onClick={() => setPickerOpen((o) => !o)}
              aria-expanded={pickerOpen}
            >
              <Icon icon={faMagnifyingGlass} />
              {selectedCard ? (
                <span className="rm-picker-label">
                  {selectedCard.ticket_key ? (
                    <span className="rm-picker-key">
                      {selectedCard.ticket_key}
                    </span>
                  ) : null}
                  {selectedCard.name}
                </span>
              ) : (
                <span className="rm-picker-placeholder">Track a card…</span>
              )}
            </button>
            {selectedCard && (
              <button
                type="button"
                className="rm-picker-clear"
                onClick={() => {
                  setSelectedCardId(null);
                  setQuery("");
                }}
                aria-label="Clear tracked card"
              >
                <Icon icon={faXmark} />
              </button>
            )}
            {pickerOpen && (
              <div className="rm-picker-pop">
                <input
                  type="text"
                  className="rm-picker-input cf-mono"
                  placeholder="Search cards…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  // biome-ignore lint/a11y/noAutofocus: opened on demand
                  autoFocus
                />
                <div className="rm-picker-list">
                  {pickerCards.length === 0 && (
                    <div className="rm-picker-none cf-mono">No cards</div>
                  )}
                  {pickerCards.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className="rm-picker-item cf-mono"
                      onClick={() => {
                        setSelectedCardId(c.id);
                        setPickerOpen(false);
                      }}
                    >
                      {c.ticket_key && (
                        <span className="rm-picker-key">{c.ticket_key}</span>
                      )}
                      <span className="rm-picker-name">{c.name}</span>
                      <span className="rm-picker-col">
                        {sectionById.get(c.section_id)?.name ?? "—"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rm-toolbar-spacer" />

        {showConstellation && (
          <div
            className="rm-group-by cf-mono"
            role="tablist"
            aria-label="Group by"
          >
            <span className="rm-group-by-label">Group by</span>
            {groupByOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                role="tab"
                aria-selected={groupBy === o.key}
                className={`rm-group-key${groupBy === o.key ? " on" : ""}`}
                onClick={() => setGroupBy(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {showFlow &&
          canEdit &&
          (editing ? (
            <div className="rm-edit-actions">
              <button
                type="button"
                className="rm-btn cf-mono"
                onClick={autoArrange}
                title="Reset to a straight left-to-right chain"
              >
                <Icon icon={faWandMagicSparkles} /> Auto-arrange
              </button>
              <button
                type="button"
                className="rm-btn cf-mono"
                onClick={cancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rm-btn rm-btn--go cf-mono"
                onClick={save}
                disabled={saving}
              >
                <Icon icon={faFloppyDisk} />{" "}
                {saving ? "Saving…" : "Save layout"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="rm-btn cf-mono"
              onClick={enterEdit}
            >
              <Icon icon={faPen} /> Edit layout
            </button>
          ))}
      </div>

      <p className="rm-hint cf-mono">
        {showConstellation
          ? "Every ticket at a glance · scroll to zoom, drag to pan · dot size = story points · click one to open it"
          : showSprintLens
            ? "Your workflow as a timeline of sprints · click one to open it and move tickets between sprints"
            : editing
              ? "Drag a step to move it · drag the ● handle onto another step to link · click a connector to remove it"
              : "Click a step to open it and see the cards inside · pick a card above to trace its path"}
      </p>

      {/* canvas + drill-in overlay */}
      <div className="rm-stage">
        {showConstellation ? (
          <div className="rm-scroll rm-cst-viewport">
            <div
              ref={cstRef}
              className={`rm-cst-pan${panning ? " panning" : ""}`}
              onPointerDown={startPan}
            >
              <div
                className="rm-cst-inner"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                {groups.map((g) => {
                  const pts = g.cards.reduce((n, c) => n + cardPoints(c), 0);
                  // Biggest dots to the centre; pack on a golden-angle spiral.
                  const sorted = [...g.cards].sort(
                    (a, b) => dotSize(b) - dotSize(a),
                  );
                  const offs = packOffsets(sorted.length);
                  let maxR = 18;
                  sorted.forEach((c, i) => {
                    const half = dotSize(c) / 2;
                    maxR = Math.max(
                      maxR,
                      Math.abs(offs[i].x) + half,
                      Math.abs(offs[i].y) + half,
                    );
                  });
                  const size = maxR * 2 + 10;
                  const cc = size / 2;
                  return (
                    <div key={g.key} className="rm-cst-group">
                      <div className="rm-cst-group-head cf-mono">
                        <span className="rm-cst-group-name">{g.label}</span>
                        <span className="rm-cst-group-meta">
                          {g.cards.length}
                          {pts > 0 ? ` · ${pts}p` : ""}
                        </span>
                      </div>
                      <div
                        className="rm-cst-disc"
                        style={{ width: size, height: size }}
                      >
                        {sorted.length === 0 && (
                          <span className="rm-cst-empty cf-mono">—</span>
                        )}
                        {sorted.map((c, i) => {
                          const d = dotSize(c);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className={`rm-dot${cardDone(c) ? " rm-dot--done" : ""}`}
                              style={{
                                width: d,
                                height: d,
                                left: cc + offs[i].x - d / 2,
                                top: cc + offs[i].y - d / 2,
                                background: priorityColor(c.priority),
                              }}
                              onClick={() => onCardClick?.(c)}
                              onPointerEnter={(e) =>
                                setHovered({
                                  card: c,
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }
                              onPointerLeave={() =>
                                setHovered((h) =>
                                  h?.card.id === c.id ? null : h,
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rm-cst-zoom">
              <button
                type="button"
                className="rm-zoom-btn"
                onClick={() => setZoom((z) => clampZoom(z * 1.18))}
                aria-label="Zoom in"
              >
                <Icon icon={faPlus} />
              </button>
              <button
                type="button"
                className="rm-zoom-btn"
                onClick={() => setZoom((z) => clampZoom(z * 0.85))}
                aria-label="Zoom out"
              >
                <Icon icon={faMinus} />
              </button>
              <button
                type="button"
                className="rm-zoom-btn rm-zoom-reset cf-mono"
                onClick={resetView}
              >
                {Math.round(zoom * 100)}%
              </button>
            </div>
          </div>
        ) : showSprintLens ? (
          <div className="rm-scroll rm-scroll--timeline">
            <div className="rm-timeline">
              {[
                {
                  id: null as number | null,
                  sprint: null as SprintInterface | null,
                },
                ...orderedSprints.map((s) => ({ id: s.id, sprint: s })),
              ].map((lane, i, arr) => {
                const list = cardsBySprint.get(lane.id) ?? [];
                const total = list.reduce((n, c) => n + cardPoints(c), 0);
                const donePts = list
                  .filter(cardDone)
                  .reduce((n, c) => n + cardPoints(c), 0);
                const pct = total > 0 ? Math.round((donePts / total) * 100) : 0;
                const status = lane.sprint?.status ?? "backlog";
                return (
                  <div
                    className="rm-lane-wrap"
                    key={lane.id ?? "backlog"}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <button
                      type="button"
                      className={`rm-node rm-node--view rm-node--sprint rm-sprint--${status}${
                        focus?.kind === "sprint" && focus.id === lane.id
                          ? " rm-node--focused"
                          : ""
                      }`}
                      onClick={() => setFocus({ kind: "sprint", id: lane.id })}
                    >
                      <div className="rm-node-head">
                        <span className="rm-node-name">
                          {lane.sprint ? lane.sprint.name : "Backlog"}
                        </span>
                        <span
                          className={`rm-sprint-tag cf-mono rm-tag--${status}`}
                        >
                          {status === "backlog" ? "POOL" : status.toUpperCase()}
                        </span>
                      </div>
                      {lane.sprint && (
                        <div className="rm-sprint-dates cf-mono">
                          {fmtDate(lane.sprint.start_date)}
                          {lane.sprint.end_date
                            ? ` → ${fmtDate(lane.sprint.end_date)}`
                            : ""}
                        </div>
                      )}
                      <div className="rm-sprint-stat cf-mono">
                        <span>{list.length} cards</span>
                        {total > 0 && (
                          <span>
                            {donePts}/{total} pts
                          </span>
                        )}
                      </div>
                      {total > 0 && (
                        <div className="rm-bar" title={`${pct}% complete`}>
                          <span
                            className="rm-bar-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {renderMiniCards(list)}
                    </button>
                    {i < arr.length - 1 && (
                      <div className="rm-link" aria-hidden>
                        <span className="rm-link-flow" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rm-scroll rm-scroll--flow">
            <div
              ref={canvasRef}
              className={`rm-canvas${editing ? " rm-canvas--edit" : ""}`}
              style={{ width: bounds.w, height: bounds.h }}
            >
              <svg
                className="rm-edges"
                width={bounds.w}
                height={bounds.h}
                aria-hidden="true"
              >
                <title>Workflow connections</title>
                <defs>
                  <marker
                    id="rm-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                  </marker>
                </defs>
                {edges.map((e) => {
                  const a = anchorOut(e.from);
                  const b = anchorIn(e.to);
                  const st = edgeState(e);
                  return (
                    <g
                      key={`${e.from}-${e.to}`}
                      className={`rm-edge rm-edge--${st}`}
                    >
                      <path
                        d={edgePath(a, b)}
                        fill="none"
                        markerEnd="url(#rm-arrow)"
                        className="rm-edge-line"
                      />
                      {editing && (
                        // Fat invisible hit-area to click the connector away.
                        // biome-ignore lint/a11y/noStaticElementInteractions: SVG path; edges are also editable via node handles
                        <path
                          d={edgePath(a, b)}
                          fill="none"
                          strokeWidth={14}
                          stroke="transparent"
                          style={{ cursor: "pointer" }}
                          onClick={() => removeEdge(e.from, e.to)}
                        >
                          <title>Remove link</title>
                        </path>
                      )}
                    </g>
                  );
                })}
                {pending && (
                  <path
                    d={edgePath(anchorOut(pending.from), {
                      x: pending.x,
                      y: pending.y,
                    })}
                    fill="none"
                    className="rm-edge-line rm-edge--pending"
                  />
                )}
              </svg>

              {sections.map((s) => {
                const p = positions[s.id];
                if (!p) return null;
                const st = nodeState(s.id);
                const list = cardsBySection.get(s.id) ?? [];
                return (
                  <div
                    key={s.id}
                    className={`rm-node rm-node--${st}${
                      editing ? " rm-node--edit" : " rm-node--view"
                    }${
                      focus?.kind === "section" && focus.id === s.id
                        ? " rm-node--focused"
                        : ""
                    }`}
                    style={{
                      left: p.x,
                      top: p.y,
                      width: NODE_W,
                      height: NODE_H,
                    }}
                    onPointerDown={(e) => startDrag(e, s.id)}
                    onPointerEnter={() => {
                      hoverNodeRef.current = s.id;
                    }}
                    onPointerLeave={() => {
                      if (hoverNodeRef.current === s.id)
                        hoverNodeRef.current = null;
                    }}
                    {...(!editing && {
                      role: "button",
                      tabIndex: 0,
                      onClick: () => setFocus({ kind: "section", id: s.id }),
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setFocus({ kind: "section", id: s.id });
                        }
                      },
                    })}
                  >
                    <div className="rm-node-head">
                      <span className="rm-node-name">{s.name}</span>
                      <span
                        className="rm-node-count"
                        title={`${list.length} card(s) here`}
                      >
                        {list.length}
                      </span>
                    </div>
                    {st === "current" && (
                      <span className="rm-node-badge cf-mono">● HERE</span>
                    )}
                    {renderMiniCards(list)}
                    {editing && (
                      <span
                        className="rm-handle"
                        onPointerDown={(e) => startConnect(e, s.id)}
                        title="Drag to link to another step"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* drill-in "ambient" for one lane */}
        {focusData && (
          // biome-ignore lint/a11y/noStaticElementInteractions: modal scrim; closes on click-out (target check) and Esc
          <div
            className="rm-focus-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFocus(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setFocus(null);
            }}
            role="presentation"
          >
            <div className="rm-focus">
              <div className="rm-focus-head">
                <div className="rm-focus-title">
                  <span className="rm-focus-name">{focusData.title}</span>
                  <span className="rm-focus-count cf-mono">
                    {focusData.cards.length} card
                    {focusData.cards.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  className="rm-focus-close"
                  onClick={() => setFocus(null)}
                  aria-label="Close"
                >
                  <Icon icon={faXmark} />
                </button>
              </div>

              <div className="rm-focus-list">
                {focusData.cards.length === 0 && (
                  <div className="rm-focus-empty cf-mono">No cards here.</div>
                )}
                {focusData.cards.map((c) => (
                  <div key={c.id} className="rm-fcard">
                    {focusData.targets.length > 0 && (
                      <button
                        type="button"
                        className="rm-fcard-grip"
                        tabIndex={-1}
                        aria-label="Drag onto a target to move"
                        onPointerDown={(e) => startCardDrag(e, c)}
                        title="Drag onto a target below to move"
                      >
                        <Icon icon={faGripVertical} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="rm-fcard-main"
                      onClick={() => onCardClick?.(c)}
                    >
                      <span
                        className="rm-fcard-dot"
                        style={{ background: priorityColor(c.priority) }}
                      />
                      <span className="rm-fcard-body">
                        <span className="rm-fcard-top">
                          {c.ticket_key && (
                            <span className="rm-fcard-key cf-mono">
                              {c.ticket_key}
                            </span>
                          )}
                          <span className="rm-fcard-name">{c.name}</span>
                        </span>
                        <span className="rm-fcard-meta cf-mono">
                          {c.assigned_user?.name && (
                            <span>{c.assigned_user.name}</span>
                          )}
                          {c.story_points != null && (
                            <span>{c.story_points} pt</span>
                          )}
                          {c.value != null && c.value !== "" && (
                            <span>
                              {formatMoney(Number(c.value), currency)}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {focusData.targets.length > 0 && (
                <div className="rm-move-rail">
                  <span className="rm-move-label cf-mono">
                    {cardDrag ? "Drop on a target →" : "Move to"}
                  </span>
                  <div className="rm-move-chips">
                    {focusData.targets.map((t) => (
                      <span
                        key={t.key}
                        className="rm-move-chip cf-mono"
                        onPointerEnter={() => {
                          hoverChipRef.current = t.key;
                        }}
                        onPointerLeave={() => {
                          if (hoverChipRef.current === t.key)
                            hoverChipRef.current = null;
                        }}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* drag ghost */}
      {cardDrag && (
        <div
          className="rm-ghost cf-mono"
          style={{ left: cardDrag.x + 12, top: cardDrag.y + 12 }}
        >
          {cardDrag.label}
        </div>
      )}

      {/* constellation hover-card */}
      {showConstellation && hovered && (
        <div
          className="rm-hovercard"
          style={{ left: hovered.x + 16, top: hovered.y + 16 }}
        >
          <div className="rm-hc-top">
            <span
              className="rm-hc-dot"
              style={{ background: priorityColor(hovered.card.priority) }}
            />
            {hovered.card.ticket_key && (
              <span className="rm-hc-key cf-mono">
                {hovered.card.ticket_key}
              </span>
            )}
            {cardDone(hovered.card) && (
              <span className="rm-hc-done cf-mono">DONE</span>
            )}
          </div>
          <div className="rm-hc-name">{hovered.card.name}</div>
          <div className="rm-hc-meta cf-mono">
            <span>{sectionById.get(hovered.card.section_id)?.name ?? "—"}</span>
            {hovered.card.sprint_id != null && (
              <span>
                {sprints.find((s) => s.id === hovered.card.sprint_id)?.name ??
                  "Sprint"}
              </span>
            )}
            <span>{hovered.card.priority ?? "no"} priority</span>
            {hovered.card.story_points != null && (
              <span>{hovered.card.story_points} pts</span>
            )}
            {hovered.card.assigned_user?.name && (
              <span>{hovered.card.assigned_user.name}</span>
            )}
          </div>
        </div>
      )}

      {/* legend */}
      {showConstellation ? (
        <div className="rm-legend cf-mono">
          <span className="rm-lg" style={{ color: "var(--cf-red)" }}>
            High
          </span>
          <span className="rm-lg" style={{ color: "var(--cf-amber)" }}>
            Medium
          </span>
          <span className="rm-lg" style={{ color: "var(--cf-phosphor)" }}>
            Low / none
          </span>
          <span className="rm-legend-note">
            {cards.length} tickets · hollow = done · bigger = more points
          </span>
        </div>
      ) : showSprintLens ? (
        <div className="rm-legend cf-mono">
          <span className="rm-lg rm-lg--done">Completed</span>
          <span className="rm-lg rm-lg--current">Active</span>
          <span className="rm-lg rm-lg--upcoming">Planned</span>
          <span className="rm-legend-note">
            Bar = points done · click a sprint to move its tickets
          </span>
        </div>
      ) : (
        <div className="rm-legend cf-mono">
          <span className="rm-lg rm-lg--current">Current</span>
          <span className="rm-lg rm-lg--done">Completed</span>
          <span className="rm-lg rm-lg--upcoming">Ahead</span>
          <span className="rm-legend-note">
            Badge = cards currently in that column
          </span>
          {selectedCard && onCardClick && (
            <button
              type="button"
              className="rm-open cf-mono"
              onClick={() => onCardClick(selectedCard)}
            >
              Open tracked card →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
