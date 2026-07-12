const DEMO_BOARDS_KEY = "yondra_demo_boards";
const boardDataKey = (id: string) => `yondra_demo_data_${id}`;
const LEGACY_KEY = "yondra_demo";

export type DemoTag = { id: number; name: string; color: string };
export type DemoSection = {
  id: number;
  name: string;
  aging_hours?: number | null;
};
export type DemoChecklistItem = {
  id: number;
  text: string;
  is_done: boolean;
  position: number;
};
export type DemoCard = {
  id: number;
  section_id: number;
  assigned_user_id?: number | null;
  tag_ids?: number[];
  name: string;
  description: string;
  due_date?: string | null;
  priority?: "low" | "medium" | "high" | null;
  position?: number;
  value?: number | null;
  story_points?: number | null;
  sprint_id?: number | null;
  section_entered_at?: string | null;
  done_at?: string | null;
  archived_at?: string | null;
  checklist_items?: DemoChecklistItem[];
  parent_card_id?: number | null;
  is_done?: boolean;
};
export type DemoTemplate = { id: number; name: string; template_data: object };
export type DemoSprint = {
  id: number;
  board_id: number;
  name: string;
  status: "future" | "active" | "completed";
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  committed_points?: number | null;
  committed_count?: number | null;
  completed_points?: number | null;
  completed_count?: number | null;
  report_snapshot?:
    | {
        id: number;
        name: string;
        points?: number | null;
        done_at?: string | null;
      }[]
    | null;
};
export type DemoBoardData = {
  sections: DemoSection[];
  cards: DemoCard[];
  tags: DemoTag[];
  templates?: DemoTemplate[];
  sprints?: DemoSprint[];
};
export type DemoBoardType = "kanban" | "scrum" | "crm";
export type DemoBoard = {
  id: string;
  name: string;
  description: string;
  type?: DemoBoardType;
  currency?: string;
};

const DEFAULT_DATA: DemoBoardData = {
  sections: [
    { id: 1, name: "To Do" },
    { id: 2, name: "In Progress" },
    { id: 3, name: "Done" },
  ],
  cards: [
    {
      id: 1,
      section_id: 1,
      name: "Welcome to Yondra!",
      description: "This is a demo board. Everything is saved in your browser.",
      position: 0,
      checklist_items: [],
    },
    {
      id: 2,
      section_id: 1,
      name: "Try creating a card",
      description: "Press C to add a new card.",
      position: 1,
      checklist_items: [],
    },
    {
      id: 3,
      section_id: 2,
      name: "Drag me to another column",
      description: "",
      position: 0,
      checklist_items: [],
    },
  ],
  tags: [],
};

function resolveCardTags(
  card: DemoCard,
  allTags: DemoTag[],
): DemoCard & { tags: DemoTag[] } {
  const tags = (card.tag_ids ?? [])
    .map((id) => allTags.find((t) => t.id === id))
    .filter(Boolean) as DemoTag[];
  return { ...card, tags };
}

function loadBoardData(boardId: string): DemoBoardData {
  if (typeof window === "undefined") return structuredClone(DEFAULT_DATA);
  if (boardId === "demo") {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      const migrated = { ...DEFAULT_DATA, ...parsed, tags: parsed.tags ?? [] };
      localStorage.setItem(boardDataKey("demo"), JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  }
  const raw = localStorage.getItem(boardDataKey(boardId));
  if (!raw) {
    const data = structuredClone(DEFAULT_DATA);
    localStorage.setItem(boardDataKey(boardId), JSON.stringify(data));
    return data;
  }
  const parsed = JSON.parse(raw);
  return { ...DEFAULT_DATA, ...parsed, tags: parsed.tags ?? [] };
}

function saveBoardData(boardId: string, data: DemoBoardData) {
  localStorage.setItem(boardDataKey(boardId), JSON.stringify(data));
}

// --- Board list ---

export function loadDemoBoards(): DemoBoard[] {
  if (typeof window === "undefined") {
    return [
      {
        id: "demo",
        name: "Demo Board",
        description: "Try it out — everything is saved in your browser.",
      },
    ];
  }
  const raw = localStorage.getItem(DEMO_BOARDS_KEY);
  if (!raw) {
    const boards: DemoBoard[] = [
      {
        id: "demo",
        name: "Demo Board",
        description: "Try it out — everything is saved in your browser.",
      },
    ];
    localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(boards));
    return boards;
  }
  return JSON.parse(raw);
}

