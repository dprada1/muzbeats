/**
 * WSInternals
 * Minimal private WaveSurfer fields we touch for instant buffer reuse/redraw.
 * Kept tiny and quarantined so future WS upgrades are easy to adapt.
 */
export type WSInternals = {
    backend?: { buffer?: AudioBuffer };
    drawBuffer?: () => void;
};
