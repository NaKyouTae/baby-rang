"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

export default function Modal({ open, onClose, className, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center p-0 md:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          className ??
          "bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        }
      >
        {children}
      </div>
    </div>
  );
}
