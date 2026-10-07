"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/DashboardShell";
import {
  BoxSets,
  CueSheet,
  Mixer,
  Receiver,
  RecordingLog,
  Spectrum,
} from "@/components/dashboard/HiFiPanels";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

// "Home hi-fi" dashboard (design/dashboard-suggestion.png). The side panel and
// data live in DashboardShell (app/dashboard/layout.tsx); styles in hifi.css.
export default function DashboardPage() {
  useDocumentTitle("Yondra - Dashboard");
  const router = useRouter();
  const { user, data, projects, latestProjectId } = useDashboard();
  const projectMeta = useMemo(
    () => new Map((data?.projects_meta ?? []).map((m) => [m.id, m])),
    [data?.projects_meta],
  );
  const loaded = !!data;
  const deck = data?.deck ?? [];
  const crm = data?.crm ?? null;
  const openCard = (boardId: number, cardId: number) =>
    router.push(`/boards/${boardId}?card=${cardId}`);

  return (
    <main className={`hf-main${crm ? "" : " no-crm"}`}>
      <Receiver
        name={user?.name ?? null}
        vitals={data?.vitals}
        crm={crm}
        projects={projects}
        meta={projectMeta}
      />

      <div className="hf-grid">
        <section className="hf-pn cue-pn">
          <div className="hf-ph">
            <span
              className="tp"
              style={{ "--c": "#b5533c" } as React.CSSProperties}
            >
              Cue sheet
            </span>
            <small>your open tracks</small>
            <span className="r">
              {deck.length} cue{deck.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="hf-cuewrap">
            <CueSheet
              deck={deck}
              overdue={data?.vitals.overdue ?? 0}
              loaded={loaded}
              onOpen={(c) => openCard(c.board_id, c.id)}
            />
            <RecordingLog
              activity={data?.activity ?? []}
              prs={data?.prs ?? []}
              loaded={loaded}
            />
          </div>
        </section>

        <section className="hf-pn box-pn" id="yd-projects">
          <div className="hf-ph">
            <span
              className="tp"
              style={{ "--c": "#8a7356" } as React.CSSProperties}
            >
              Box sets
            </span>
            <small>your projects</small>
            {latestProjectId != null && (
              <Link className="r" href={`/projects/${latestProjectId}`}>
                All projects →
              </Link>
            )}
          </div>
          <BoxSets
            projects={projects}
            meta={projectMeta}
            loaded={loaded}
            onOpen={(p) => router.push(`/projects/${p.id}`)}
            onBoard={(b) => router.push(`/boards/${b.id}`)}
          />
        </section>

        <section className="hf-pn spec-pn">
          <div className="hf-ph">
            <span
              className="tp"
              style={{ "--c": "#d9822b" } as React.CSSProperties}
            >
              Spectrum
            </span>
            <small>cards done / day</small>
          </div>
          <Spectrum data={data?.throughput ?? []} sprint={data?.sprint} />
        </section>

        {crm && (
          <section className="hf-pn mix-pn">
            <div className="hf-ph">
              <span
                className="tp"
                style={{ "--c": "#6f8a4a" } as React.CSSProperties}
              >
                Mixer
              </span>
              <small>CRM pipeline</small>
              <Link className="r" href="/dashboard/revenue">
                Revenue →
              </Link>
            </div>
            <Mixer crm={crm} />
          </section>
        )}
      </div>
    </main>
  );
}
