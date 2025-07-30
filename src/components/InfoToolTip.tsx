import React, { type ReactNode, useState } from 'react';

type Props = {
  trigger: ReactNode;
  message: ReactNode;
};

/**
 * A simple hover/focus tooltip with fade/slide transition.
 */
export const InfoTooltip: React.FC<Props> = ({ trigger, message }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      {/* Hover/focus on trigger only */}
      <span
        className="cursor-pointer"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
      >
        {trigger}
      </span>

      {/* Tooltip bubble */}
      <div
        role="tooltip"
        className={`
          absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10
          w-56 p-2 text-sm bg-gray-800 text-white rounded shadow-lg
          transform transition-transform duration-200
          ${open
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-1 pointer-events-none'}
        `}
      >
        {message}
      </div>

      {/* Tooltip arrow */}
      <div
        className={`
          absolute top-full left-1/2 -translate-x-1/2 mt-0.5
          w-0 h-0 border-l-4 border-r-4 border-b-4
          border-l-transparent border-r-transparent border-b-gray-800
          transform transition-transform duration-200
          ${open
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-1 pointer-events-none'}
        `}
      />
    </div>
  );
};
