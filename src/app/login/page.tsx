'use client'

import { Button } from "@mui/material";
import { useCallback, useState } from "react"

export default function LoginPage () {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    return (
        <div className="mx-[38vw] flex flex-col  justify-center min-h-[80vh]">
            <p className="text-4xl mb-2 text-center">Login</p>
            <form className="bg-gray-800 p-10 rounded-4xl">
                <div className="pb-10">
                    <p className="text-2xl">Username: </p>
                    <input className="bg-blue-950 p-2 rounded w-full" type="text" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)}/>
                </div>
                <div className="pb-15">
                    <p className="text-2xl">Password: </p>
                    <input className="bg-blue-950 p-2 rounded w-full" type="password" id="username" name="username" value={password} onChange={(e) => setPassword(e.target.value)}/>
                </div>
                <div className="flex justify-center w-full">
                    <Button variant="contained" color="secondary">
                        <p>You may enter</p>
                    </Button>
                </div>
            </form>
        </div>
    )
}