import { createContext, ReactNode, useContext, useState } from "react";

type SystemContextType = {
    isLogged: boolean;
    setIsLogged: any;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider = ({ children }: {children: ReactNode}) => {
    const [ isLogged, setIsLogged ] = useState<boolean>(false);

    const tempIsLogged = localStorage.getItem('isLogged');
    if (tempIsLogged === 'true') {
        setIsLogged(true);
    }

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