"use client";

import Avatar from "../Avatar";

// Overlapped avatar row capped at `max`, with a "+n" chip for the overflow.
export default function CrewStack({
  users,
  max = 4,
  size = 22,
  ring = "#2c2a24",
}: {
  users: { id: number; name: string }[];
  max?: number;
  size?: number;
  ring?: string;
}) {
  if (users.length === 0) return null;
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  const overlap = -Math.round(size * 0.32);

  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <span key={u.id} style={{ marginLeft: i ? overlap : 0 }}>
          <Avatar user={u} size={size} ring={ring} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="cs-crew-more"
          style={{
            marginLeft: overlap,
            width: size,
            height: size,
            borderColor: ring,
            fontSize: size * 0.38,
          }}
          title={`${extra} more`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
