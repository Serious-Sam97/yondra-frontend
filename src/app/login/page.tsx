'use client'

import { login } from "@/lib/auth";
import { useSystem } from "@/contexts/SystemContext";
import { useRouter } from "next/navigation";
import { useState } from "react"
import Image from "next/image";
import YondraIcon from "@/components/icons/yondra.png";

export default function LoginPage () {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const { setIsLogged } = useSystem();
    const router = useRouter();

    const loginAction = async () => {
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            setIsLogged(true);
            router.push('/dashboard');
        } catch (e: any) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') loginAction();
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
                        Welcome back
                    </p>
                    <p className="text-white/70 mt-1 text-sm">Sign in to continue</p>
                </div>

                <div className="glass-panel p-6 md:p-8">
                    {error && (
                        <div
                            className="text-sm px-4 py-2 rounded-xl mb-6"
                            style={{ background: 'rgba(255,45,149,0.18)', border: '1px solid rgba(255,45,149,0.6)', color: '#ffd2e6' }}
                        >
                            {error}
                        </div>
                    )}

                    <div className="mb-5">
                        <label className="block text-xs uppercase tracking-wider text-white/70 mb-2">Email</label>
                        <input
                            className="glass-input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <div className="mb-2">
                        <label className="block text-xs uppercase tracking-wider text-white/70 mb-2">Password</label>
                        <input
                            className="glass-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <div className="text-right mb-6">
                        <a href="/forgot-password" style={{ color: 'var(--cf-phosphor)' }} className="text-sm hover:underline">Forgot password?</a>
                    </div>

                    <button
                        onClick={loginAction}
                        disabled={loading}
                        className="aero-btn aero-btn--cyan w-full py-3"
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>

                    <p className="text-center text-white/70 text-sm mt-5">
                        Don&apos;t have an account?{' '}
                        <a href="/register" style={{ color: 'var(--aero-cyan)' }} className="hover:underline">Register</a>
                    </p>

                    <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}>
                        <p className="text-white/50 text-xs mb-3">Want to test the system first?</p>
                        <button
                            onClick={() => router.push('/demo')}
                            type="button"
                            className="aero-btn aero-btn--ghost w-full py-2.5 text-sm"
                        >
                            Try the demo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
