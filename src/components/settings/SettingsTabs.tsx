"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import Icon from "@/components/ui/Icon";

export interface TabDef {
  key: string;
  label: string;
  icon: IconDefinition;
}

interface Props {
  tabs: TabDef[];
  active: string;
  onSelect: (key: string) => void;
}

export default function SettingsTabs({ tabs, active, onSelect }: Props) {
  return (
    <nav
      className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible md:w-52 flex-shrink-0 pb-1 md:pb-0"
      aria-label="Board settings sections"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className="cf-label flex items-center gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-150 flex-shrink-0 text-left whitespace-nowrap"
            style={{
              border: `1px solid ${isActive ? "var(--cf-phosphor)" : "var(--cf-edge)"}`,
              background: isActive ? "rgba(154,166,126,0.14)" : "transparent",
              color: isActive ? "var(--cf-phosphor)" : "var(--cf-text-muted)",
              boxShadow: isActive
                ? "0 0 8px rgba(154,166,126,0.35)"
                : undefined,
            }}
          >
            <Icon icon={tab.icon} style={{ fontSize: "12px", width: 14 }} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
