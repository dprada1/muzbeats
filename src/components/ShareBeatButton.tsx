import { useState } from 'react';
import { Share2 } from 'lucide-react';

interface ShareBeatButtonProps {
    /* Full URL to share (including origin), eg. https://.../store/beat/:id */
    url: string;

    /* Optional title for share dialog */
    title?: string;
}

export function ShareBeatButton({ url, title }: ShareBeatButtonProps) {
    const [copied, setCopied] = useState(false);

    // Use the provided url/title or fall back to window/document values
    const shareUrl = url ?? window.location.href;
    const shareTitle = title ?? document.title;

    const handleShare = async () => {
        const url = window.location.href;

        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: shareTitle, url: shareUrl});
            } catch {
                // user cancelled or error
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Copy failed', err);
            }
        }
    };

    return (
        <button
            onClick={handleShare}
            className="
                inline-flex items-center space-x-1
                px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer
                text-gray-100 text-sm
            "
        >
            <Share2 className="w-4 h-4" />
            <span>
                {typeof navigator.share === 'function'
                    ? 'Share'
                    : copied
                    ? 'Copied!'
                    : 'Copy link'
                }
            </span>
        </button>
    );
}
