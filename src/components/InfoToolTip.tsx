import React, { type ReactNode, useState } from 'react';

type Props = {
  trigger: ReactNode;
  message: ReactNode;
};

/**
 * A simple hover/focus tooltip.
 */
export const InfoTooltip: React.FC<Props> = ({ trigger, message }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      {/*
        — attach hover/focus handlers to the trigger only,
          so moving into the tooltip itself closes it
      */}
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

      {open && (
        <>
          {/* the tooltip bubble */}
          <div
            role="tooltip"
            className="
              absolute
              top-full          /* position right below the trigger */
              left-1/2          /* center horizontally */
              -translate-x-1/2  /* true center */
              mt-2              /* small gap */
              z-10
              max-w-xs
              w-72
              p-2
              text-sm
              bg-gray-800
              text-white
              rounded
              shadow-lg
              break-words
            "
          >
            {message}
          </div>

          {/* little arrow, also absolutely positioned */}
          <div
            className="
              absolute
              top-full          /* start right at bottom of trigger */
              left-1/2
              -translate-x-1/2
              mt-0.5           /* nudge it into the bubble */
              w-0 h-0
              border-l-4 border-r-4 border-b-4
              border-l-transparent border-r-transparent border-b-gray-800
            "
          />
        </>
      )}
    </div>
  );
};
