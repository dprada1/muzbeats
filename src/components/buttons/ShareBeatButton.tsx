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
			className="inline-flex items-center space-x-1 px-2 py-1 rounded-full
					bg-gray-800 hover:bg-gray-700 cursor-pointer
					text-gray-100 text-sm no-ring"
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
