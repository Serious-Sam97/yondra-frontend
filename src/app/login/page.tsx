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
        <div className="flex items-center justify-center min-h-[90vh]">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <Image src={YondraIcon} alt="logo" width={60} height={60} className="rounded-xl mb-3"/>
                    <p className="text-3xl font-bold">Welcome back</p>
                    <p className="text-gray-400 mt-1">Sign in to your Yondra account</p>
                </div>

                <div className="bg-gray-800 p-8 rounded-2xl shadow-lg">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-300 text-sm px-4 py-2 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <div className="mb-5">
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input
                            className="bg-gray-900 p-3 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <div className="mb-7">
                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                        <input
                            className="bg-gray-900 p-3 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <button
                        onClick={loginAction}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors duration-200 cursor-pointer"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>

                    <p className="text-center text-gray-400 text-sm mt-5">
                        Don't have an account?{' '}
                        <a href="/register" className="text-blue-400 hover:underline">Register</a>
                    </p>

                    <div className="mt-6 pt-6 border-t border-gray-700 text-center">
                        <p className="text-gray-500 text-xs mb-3">Want to test the system first?</p>
                        <button
                            onClick={() => router.push('/demo')}
                            type="button"
                            className="w-full border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white py-2.5 rounded-lg text-sm transition-colors duration-200 cursor-pointer"
                        >
                            Try the Demo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
