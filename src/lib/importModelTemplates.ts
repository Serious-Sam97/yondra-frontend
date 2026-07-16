// Ready-made starting points for the Import Models tab (YON-122), so a project's
// first model isn't a blank page. Clicking one pre-fills a new draft (name, mode,
// item_path, wired fields, and a filled sample that drives the live preview); the
// user tweaks and saves. These are pure client-side templates — nothing is created
// until the user hits Save.

import type { ImportFieldRule } from "@/interfaces/ImportModelInterface";

export interface ImportModelTemplate {
  label: string;
  blurb: string;
  mode: "many" | "one";
  item_path: string;
  fields: ImportFieldRule[];
  sample: unknown;
}

export const IMPORT_MODEL_TEMPLATES: ImportModelTemplate[] = [
  {
    label: "Zendesk tickets",
    blurb: "A results[] array of support tickets",
    mode: "many",
    item_path: "results",
    fields: [
      { target: "name", source: "subject" },
      { target: "description", source: "description" },
      {
        target: "priority",
        source: "priority",
        transform: {
          type: "scale",
          map: { low: "low", normal: "medium", high: "high", urgent: "high" },
        },
      },
      { target: "tags", source: "tags" },
      { target: "contact_email", source: "requester.email" },
      { target: "due_date", source: "due_at", transform: { type: "date" } },
    ],
    sample: {
      results: [
        {
          subject: "Refund not received",
          description: "Customer says last week's refund never arrived.",
          priority: "high",
          tags: ["vip", "billing"],
          requester: { email: "sam@acme.io" },
          due_at: "2026-08-01",
        },
      ],
    },
  },
  {
    label: "Linear issues",
    blurb: "An issues[] array from a Linear export",
    mode: "many",
    item_path: "issues",
    fields: [
      { target: "name", source: "title" },
      { target: "description", source: "description" },
      {
        target: "priority",
        source: "priority",
        transform: {
          type: "scale",
          map: {
            "1": "high",
            "2": "high",
            "3": "medium",
            "4": "low",
            "0": "low",
          },
        },
      },
      {
        target: "story_points",
        source: "estimate",
        transform: { type: "number" },
      },
      { target: "column", source: "state.name" },
      { target: "tags", source: "labels" },
    ],
    sample: {
      issues: [
        {
          title: "Fix crash on export",
          description: "Null pointer when the board has no cards.",
          priority: 2,
          estimate: 3,
          state: { name: "In Progress" },
          labels: ["bug", "backend"],
        },
      ],
    },
  },
  {
    label: "Opportunity Canvas",
    blurb: "One canvas document → one card",
    mode: "one",
    item_path: "",
    fields: [
      { target: "name", source: "opportunity.name" },
      { target: "description", source: "problem.description" },
      {
        target: "priority",
        source: "commercialContext.urgency",
        transform: {
          type: "scale",
          map: { Low: "low", Medium: "medium", High: "high" },
        },
      },
      {
        target: "value",
        source: "commercialContext.expectedBudget",
        transform: { type: "number" },
      },
      {
        target: "due_date",
        source: "objective.desiredDeadline",
        transform: { type: "date" },
      },
      { target: "tags", source: "impact.types" },
      { target: "contact_name", source: "contact.name" },
      { target: "contact_email", source: "contact.emailOrPhone" },
    ],
    // A filled version of outputs/opportunity-canvas.en.json so the preview renders.
    // (Yondra also auto-detects a raw canvas via the built-in shape; this template is
    // the editable, patchbay-mapped alternative.)
    sample: {
      schemaVersion: "1.1",
      document: { code: "OC-2026-001", status: "draft" },
      opportunity: {
        name: "Acme warehouse rollout",
        client: "Acme Corp",
        segment: "Logistics",
      },
      contact: {
        name: "Jane Doe",
        role: "Ops Lead",
        emailOrPhone: "jane@acme.com",
      },
      problem: {
        description: "Manual stock counts cause frequent errors.",
        frequency: "Daily",
      },
      impact: { types: ["Financial", "Operational"], level: "High" },
      objective: {
        expectedResult: "Cut count errors by 80%",
        desiredDeadline: "2026-10-01",
      },
      commercialContext: { expectedBudget: "120000", urgency: "High" },
      strategicAlignment: { drivers: ["Efficiency"] },
      score: { result: 78, classification: "A" },
    },
  },
];