export function createDemoBoard(
  name: string,
  description: string,
  type: DemoBoardType = "kanban",
  currency = "BRL",
): DemoBoard {
  const boards = loadDemoBoards();
  const id = `demo-${Date.now()}`;
  const board: DemoBoard = { id, name, description, type, currency };
  boards.push(board);
  localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(boards));
  // CRM boards start as a sales funnel; others get the classic workflow lanes.
  const data = structuredClone(DEFAULT_DATA);
  if (type === "crm") {
    data.sections = [
      { id: 1, name: "Lead In" },
      { id: 2, name: "Contact Made" },
      { id: 3, name: "Proposal Made" },
      { id: 4, name: "Negotiations Started" },
      { id: 5, name: "Won" },
    ];
    data.cards = [];
  }
  saveBoardData(id, data);
  return board;
}

export function updateDemoBoard(
  id: string,
  name: string,
  description: string,
): void {
  const boards = loadDemoBoards().map((b) =>
    b.id === id ? { ...b, name, description } : b,
  );
  localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(boards));
}

export function deleteDemoBoard(id: string): void {
  const boards = loadDemoBoards().filter((b) => b.id !== id);
  localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(boards));
  localStorage.removeItem(boardDataKey(id));
}

// --- Board data ---

export function loadDemoBoardData(boardId: string): DemoBoardData {
  const data = loadBoardData(boardId);
  return {
    ...data,
    cards: data.cards
      .filter((c) => !c.archived_at && !c.parent_card_id)
      .map((c) => resolveCardTags(c, data.tags)),
  };
}

export function loadDemoArchivedCards(
  boardId: string,
): (DemoCard & { tags: DemoTag[] })[] {
  const data = loadBoardData(boardId);
  return data.cards
    .filter((c) => !!c.archived_at)
    .map((c) => resolveCardTags(c, data.tags));
}

// --- Tags ---

export function demoCreateTag(
  boardId: string,
  name: string,
  color: string,
): DemoTag {
  const data = loadBoardData(boardId);
  const newId =
    data.tags.length > 0 ? Math.max(...data.tags.map((t) => t.id)) + 1 : 1;
  const tag: DemoTag = { id: newId, name, color };
  data.tags.push(tag);
  saveBoardData(boardId, data);
  return tag;
}

export function demoDeleteTag(boardId: string, tagId: number): void {
  const data = loadBoardData(boardId);
  data.tags = data.tags.filter((t) => t.id !== tagId);
  data.cards = data.cards.map((c) => ({
    ...c,
    tag_ids: (c.tag_ids ?? []).filter((id) => id !== tagId),
  }));
  saveBoardData(boardId, data);
}

// --- Sections ---

export function demoCreateSection(boardId: string, name: string): DemoSection {
  const data = loadBoardData(boardId);
  const newId =
    data.sections.length > 0
      ? Math.max(...data.sections.map((s) => s.id)) + 1
      : 1;
  const section: DemoSection = { id: newId, name };
  // The reserved "Backlog" section stays pinned to the end — new columns go before it.
  const blIdx = data.sections.findIndex((s) => s.name === "Backlog");
  if (blIdx === -1 || name === "Backlog") data.sections.push(section);
  else data.sections.splice(blIdx, 0, section);
  saveBoardData(boardId, data);
  return section;
}

export function demoUpdateSection(
  boardId: string,
  sectionId: number,
  name: string,
): DemoSection | null {
  const data = loadBoardData(boardId);
  const idx = data.sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) return null;
  data.sections[idx] = { ...data.sections[idx], name };
  saveBoardData(boardId, data);
  return data.sections[idx];
}

export function demoReorderSections(
  boardId: string,
  orderedIds: number[],
): void {
  const data = loadBoardData(boardId);
  const byId = new Map(data.sections.map((s) => [s.id, s]));
  const reordered = orderedIds
    .map((id) => byId.get(id))
    .filter(Boolean) as DemoSection[];
  // keep any sections not in the ordered list (e.g. reserved Backlog) at the end
  const rest = data.sections.filter((s) => !orderedIds.includes(s.id));
  data.sections = [...reordered, ...rest];
  saveBoardData(boardId, data);
}

export function demoDeleteSection(boardId: string, sectionId: number): void {
  const data = loadBoardData(boardId);
  data.sections = data.sections.filter((s) => s.id !== sectionId);
  data.cards = data.cards.filter((c) => c.section_id !== sectionId);
  saveBoardData(boardId, data);
}

