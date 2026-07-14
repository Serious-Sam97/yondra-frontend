"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import YondraIcon from "@/components/icons/yondra.png";
import { useSystem } from "@/contexts/SystemContext";
import {
  type FieldErrors,
  parseAuthError,
  postAuthRedirectPath,
  register,
} from "@/lib/auth";
import { maskName, NAME_MAX } from "@/lib/inputMasks";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

// Matches the backend's `email` rule closely enough for instant client feedback;
// the server stays the source of truth (format + uniqueness) on submit.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { key: "identity", label: "Identity" },
  { key: "security", label: "Security" },
  { key: "launch", label: "Launch" },
] as const;

// Individual password requirements. `length` is the only hard gate (the backend
// enforces min:8); the rest feed the strength meter and nudge toward a stronger
// secret without blocking submission.
function passwordChecks(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

const STRENGTH = [
  { label: "Enter a passphrase", tone: "" as const, lit: 0 },
  { label: "Weak", tone: "weak" as const, lit: 1 },
  { label: "Weak", tone: "weak" as const, lit: 2 },
  { label: "Fair", tone: "fair" as const, lit: 3 },
  { label: "Good", tone: "good" as const, lit: 4 },
  { label: "Strong", tone: "good" as const, lit: 5 },
];

// Up to two initials for the operator sigil on the launch readout.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const BOOT_LINES = [
  "> allocating operator record …",
  "> hashing credentials …",
  "> minting access token …",
  "> mounting workspace …",
  "> ready. entering console",
];

