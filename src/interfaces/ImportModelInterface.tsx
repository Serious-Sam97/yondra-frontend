// Custom JSON import models (YON-122). A project-scoped, reusable recipe that maps
// an arbitrary JSON shape onto cards. Mirrors the backend ImportModel + the
// ImportModelMapper definition it applies.

export type ImportFieldTarget =
  | "name"
  | "description"
  | "priority"
  | "due_date"
  | "story_points"
  | "value"
  | "tags"
  | "column"
  | "contact_name"
  | "contact_email"
  | "contact_phone";

export type ImportTransform =
  | { type: "none" }
  | { type: "const"; value: string }
  | { type: "split"; delimiter: string }
  | { type: "scale"; map: Record<string, string> }
  | { type: "date" }
  | { type: "number" };

// One wire on the patchbay: a card field fed by a source key (dot-path), optionally
// passed through a transform. `source` is null/absent for a pure const.
export interface ImportFieldRule {
  target: ImportFieldTarget;
  source?: string | null;
  transform?: ImportTransform | null;
}

export interface ImportModelInterface {
  id: number;
  project_id: number;
  name: string;
  mode: "many" | "one";
  item_path: string | null;
  fields: ImportFieldRule[];
  // A stored sample JSON that powers the patchbay's source keys + live preview.
  sample?: unknown;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

// The writable shape sent to create/update (server assigns id/project/timestamps).
export interface ImportModelInput {
  name?: string;
  mode?: "many" | "one";
  item_path?: string | null;
  fields?: ImportFieldRule[];
  sample?: unknown;
}
