import { ReactNode } from "react"

interface ModalI {
    children: ReactNode
    mobileFullscreen?: boolean
}

const Modal: React.FC<ModalI> = ({ children, mobileFullscreen = false }) => {
    return (
        <div className={`modal-backdrop fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex justify-center ${
            mobileFullscreen
                ? 'items-start overflow-y-auto sm:items-center sm:overflow-hidden'
                : 'items-center'
        }`}>
            <div className="modal-content">
                {children}
            </div>
        </div>
    )
}

export default Modal
