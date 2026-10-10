// Proposed actions (the ACTION/ACTIONS protocol): what the contract says, and
// how it is executed once signed — through the same authorized REST endpoints
// the regular UI uses. Vortex himself never writes anything. A batch runs in
// order and stops at the first failure, reporting what went through (G-02).

import type { VortexAction } from "@/hooks/useVortexChat";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import {
  apiFetch,
  archiveBoard,
  createBoard,
  createCard,
  createComment,
  createProject,
  createSection,
  createSubtask,
  createTag,
  deleteCard,
  fetchBoard,
  updateCard,
} from "@/lib/api";

const q = (s: string) => `“${s}”`;
const boardLabel = (a: { board_id: number; board_name?: string }) =>
  a.board_name ? q(a.board_name) : `#${a.board_id}`;
const cardLabel = (a: { card_id: number; card_name?: string }) =>
  a.card_name ? q(a.card_name) : `card #${a.card_id}`;

export function describeAction(action: VortexAction): string {
  switch (action.kind) {
    case "create_project":
      return `create project ${q(action.name)}${
        action.boards.length > 0
          ? ` with ${action.boards.map((b) => `${q(b.name)} (${b.type})`).join(", ")}`
          : ""
      }`;
    case "create_board":
      return `create board ${q(action.name)} (${action.type})${
        action.project_id !== undefined
          ? ` in project #${action.project_id}`
          : ""
      }`;
    case "create_card":
      return `create card ${q(action.name)} on ${boardLabel(action)}${action.column ? ` in ${q(action.column)}` : ""}`;
    case "add_column":
      return `add column ${q(action.name)} to ${boardLabel(action)}`;
    case "archive_board":
      return `archive board ${boardLabel(action)}`;
    case "move_card":
      return `move ${cardLabel(action)} → ${action.column}`;
    case "rename_card":
      return `rename ${cardLabel(action)} → ${q(action.name)}`;
    case "set_due":
      return `${cardLabel(action)}: due ${action.due ?? "(none)"}`;
    case "assign_card":
      return `assign ${cardLabel(action)} to ${action.user_name}`;
    case "add_label":
      return `label ${cardLabel(action)} ${q(action.label)}`;
    case "add_comment":
      return `comment on ${cardLabel(action)}: ${q(action.text.slice(0, 80))} (via Vortex)`;
    case "set_description":
      return `write the description of ${cardLabel(action)}`;
    case "archive_card":
      return `archive ${cardLabel(action)}`;
    case "remind":
      return `remind you ${new Date(action.at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}: ${q(action.text)}`;
  }
}

/** The contract's diff line (+ create, ~ change, - remove). */
export function diffLine(action: VortexAction): {
  sign: "+" | "~" | "-";
  text: string;
} {
  const sign: "+" | "~" | "-" = ["archive_board", "archive_card"].includes(
    action.kind,
  )
    ? "-"
    : [
          "create_project",
          "create_board",
          "create_card",
          "add_column",
          "add_comment",
          "remind",
        ].includes(action.kind)
      ? "+"
      : "~";
  return { sign, text: describeAction(action) };
}

const boards = new Map<number, Promise<BoardInterface>>();
const board = (id: number) => {
  if (!boards.has(id)) boards.set(id, fetchBoard(id));
  return boards.get(id) as Promise<BoardInterface>;
};
const section = async (boardId: number, column?: string) => {
  const b = await board(boardId);
  const wanted = column?.trim().toLowerCase();
  const s =
    (wanted &&
      b.sections?.find((x) => x.name.trim().toLowerCase() === wanted)) ||
    (!wanted && b.sections?.[0]);
  if (!s) throw new Error(`no column ${column ?? ""}`);
  return s;
};

/** Run a signed action. Resolves with where to go afterwards. */
export async function runAction(action: VortexAction): Promise<string> {
  switch (action.kind) {
    case "create_project": {
      const project = await createProject({
        name: action.name,
        description: action.description ?? null,
      });
      let firstBoardId: number | null = null;
      for (const b of action.boards) {
        const nb = await createBoard({
          name: b.name,
          description: "",
          project_id: project.id,
          type: b.type,
        });
        firstBoardId ??= nb.id;
      }
      return firstBoardId !== null ? `/boards/${firstBoardId}` : "/projects";
    }
    case "create_board": {
      const nb = await createBoard({
        name: action.name,
        description: "",
        project_id: action.project_id ?? null,
        type: action.type,
      });
      return `/boards/${nb.id}`;
    }
    case "create_card": {
      // G-06 · a split: the pieces become subtasks of the big card
      if (action.parent_card_id) {
        await createSubtask(action.board_id, action.parent_card_id, {
          name: action.name,
          description: action.description ?? "",
        });
        return `/boards/${action.board_id}?card=${action.parent_card_id}`;
      }
      const s = await section(action.board_id, action.column).catch(() =>
        section(action.board_id),
      );
      const card = await createCard(action.board_id, {
        section_id: s.id,
        name: action.name,
        description: action.description ?? "",
      });
      return `/boards/${action.board_id}?card=${card.id}`;
    }
    case "add_column":
      await createSection(action.board_id, action.name);
      return `/boards/${action.board_id}`;
    case "archive_board":
      await archiveBoard(action.board_id);
      return "/projects";
    case "move_card": {
      const s = await section(action.board_id, action.column);
      await updateCard(action.board_id, action.card_id, { section_id: s.id });
      return `/boards/${action.board_id}`;
    }
    case "rename_card":
      await updateCard(action.board_id, action.card_id, { name: action.name });
      return `/boards/${action.board_id}?card=${action.card_id}`;
    case "set_due":
      await updateCard(action.board_id, action.card_id, {
        due_date: action.due,
      });
      return `/boards/${action.board_id}?card=${action.card_id}`;
    case "assign_card": {
      const b = await board(action.board_id);
      const who = action.user_name.trim().toLowerCase();
      const people = [b.owner, ...(b.shared_with ?? [])].filter(Boolean) as {
        id: number;
        name: string;
      }[];
      const u =
        people.find((p) => p.name.toLowerCase() === who) ??
        people.find((p) => p.name.toLowerCase().startsWith(who));
      if (!u) throw new Error(`${action.user_name} isn't on this board`);
      await updateCard(action.board_id, action.card_id, {
        assigned_user_id: u.id,
      });
      return `/boards/${action.board_id}?card=${action.card_id}`;
    }
    case "add_label": {
      const b = await board(action.board_id);
      const card = b.cards.find((c) => Number(c.id) === action.card_id);
      let tag = b.tags?.find(
        (t) => t.name.toLowerCase() === action.label.toLowerCase(),
      );
      tag ??= await createTag(action.board_id, {
        name: action.label,
        color: "#c8962e",
      });
      const ids = [
        ...new Set([...(card?.tags ?? []).map((t) => t.id), tag.id]),
      ];
      await updateCard(action.board_id, action.card_id, { tag_ids: ids });
      return `/boards/${action.board_id}?card=${action.card_id}`;
    }
    case "add_comment":
      await createComment(
        action.board_id,
        action.card_id,
        `${action.text}\n\n— via Vortex`,
      );
      return `/boards/${action.board_id}?card=${action.card_id}`;
    case "set_description":
      await updateCard(action.board_id, action.card_id, {
        description: action.description,
      });
      return `/boards/${action.board_id}?card=${action.card_id}`;
    case "archive_card":
      await deleteCard(action.board_id, action.card_id);
      return `/boards/${action.board_id}`;
    case "remind":
      await apiFetch("/api/mascot/reminders", {
        method: "POST",
        body: JSON.stringify({ text: action.text, at: action.at }),
      });
      return window.location.pathname;
  }
}

/**
 * G-02 · run a signed batch in order; stop at the first failure.
 * Resolves with per-line results and where to go.
 */
export async function runBatch(
  actions: VortexAction[],
  onStep?: (i: number, state: "ok" | "fail") => void,
): Promise<{
  results: ("ok" | "fail" | "skip")[];
  to: string;
  error?: string;
}> {
  boards.clear();
  const results: ("ok" | "fail" | "skip")[] = actions.map(() => "skip");
  let to = window.location.pathname;
  for (const [i, a] of actions.entries()) {
    try {
      to = await runAction(a);
      results[i] = "ok";
      onStep?.(i, "ok");
      if (
        a.kind !== "create_project" &&
        a.kind !== "create_board" &&
        a.kind !== "create_card"
      )
        boards.delete("board_id" in a ? a.board_id : -1);
    } catch (e) {
      results[i] = "fail";
      onStep?.(i, "fail");
      return {
        results,
        to,
        error: e instanceof Error ? e.message : "it failed",
      };
    }
  }
  return { results, to };
}
