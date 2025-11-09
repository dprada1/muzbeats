import { type ReactNode, useEffect } from 'react';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    /** optional custom content instead of the default message */
    children?: ReactNode;
}

export default function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Yes',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    children,
}: ConfirmDialogProps) {
    // Close on Esc
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    // Disable background scrolling when dialog box is open
    useEffect(() => {
        const html = document.documentElement;
        const prev = html.style.overflow;
        html.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prev;
        };
    }, []);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onCancel} // click-outside closes
        >
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/60" />

            {/* panel */}
            <div
                className="relative w-full max-w-sm sm:max-w-md rounded-2xl bg-[#1e1e1e] shadow-2xl border border-white/10
                            p-4 sm:p-6 max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()} // prevent bubbling to backdrop
            >
                <h3 id="confirm-title" className="text-lg font-bold mb-2 sm:mb-3">{title}</h3>

                {children ? (
                    children
                ) : (
                    <p className="text-sm sm:text-base mb-4 sm:mb-6">{message}</p>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded text-sm bg-zinc-700 hover:bg-zinc-600 cursor-pointer no-ring"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded text-sm bg-red-600 hover:bg-red-500 cursor-pointer text-white no-ring"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
