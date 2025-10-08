'use client'

import { Board } from "@/components/layout/Board"

export default function DashboardPage () {
    return (
        <div className="w-[100dvw] flex justify-center">
            <div>
                <h1>Hello Motto</h1>
                <Board/>
            </div>
        </div>
    )
}
