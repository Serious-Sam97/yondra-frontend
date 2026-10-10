import { body, pick, say, wait } from "./bridge";

// R-06 · the camera, opt-in, with his red eye always open in the corner while
// it's on. Face detection runs on this device (the browser's FaceDetector when
// it exists, otherwise MediaPipe's BlazeFace in WASM; the model is downloaded,
// frames never leave). Only three facts are derived: is there a face, how big
// is it (too close?), and is it turned away.
//   turned away → he moves; look back → he freezes ("statue")
//   too close → he jumps · nobody there for 30 s → he falls asleep

export type Gaze = "none" | "looking" | "away" | "close";

interface Face {
  x: number; // bbox, normalised 0–1
  w: number;
  yaw: number | null; // nose offset from the eyes' midpoint, in eye-distances
}
type Detect = (v: HTMLVideoElement, t: number) => Promise<Face[]>;

async function nativeDetector(): Promise<Detect | null> {
  const FD = (
    window as unknown as {
      FaceDetector?: new (
        o: object,
      ) => {
        detect(v: HTMLVideoElement): Promise<
          {
            boundingBox: DOMRectReadOnly;
            landmarks?: { type: string; locations: { x: number }[] }[];
          }[]
        >;
      };
    }
  ).FaceDetector;
  if (!FD) return null;
  try {
    const fd = new FD({ fastMode: true, maxDetectedFaces: 1 });
    return async (v) => {
      const out = await fd.detect(v);
      return out.map((f) => {
        const eyes =
          f.landmarks
            ?.filter((l) => l.type === "eye")
            .map((l) => l.locations[0].x) ?? [];
        const nose = f.landmarks?.find((l) => l.type === "nose")?.locations[0]
          .x;
        const yaw =
          eyes.length === 2 && nose !== undefined
            ? (nose - (eyes[0] + eyes[1]) / 2) /
              Math.abs(eyes[0] - eyes[1] || 1)
            : null;
        return {
          x: f.boundingBox.x / v.videoWidth,
          w: f.boundingBox.width / v.videoWidth,
          yaw,
        };
      });
    };
  } catch {
    return null;
  }
}

const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

async function mediapipeDetector(): Promise<Detect | null> {
  try {
    const vision = await import(
      /* webpackIgnore: true */ `${MP}/vision_bundle.mjs`
    );
    const files = await vision.FilesetResolver.forVisionTasks(`${MP}/wasm`);
    const det = await vision.FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5,
    });
    return async (v, t) => {
      const r = det.detectForVideo(v, t) as {
        detections: {
          boundingBox: { originX: number; width: number };
          keypoints: { x: number }[];
        }[];
      };
      return r.detections.map((d) => {
        // keypoints: 0 right eye, 1 left eye, 2 nose tip (normalised)
        const [re, le, nose] = d.keypoints;
        const yaw =
          re && le && nose
            ? (nose.x - (re.x + le.x) / 2) / Math.abs(re.x - le.x || 1)
            : null;
        return {
          x: d.boundingBox.originX / v.videoWidth,
          w: d.boundingBox.width / v.videoWidth,
          yaw,
        };
      });
    };
  } catch {
    return null;
  }
}

export async function startCamera(
  onGaze?: (g: Gaze) => void,
): Promise<(() => void) | null> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: "user" },
    });
  } catch {
    say("no camera. good. i didn't want to see you anyway. (i did.)");
    return null;
  }
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.srcObject = stream;
  await v.play();
  const detect = (await nativeDetector()) ?? (await mediapipeDetector());
  if (!detect) {
    for (const t of stream.getTracks()) t.stop();
    say("your browser can't find faces. lucky you. i'd have opinions.");
    return null;
  }

  let alive = true;
  let gaze: Gaze = "looking";
  let lastFace = performance.now();
  let asleep = false;
  let moving = false;
  let lastClose = 0;

  // statue: while you look away, he does something; when you look back, he freezes
  const sneak = async () => {
    if (moving) return;
    moving = true;
    body({
      cmd: "mood",
      mood: pick(["malicious", "sideeye", "crosseyed"] as const),
    });
    body({
      cmd: "travel",
      x: 120 + Math.random() * (window.innerWidth - 240),
      y: 160 + Math.random() * (window.innerHeight - 320),
    });
    await wait(1400);
    moving = false;
  };

  const loop = async () => {
    while (alive) {
      const t = performance.now();
      let faces: Face[] = [];
      try {
        faces = await detect(v, t);
      } catch {}
      const f = faces[0];
      let g: Gaze;
      if (!f) g = "none";
      else if (f.w > 0.55) g = "close";
      else if (f.yaw !== null && Math.abs(f.yaw) > 0.38) g = "away";
      else g = "looking";

      if (g !== "none") {
        lastFace = t;
        if (asleep) {
          asleep = false;
          body({ cmd: "mood", mood: "shocked" });
          say(
            pick([
              "oh. you're back. i wasn't sleeping.",
              "i was resting my eye. eyes. both of them. i have two.",
            ]),
          );
        }
      } else if (!asleep && t - lastFace > 30_000) {
        asleep = true;
        body({ cmd: "mood", mood: "asleep" });
        say("*zzz* (wake me when the human comes back)");
      }
      if (g === "close" && t - lastClose > 20_000) {
        lastClose = t;
        body({ cmd: "mood", mood: "terror" });
        body({ cmd: "fx", cls: "vxr-tv-out", ms: 340 });
        say(
          pick([
            "TOO CLOSE. i can see your pores. they can see me.",
            "back up. BACK UP. personal space. i'm a ghost, not a mirror.",
          ]),
        );
      }
      if (g === "away" && gaze !== "away") void sneak();
      if (g === "looking" && gaze === "away") {
        body({ cmd: "mood", mood: "embarrassed" });
        if (moving)
          say(
            pick([
              "…i didn't move.",
              "statue. i'm a statue. statues don't explain themselves.",
            ]),
          );
      }
      if (g !== gaze) onGaze?.(g);
      gaze = g;
      await wait(300);
    }
  };
  void loop();

  return () => {
    alive = false;
    for (const tr of stream.getTracks()) tr.stop();
    v.srcObject = null;
  };
}
