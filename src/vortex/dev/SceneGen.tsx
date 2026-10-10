"use client";

import { useState } from "react";
import {
  SCENE_PALETTES,
  SCENE_ROOMS,
  type ScenePalette,
  type SceneRoom,
  sceneArt,
} from "@/lib/sceneArt";
import "./lab.css";

// S-07 · the Below scene generator (internal): every room × palette × seed,
// to pick art for new rooms, seasons and dimensions. Click one to download it.

export default function SceneGen() {
  const [room, setRoom] = useState<SceneRoom | "all">("all");
  const [palette, setPalette] = useState<ScenePalette>("below");
  const [seed, setSeed] = useState(1);
  const rooms = room === "all" ? SCENE_ROOMS : [room];
  const save = (svg: string, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.download = `${name}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <main className="vxlab">
      <header>
        <h1>below scene generator</h1>
        <p>dev only · S-07 · riso scenes per room, palette and seed</p>
      </header>
      <div className="vxlab-sliders">
        <label>
          room
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value as SceneRoom | "all")}
          >
            <option value="all">all rooms</option>
            {SCENE_ROOMS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          palette
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value as ScenePalette)}
          >
            {SCENE_PALETTES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          seed{" "}
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => setSeed(Math.floor(Math.random() * 9999))}
        >
          reroll
        </button>
      </div>
      <div className="vxscene-grid">
        {rooms.flatMap((r) =>
          [0, 1, 2].map((k) => {
            const svg = sceneArt(r, palette, seed + k);
            return (
              <button
                key={`${r}${k}`}
                type="button"
                onClick={() => save(svg, `${r}-${palette}-${seed + k}`)}
                title="download SVG"
              >
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated from numbers only */}
                <span dangerouslySetInnerHTML={{ __html: svg }} />
                <small className="vxscene-label">
                  {r} · {seed + k}
                </small>
              </button>
            );
          }),
        )}
      </div>
    </main>
  );
}
