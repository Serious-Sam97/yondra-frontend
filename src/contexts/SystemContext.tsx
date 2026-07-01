'use client'

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";

type SystemContextType = {
    isLogged: boolean;
    setIsLogged: Dispatch<SetStateAction<boolean>>;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider = ({ children }: {children: ReactNode}) => {
    const [ isLogged, setIsLogged ] = useState<boolean>(false);

    useEffect(() => {
        if (localStorage.getItem('isLogged') === 'true') {
            setIsLogged(true);
        }
    }, []);

    return (
        <SystemContext.Provider value={{isLogged, setIsLogged}}>
            {children}
        </SystemContext.Provider>
    )
}

export const useSystem = () => {
    const context = useContext(SystemContext);
    if (!context) {
        throw new Error('Wrong Context used');
    }

    return context;
}