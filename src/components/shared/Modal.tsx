import { ReactNode } from "react"

interface ModalI {
    children: ReactNode
    mobileFullscreen?: boolean
}

const Modal: React.FC<ModalI> = ({ children, mobileFullscreen = false }) => {
    return (
        <div className={`fixed inset-0 z-50 bg-black/70 flex justify-center ${
            mobileFullscreen
                ? 'items-start overflow-y-auto sm:items-center sm:overflow-hidden'
                : 'items-center'
        }`}>
            {children}
        </div>
    )
}

export default Modal