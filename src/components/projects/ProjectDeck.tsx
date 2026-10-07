"use client";

import {
  faBars,
  faCrown,
  faGear,
  faPen,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import Icon from "@/components/ui/Icon";
import { SvgArt } from "@/components/ui/SvgArt";
import { headerWaveform } from "@/lib/boardArt";
import type {
  BoardFlow,
  ProjectInterface,
} from "@/interfaces/ProjectInterface";
import CrewStack from "./cassette/CrewStack";
import DeckScreen from "./DeckScreen";

// Project page header as the front panel of a tape deck: sunset trim, the
// project LED + title, crew pill (replaces the old members side panel), the
// hardware keys, and the DeckScreen readouts. The vaporwave slit-sun lives on
// the engraved model plate.
export default function ProjectDeck({
  project,
  roleLabel,
  isOwner,
  canManage,
  editMode,
  stats,
  onToggleSidebar,
  onToggleEdit,
  onNewBoard,
  onOpenSettings,
  onOpenMembers,
}: {
  project: ProjectInterface | null;
  roleLabel: string;
  isOwner: boolean;
  canManage: boolean;
  editMode: boolean;
  stats: {
    cards: number;
    boards: number;
    archived: number;
    recording: number;
    flow: BoardFlow;
  };
  onToggleSidebar: () => void;
  onToggleEdit: () => void;
  onNewBoard: () => void;
  onOpenSettings: () => void;
  onOpenMembers: () => void;
}) {
  const color = project?.color ?? "var(--cf-phosphor)";
  const members = project?.members ?? [];
  const crewLabel = `${members.length} crew`;
  // Box-set label stripes in the project colour (same recipe as board labels).
  const stripes = [
    color,
    `color-mix(in srgb, ${color} 55%, #ff5a4d)`,
    `color-mix(in srgb, ${color} 45%, #ffb000)`,
  ];
  const latinName = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]*$/u.test(
    project?.name ?? "",
  );
  const tapes = String(stats.boards).padStart(2, "0");

  return (
    <section
      className="pd-deck"
      style={{ "--pc": color } as React.CSSProperties}
      aria-label="Project overview"
    >
      <SvgArt as="div" className="ph-art" svg={headerWaveform()} aria-hidden />
      <div className="ph-trim" aria-hidden>
        {stripes.map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
      </div>

      <div className="pd-top">
        <button
          type="button"
          className="lg:hidden p-1 cursor-pointer self-start mt-1"
          style={{ color: "var(--cf-text)" }}
          onClick={onToggleSidebar}
          aria-label="Open project list"
        >
          <Icon icon={faBars} />
        </button>
        {/* Box-set label: stripes, tape count, handwritten name, summary. */}
        <div className="ph-label" title={project?.description ?? undefined}>
          <span className="ph-stripes" aria-hidden>
            {stripes.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
          <span className="ph-box" aria-label={`${stats.boards} boards`}>
            <b>{tapes}</b>
            <small>TAPES</small>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className={`pd-title${latinName ? "" : " plain"}`}>
                {project?.name}
              </h1>
              <span className={`pd-role${isOwner ? " is-owner" : ""}`}>
                {isOwner && <Icon icon={faCrown} style={{ fontSize: 8 }} />}
                {roleLabel}
              </span>
            </div>
            <div className="ph-sub">
              Box set · {stats.boards} tape{stats.boards === 1 ? "" : "s"} ·{" "}
              {stats.cards} cards · {members.length} crew
            </div>
          </div>
        </div>
        <div className="flex-1" />

        <div className="pd-actions">
          {members.length > 0 &&
            (canManage ? (
              <button
                type="button"
                className="pd-crew is-button"
                onClick={onOpenMembers}
                aria-label={`${crewLabel}. Manage members`}
              >
                <CrewStack users={members} max={4} size={26} ring="#2b2a26" />
                <span className="pd-crew-label">{crewLabel}</span>
              </button>
            ) : (
              <div
                className="pd-crew"
                title={members.map((m) => m.name).join(", ")}
              >
                <CrewStack users={members} max={4} size={26} ring="#2b2a26" />
                <span className="pd-crew-label">{crewLabel}</span>
              </div>
            ))}
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="aero-btn aero-btn--ghost pd-key"
              >
                <Icon icon={faGear} />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={onToggleEdit}
                aria-pressed={editMode}
                className={`aero-btn aero-btn--${editMode ? "magenta" : "ghost"} pd-key`}
              >
                <Icon icon={faPen} />
                <span className="hidden sm:inline">
                  {editMode ? "Done" : "Edit"}
                </span>
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={onNewBoard}
                className="aero-btn aero-btn--cyan pd-key"
              >
                <Icon icon={faPlus} />
                <span className="hidden sm:inline">Board</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <DeckScreen
        cards={stats.cards}
        boards={stats.boards}
        archived={stats.archived}
        recording={stats.recording}
        flow={stats.flow}
        throughput={project?.throughput}
      />
      <div className="pd-plate" aria-hidden>
        <span className="pd-plate-sun" />
        Yondra · project deck
      </div>
    </section>
  );
}
