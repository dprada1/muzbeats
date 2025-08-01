import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ShareDialog } from './ShareDialog';

interface ShareBeatButtonProps {
  /** Full URL to share (including origin), e.g. https://.../store/beat/:id */
  url: string;
  /** Optional title for share dialog */
  title?: string;
}

export function ShareBeatButton({ url, title }: ShareBeatButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const shareUrl = url ?? window.location.href;
  const shareTitle = title ?? document.title;

  const handleClick = () => {
    // open our custom share dialog
    setDialogOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-gray-800 hover:bg-gray-700 cursor-pointer text-gray-100 text-sm"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
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
