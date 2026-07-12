"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DirtyLed, ModuleHead, StatusLcd } from "@/components/ui/ConsoleModule";
import NotificationPreferences from "@/components/ui/NotificationPreferences";
import type { UserInterface } from "@/interfaces/UserInterface";
import { ApiError } from "@/lib/api";
import {
  fetchBoards,
  fetchUser,
  logout,
  updatePassword,
  updateProfile,
} from "@/lib/auth";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

// Turn an ApiError into something a human can read: prefer Laravel's
// validation messages, never show raw status codes or JSON.
function friendlyMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    try {
      const data = JSON.parse(e.body);
      const firstError = data.errors
        ? (Object.values(data.errors).flat() as string[])[0]
        : null;
      return firstError ?? data.message ?? fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const AVATAR_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
  "#00BCD4",
  "#E91E63",
];
const STRIPE_COLORS = [
  "#9aa67e",
  "#ffb000",
  "#ff5a4d",
  "#6fe0ff",
  "#9aa67e",
  "#ffb000",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// Module save lifecycle. The status LCD in each module header replaces the
// old success/error banners: idle → dirty (amber MOD LED) → saving → saved/error.
type ModuleState =
  | { phase: "idle" | "dirty" | "saving" | "saved" }
  | { phase: "error"; message: string };

function lcdFor(
  state: ModuleState,
  texts: { idle: string; saved: string },
): { text: string; tone: "phosphor" | "amber" | "red" } {
  switch (state.phase) {
    case "idle":
      return { text: texts.idle, tone: "phosphor" };
    case "dirty":
      return { text: "MODIFIED", tone: "amber" };
    case "saving":
      return { text: "SAVING…", tone: "amber" };
    case "saved":
      return { text: texts.saved, tone: "phosphor" };
    case "error":
      return { text: "ERROR", tone: "red" };
  }
}

function Led({ color, dim }: { color: string; dim?: boolean }) {
  return (
    <span
      className="cf-led flex-shrink-0"
      style={
        dim
          ? { background: "#3a382f" }
          : { background: color, boxShadow: `0 0 7px ${color}` }
      }
    />
  );
}

function LcdClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setTime(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <StatusLcd text={time} />;
}

// New-password "signal strength" — length-driven with a small bonus for
// mixing cases and digits, purely advisory (the backend enforces the rules).
function strengthScore(password: string): number {
  if (!password) return 0;
  let score = Math.min(10, Math.floor(password.length * 0.9));
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) {
    score = Math.min(10, score + 1);
  }
  return score;
}

function SignalBar({ password }: { password: string }) {
  const score = strengthScore(password);
  const weak = score > 0 && score < 5;
  const hint =
    password.length === 0
      ? "Signal strength — 8+ chars recommended"
      : score < 5
        ? "Signal weak — keep going"
        : score < 8
          ? "Signal fair"
          : "Signal strong";
  return (
    <div>
      <div className="flex gap-[3px] mt-2" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-[1.5px]"
            style={
              i < score
                ? {
                    background: weak ? "var(--cf-amber)" : "var(--cf-phosphor)",
                    boxShadow: weak
                      ? "0 0 5px rgba(255,176,0,0.5)"
                      : "0 0 5px rgba(154,166,126,0.5)",
                  }
                : {
                    background: "#1e211a",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)",
                  }
            }
          />
        ))}
      </div>
      <p
        className="text-xs mt-1.5 cf-mono"
        style={{ color: "var(--cf-text-dim)" }}
      >
        {hint}
      </p>
    </div>
  );
}

function IdSpec({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex justify-between gap-3 cf-mono"
      style={{ fontSize: 11, letterSpacing: "0.06em" }}
    >
      <span style={{ color: "#8a8265", textTransform: "uppercase" }}>
        {label}
      </span>
      <span
        className="flex items-center gap-1.5"
        style={{ color: "var(--cf-ink)" }}
      >
        {children}
      </span>
    </div>
  );
}

