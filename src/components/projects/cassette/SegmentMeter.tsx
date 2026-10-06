"use client";

import type { BoardFlow } from "@/interfaces/ProjectInterface";

// LED-style level meter: done segments lit phosphor, doing amber, the rest
// unlit. Segment counts are rounded so done + doing never overflow the strip.
export default function SegmentMeter({
  flow,
  segments = 50,
  scale = false,
}: {
  flow: BoardFlow;
  segments?: number;
  scale?: boolean;
}) {
  const total = flow.todo + flow.doing + flow.done;
  const done = total ? Math.round((flow.done / total) * segments) : 0;
  const doing = total
    ? Math.min(segments - done, Math.round((flow.doing / total) * segments))
    : 0;
  const pct = total ? Math.round((flow.done / total) * 100) : 0;

  return (
    <div
      role="img"
      aria-label={`${pct}% done: ${flow.done} done, ${flow.doing} doing, ${flow.todo} to do`}
    >
      {scale && (
        <div className="cs-meter-scale" aria-hidden>
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      )}
      <div className="cs-meter" aria-hidden>
        {Array.from({ length: segments }, (_, i) => (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-position segments
            key={i}
            className={i < done ? "done" : i < done + doing ? "doing" : ""}
          />
        ))}
      </div>
    </div>
  );
}
