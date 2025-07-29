import React, { type ReactNode, useState } from 'react';

type Props = {
    trigger: ReactNode;
    message: string;
};

/**
 * A simple hover/focus tooltip.
 */
export const InfoTooltip: React.FC<Props> = ({ trigger, message }) => {
    const [open, setOpen] = useState(false);

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            tabIndex={0}
        >
            <span className="cursor-pointer">{trigger}</span>
            {open && (
                <div
                    role="tooltip"
                    className="absolute z-10 w-48 p-2 text-sm bg-gray-800 text-white rounded shadow-lg -mt-2 ml-2"
                >
                    {message}
                </div>
            )}
        </div>
    );
};
