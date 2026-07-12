import type { CardInterface } from "./CardInterface";

export interface SectionInterface {
  id: number;
  name: string;
  color: string;
  parent?: unknown;
  cards: CardInterface[];
  handleClick: (card: CardInterface) => void;
  // Section callbacks receive the section id so Board can pass ONE stable
  // handler to every column (Section is memoized — per-section inline closures
  // would defeat React.memo and re-render all columns on each keystroke).
  onDelete?: (id: number, name: string) => void;
  onRename?: (id: number, newName: string) => void;
  wipLimit?: number | null;
  onSetWipLimit?: (id: number, limit: number | null) => void;
  // CRM: board type + currency drive the deal-value column total.
  boardType?: "kanban" | "scrum" | "crm";
  currency?: string;
  // CRM: per-stage SLA aging threshold (hours) passed down to cards.
  agingHours?: number | null;
}
