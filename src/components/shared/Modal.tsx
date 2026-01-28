import { ReactNode } from "react"

interface ModalI {
    children: ReactNode
}

const Modal: React.FC<ModalI> = ({children}) => {
    return (
        <div className="fixed inset-0 bg-black/70 items-center justify-center flex">
            {children}
        </div>
    )
}

export default Modal