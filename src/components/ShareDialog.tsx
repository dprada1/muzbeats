import React, { useState } from 'react';
import {
  FiX,
  FiMessageSquare,
  FiSend,
  FiTwitter,
  FiMail,
  FiMoreHorizontal,
  FiLink,
} from 'react-icons/fi';
import { MdContentCopy } from 'react-icons/md';

export interface ShareDialogProps {
  /** Full URL to share */
  url: string;
  /** Title for email/share text */
  title?: string;
  /** Called when the user clicks the “×” */
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  url,
  title = 'Check this out',
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

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
    { icon: <FiMessageSquare />, label: 'Chat', href: `sms:?&body=${encodedText}%20${encodedUrl}` },
    { icon: <FiSend />, label: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { icon: <FiTwitter />, label: 'Twitter', href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}` },
    { icon: <FiMail />, label: 'E-mail', href: `mailto:?subject=${encodedText}&body=${encodedUrl}` },
    { icon: <FiMoreHorizontal />, label: 'More', href: '#' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 bg-opacity-95 rounded-lg p-6 w-full max-w-sm relative text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Share with</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white cursor-pointer">
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
              className="flex flex-col items-center space-y-1 text-gray-300 hover:text-white"
            >
              <div className="p-3 bg-gray-700 rounded-full">{icon}</div>
              <span className="text-xs">{label}</span>
            </a>
          ))}
        </div>

        {/* Copy link section */}
        <div className="text-center text-gray-400 text-xs mb-2">Or share with link</div>
        <div className="flex items-center space-x-2">
          <FiLink className="text-gray-400" />
          <input
            type="text"
            readOnly
            value={url}
            className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-l-md text-sm text-gray-100 overflow-x-auto"
          />
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 p-2 bg-gray-700 border-l-0 border border-gray-600 rounded-r-md hover:bg-gray-600 cursor-pointer"
          >
            <MdContentCopy className="text-gray-300 w-5 h-5" />
            <span className={`${copied ? 'text-green-500' : 'text-gray-300'} text-sm`}>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