function ClusterRow({
  led,
  ledDim,
  label,
  value,
}: {
  led: string;
  ledDim?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 cf-mono"
      style={{
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      <Led color={led} dim={ledDim} />
      <span className="flex-1" style={{ color: "var(--cf-text-muted)" }}>
        {label}
      </span>
      <span style={{ color: "var(--cf-text)" }}>{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  useDocumentTitle("Yondra - Profile");
  const router = useRouter();
  const [user, setUser] = useState<UserInterface | null>(null);
  const [boardsOwned, setBoardsOwned] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [identState, setIdentState] = useState<ModuleState>({ phase: "idle" });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessState, setAccessState] = useState<ModuleState>({
    phase: "idle",
  });

  useEffect(() => {
    fetchUser()
      .then((u) => {
        setUser(u);
        setName(u.name);
        setEmail(u.email);
        setWhatsappNumber(u.whatsapp_number ?? "");
      })
      .catch(() => router.push("/login"));
    fetchBoards()
      .then(({ owned }) => setBoardsOwned(owned.length))
      .catch(() => {}); // spec row just stays hidden
  }, []);

  // Dirty tracking drives the MOD LED + MODIFIED readout.
  const identDirty =
    !!user &&
    (name !== user.name ||
      email !== user.email ||
      whatsappNumber !== (user.whatsapp_number ?? ""));
  const accessDirty = !!(currentPassword || newPassword || confirmPassword);

  useEffect(() => {
    setIdentState((s) =>
      s.phase === "saving"
        ? s
        : identDirty
          ? s.phase === "error"
            ? s
            : { phase: "dirty" }
          : s.phase === "saved"
            ? s
            : { phase: "idle" },
    );
  }, [identDirty]);

  useEffect(() => {
    setAccessState((s) =>
      s.phase === "saving"
        ? s
        : accessDirty
          ? s.phase === "error"
            ? s
            : { phase: "dirty" }
          : s.phase === "saved"
            ? s
            : { phase: "idle" },
    );
  }, [accessDirty]);

  // "SAVED ✓" / "CODE SET" readouts settle back to idle after a beat.
  useEffect(() => {
    if (identState.phase !== "saved") return;
    const t = setTimeout(() => setIdentState({ phase: "idle" }), 2000);
    return () => clearTimeout(t);
  }, [identState.phase]);
  useEffect(() => {
    if (accessState.phase !== "saved") return;
    const t = setTimeout(() => setAccessState({ phase: "idle" }), 2000);
    return () => clearTimeout(t);
  }, [accessState.phase]);

  const handleProfileSave = async () => {
    setIdentState({ phase: "saving" });
    try {
      const updated = await updateProfile({
        name,
        email,
        whatsapp_number: whatsappNumber.trim() || null,
      });
      setUser(updated);
      setIdentState({ phase: "saved" });
    } catch (e) {
      setIdentState({
        phase: "error",
        message: friendlyMessage(e, "Failed to update profile."),
      });
    }
  };

  const handlePasswordSave = async () => {
    if (newPassword !== confirmPassword) {
      setAccessState({ phase: "error", message: "Passwords do not match." });
      return;
    }
    setAccessState({ phase: "saving" });
    try {
      await updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAccessState({ phase: "saved" });
    } catch (e) {
      setAccessState({
        phase: "error",
        message: friendlyMessage(e, "Failed to update password."),
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{
            borderColor: "var(--cf-phosphor)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  const color = avatarColor(user.id);
  const identLcd = lcdFor(identState, { idle: "READY", saved: "SAVED ✓" });
  const accessLcd = lcdFor(accessState, { idle: "LOCKED", saved: "CODE SET" });
  const issued = user.created_at ? user.created_at.slice(0, 10) : null;

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10 max-w-6xl mx-auto">
      {/* LED status strip */}
      <div className="flex gap-1.5 mb-6">
        {STRIPE_COLORS.map((c, i) => (
          <div
            key={i}
            style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }}
            className="h-1.5 flex-1 rounded-sm"
          />
        ))}
      </div>

      {/* Topline: back key · tape label · clock */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="aero-btn px-3.5 py-2 text-xs"
        >
          ← Boards
        </button>
        <span
          className="cf-mono hidden sm:inline-block"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--cf-ink)",
            background: "var(--cf-cream)",
            padding: "4px 12px",
            borderRadius: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {"SYS // OPERATOR PROFILE"}
        </span>
        <LcdClock />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* ── Left rail: operator ID card + status cluster ── */}
        <aside className="lg:sticky lg:top-6 flex flex-col gap-4">
          <div className="glass-card p-[18px]" style={{ borderRadius: 6 }}>
            {/* punch slot */}
            <div
              className="mx-auto mb-3.5"
              style={{
                width: 44,
                height: 9,
                borderRadius: 999,
                background: "var(--cf-graphite-3, #16150f)",
                boxShadow:
                  "inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.6)",
              }}
            />
            <div
              className="flex justify-between items-baseline cf-mono pb-2.5 mb-3.5"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6e6753",
                borderBottom: "1px dashed #b3ac93",
              }}
            >
              <span>Yondra</span>
              <span>Operator permit</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div
                className="rounded-[10px] flex items-center justify-center text-white font-bold flex-shrink-0 cf-mono relative"
                style={{
                  backgroundColor: color,
                  width: 76,
                  height: 76,
                  fontSize: 30,
                  border: "2px solid var(--cf-edge)",
                  boxShadow:
                    "inset 0 2px 6px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)",
                }}
              >
                <span
                  className="cf-screw absolute"
                  style={{ width: 6, height: 6, top: 4, left: 4 }}
                />
                {initials(user.name)}
                <span
                  className="cf-screw absolute"
                  style={{ width: 6, height: 6, bottom: 4, right: 4 }}
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-2xl font-bold leading-tight"
                  style={{ color: "var(--cf-ink)" }}
                >
                  {user.name}
                </p>
                <p
                  className="cf-mono break-all"
                  style={{ fontSize: 12, color: "#6e6753" }}
                >
                  {user.email}
                </p>
              </div>
            </div>

            <div
              className="flex flex-col gap-[7px] mt-4 pt-3"
              style={{ borderTop: "1px dashed #b3ac93" }}
            >
              <IdSpec label="Operator no.">
                {String(user.id).padStart(4, "0")}
              </IdSpec>
              {issued && <IdSpec label="Issued">{issued}</IdSpec>}
              {boardsOwned !== null && (
                <IdSpec label="Boards owned">{boardsOwned}</IdSpec>
              )}
              <IdSpec label="Clearance">
                {user.is_admin ? "Vortex admin" : "Operator"}
              </IdSpec>
              <IdSpec label="WhatsApp">
                <Led color="var(--cf-phosphor)" dim={!user.whatsapp_number} />
                {user.whatsapp_number ? "Linked" : "Not linked"}
              </IdSpec>
            </div>

            {/* barcode */}
            <div
              className="mt-4 rounded-[2px]"
              style={{
                height: 34,
                opacity: 0.85,
                background:
                  "repeating-linear-gradient(90deg, #2a2620 0 2px, transparent 2px 5px, #2a2620 5px 6px, transparent 6px 11px, #2a2620 11px 14px, transparent 14px 17px)",
              }}
            />
            <p
              className="cf-mono text-center mt-1.5"
              style={{ fontSize: 10, letterSpacing: "0.3em", color: "#6e6753" }}
            >
              ID-{String(user.id).padStart(4, "0")}-YND
            </p>
          </div>

          {/* status cluster */}
          <div className="glass-panel px-4 py-3.5 flex flex-col gap-2.5">
            <ClusterRow
              led="var(--cf-phosphor)"
              label="Session"
              value="Active"
            />
            <ClusterRow
              led={
                user.email_verified_at
                  ? "var(--cf-phosphor)"
                  : "var(--cf-amber)"
              }
              label="Email"
              value={user.email_verified_at ? "Verified" : "Unverified"}
            />
            <ClusterRow
              led="var(--cf-amber)"
              label="Push"
              value="Rolling out"
            />
            <ClusterRow
              led="var(--cf-cyan)"
              ledDim={!user.whatsapp_number}
              label="WhatsApp"
              value={user.whatsapp_number ? "Connected" : "Not linked"}
            />
          </div>
        </aside>

        {/* ── Right rack: hardware modules ── */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* IDENT */}
          <section className="glass-panel">
            <ModuleHead label="Ident" sub="personal info">
              <DirtyLed on={identState.phase === "dirty"} />
              <StatusLcd text={identLcd.text} tone={identLcd.tone} />
            </ModuleHead>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="cf-label text-xs block mb-2" htmlFor="profile-name">
                    Name
                  </label>
                  <input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div>
                  <label
                    className="cf-label text-xs block mb-2"
                    htmlFor="profile-email"
                  >
                    Email
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    className="cf-label text-xs block mb-2"
                    htmlFor="profile-whatsapp"
                  >
                    WhatsApp number
                  </label>
                  <input
                    id="profile-whatsapp"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 5511987654321 (country code + number)"
                    className="glass-input"
                  />
                  <p
                    className="text-xs mt-1.5 cf-mono"
                    style={{ color: "var(--cf-text-dim)" }}
                  >
                    Used for WhatsApp notifications. Enable it per event in the
                    comms matrix below.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 mt-5">
                {identState.phase === "error" && (
                  <p
                    className="text-xs cf-mono"
                    style={{ color: "var(--cf-red)" }}
                  >
                    {identState.message}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={
                    identState.phase === "saving" ||
                    !identDirty ||
                    !name.trim() ||
                    !email.trim()
                  }
                  className="aero-btn aero-btn--cyan px-5 py-2.5 flex-shrink-0"
                >
                  {identState.phase === "saving" ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </section>

          {/* ACCESS CODE */}
          <section className="glass-panel">
            <ModuleHead label="Access code" sub="password">
              <DirtyLed on={accessState.phase === "dirty"} />
              <StatusLcd text={accessLcd.text} tone={accessLcd.tone} />
            </ModuleHead>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="cf-label text-xs block mb-2" htmlFor="pw-current">
                    Current password
                  </label>
                  <input
                    id="pw-current"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input"
                  />
                </div>
                <div>
                  <label className="cf-label text-xs block mb-2" htmlFor="pw-new">
                    New password
                  </label>
                  <input
                    id="pw-new"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input"
                  />
                  <SignalBar password={newPassword} />
                </div>
                <div>
                  <label className="cf-label text-xs block mb-2" htmlFor="pw-confirm">
                    Confirm new password
                  </label>
                  <input
                    id="pw-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 mt-5">
                {accessState.phase === "error" && (
                  <p
                    className="text-xs cf-mono"
                    style={{ color: "var(--cf-red)" }}
                  >
                    {accessState.message}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handlePasswordSave}
                  disabled={
                    accessState.phase === "saving" ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  className="aero-btn aero-btn--cyan px-5 py-2.5 flex-shrink-0"
                >
                  {accessState.phase === "saving"
                    ? "Updating…"
                    : "Update password"}
                </button>
              </div>
            </div>
          </section>

          {/* COMMS MATRIX — notification preferences */}
          <NotificationPreferences />

          {/* SESSION */}
          <section className="glass-panel relative overflow-hidden flex items-center gap-5 p-5">
            {/* hazard-striped edge */}
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: 10,
                opacity: 0.8,
                background:
                  "repeating-linear-gradient(-45deg, var(--cf-amber) 0 8px, #14130f 8px 16px)",
              }}
            />
            <div className="flex-1 pl-3">
              <p
                className="cf-label mb-1"
                style={{ color: "var(--cf-phosphor)" }}
              >
                Session
              </p>
              <p
                className="text-sm cf-mono"
                style={{ color: "var(--cf-text-muted)" }}
              >
                Sign out from your account on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="aero-btn aero-btn--magenta px-4 py-2.5 flex-shrink-0"
            >
              ⏏ Sign out
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
