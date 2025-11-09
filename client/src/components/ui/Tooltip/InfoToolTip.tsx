import React, {
    type ReactNode,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

type Placement = 'down' | 'up' | 'left' | 'right';
type Align = 'left' | 'center' | 'right';

type Props = {
    trigger: ReactNode;
    message: ReactNode;
    className?: string;
    placement?: Placement; // e.g. "down"
    align?: Align;         // for down/up: left|center|right
};

const ARROW = 10;     // fixed arrow size (px)
const APEX_GAP = 4;   // fixed gap between arrow tip and icon (px)
const MAX_PANEL = 'min(90vw, 24rem)'; // hard cap; width otherwise fits content

export const InfoTooltip: React.FC<Props> = ({
    trigger,
    message,
    className = '',
    placement = 'down',
    align = 'left',
}) => {
    const [open, setOpen] = useState(false);
    const id = useId();

    const wrapRef = useRef<HTMLDivElement>(null);
    const trigRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const position = () => {
        const wrap = wrapRef.current!;
        const trig = trigRef.current!;
        const panel = panelRef.current!;
        if (!wrap || !trig || !panel) return;

        // autosize: width equals content (capped via maxWidth)
        panel.style.width = 'max-content';

        const wrapRect = wrap.getBoundingClientRect();
        const tRect = trig.getBoundingClientRect();

        // make measurable
        panel.style.left = '0px';
        panel.style.top = '0px';
        const pw = panel.offsetWidth;
        const ph = panel.offsetHeight;

        const iconCx = tRect.left - wrapRect.left + tRect.width / 2;
        const iconCy = tRect.top - wrapRect.top + tRect.height / 2;

        let left = 0, top = 0, arrowLeft = ARROW, arrowTop = ARROW;

        if (placement === 'down' || placement === 'up') {
            // vertical: include arrow size + fixed gap so the tip is APEX_GAP below/above the icon
            top = placement === 'down'
                ? (tRect.height + ARROW + APEX_GAP)
                : (-ph - ARROW - APEX_GAP);

            // desired arrowLeft from panel's left edge based on align (body shift)
            if (align === 'center') arrowLeft = Math.round(pw / 2 - ARROW);
            else if (align === 'right') arrowLeft = Math.max(ARROW, pw - 2 * ARROW);
            else arrowLeft = ARROW; // left

            // place panel so arrow tip lands on icon center
            left = Math.round(iconCx - (arrowLeft + ARROW));

            // clamp to viewport; keep arrow anchored
            const vw = document.documentElement.clientWidth;
            const minL = Math.round(-wrapRect.left + 8);
            const maxL = Math.round(vw - wrapRect.left - pw - 8);
            if (left < minL) left = minL;
            if (left > maxL) left = maxL;

            arrowLeft = Math.round(iconCx - ARROW - left);
            arrowLeft = Math.max(ARROW, Math.min(pw - ARROW, arrowLeft));
        } else if (placement === 'right' || placement === 'left') {
            // horizontal: same logic, with arrow size + fixed gap horizontally
            left = placement === 'right'
                ? (tRect.width + ARROW + APEX_GAP)
                : (-pw - ARROW - APEX_GAP);

            if (align === 'center') arrowTop = Math.round(ph / 2 - ARROW);
            else if (align === 'right') arrowTop = Math.max(ARROW, ph - 2 * ARROW); // bottom
            else arrowTop = ARROW; // top

            top = Math.round(iconCy - (arrowTop + ARROW));

            const vh = document.documentElement.clientHeight;
            const minT = Math.round(-wrapRect.top + 8);
            const maxT = Math.round(vh - wrapRect.top - ph - 8);
            if (top < minT) top = minT;
            if (top > maxT) top = maxT;

            arrowTop = Math.round(iconCy - ARROW - top);
            arrowTop = Math.max(ARROW, Math.min(ph - ARROW, arrowTop));
        }

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.setProperty('--arrow-left', `${arrowLeft}px`);
        panel.style.setProperty('--arrow-top', `${arrowTop}px`);
        panel.style.visibility = 'visible';
    };

    // position before paint to avoid initial "slide"
    useLayoutEffect(() => {
        if (open) position();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, placement, align]);

    useEffect(() => {
        if (!open) return;
        const onResize = () => position();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const Arrow = () => {
        const color = 'rgba(31,41,55,1)'; // gray-800
        if (placement === 'down') {
            return (
                <div
                    aria-hidden
                    className="absolute w-0 h-0"
                    style={{
                        left: 'var(--arrow-left)',
                        top: -ARROW,
                        borderLeft: `${ARROW}px solid transparent`,
                        borderRight: `${ARROW}px solid transparent`,
                        borderBottom: `${ARROW}px solid ${color}`,
                    }}
                />
            );
        }
        if (placement === 'up') {
            return (
                <div
                    aria-hidden
                    className="absolute w-0 h-0"
                    style={{
                        left: 'var(--arrow-left)',
                        bottom: -ARROW,
                        borderLeft: `${ARROW}px solid transparent`,
                        borderRight: `${ARROW}px solid transparent`,
                        borderTop: `${ARROW}px solid ${color}`,
                    }}
                />
            );
        }
        if (placement === 'right') {
            return (
                <div
                    aria-hidden
                    className="absolute w-0 h-0"
                    style={{
                        top: 'var(--arrow-top)',
                        left: -ARROW,
                        borderTop: `${ARROW}px solid transparent`,
                        borderBottom: `${ARROW}px solid transparent`,
                        borderRight: `${ARROW}px solid ${color}`,
                    }}
                />
            );
        }
        return (
            <div
                aria-hidden
                className="absolute w-0 h-0"
                style={{
                    top: 'var(--arrow-top)',
                    right: -ARROW,
                    borderTop: `${ARROW}px solid transparent`,
                    borderBottom: `${ARROW}px solid transparent`,
                    borderLeft: `${ARROW}px solid ${color}`,
                }}
            />
        );
    };

    return (
        <div ref={wrapRef} className={`relative inline-flex items-center ${className}`}>
            <button
                ref={trigRef}
                type="button"
                aria-describedby={open ? id : undefined}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={() => setOpen(v => !v)}
                className="no-ring h-full flex items-center justify-center"
            >
                {trigger}
            </button>

            <div
                ref={panelRef}
                id={id}
                role="tooltip"
                className={[
                    'absolute z-50',
                    'transition-opacity duration-150', // fade only
                    open ? 'opacity-100' : 'opacity-0 pointer-events-none',
                ].join(' ')}
                style={{
                    width: 'max-content',      // <-- fit to content
                    maxWidth: MAX_PANEL,       // <-- but don’t exceed viewport/cap
                    visibility: open ? 'visible' : 'hidden',
                }}
            >
                <Arrow />
                <div className="bg-gray-800 text-white text-[13px] leading-snug rounded-md shadow-lg px-3 py-2 break-words">
                    {message}
                </div>
            </div>
        </div>
    );
};
