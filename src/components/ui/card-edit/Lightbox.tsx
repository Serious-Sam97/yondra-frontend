"use client";

interface LightboxProps {
  src: string;
  onClose: () => void;
}

// Full-size image viewer opened by clicking any inline rich-text image
// (description or comments). Escape handling lives in useCardAttachments.
export function Lightbox({ src, onClose }: LightboxProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4vh",
        cursor: "zoom-out",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          maxWidth: "92vw",
          maxHeight: "92vh",
          objectFit: "contain",
          borderRadius: 8,
          boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}
