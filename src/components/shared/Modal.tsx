import { type ReactNode, useRef } from "react";

interface ModalI {
  children: ReactNode;
  mobileFullscreen?: boolean;
  // When provided, clicking the backdrop (outside the content) closes the modal.
  onClose?: () => void;
}

const Modal: React.FC<ModalI> = ({
  children,
  mobileFullscreen = false,
  onClose,
}) => {
  // Only close when the press STARTED on the backdrop too — prevents a
  // text-selection drag that ends on the backdrop from closing the modal.
  const pressedBackdrop = useRef(false);

  return (
    <div
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (onClose && pressedBackdrop.current && e.target === e.currentTarget)
          onClose();
      }}
      className={`modal-backdrop fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex justify-center ${
        mobileFullscreen
          ? "items-start overflow-y-auto sm:items-center sm:overflow-hidden"
          : "items-center"
      }`}
    >
      <div className="modal-content">{children}</div>
    </div>
  );
};

export default Modal;
