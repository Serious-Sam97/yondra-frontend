'use client'

import { register } from "@/lib/auth";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react"

export default function RegisterPage () {
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [passwordConfirmation, setPasswordConfirmation] = useState<string>('');
    const [error, setError] = useState<string>('');
    const router = useRouter();

    const registerAction = async () => {
        setError('');
        if (password !== passwordConfirmation) {
            setError('Passwords do not match');
            return;
        }
        try {
            await register(name, email, password, passwordConfirmation);
            router.push('/dashboard');
        } catch (e: any) {
            setError(e.message ?? 'Registration failed');
        }
    }

    return (
        <div className="mx-[38vw] flex flex-col justify-center min-h-[80vh]">
            <p className="text-4xl mb-2 text-center">Register</p>
            <form className="bg-gray-800 p-10 rounded-4xl">
                <div className="pb-10">
                    <p className="text-2xl">Name: </p>
                    <input className="bg-blue-950 p-2 rounded w-full" type="text" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)}/>
                </div>
                <div className="pb-10">
                    <p className="text-2xl">Email: </p>
                    <input className="bg-blue-950 p-2 rounded w-full" type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
                </div>
                <div className="pb-10">
                    <p className="text-2xl">Password: </p>
                    <input className="bg-blue-950 p-2 rounded w-full" type="password" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                </div>
                <div className="pb-15">
                    <p className="text-2xl">Confirm Password: </p>
                    <input className="bg-blue-950 p-2 rounded w-full" type="password" id="password_confirmation" name="password_confirmation" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}/>
                </div>
                {error && <p className="text-red-400 mb-4">{error}</p>}
                <div className="flex justify-center w-full">
                    <Button variant="contained" color="secondary" onClick={registerAction}>
                        <p>Create account</p>
                    </Button>
                </div>
                <div className="flex justify-center mt-4">
                    <a href="/login" className="text-blue-400 hover:underline text-sm">Already have an account? Login</a>
                </div>
            </form>
        </div>
    )
}
