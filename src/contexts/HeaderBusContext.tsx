"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { BoardViewMode } from "@/components/ui/BoardTopBar";

// What a board page publishes so the console header (MenuAppBar) can act on it:
// view switching (MODE keys), section counts (WIP faders), quick card creation,
// and column jumps. Null everywhere else — the header degrades gracefully.
export interface HeaderBoardBus {
  boardId: number | string;
  boardName: string;
  boardType: "kanban" | "scrum" | "crm";
  projectId: number | null;
  isDemo: boolean;
  canWrite: boolean;
  qaEnabled: boolean;
  viewMode: BoardViewMode;
  setViewMode: (v: BoardViewMode) => void;
  sections: { id: number; name: string; count: number }[];
  quickCreate: (name: string) => Promise<void>;
  jumpToSection: (sectionId: number) => void;
}

interface HeaderBusValue {
  board: HeaderBoardBus | null;
  publish: (bus: HeaderBoardBus) => void;
  clear: () => void;
}

const HeaderBusContext = createContext<HeaderBusValue>({
  board: null,
  publish: () => {},
  clear: () => {},
});

export function HeaderBusProvider({ children }: { children: React.ReactNode }) {
  const [board, setBoard] = useState<HeaderBoardBus | null>(null);
  const publish = useCallback((bus: HeaderBoardBus) => setBoard(bus), []);
  const clear = useCallback(() => setBoard(null), []);
  const value = useMemo(
    () => ({ board, publish, clear }),
    [board, publish, clear],
  );
  return (
    <HeaderBusContext.Provider value={value}>
      {children}
    </HeaderBusContext.Provider>
  );
}

export const useHeaderBus = () => useContext(HeaderBusContext);