// --- Cards ---

export function demoCreateCard(
  boardId: string,
  cardData: {
    section_id: number;
    name: string;
    description: string;
    tag_ids?: number[];
    assigned_user_id?: number | null;
    due_date?: string | null;
    priority?: "low" | "medium" | "high" | null;
    value?: number | null;
    story_points?: number | null;
    sprint_id?: number | null;
  },
): DemoCard & { tags: DemoTag[] } {
  const data = loadBoardData(boardId);
  const newId =
    data.cards.length > 0 ? Math.max(...data.cards.map((c) => c.id)) + 1 : 1;
  const position = data.cards.filter(
    (c) => c.section_id === cardData.section_id,
  ).length;
  const card: DemoCard = {
    id: newId,
    ...cardData,
    tag_ids: cardData.tag_ids ?? [],
    position,
    checklist_items: [],
    section_entered_at: new Date().toISOString(),
  };
  data.cards.push(card);
  saveBoardData(boardId, data);
  return resolveCardTags(card, data.tags);
}

export function demoUpdateCard(
  boardId: string,
  cardId: number,
  cardData: {
    section_id?: number;
    name?: string;
    description?: string;
    tag_ids?: number[];
    assigned_user_id?: number | null;
    due_date?: string | null;
    priority?: "low" | "medium" | "high" | null;
    value?: number | null;
    story_points?: number | null;
    sprint_id?: number | null;
  },
): (DemoCard & { tags: DemoTag[] }) | null {
  const data = loadBoardData(boardId);
  const idx = data.cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  const prev = data.cards[idx];
  // Moving to a different column resets the SLA-aging clock and stamps/clears done_at
  // (mirrors the backend: a card is "done" once it enters a Done-named column).
  const movedColumn =
    cardData.section_id !== undefined &&
    cardData.section_id !== prev.section_id;
  let doneAt = prev.done_at ?? null;
  if (movedColumn) {
    const target = data.sections.find((s) => s.id === cardData.section_id);
    doneAt =
      target && target.name.toLowerCase() === "done"
        ? (doneAt ?? new Date().toISOString())
        : null;
  }
  data.cards[idx] = {
    ...prev,
    ...cardData,
    section_entered_at: movedColumn
      ? new Date().toISOString()
      : prev.section_entered_at,
    done_at: doneAt,
  };
  saveBoardData(boardId, data);
  return resolveCardTags(data.cards[idx], data.tags);
}

export function demoDeleteCard(boardId: string, cardId: number): void {
  const data = loadBoardData(boardId);
  data.cards = data.cards.filter((c) => c.id !== cardId);
  saveBoardData(boardId, data);
}

export function demoArchiveCard(boardId: string, cardId: number): void {
  const data = loadBoardData(boardId);
  const idx = data.cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return;
  data.cards[idx] = {
    ...data.cards[idx],
    archived_at: new Date().toISOString(),
  };
  saveBoardData(boardId, data);
}

export function demoRestoreCard(boardId: string, cardId: number): void {
  const data = loadBoardData(boardId);
  const idx = data.cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return;
  data.cards[idx] = { ...data.cards[idx], archived_at: null };
  saveBoardData(boardId, data);
}

// --- Checklist ---

export function demoCreateChecklistItem(
  boardId: string,
  cardId: number,
  text: string,
): DemoChecklistItem {
  const data = loadBoardData(boardId);
  const card = data.cards.find((c) => c.id === cardId);
  if (!card) throw new Error("Card not found");
  if (!card.checklist_items) card.checklist_items = [];
  const newId =
    card.checklist_items.length > 0
      ? Math.max(...card.checklist_items.map((i) => i.id)) + 1
      : 1;
  const item: DemoChecklistItem = {
    id: newId,
    text,
    is_done: false,
    position: card.checklist_items.length,
  };
  card.checklist_items.push(item);
  saveBoardData(boardId, data);
  return item;
}

export function demoUpdateChecklistItem(
  boardId: string,
  cardId: number,
  itemId: number,
  patch: { text?: string; is_done?: boolean },
): DemoChecklistItem | null {
  const data = loadBoardData(boardId);
  const card = data.cards.find((c) => c.id === cardId);
  if (!card || !card.checklist_items) return null;
  const idx = card.checklist_items.findIndex((i) => i.id === itemId);
  if (idx === -1) return null;
  card.checklist_items[idx] = { ...card.checklist_items[idx], ...patch };
  saveBoardData(boardId, data);
  return card.checklist_items[idx];
}

