'use client'

import { register } from "@/lib/auth";
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
        <div className="flex items-center justify-center min-h-[90vh] px-4 py-8">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <Image src={YondraIcon} alt="logo" width={60} height={60} className="rounded-xl mb-3"/>
                    <p className="text-2xl md:text-3xl font-bold">Create your account</p>
                    <p className="text-gray-400 mt-1 text-sm">Join Yondra and start organizing</p>
                </div>

                <div className="bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg flex flex-col gap-5">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-300 text-sm px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Name</label>
                        <input
                            className="bg-gray-900 p-3 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <div>
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

                    <div>
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

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
                        <input
                            className="bg-gray-900 p-3 rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors duration-200 cursor-pointer"
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>

                    <p className="text-center text-gray-400 text-sm">
                        Already have an account?{' '}
                        <a href="/login" className="text-blue-400 hover:underline">Sign in</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
