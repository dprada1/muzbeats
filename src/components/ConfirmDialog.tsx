import { type ReactNode, useEffect } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
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
    isOpen,
    title,
    message,
    confirmLabel = 'Yes',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    children,
}: ConfirmDialogProps) {
    /* close on Esc */
    useEffect(() => {
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
        if (isOpen) window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-sm bg-[#1e1e1e] rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-semibold mb-3">{title}</h3>
                {children ? children : <p className="text-sm mb-6">{message}</p>}

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