export function demoDeleteChecklistItem(
  boardId: string,
  cardId: number,
  itemId: number,
): void {
  const data = loadBoardData(boardId);
  const card = data.cards.find((c) => c.id === cardId);
  if (!card || !card.checklist_items) return;
  card.checklist_items = card.checklist_items.filter((i) => i.id !== itemId);
  saveBoardData(boardId, data);
}

// --- Subtasks ---

export function demoGetSubtasks(
  boardId: string,
  parentCardId: number,
): (DemoCard & { tags: DemoTag[] })[] {
  const data = loadBoardData(boardId);
  return data.cards
    .filter((c) => c.parent_card_id === parentCardId && !c.archived_at)
    .map((c) => resolveCardTags(c, data.tags));
}

export function demoCreateSubtask(
  boardId: string,
  parentCardId: number,
  subtaskData: { name: string; description?: string },
): DemoCard {
  const data = loadBoardData(boardId);
  const newId =
    data.cards.length > 0 ? Math.max(...data.cards.map((c) => c.id)) + 1 : 1;
  const subtask: DemoCard = {
    id: newId,
    section_id: data.cards.find((c) => c.id === parentCardId)?.section_id ?? 1,
    name: subtaskData.name,
    description: subtaskData.description ?? "",
    parent_card_id: parentCardId,
    is_done: false,
    checklist_items: [],
  };
  data.cards.push(subtask);
  saveBoardData(boardId, data);
  return subtask;
}

export function demoToggleSubtask(boardId: string, subtaskId: number): void {
  const data = loadBoardData(boardId);
  const idx = data.cards.findIndex((c) => c.id === subtaskId);
  if (idx === -1) return;
  data.cards[idx] = { ...data.cards[idx], is_done: !data.cards[idx].is_done };
  saveBoardData(boardId, data);
}

// --- Templates ---

export function loadDemoTemplates(boardId: string): DemoTemplate[] {
  const data = loadBoardData(boardId);
  return data.templates ?? [];
}

export function saveDemoTemplate(
  boardId: string,
  name: string,
  templateData: object,
): DemoTemplate {
  const data = loadBoardData(boardId);
  if (!data.templates) data.templates = [];
  const newId =
    data.templates.length > 0
      ? Math.max(...data.templates.map((t) => t.id)) + 1
      : 1;
  const template: DemoTemplate = {
    id: newId,
    name,
    template_data: templateData,
  };
  data.templates.push(template);
  saveBoardData(boardId, data);
  return template;
}

export function deleteDemoTemplate(boardId: string, templateId: number): void {
  const data = loadBoardData(boardId);
  data.templates = (data.templates ?? []).filter((t) => t.id !== templateId);
  saveBoardData(boardId, data);
}

// --- Sprints (scrum) ---

export function loadDemoSprints(boardId: string): DemoSprint[] {
  return loadBoardData(boardId).sprints ?? [];
}

// --- Sprint schedule helpers (mirror the backend's date logic) ---
function demoYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function demoAddDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return demoYmd(d);
}
function demoDiffDays(a: string, b: string) {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() -
      new Date(a + "T00:00:00").getTime()) /
      86400000,
  );
}

// Enforce non-overlapping schedules: any sprint starting before the previous one ends is
// pushed to start at the previous end, preserving its duration.
function demoCascadeDates(sprints: DemoSprint[]): DemoSprint[] {
  const ordered = [...sprints]
    .filter((s) => s.status !== "completed" && s.start_date && s.end_date)
    .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1],
      cur = ordered[i];
    // Must begin the day AFTER the previous sprint ends (no shared boundary day).
    if (cur.start_date! <= prev.end_date!) {
      const duration = demoDiffDays(cur.start_date!, cur.end_date!);
      cur.start_date = demoAddDays(prev.end_date!, 1);
      cur.end_date = demoAddDays(cur.start_date, duration);
    }
  }
  return sprints; // mutated in place (ordered holds the same object refs)
}

