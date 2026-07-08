"use client";

import {
  faSliders,
  faTableColumns,
  faTriangleExclamation,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import BoardsTab from "@/components/project-settings/BoardsTab";
import DangerTab from "@/components/project-settings/DangerTab";
import GeneralTab from "@/components/project-settings/GeneralTab";
import MembersTab from "@/components/project-settings/MembersTab";
import SettingsTabs, { type TabDef } from "@/components/settings/SettingsTabs";
import type {
  ProjectBoard,
  ProjectInterface,
} from "@/interfaces/ProjectInterface";
import { ApiError, fetchProject } from "@/lib/api";
import { fetchUser } from "@/lib/auth";
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

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject] = useState<ProjectInterface | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(
    undefined,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState<string>(
    searchParams.get("tab") ?? "general",
  );

  useDocumentTitle(
    project?.name
      ? `Yondra - ${project.name} · Settings`
      : "Yondra - Project settings",
  );

  const projectHref = `/projects/${id}`;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchProject(Number(id)), fetchUser(controller.signal)])
      .then(([data, user]: [ProjectInterface, { id: number } | null]) => {
        setProject(data);
        setCurrentUserId(user?.id);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
          setLoadError(
            "This project doesn't exist or you no longer have access to it.",
          );
        } else {
          setLoadError(
            "Could not load the project. Check your connection and try again.",
          );
        }
      });
    return () => controller.abort();
  }, [id]);

  const patch = (p: Partial<ProjectInterface>) =>
    setProject((b) => (b ? { ...b, ...p } : b));

  const canManage = useMemo(() => {
    if (!project) return false;
    if (project.can_manage === true) return true;
    if (project.owner_id === currentUserId) return true;
    return (
      project.members?.find((m) => m.id === currentUserId)?.role === "owner"
    );
  }, [project, currentUserId]);

  const tabs = useMemo<TabDef[]>(() => {
    if (!project) return [];
    const t: TabDef[] = [];
    if (canManage)
      t.push({ key: "general", label: "General", icon: faSliders });
    t.push({ key: "members", label: "Members", icon: faUsers });
    t.push({ key: "boards", label: "Boards", icon: faTableColumns });
    if (canManage)
      t.push({ key: "danger", label: "Danger", icon: faTriangleExclamation });
    return t;
  }, [project, canManage]);

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
            Project unavailable
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

  if (!project) {
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
        onClick={() => router.push(projectHref)}
        className="cf-label mb-6 flex items-center gap-1 cursor-pointer transition-colors duration-150"
        style={{ color: "var(--cf-text-muted)" }}
      >
        ← Back to project
      </button>
      <div className="mb-8">
        <p className="cf-label mb-1" style={{ color: "var(--cf-text-dim)" }}>
          Project settings
        </p>
        <div className="flex items-center gap-3">
          <span
            className="cf-led flex-shrink-0"
            style={{
              background: project.color,
              boxShadow: `0 0 8px ${project.color}`,
            }}
          />
          <h1 className="text-2xl md:text-3xl font-bold chrome-text">
            {project.name}
          </h1>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <SettingsTabs tabs={tabs} active={active} onSelect={setActive} />

        <div className="flex-1 min-w-0">
          {active === "general" && (
            <GeneralTab project={project} onSaved={patch} />
          )}
          {active === "members" && (
            <MembersTab
              project={project}
              currentUserId={currentUserId}
              onChange={(p: ProjectInterface) => setProject(p)}
            />
          )}
          {active === "boards" && (
            <BoardsTab
              project={project}
              canManage={canManage}
              onChange={(b: ProjectBoard[]) => patch({ boards: b })}
            />
          )}
          {active === "danger" && <DangerTab project={project} />}
        </div>
      </div>
    </div>
  );
}
