import { body, centre, pick, say, wait, where } from "./bridge";

// R-07/R-08 · the phone's body: tilt and he rolls, shake and he gets sick
// (vomits static), turn it upside down and he falls up. R-09 · the battery.
// R-16 · the weather where you are (opt-in; the only thing that leaves the
// device is a rounded position to open-meteo.com, to ask about the sky).

/* ── R-09 ── */
interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}
export function startBattery(): () => void {
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<BatteryLike>;
  };
  if (!nav.getBattery) return () => {};
  let bat: BatteryLike | null = null;
  let warned = false;
  let lastCharging: boolean | null = null;
  const check = () => {
    if (!bat) return;
    const pct = Math.round(bat.level * 100);
    if (!bat.charging && pct <= 10 && !warned) {
      warned = true;
      say(
        `you're dying. we're all dying. but you specifically, at ${pct}%.`,
        "terror",
      );
    }
    if (lastCharging === false && bat.charging)
      say("ahh. electricity. that's how i got here, you know.", "ecstasy");
    if (bat.charging) warned = false;
    lastCharging = bat.charging;
  };
  void nav.getBattery().then((b) => {
    bat = b;
    lastCharging = b.charging;
    b.addEventListener("levelchange", check);
    b.addEventListener("chargingchange", check);
    check();
  });
  return () => {
    bat?.removeEventListener("levelchange", check);
    bat?.removeEventListener("chargingchange", check);
  };
}