export function demoCreateSprint(
  boardId: string,
  name: string,
  startDate?: string,
  endDate?: string,
): DemoSprint {
  const data = loadBoardData(boardId);
  const sprints = data.sprints ?? [];
  const newId =
    sprints.length > 0 ? Math.max(...sprints.map((s) => s.id)) + 1 : 1;
  // Default: start the day after the latest sprint ends (or today), run two weeks.
  const lastEnd = sprints
    .map((s) => s.end_date)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;
  const start =
    startDate ?? (lastEnd ? demoAddDays(lastEnd, 1) : demoYmd(new Date()));
  const end = endDate ?? demoAddDays(start, 14);
  const sprint: DemoSprint = {
    id: newId,
    board_id: 0,
    name,
    status: "future",
    is_active: false,
    start_date: start,
    end_date: end,
  };
  data.sprints = demoCascadeDates([...sprints, sprint]);
  saveBoardData(boardId, data);
  return sprint;
}

export function demoUpdateSprint(
  boardId: string,
  sprintId: number,
  dates: { start_date?: string; end_date?: string },
): void {
  const data = loadBoardData(boardId);
  data.sprints = (data.sprints ?? []).map((s) =>
    s.id === sprintId ? { ...s, ...dates } : s,
  );
  data.sprints = demoCascadeDates(data.sprints);
  saveBoardData(boardId, data);
}

export function demoStartSprint(
  boardId: string,
  sprintId: number,
): DemoSprint | null {
  const data = loadBoardData(boardId);
  const sprints = data.sprints ?? [];
  const idx = sprints.findIndex((s) => s.id === sprintId);
  if (idx === -1) return null;
  const inSprint = data.cards.filter(
    (c) => c.sprint_id === sprintId && !c.archived_at,
  );
  const now = new Date();
  data.sprints = sprints.map((s) =>
    s.id === sprintId
      ? {
          ...s,
          status: "active",
          is_active: true,
          started_at: now.toISOString(),
          start_date: s.start_date ?? now.toISOString().slice(0, 10),
          committed_points: inSprint.reduce(
            (sum, c) => sum + (c.story_points ?? 0),
            0,
          ),
          committed_count: inSprint.length,
        }
      : { ...s, is_active: false },
  );
  saveBoardData(boardId, data);
  return data.sprints[idx];
}

export function demoCompleteSprint(
  boardId: string,
  sprintId: number,
  moveTo: string,
  newSprintName?: string,
): DemoSprint | null {
  const data = loadBoardData(boardId);
  const sprints = data.sprints ?? [];
  const sprint = sprints.find((s) => s.id === sprintId);
  if (!sprint) return null;

  const inSprint = data.cards.filter(
    (c) => c.sprint_id === sprintId && !c.archived_at,
  );
  const done = inSprint.filter((c) => c.done_at);

  // Resolve destination for incomplete cards.
  let targetId: number | null = null;
  const nextSprints = [...sprints];
  if (moveTo === "new" && newSprintName) {
    const newId =
      sprints.length > 0 ? Math.max(...sprints.map((s) => s.id)) + 1 : 1;
    nextSprints.push({
      id: newId,
      board_id: 0,
      name: newSprintName,
      status: "future",
      is_active: false,
    });
    targetId = newId;
  } else if (moveTo !== "backlog") {
    targetId = Number(moveTo) || null;
  }

  data.cards = data.cards.map((c) =>
    c.sprint_id === sprintId && !c.done_at ? { ...c, sprint_id: targetId } : c,
  );

  data.sprints = nextSprints.map((s) =>
    s.id === sprintId
      ? {
          ...s,
          status: "completed",
          is_active: false,
          completed_at: new Date().toISOString(),
          completed_points: done.reduce(
            (sum, c) => sum + (c.story_points ?? 0),
            0,
          ),
          completed_count: done.length,
          // Freeze the ticket set so the report stays accurate after cards move out.
          report_snapshot: inSprint.map((c) => ({
            id: c.id,
            name: c.name,
            points: c.story_points ?? 0,
            done_at: c.done_at ?? null,
          })),
        }
      : s,
  );
  saveBoardData(boardId, data);
  return data.sprints.find((s) => s.id === sprintId) ?? null;
}

export function demoDeleteSprint(boardId: string, sprintId: number): void {
  const data = loadBoardData(boardId);
  data.sprints = (data.sprints ?? []).filter((s) => s.id !== sprintId);
  data.cards = data.cards.map((c) =>
    c.sprint_id === sprintId ? { ...c, sprint_id: null } : c,
  );
  saveBoardData(boardId, data);
}
