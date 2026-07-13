"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBoxArchive,
  faClipboardList,
  faCommentDots,
  faPalette,
  faTag,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { type Dispatch, type SetStateAction, useRef } from "react";
import Icon from "@/components/ui/Icon";
import type { BoardViewMode } from "./BoardTopBar";

// Per-tool colors chosen to echo each original emoji's dominant hue.
export const TOOL_COLORS = {
  tags: "#f97316", // 🏷 orange label
  activity: "#c2a878", // 📋 tan clipboard
  chat: "#d4d4d4", // 💬 light speech bubble
  archived: "#d9a441", // 🗂 manila folder
  background: "#c08bff", // 🎨 artist palette
  config: "#9ca3af", // ⚙ steel gear
  standup: "#9ece6a", // AI phosphor green
} as const;

function ToolBtn({
  icon,
  label,
  color,
  onClick,
}: {
  icon: IconDefinition;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="cf-mono text-[9px] uppercase tracking-widest whitespace-nowrap"
        style={{ color: "var(--cf-text-muted)" }}
      >
        {label}
      </span>
      <button
        onClick={onClick}
        className="aero-btn aero-btn--ghost w-10 h-10 flex items-center justify-center cursor-pointer text-lg"
        style={{ color }}
      >
        <Icon icon={icon} />
      </button>
    </div>
  );
}

function MobileToolBtn({
  icon,
  label,
  color,
  onClick,
}: {
  icon: IconDefinition;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="aero-btn aero-btn--ghost flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl cursor-pointer"
    >
      <span className="text-2xl" style={{ color }}>
        <Icon icon={icon} />
      </span>
      <span
        className="cf-mono text-[9px] uppercase tracking-widest"
        style={{ color: "var(--cf-text-muted)" }}
      >
        {label}
      </span>
    </button>
  );
}

interface BoardToolsDockProps {
  viewMode: BoardViewMode;
  isDemo: boolean;
  isToolbarOpen: boolean;
  setIsToolbarOpen: Dispatch<SetStateAction<boolean>>;
  onOpenTags: () => void;
  onOpenActivity: () => void;
  onOpenChat: () => void;
  onOpenArchived: () => void;
  onOpenBackground: () => void;
  onOpenStandup: () => void;
}