/* ── R-07 / R-08 ── */
/** iOS asks for permission, and only from a tap; call this from the toggle. */
export async function askMotion(): Promise<boolean> {
  const D = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>;
  };
  if (typeof D?.requestPermission !== "function") return true;
  try {
    return (await D.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export function startMotion(): () => void {
  if (
    !("ontouchstart" in window) ||
    typeof DeviceOrientationEvent === "undefined"
  )
    return () => {};
  let tilt = { x: 0, y: 0 };
  let upside = false;
  let shakes: number[] = [];
  let sick = 0;
  const onTilt = (e: DeviceOrientationEvent) => {
    tilt = { x: (e.gamma ?? 0) / 45, y: ((e.beta ?? 0) - 40) / 45 };
    const flipped = Math.abs(e.beta ?? 0) > 150;
    if (flipped !== upside) {
      upside = flipped;
      window.dispatchEvent(
        new CustomEvent("vortex:gadget", {
          detail: { id: "gravity", on: flipped },
        }),
      );
    }
  };
  const onShake = (e: DeviceMotionEvent) => {
    const a = e.acceleration ?? e.accelerationIncludingGravity;
    if (!a) return;
    const m = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
    if (m < 22) return;
    const now = Date.now();
    shakes = [...shakes.filter((t) => now - t < 1200), now];
    if (shakes.length >= 4 && now - sick > 15_000) {
      sick = now;
      shakes = [];
      navigator.vibrate?.([40, 40, 40, 40, 120]);
      body({ cmd: "mood", mood: "dizzy" });
      body({ cmd: "fx", cls: "vxw-vomit", ms: 1600 });
      say(
        pick([
          "STOP SHAKING THE WORLD. i'm going to— *static* —",
          "i had lunch in there. it was a cassette. it's coming back up.",
          "this is how snow globes feel. i understand them now.",
        ]),
      );
    }
  };
  // rolling: a slow push toward wherever the phone leans
  const roll = setInterval(() => {
    const r = where();
    if (!r || (Math.abs(tilt.x) < 0.25 && Math.abs(tilt.y) < 0.25)) return;
    const c = centre(r);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const x = Math.max(
      r.width / 2,
      Math.min(W - r.width / 2, c.x + tilt.x * 38),
    );
    const y = Math.max(90, Math.min(H - r.height / 2, c.y + tilt.y * 38));
    body({ cmd: "place", x, y, ms: 160 });
    if (
      (x <= r.width / 2 + 1 || x >= W - r.width / 2 - 1) &&
      Math.random() < 0.08
    )
      navigator.vibrate?.(14); // bonk
  }, 160);
  window.addEventListener("deviceorientation", onTilt);
  window.addEventListener("devicemotion", onShake);
  return () => {
    clearInterval(roll);
    window.removeEventListener("deviceorientation", onTilt);
    window.removeEventListener("devicemotion", onShake);
    if (upside)
      window.dispatchEvent(
        new CustomEvent("vortex:gadget", {
          detail: { id: "gravity", on: false },
        }),
      );
  };
}

/* ── R-16 ── */
export type Sky = "rain" | "storm" | "cold" | "sun" | "clear";
const SKY_KEY = "yd:vortex.sky";

function classify(code: number, temp: number, day: boolean): Sky {
  if (code >= 95) return "storm";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86 || temp < 8)
    return "cold";
  if (day && code <= 1 && temp >= 24) return "sun";
  return "clear";
}

async function readSky(): Promise<Sky | null> {
  try {
    const c = JSON.parse(localStorage.getItem(SKY_KEY) ?? "null") as {
      sky: Sky;
      at: number;
    } | null;
    if (c && Date.now() - c.at < 3_600_000) return c.sky;
  } catch {}
  const pos = await new Promise<GeolocationPosition | null>((ok) =>
    navigator.geolocation.getCurrentPosition(ok, () => ok(null), {
      enableHighAccuracy: false,
      maximumAge: 3 * 3_600_000,
      timeout: 15_000,
    }),
  );
  if (!pos) return null;
  // city-level only: one decimal (~10 km)
  const lat = pos.coords.latitude.toFixed(1);
  const lon = pos.coords.longitude.toFixed(1);
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`,
  );
  if (!r.ok) return null;
  const j = (await r.json()) as {
    current?: { temperature_2m: number; weather_code: number; is_day: number };
  };
  if (!j.current) return null;
  const sky = classify(
    j.current.weather_code,
    j.current.temperature_2m,
    j.current.is_day === 1,
  );
  try {
    localStorage.setItem(SKY_KEY, JSON.stringify({ sky, at: Date.now() }));
  } catch {}
  return sky;
}

export function startWeather(): () => void {
  let alive = true;
  let flash: ReturnType<typeof setInterval> | null = null;
  let rain: HTMLDivElement | null = null;
  const apply = (sky: Sky) => {
    if (!alive) return;
    document.documentElement.dataset.vxSky = sky;
    if (sky === "rain" && !rain) {
      rain = document.createElement("div");
      rain.className = "vxw-rain";
      rain.setAttribute("aria-hidden", "true");
      document.body.appendChild(rain);
    }
    if (sky === "storm") {
      body({ cmd: "mood", mood: "terror" });
      say(
        "there's a storm where you are. electricity is how i got here. i'd rather not leave the same way.",
      );
      flash = setInterval(async () => {
        if (Math.random() > 0.3) return;
        const f = document.createElement("div");
        f.className = "vxw-flash";
        document.body.appendChild(f);
        navigator.vibrate?.([30, 50, 60]);
        await wait(380);
        f.remove();
        body({ cmd: "fx", cls: "vxr-tv-out", ms: 340 });
      }, 25_000);
    } else if (sky === "rain")
      say(
        "it's raining where you are. it's raining in here too. look at the edges.",
      );
    else if (sky === "sun")
      say(
        "it's bright out there. i brought glasses. i'm not going outside. ever.",
      );
    else if (sky === "cold")
      say(
        "it's cold where you are. i knitted a scarf out of a cassette. don't look at it.",
      );
  };
  void readSky()
    .then((s) => s && apply(s))
    .catch(() => {});
  const iv = setInterval(
    () =>
      void readSky().then((s) => {
        if (s && alive) document.documentElement.dataset.vxSky = s;
      }),
    3_600_000,
  );
  return () => {
    alive = false;
    clearInterval(iv);
    if (flash) clearInterval(flash);
    rain?.remove();
    delete document.documentElement.dataset.vxSky;
  };
}
