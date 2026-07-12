"use client";

import { useEffect, useState } from "react";
import { createTemplate, deleteTemplate, getTemplates } from "@/lib/api";
import {
  deleteDemoTemplate,
  loadDemoTemplates,
  saveDemoTemplate,
} from "@/lib/demoStorage";

export interface Template {
  id: number;
  name: string;
  template_data: unknown;
}

interface UseCardTemplatesParams {
  isDemo: boolean;
  demoId: string;
  boardId?: number;
  initialTemplates: Template[];
  // Form state the templates read from (save) and write to (apply).
  description: string;
  selectedTagIds: number[];
  priority: "low" | "medium" | "high" | null;
  dueDate: string;
  setDescription: (v: string) => void;
  setSelectedTagIds: (v: number[]) => void;
  setPriority: (v: "low" | "medium" | "high" | null) => void;
  setDueDate: (v: string) => void;
}

// Card templates for the editor: snapshot the current form (description, tags,
// priority, due date) under a name, or apply a saved snapshot back onto the form.
export function useCardTemplates({
  isDemo,
  demoId,
  boardId,
  initialTemplates,
  description,
  selectedTagIds,
  priority,
  dueDate,
  setDescription,
  setSelectedTagIds,
  setPriority,
  setDueDate,
}: UseCardTemplatesParams) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setTemplates(loadDemoTemplates(demoId));
    } else if (boardId && initialTemplates.length === 0) {
      getTemplates(boardId)
        .then((data) => setTemplates(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, []);

  const handleSaveTemplate = async () => {
    const tname = templateNameInput.trim();
    if (!tname) return;
    const data = {
      name: tname,
      description,
      tag_ids: selectedTagIds,
      priority,
      due_date: dueDate || null,
    };
    if (isDemo) {
      const t = saveDemoTemplate(demoId, tname, data);
      setTemplates((prev) => [...prev, t]);
    } else if (boardId) {
      const t = await createTemplate(boardId, {
        name: tname,
        template_data: data,
      }).catch(() => null);
      if (t) setTemplates((prev) => [...prev, t]);
    }
    setTemplateNameInput("");
    setShowSaveTemplate(false);
  };

  const handleApplyTemplate = (t: Template) => {
    const d = t.template_data as {
      description?: string;
      tag_ids?: number[];
      priority?: "low" | "medium" | "high" | null;
      due_date?: string | null;
    };
    if (d.description !== undefined) setDescription(d.description);
    if (d.tag_ids !== undefined) setSelectedTagIds(d.tag_ids);
    if (d.priority !== undefined) setPriority(d.priority);
    if (d.due_date !== undefined) setDueDate(d.due_date ?? "");
    setShowTemplatePicker(false);
  };

  const handleDeleteTemplate = async (tId: number) => {
    if (isDemo) {
      deleteDemoTemplate(demoId, tId);
    } else if (boardId) {
      await deleteTemplate(boardId, tId).catch(() => {});
    }
    setTemplates((prev) => prev.filter((t) => t.id !== tId));
  };

  return {
    templates,
    showTemplatePicker,
    setShowTemplatePicker,
    templateNameInput,
    setTemplateNameInput,
    showSaveTemplate,
    setShowSaveTemplate,
    handleSaveTemplate,
    handleApplyTemplate,
    handleDeleteTemplate,
  };
}
