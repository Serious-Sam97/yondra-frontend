'use client'

import { register } from "@/lib/auth";
import { useSystem } from "@/contexts/SystemContext";
import { useRouter } from "next/navigation";
import { useState } from "react"
import Image from "next/image";
import YondraIcon from "@/components/icons/yondra.png";

export default function RegisterPage () {
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [passwordConfirmation, setPasswordConfirmation] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const { setIsLogged } = useSystem();
    const router = useRouter();

    const registerAction = async () => {
        setError('');
        if (password !== passwordConfirmation) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await register(name, email, password, passwordConfirmation);
            setIsLogged(true);
            router.push('/dashboard');
        } catch (e: any) {
            setError(e.message ?? 'Registration failed');
        } finally {
            setLoading(false);
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') registerAction();
    }

    return (
        <div className="min-h-[90vh] flex items-center justify-center px-4 py-8">
            <div className="relative z-10 w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <Image
                        src={YondraIcon}
                        alt="logo"
                        width={56}
                        height={56}
                        className="rounded-2xl mb-4"
                        style={{ boxShadow: '0 0 24px rgba(154,166,126,0.45)' }}
                    />
                    <p className="chrome-text text-2xl font-medium">YONDRA</p>
                    <p className="text-2xl font-bold mt-3" style={{ color: 'var(--cf-text)' }}>
                        Create your account
                    </p>
                    <p className="mt-1 text-sm cf-mono" style={{ color: 'var(--cf-text-muted)' }}>Join Yondra and start organizing</p>
                </div>

                <div className="glass-panel p-6 md:p-8" style={{ position: 'relative' }}>
                    <span className="cf-screw" style={{ position: 'absolute', top: 8, left: 8 }} />
                    <span className="cf-screw" style={{ position: 'absolute', top: 8, right: 8 }} />
                    <span className="cf-screw" style={{ position: 'absolute', bottom: 8, left: 8 }} />
                    <span className="cf-screw" style={{ position: 'absolute', bottom: 8, right: 8 }} />
                    {error && (
                        <div
                            className="text-sm px-4 py-2 rounded-xl mb-6 cf-mono"
                            style={{ background: 'rgba(255,90,77,0.16)', border: '1px solid var(--cf-red)', color: 'var(--cf-red)' }}
                        >
                            {error}
                        </div>
                    )}

                    <div className="mb-5">
                        <label className="cf-label block mb-2">Name</label>
                        <input
                            className="glass-input"
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <div className="mb-5">
                        <label className="cf-label block mb-2">Email</label>
                        <input
                            className="glass-input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <div className="mb-5">
                        <label className="cf-label block mb-2">Password</label>
                        <input
                            className="glass-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <div className="mb-7">
                        <label className="cf-label block mb-2">Confirm password</label>
                        <input
                            className="glass-input"
                            type="password"
                            placeholder="••••••••"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <button
                        onClick={registerAction}
                        disabled={loading}
                        className="aero-btn aero-btn--cyan w-full py-3"
                    >
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>

                    <p className="text-center text-sm mt-5 cf-mono" style={{ color: 'var(--cf-text-muted)' }}>
                        Already have an account?{' '}
                        <a href="/login" style={{ color: 'var(--cf-phosphor)' }} className="hover:underline">Sign in</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
