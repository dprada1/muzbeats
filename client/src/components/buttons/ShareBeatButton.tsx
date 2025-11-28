import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ShareDialog } from '../ui/Dialog/ShareDialog';

interface ShareBeatButtonProps {
    url: string;     // full URL to share (including origin), e.g. https://.../store/beat/:id
    title?: string;  // optional title for share dialog
}

export function ShareBeatButton({ url, title }: ShareBeatButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const shareUrl = url ?? window.location.href;
    const shareTitle = title ?? document.title;

    return (
        <>
        <button
            onClick={() => setDialogOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={dialogOpen}
            className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-700
                    bg-gray-800 hover:bg-gray-700 cursor-pointer
                    text-gray-100 text-sm no-ring active:scale-[1.02] w-[6rem] sm:w-[8rem] justify-center transition"
        >
            <Share2 className="w-4 h-4" />
            <span className="pointer-events-none">
                Share
            </span>
        </button>

        {dialogOpen && (
            <ShareDialog
                url={shareUrl}
                title={shareTitle}
                onClose={() => setDialogOpen(false)}
            />
        )}
        </>
    );
}
