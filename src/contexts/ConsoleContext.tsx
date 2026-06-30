'use client'

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";

export type ConsoleActivity = { id: number; time: string; text: string };

type ConsoleContextType = {
    /** Where the user currently is (board / section / view). Null = derive from route. */
    location: string | null;
    setLocation: (label: string | null) => void;
    /** Rolling log of what the user is doing. Newest last. */
    activity: ConsoleActivity[];
    pushActivity: (text: string) => void;
};

const ConsoleContext = createContext<ConsoleContextType | undefined>(undefined);

function stamp(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const ConsoleProvider = ({ children }: { children: ReactNode }) => {
    const [location, setLocation] = useState<string | null>(null);
    const [activity, setActivity] = useState<ConsoleActivity[]>([]);
    const idRef = useRef(0);

    const pushActivity = useCallback((text: string) => {
        setActivity(prev => {
            // ignore exact-duplicate consecutive entries to avoid noise
            if (prev.length && prev[prev.length - 1].text === text) return prev;
            const next = [...prev, { id: ++idRef.current, time: stamp(), text }];
            return next.slice(-8);
        });
    }, []);

    return (
        <ConsoleContext.Provider value={{ location, setLocation, activity, pushActivity }}>
            {children}
        </ConsoleContext.Provider>
    );
};

export const useConsole = () => {
    const ctx = useContext(ConsoleContext);
    if (!ctx) throw new Error('useConsole must be used within ConsoleProvider');
    return ctx;
};
