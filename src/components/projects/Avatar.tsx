"use client";

import { avatarColor, initials } from "@/lib/ui";

export default function Avatar({
  user,
  size = 22,
  ring,
}: {
  user: { id: number; name: string };
  size?: number;
  ring?: string;
}) {
  return (
    <div
      title={user.name}
      style={{
        backgroundColor: avatarColor(user.id),
        width: size,
        height: size,
        fontSize: size * 0.42,
        borderColor: ring ?? "var(--cf-edge, #4a463f)",
      }}
      className="cf-mono rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 border-2 shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
    >
      {initials(user.name)}
    </div>
  );
}
