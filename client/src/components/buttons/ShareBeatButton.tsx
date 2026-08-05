import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ShareDialog } from '@/components/ui/Dialog/ShareDialog';

interface ShareBeatButtonProps {
    url: string;     // full URL to share (including origin), e.g. https://.../store/beat/:id
    title?: string;  // optional title for share dialog
    disabled?: boolean;
}

export function ShareBeatButton({ url, title, disabled = false }: ShareBeatButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const shareUrl = url ?? window.location.href;
    const shareTitle = title ?? document.title;

    return (
        <>
        <button
            onClick={() => {
                if (disabled) return;
                setDialogOpen(true);
            }}
            disabled={disabled}
            aria-disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={dialogOpen}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border
                    text-sm no-ring w-24 sm:w-32 justify-center transition ${
                        disabled
                            ? 'border-zinc-600 bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                            : 'border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-pointer text-gray-100 active:scale-[1.02]'
                    }`}
        >
            <Share2 className="w-4 h-4" />
            <span className="pointer-events-none">
                Share
            </span>
        </button>

        {dialogOpen && !disabled && (
            <ShareDialog
                url={shareUrl}
                title={shareTitle}
                onClose={() => setDialogOpen(false)}
            />
        )}
        </>
    );
}
