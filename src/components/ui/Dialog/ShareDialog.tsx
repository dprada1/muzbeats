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

    // Disable background scrolling when dialog box is open
    useEffect(() => {
        const html = document.documentElement;
        const prev = html.style.overflow;
        html.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prev;
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
            color: 'bg-green-500 hover:bg-green-600',
        },
        {
            icon: <FiSend />,
            label: 'Telegram',
            href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
            color: 'bg-[#0088cc] hover:bg-[#0077b3]',
        },
        {
            icon: <FiTwitter />,
            label: 'Twitter',
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
            color: 'bg-[#1DA1F2] hover:bg-[#1a91da]',
        },
        {
            icon: <FiMail />,
            label: 'E-mail',
            href: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
            color: 'bg-red-500 hover:bg-red-600',
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
                <div className="flex justify-between items-center mb-3">
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
                <div className="flex justify-around mb-4">
                    {shareLinks.map(({ icon, label, href, color }) => (
                        <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 text-gray-300 hover:text-white focus:outline-none transition-colors cursor-pointer group"
                        >
                            <div className={`p-3 ${color} rounded-full text-white transition-colors shadow-lg group-hover:scale-110`}>
                                {icon}
                            </div>
                            <span className="text-xs font-medium">{label}</span>
                        </a>
                    ))}
                </div>

                {/* Copy link section */}
                <div className="text-center text-gray-400 text-xs mb-2">
                    Or share with link
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FiLink className="text-gray-400 flex-shrink-0"/>
                        <input
                            type="text"
                            readOnly
                            value={url}
                            className="flex-grow p-2.5 bg-[#2a2a2a] border border-[#3a3a3a] rounded-md text-sm text-gray-100 overflow-x-auto focus:outline-none focus:border-gray-500 transition-colors"
                        />
                    </div>
                    <button
                        onClick={handleCopy}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all focus:outline-none cursor-pointer ${
                            copied
                                ? 'bg-green-600/80 hover:bg-green-600 text-white'
                                : 'bg-[#0b84ff] hover:bg-[#0a74d1] text-white'
                        } shadow-lg active:scale-[0.98]`}
                    >
                        <MdContentCopy className="w-5 h-5" />
                        <span className="text-sm">
                            {copied ? 'Copied!' : 'Copy Link'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
