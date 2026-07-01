'use client'

import { forgotPassword } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react"
import Image from "next/image";
import YondraIcon from "@/components/icons/yondra.png";

export default function ForgotPasswordPage () {
    const [email, setEmail] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string>('');
    const router = useRouter();

    const submit = async () => {
        if (!email.trim()) return;
        setError('');
        setLoading(true);
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch {
            // Fail generically — never reveal whether the email exists.
            setSent(true);
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
                        Reset your password
                    </p>
                    <p className="text-white/70 mt-1 text-sm">We&apos;ll email you a reset link</p>
                </div>

                <div className="glass-panel p-6 md:p-8">
                    {sent ? (
                        <>
                            <div
                                className="text-sm px-4 py-3 rounded-xl cf-mono"
                                style={{ background: 'rgba(154,166,126,0.14)', border: '1px solid var(--cf-phosphor)', color: 'var(--cf-phosphor)' }}
                            >
                                If an account exists for <span className="font-bold">{email.trim()}</span>, we&apos;ve sent a password reset link. Check your inbox.
                            </div>
                            <button
                                onClick={() => router.push('/login')}
                                className="aero-btn aero-btn--cyan w-full py-3 mt-6"
                            >
                                Back to sign in
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

                            <div className="mb-7">
                                <label className="block text-xs uppercase tracking-wider text-white/70 mb-2">Email</label>
                                <input
                                    className="glass-input"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={submit}
                                disabled={loading || !email.trim()}
                                className="aero-btn aero-btn--cyan w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending…' : 'Send reset link'}
                            </button>

                            <p className="text-center text-white/70 text-sm mt-5">
                                Remembered it?{' '}
                                <a href="/login" style={{ color: 'var(--cf-phosphor)' }} className="hover:underline">Back to sign in</a>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
