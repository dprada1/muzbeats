import { createContext, useContext } from "react";
import type { PlayerBarContextType } from "./usePlayerBar";

const PlayerBarContext = createContext<PlayerBarContextType | null>(null);

/**
 * Provider for PlayerBar’s shared state & handlers.
 */
export const PlayerBarProvider = PlayerBarContext.Provider;

/**
 * Hook to consume PlayerBar context. Must be inside <PlayerBarProvider>.
 */
export function usePlayerBarContext(): PlayerBarContextType {
    const ctx = useContext(PlayerBarContext);
    if (!ctx) {
        throw new Error(
            'usePlayerBarContext() must be used within a <PlayerBarProvider>'
        );
    }
    return ctx;
}