export default function RegisterPage() {
  useDocumentTitle("Yondra - Register");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [revealPw, setRevealPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"form" | "booting">("form");
  const { setIsLogged } = useSystem();
  const router = useRouter();
  // Focus the first field whenever the wizard advances/retreats to a step.
  const firstFieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // `step` is the trigger: the newly-mounted step's first input gets focus.
    void step;
    firstFieldRef.current?.focus();
  }, [step]);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const strengthScore = useMemo(
    () => Object.values(checks).filter(Boolean).length,
    [checks],
  );
  const strength = STRENGTH[strengthScore];

  const emailValid = EMAIL_RE.test(email);
  const passwordsMatch =
    password.length > 0 && password === passwordConfirmation;

  const stepValid = [
    name.trim().length > 0 && emailValid, // identity
    checks.length && passwordsMatch, // security
    accepted, // launch
  ];

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const goNext = () => {
    if (!stepValid[step]) return;
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    if (!stepValid[2]) return;
    setError("");
    setFieldErrors({});
    setPhase("booting");
    try {
      await register(name, email, password, passwordConfirmation);
      setIsLogged(true);
      // Give the boot sequence a beat to play before the redirect swaps the view.
      setTimeout(() => router.push(postAuthRedirectPath()), 1400);
    } catch (e) {
      const { message, fields } = parseAuthError(e);
      setFieldErrors(fields);
      setError(message);
      setPhase("form");
      // Route the user back to the step that owns the failing field.
      if (fields.name || fields.email) setStep(0);
      else if (fields.password) setStep(1);
    }
  };

  // Enter advances the wizard (or submits on the final step) when the step is valid.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (step < STEPS.length - 1) goNext();
    else submit();
  };

  const trackCaps = (e: React.KeyboardEvent) =>
    setCapsOn(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-7">
          <Image
            src={YondraIcon}
            alt="logo"
            width={56}
            height={56}
            className="rounded-2xl mb-4"
            style={{ boxShadow: "0 0 24px rgba(154,166,126,0.45)" }}
          />
          <p className="chrome-text text-2xl font-medium">YONDRA</p>
          <p
            className="mt-1 text-sm cf-mono"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Operator provisioning
          </p>
        </div>

        {/* Provisioning rail */}
        <div className="reg-rail" aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s.key} className="contents">
              <div className="reg-rail__node">
                <div
                  className={
                    "reg-rail__dot" +
                    (i === step
                      ? " reg-rail__dot--active"
                      : i < step
                        ? " reg-rail__dot--done"
                        : "")
                  }
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className={
                    "reg-rail__label" +
                    (i === step ? " reg-rail__label--active" : "")
                  }
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`reg-rail__bar${
                    i < step ? " reg-rail__bar--done" : ""
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div
          className="glass-panel p-6 md:p-8"
          style={{ position: "relative" }}
        >
          <span
            className="cf-screw"
            style={{ position: "absolute", top: 8, left: 8 }}
          />
          <span
            className="cf-screw"
            style={{ position: "absolute", top: 8, right: 8 }}
          />
          <span
            className="cf-screw"
            style={{ position: "absolute", bottom: 8, left: 8 }}
          />
          <span
            className="cf-screw"
            style={{ position: "absolute", bottom: 8, right: 8 }}
          />

          {error && phase === "form" && (
            <div
              className="text-sm px-4 py-2 rounded-xl mb-6 cf-mono"
              style={{
                background: "rgba(255,90,77,0.16)",
                border: "1px solid var(--cf-red)",
                color: "var(--cf-red)",
              }}
            >
              {error}
            </div>
          )}

          {phase === "booting" ? (
            <BootSequence name={name} />
          ) : (
            <>
              {/* ── Step 1 — Identity ─────────────────────────────────────── */}
              {step === 0 && (
                <div className="reg-step" key="identity">
                  <p className="reg-step__title">Who are you?</p>
                  <p className="reg-step__sub">
                    Your display name and sign-in channel
                  </p>

                  <div className="mt-6 mb-5">
                    <label htmlFor="reg-name" className="cf-label block mb-2">
                      Name
                    </label>
                    <input
                      id="reg-name"
                      ref={firstFieldRef}
                      className="glass-input"
                      type="text"
                      placeholder="Your name"
                      maxLength={NAME_MAX}
                      value={name}
                      onChange={(e) => {
                        setName(maskName(e.target.value));
                        clearFieldError("name");
                      }}
                      onKeyDown={handleKeyDown}
                    />
                    {fieldErrors.name && (
                      <p className="reg-field-error">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div className="mb-1">
                    <label htmlFor="reg-email" className="cf-label block mb-2">
                      Email
                    </label>
                    <input
                      id="reg-email"
                      className="glass-input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                      }}
                      onKeyDown={handleKeyDown}
                    />
                    {fieldErrors.email ? (
                      <p className="reg-field-error">{fieldErrors.email}</p>
                    ) : email.length > 0 && !emailValid ? (
                      <p className="reg-field-error">
                        That doesn&apos;t look like a valid email.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* ── Step 2 — Security ─────────────────────────────────────── */}
              {step === 1 && (
                <div className="reg-step" key="security">
                  <p className="reg-step__title">Set a passphrase</p>
                  <p className="reg-step__sub">Minimum 8 characters</p>

                  <div className="mt-6 mb-1">
                    <label
                      htmlFor="reg-password"
                      className="cf-label block mb-2"
                    >
                      Password
                    </label>
                    <input
                      id="reg-password"
                      ref={firstFieldRef}
                      className="glass-input"
                      type={revealPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFieldError("password");
                      }}
                      onKeyDown={(e) => {
                        trackCaps(e);
                        handleKeyDown(e);
                      }}
                      onKeyUp={trackCaps}
                    />
                    <div className="reg-field-tools">
                      {capsOn ? (
                        <span className="reg-caps">
                          <span className="reg-caps__led" />
                          Caps Lock on
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        className="reg-mini-btn"
                        onClick={() => setRevealPw((v) => !v)}
                      >
                        {revealPw ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* Strength meter */}
                  <div className="reg-meter">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={
                          "reg-meter__seg" +
                          (i < strength.lit && strength.tone
                            ? ` reg-meter__seg--${strength.tone}`
                            : "")
                        }
                      />
                    ))}
                  </div>
                  <div
                    className="reg-meter__label"
                    style={{
                      color:
                        strength.tone === "good"
                          ? "var(--cf-phosphor)"
                          : strength.tone === "fair"
                            ? "var(--cf-amber)"
                            : strength.tone === "weak"
                              ? "var(--cf-red)"
                              : "var(--cf-text-dim)",
                    }}
                  >
                    {strength.label}
                  </div>

                  {/* Requirement LEDs */}
                  <div className="reg-reqs">
                    {(
                      [
                        ["length", "8+ characters"],
                        ["upper", "Uppercase"],
                        ["lower", "Lowercase"],
                        ["number", "Number"],
                        ["symbol", "Symbol"],
                      ] as const
                    ).map(([key, label]) => (
                      <span
                        key={key}
                        className={`reg-req${
                          checks[key] ? " reg-req--met" : ""
                        }`}
                      >
                        <span className="reg-req__led" />
                        {label}
                      </span>
                    ))}
                  </div>
                  {fieldErrors.password && (
                    <p className="reg-field-error">{fieldErrors.password}</p>
                  )}

                  <div className="mt-6 mb-1">
                    <label
                      htmlFor="reg-confirm"
                      className="cf-label block mb-2"
                    >
                      Confirm password
                    </label>
                    <input
                      id="reg-confirm"
                      className="glass-input"
                      type={revealPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      onKeyDown={(e) => {
                        trackCaps(e);
                        handleKeyDown(e);
                      }}
                      onKeyUp={trackCaps}
                    />
                    {passwordConfirmation.length > 0 && (
                      <span
                        className={
                          "reg-match " +
                          (passwordsMatch ? "reg-match--ok" : "reg-match--no")
                        }
                      >
                        <span className="reg-match__led" />
                        {passwordsMatch
                          ? "Passwords match"
                          : "Passwords do not match"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 3 — Launch ───────────────────────────────────────── */}
              {step === 2 && (
                <div className="reg-step" key="launch">
                  <p className="reg-step__title">Confirm &amp; launch</p>
                  <p className="reg-step__sub">
                    Review before we provision your account
                  </p>

                  <div className="flex items-center gap-4 mt-6 mb-5">
                    <span className="reg-sigil">{initials(name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <p
                        className="cf-lcd"
                        style={{
                          fontSize: 20,
                          color: "var(--cf-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name || "—"}
                      </p>
                      <p
                        className="cf-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--cf-text-dim)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {email}
                      </p>
                    </div>
                  </div>

                  <div className="reg-readout">
                    <div className="reg-readout__row">
                      <span className="reg-readout__k">Operator</span>
                      <span className="reg-readout__v">{name || "—"}</span>
                    </div>
                    <div className="reg-readout__row">
                      <span className="reg-readout__k">Channel</span>
                      <span className="reg-readout__v">{email || "—"}</span>
                    </div>
                    <div className="reg-readout__row">
                      <span className="reg-readout__k">Cipher</span>
                      <span className="reg-readout__v">
                        {"•".repeat(Math.min(password.length, 12))}
                      </span>
                    </div>
                    <div className="reg-readout__row">
                      <span className="reg-readout__k">Strength</span>
                      <span
                        className="reg-readout__v"
                        style={{
                          color:
                            strength.tone === "good"
                              ? "var(--cf-phosphor)"
                              : strength.tone === "fair"
                                ? "var(--cf-amber)"
                                : "var(--cf-red)",
                        }}
                      >
                        {strength.label}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`reg-switch${accepted ? " reg-switch--on" : ""}`}
                  >
                    <button
                      type="button"
                      role="switch"
                      aria-checked={accepted}
                      aria-label="Accept the Terms and Privacy Policy"
                      className="reg-switch__btn"
                      onClick={() => setAccepted((v) => !v)}
                    >
                      <span className="reg-switch__track">
                        <span className="reg-switch__knob" />
                      </span>
                    </button>
                    <span className="reg-switch__text">
                      I agree to the <a href="/terms">Terms</a> and{" "}
                      <a href="/privacy">Privacy Policy</a>.
                    </span>
                  </div>
                </div>
              )}

              {/* ── Nav controls ──────────────────────────────────────────── */}
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="aero-btn aero-btn--ghost py-3 px-5"
                  >
                    Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!stepValid[step]}
                    className="aero-btn aero-btn--cyan py-3 flex-1"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!stepValid[2]}
                    className="aero-btn aero-btn--cyan py-3 flex-1"
                  >
                    Initialize account
                  </button>
                )}
              </div>

              <p
                className="text-center text-sm mt-6 cf-mono"
                style={{ color: "var(--cf-text-muted)" }}
              >
                Already have an account?{" "}
                <a
                  href="/login"
                  style={{ color: "var(--cf-phosphor)" }}
                  className="hover:underline"
                >
                  Sign in
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// The provisioning "boot log" shown while POST /api/register is in flight. Lines
// reveal on a stagger — purely cosmetic; the redirect is driven by the network
// call resolving, not by this animation finishing.
function BootSequence({ name }: { name: string }) {
  return (
    <div className="reg-step">
      <p className="reg-step__title">Provisioning</p>
      <p className="reg-step__sub">Welcome aboard, {name.split(/\s+/)[0]}</p>
      <div className="reg-boot mt-5">
        {BOOT_LINES.map((line, i) => (
          <div
            key={line}
            className={
              "reg-boot__line" +
              (i === BOOT_LINES.length - 1 ? " reg-cursor" : "")
            }
            style={{ animationDelay: `${i * 260}ms` }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