// Board tool launchers: the desktop toolbar (vertical on kanban/list, horizontal
// bottom bar on calendar/analytics) plus the mobile swipe-up bottom drawer.
export function BoardToolsDock({
  viewMode,
  isDemo,
  isToolbarOpen,
  setIsToolbarOpen,
  onOpenTags,
  onOpenActivity,
  onOpenChat,
  onOpenArchived,
  onOpenBackground,
  onOpenStandup,
}: BoardToolsDockProps) {
  const touchStartY = useRef<number>(0);

  return (
    <>
      {/* Desktop toolbar — vertical on kanban/list, horizontal bottom bar on calendar/analytics */}
      {viewMode === "kanban" ? (
        <div
          className="hidden lg:flex flex-col items-end gap-2 fixed z-40"
          style={{ right: "24px", bottom: "96px" }}
        >
          <ToolBtn
            icon={faTag}
            color={TOOL_COLORS.tags}
            label="Tags"
            onClick={onOpenTags}
          />
          {!isDemo && (
            <ToolBtn
              icon={faClipboardList}
              color={TOOL_COLORS.activity}
              label="Activity"
              onClick={onOpenActivity}
            />
          )}
          {!isDemo && (
            <ToolBtn
              icon={faCommentDots}
              color={TOOL_COLORS.chat}
              label="Chat"
              onClick={onOpenChat}
            />
          )}
          {!isDemo && (
            <ToolBtn
              icon={faWandMagicSparkles}
              color={TOOL_COLORS.standup}
              label="Standup"
              onClick={onOpenStandup}
            />
          )}
          <ToolBtn
            icon={faBoxArchive}
            color={TOOL_COLORS.archived}
            label="Archived"
            onClick={onOpenArchived}
          />
          <ToolBtn
            icon={faPalette}
            color={TOOL_COLORS.background}
            label="Background"
            onClick={onOpenBackground}
          />
        </div>
      ) : (
        <div
          className="hidden lg:flex flex-row items-center gap-2 fixed z-40"
          style={{ bottom: "28px", left: "50%", transform: "translateX(-50%)" }}
        >
          {[
            {
              icon: faTag,
              color: TOOL_COLORS.tags,
              label: "Tags",
              onClick: onOpenTags,
            },
            ...(!isDemo
              ? [
                  {
                    icon: faClipboardList,
                    color: TOOL_COLORS.activity,
                    label: "Activity",
                    onClick: onOpenActivity,
                  },
                ]
              : []),
            ...(!isDemo
              ? [
                  {
                    icon: faCommentDots,
                    color: TOOL_COLORS.chat,
                    label: "Chat",
                    onClick: onOpenChat,
                  },
                ]
              : []),
            ...(!isDemo
              ? [
                  {
                    icon: faWandMagicSparkles,
                    color: TOOL_COLORS.standup,
                    label: "Standup",
                    onClick: onOpenStandup,
                  },
                ]
              : []),
            {
              icon: faBoxArchive,
              color: TOOL_COLORS.archived,
              label: "Archived",
              onClick: onOpenArchived,
            },
            {
              icon: faPalette,
              color: TOOL_COLORS.background,
              label: "Background",
              onClick: onOpenBackground,
            },
          ].map(({ icon, color, label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              title={label}
              className="aero-btn aero-btn--ghost w-10 h-10 flex items-center justify-center cursor-pointer text-lg"
              style={{ color }}
            >
              <Icon icon={icon} />
            </button>
          ))}
        </div>
      )}

      {/* Mobile bottom drawer */}
      <div className="lg:hidden">
        {isToolbarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsToolbarOpen(false)}
          />
        )}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out"
          style={{
            transform: isToolbarOpen
              ? "translateY(0)"
              : "translateY(calc(100% - 36px))",
          }}
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const delta = touchStartY.current - e.changedTouches[0].clientY;
            if (delta > 40) setIsToolbarOpen(true);
            if (delta < -40) setIsToolbarOpen(false);
          }}
        >
          <div className="aero-menu border-t rounded-t-2xl rounded-b-none">
            <div
              className="flex items-center justify-center gap-2 pt-3 pb-2 cursor-pointer"
              onClick={() => setIsToolbarOpen((s) => !s)}
            >
              <div
                className="w-10 h-1 rounded-full flex-shrink-0"
                style={{ background: "var(--cf-edge)" }}
              />
              {!isToolbarOpen && (
                <span
                  className="cf-mono text-[9px] uppercase tracking-widest font-bold"
                  style={{ color: "var(--cf-text-muted)" }}
                >
                  Tools
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-evenly px-2 pb-8 pt-1 gap-y-1">
              <MobileToolBtn
                icon={faTag}
                color={TOOL_COLORS.tags}
                label="Tags"
                onClick={() => {
                  onOpenTags();
                  setIsToolbarOpen(false);
                }}
              />
              {!isDemo && (
                <MobileToolBtn
                  icon={faClipboardList}
                  color={TOOL_COLORS.activity}
                  label="Activity"
                  onClick={() => {
                    onOpenActivity();
                    setIsToolbarOpen(false);
                  }}
                />
              )}
              {!isDemo && (
                <MobileToolBtn
                  icon={faCommentDots}
                  color={TOOL_COLORS.chat}
                  label="Chat"
                  onClick={() => {
                    onOpenChat();
                    setIsToolbarOpen(false);
                  }}
                />
              )}
              {!isDemo && (
                <MobileToolBtn
                  icon={faWandMagicSparkles}
                  color={TOOL_COLORS.standup}
                  label="Standup"
                  onClick={() => {
                    onOpenStandup();
                    setIsToolbarOpen(false);
                  }}
                />
              )}
              <MobileToolBtn
                icon={faBoxArchive}
                color={TOOL_COLORS.archived}
                label="Archived"
                onClick={() => {
                  onOpenArchived();
                  setIsToolbarOpen(false);
                }}
              />
              <MobileToolBtn
                icon={faPalette}
                color={TOOL_COLORS.background}
                label="Background"
                onClick={() => {
                  onOpenBackground();
                  setIsToolbarOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
