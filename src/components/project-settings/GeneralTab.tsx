"use client";

import { useState } from "react";
import {
  type Feedback,
  FeedbackBanner,
  PanelHeading,
  PermSegments,
} from "@/components/settings/shared";
import type { BoardPermission } from "@/interfaces/BoardInterface";
import type { ProjectInterface } from "@/interfaces/ProjectInterface";
import { updateProject } from "@/lib/api";

const PROJECT_COLORS = [
  "#1976D2",
  "#388E3C",
  "#F57C00",
  "#7B1FA2",
  "#C62828",
  "#00838F",
  "#AD1457",
  "#4527A0",
];

interface Props {
  project: ProjectInterface;
  onSaved: (patch: Partial<ProjectInterface>) => void;
}

export default function GeneralTab({ project, onSaved }: Props) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [color, setColor] = useState(project.color);
  const [defaultPermission, setDefaultPermission] = useState<BoardPermission>(
    project.default_permission ?? "write",
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFeedback(null);
    setSaving(true);
    try {
      await updateProject(project.id, {
        name: trimmed,
        description: description.trim() || null,
        color,
        default_permission: defaultPermission,
      });
      onSaved({
        name: trimmed,
        description: description.trim() || null,
        color,
        default_permission: defaultPermission,
      });
      setFeedback({ type: "success", message: "Project settings saved." });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to save project settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-5">
      <PanelHeading>General</PanelHeading>
      <FeedbackBanner feedback={feedback} />

      <div className="flex flex-col gap-4">
        <div>
          <label className="cf-label block mb-2">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name…"
            className="glass-input"
          />
        </div>
        <div>
          <label className="cf-label block mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional…"
            rows={2}
            className="glass-input resize-none"
          />
        </div>

        <div>
          <label className="cf-label block mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                style={{
                  backgroundColor: c,
                  width: 26,
                  height: 26,
                  borderRadius: "6px",
                  borderColor:
                    color === c ? "var(--cf-phosphor)" : "var(--cf-edge)",
                  boxShadow: color === c ? `0 0 10px ${c}` : undefined,
                }}
                className={`border-2 transition-all cursor-pointer ${color === c ? "scale-125" : ""}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="cf-label block mb-2">
            Default board permission
          </label>
          <PermSegments
            value={defaultPermission}
            onChange={setDefaultPermission}
          />
          <span
            className="cf-mono text-[10px] block mt-2"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Applied to new boards created in this project.
          </span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="aero-btn aero-btn--cyan self-end px-5 py-2.5"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
