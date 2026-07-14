"use client";

import { faGithub, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import {
  faBoxArchive,
  faClockRotateLeft,
  faEnvelope,
  faSliders,
  faTableColumns,
  faTags,
  faTriangleExclamation,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import ActivityTab from "@/components/settings/ActivityTab";
import ArchivedTab from "@/components/settings/ArchivedTab";
import ColumnsTab from "@/components/settings/ColumnsTab";
import DangerTab from "@/components/settings/DangerTab";
import EmailTab from "@/components/settings/EmailTab";
import GeneralTab from "@/components/settings/GeneralTab";
import GitHubTab from "@/components/settings/GitHubTab";
import MembersTab from "@/components/settings/MembersTab";
import SettingsTabs, { type TabDef } from "@/components/settings/SettingsTabs";
import TagsTab from "@/components/settings/TagsTab";
import WhatsAppTab from "@/components/settings/WhatsAppTab";
import type {
  BoardInterface,
  SectionData,
  SharedUser,
} from "@/interfaces/BoardInterface";
import type { TagInterface } from "@/interfaces/TagInterface";
import { ApiError, fetchBoard } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const STRIPE_COLORS = [
  "#9aa67e",
  "#ffb000",
  "#ff5a4d",
  "#6fe0ff",
  "#9aa67e",
  "#ffb000",
];

type Params = { id: string };

export default function BoardSettingsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [board, setBoard] = useState<BoardInterface | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState<string>(
    searchParams.get("tab") ?? "general",
  );

  useDocumentTitle(
    board?.name
      ? `Yondra - ${board.name} · Settings`
      : "Yondra - Board settings",
  );

  const boardHref = `/boards/${id}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchBoard(Number(id), controller.signal)
      .then((data: BoardInterface) => {
        // Only writers/managers belong on the settings page.
        if (!data.can_write && !data.can_manage) {
          router.replace(boardHref);
          return;
        }
        setBoard(data);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
          setLoadError(
            "This board doesn't exist or you no longer have access to it.",
          );
        } else {
          setLoadError(
            "Could not load the board. Check your connection and try again.",
          );
        }
      });
    return () => controller.abort();
  }, [id]);

  const patch = (p: Partial<BoardInterface>) =>
    setBoard((b) => (b ? { ...b, ...p } : b));

  const tabs = useMemo<TabDef[]>(() => {
    if (!board) return [];
    const canWrite = board.can_write === true;
    const canManage = board.can_manage === true;
    const t: TabDef[] = [];
    if (canWrite) {
      t.push({ key: "general", label: "General", icon: faSliders });
      t.push({ key: "columns", label: "Columns", icon: faTableColumns });
      t.push({ key: "tags", label: "Tags", icon: faTags });
    }
    if (canManage) t.push({ key: "members", label: "Members", icon: faUsers });
    if (canManage) t.push({ key: "github", label: "GitHub", icon: faGithub });
    if (canManage)
      t.push({ key: "whatsapp", label: "WhatsApp", icon: faWhatsapp });
    // Email stage automations are contact-driven; contacts are a CRM-board affordance.
    if (canManage && board.type === "crm")
      t.push({ key: "email", label: "Email", icon: faEnvelope });
    t.push({ key: "activity", label: "Activity", icon: faClockRotateLeft });
    if (canManage) {
      t.push({ key: "archived", label: "Archived", icon: faBoxArchive });
      t.push({ key: "danger", label: "Danger", icon: faTriangleExclamation });
    }
    return t;
  }, [board]);

  // Keep the active tab valid for the current capabilities.
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.key === active))
      setActive(tabs[0].key);
  }, [tabs, active]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel flex flex-col items-center gap-4 px-8 py-10 text-center max-w-sm">
          <p
            className="cf-mono text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--cf-red)" }}
          >
            Board unavailable
          </p>
          <p
            className="cf-mono text-xs"
            style={{ color: "var(--cf-text-muted)" }}
          >
            {loadError}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{
            borderColor: "var(--cf-phosphor)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10 max-w-4xl mx-auto">
      {/* LED status strip */}
      <div className="flex gap-1.5 mb-6">
        {STRIPE_COLORS.map((c, i) => (
          <div
            key={i}
            style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }}
            className="h-1.5 flex-1 rounded-sm"
          />
        ))}
      </div>

      {/* Back + title */}
      <button
        onClick={() => router.push(boardHref)}
        className="cf-label mb-6 flex items-center gap-1 cursor-pointer transition-colors duration-150"
        style={{ color: "var(--cf-text-muted)" }}
      >
        ← Back to board
      </button>
      <div className="mb-8">
        <p className="cf-label mb-1" style={{ color: "var(--cf-text-dim)" }}>
          Board settings
        </p>
        <h1 className="text-2xl md:text-3xl font-bold chrome-text">
          {board.name}
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <SettingsTabs tabs={tabs} active={active} onSelect={setActive} />

        <div className="flex-1 min-w-0">
          {active === "general" && <GeneralTab board={board} onSaved={patch} />}
          {active === "github" && <GitHubTab board={board} onSaved={patch} />}
          {active === "whatsapp" && (
            <WhatsAppTab board={board} onSaved={patch} />
          )}
          {active === "email" && <EmailTab board={board} onSaved={patch} />}
          {active === "columns" && (
            <ColumnsTab
              board={board}
              onChange={(s: SectionData[]) => patch({ sections: s })}
              onBoardPatch={patch}
            />
          )}
          {active === "tags" && (
            <TagsTab
              board={board}
              onChange={(t: TagInterface[]) => patch({ tags: t })}
            />
          )}
          {active === "members" && (
            <MembersTab
              board={board}
              onChange={(u: SharedUser[]) => patch({ shared_with: u })}
            />
          )}
          {active === "activity" && <ActivityTab board={board} />}
          {active === "archived" && <ArchivedTab board={board} />}
          {active === "danger" && <DangerTab board={board} />}
        </div>
      </div>
    </div>
  );
}
