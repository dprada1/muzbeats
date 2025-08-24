import React, { useState, useEffect } from 'react';
import {
    FiX,
    FiMessageSquare,
    FiSend,
    FiTwitter,
    FiMail,
    FiLink,
} from 'react-icons/fi';
import { MdContentCopy } from 'react-icons/md';

export interface ShareDialogProps {
    url: string;
    title?: string;
    onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
    url,
    title = 'Check this out',
    onClose,
}) => {
    const [copied, setCopied] = useState(false);

    // Close on Esc
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

	// Prevent background scrolling while the dialog is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(title);
    const shareLinks = [
        {
            icon: <FiMessageSquare />,
            label: 'Chat',
            href: `sms:?&body=${encodedText}%20${encodedUrl}`,
        },
        {
            icon: <FiSend />,
            label: 'Telegram',
            href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        },
        {
            icon: <FiTwitter />,
            label: 'Twitter',
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
        },
        {
            icon: <FiMail />,
            label: 'E-mail',
            href: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
        },
    ];

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center
                        justify-center z-50 p-4 sm:p-6"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1a1a] bg-opacity-95 rounded-lg p-4
                            sm:p-6 w-full max-w-sm sm:max-w-md md:max-w-lg
                            relative text-gray-100 max-h-[85vh]
                            overflow-y-auto border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Share with</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white
                                    cursor-pointer focus:outline-none"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Icon links */}
                <div className="flex justify-between mb-6">
                    {shareLinks.map(({ icon, label, href }) => (
                        <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center space-y-1 text-gray-300 hover:text-white focus:outline-none"
                        >
                            <div className="p-3 bg-[#2a2a2a] rounded-full">
                                {icon}
                            </div>
                            <span className="text-xs">{label}</span>
                        </a>
                    ))}
                </div>

                {/* Copy link section */}
                <div className="text-center text-gray-400 text-xs mb-2">
                    Or share with link
                </div>
                <div className="flex items-center">
                    <FiLink className="text-gray-400"/>
                    <input
                        type="text"
                        readOnly
                        value={url}
                        className="flex-grow p-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-l-md text-sm text-gray-100 overflow-x-auto focus:outline-none"
                    />
                    <button
                        onClick={handleCopy}
                        className={`flex items-center justify-center space-x-1 p-2 bg-[#2a2a2a] border-l-0 border border-[#3a3a3a] rounded-r-md hover:bg-[#3a3a3a] cursor-pointer focus:outline-none -ml-px w-22`}
                    >
                        <MdContentCopy className="text-gray-300 w-5 h-5" />
                        <span
                            className={`text-sm ${
                                copied ? 'text-green-500' : 'text-gray-300'
                            }`}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
