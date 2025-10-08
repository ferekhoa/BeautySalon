// src/components/ConfirmModal.jsx
import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ConfirmModal({
    open,
    title = "Are you sure?",
    children,
    confirmText = "Confirm",
    cancelText = "Cancel",
    destructive = false,
    onConfirm,
    onClose,
}) {
    // Close on ESC
    useEffect(() => {
        if (!open) return;
        function onKey(e) { if (e.key === "Escape") onClose?.(); }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                    className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
                    role="dialog"
                    aria-modal="true"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-lg font-semibold mb-2">{title}</h2>
                    <div className="text-sm text-gray-700">{children}</div>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" className="btn" onClick={onClose}>{cancelText}</button>
                        <button
                            type="button"
                            className={`btn ${destructive ? "btn-primary bg-red-600 border-red-600 hover:opacity-90" : "btn-primary"}`}
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
