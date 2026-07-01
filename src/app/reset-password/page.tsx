'use client'

import { resetPassword } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react"
import Image from "next/image";
import YondraIcon from "@/components/icons/yondra.png";

function ResetPasswordInner () {
    const params = useSearchParams();
    const token = params.get('token') ?? '';
    const email = params.get('email') ?? '';

    const [password, setPassword] = useState<string>('');
    const [confirm, setConfirm] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [done, setDone] = useState(false);
    const router = useRouter();

    const missingLink = !token || !email;

    const submit = async () => {
        setError('');
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            await resetPassword(token, email, password, confirm);
            setDone(true);
            setTimeout(() => router.push('/login'), 1600);
        } catch {
            setError('This reset link is invalid or has expired. Request a new one.');
        } finally {
            setLoading(false);
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') submit();
    }

    return (
        <div className="min-h-[90vh] flex items-center justify-center px-4">
            <div className="relative z-10 w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <Image
                        src={YondraIcon}
                        alt="logo"
                        width={56}
                        height={56}
                        className="rounded-2xl mb-4"
                        style={{ boxShadow: '0 0 24px rgba(0,240,255,0.45)' }}
                    />
                    <p className="chrome-text text-2xl font-medium">YONDRA</p>
                    <p className="text-white text-2xl font-bold mt-3" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                        Set a new password
                    </p>
                    {email && <p className="text-white/70 mt-1 text-sm cf-mono">{email}</p>}
                </div>

                <div className="glass-panel p-6 md:p-8">
                    {done ? (
                        <div
                            className="text-sm px-4 py-3 rounded-xl cf-mono"
                            style={{ background: 'rgba(154,166,126,0.14)', border: '1px solid var(--cf-phosphor)', color: 'var(--cf-phosphor)' }}
                        >
                            Password updated. Redirecting you to sign in…
                        </div>
                    ) : missingLink ? (
                        <>
                            <div
                                className="text-sm px-4 py-3 rounded-xl cf-mono"
                                style={{ background: 'rgba(255,90,77,0.16)', border: '1px solid var(--cf-red)', color: 'var(--cf-red)' }}
                            >
                                This reset link is incomplete. Please use the link from your email, or request a new one.
                            </div>
                            <button onClick={() => router.push('/forgot-password')} className="aero-btn aero-btn--cyan w-full py-3 mt-6">
                                Request a new link
                            </button>
                        </>
                    ) : (
                        <>
                            {error && (
                                <div
                                    className="text-sm px-4 py-2 rounded-xl mb-6 cf-mono"
                                    style={{ background: 'rgba(255,90,77,0.16)', border: '1px solid var(--cf-red)', color: 'var(--cf-red)' }}
                                >
                                    {error}
                                </div>
                            )}

                            <div className="mb-5">
                                <label className="block text-xs uppercase tracking-wider text-white/70 mb-2">New password</label>
                                <input
                                    className="glass-input"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                />
                            </div>

                            <div className="mb-7">
                                <label className="block text-xs uppercase tracking-wider text-white/70 mb-2">Confirm password</label>
                                <input
                                    className="glass-input"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>

                            <button
                                onClick={submit}
                                disabled={loading}
                                className="aero-btn aero-btn--cyan w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Updating…' : 'Reset password'}
                            </button>

                            <p className="text-center text-white/70 text-sm mt-5">
                                <a href="/login" style={{ color: 'var(--cf-phosphor)' }} className="hover:underline">Back to sign in</a>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage () {
    return (
        <Suspense fallback={null}>
            <ResetPasswordInner />
        </Suspense>
    )
}
