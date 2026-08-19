/**
 * Process-wide readiness for deploy health checks.
 *
 * The HTTP server listens before catalog audit finishes so platforms can probe `/health`.
 * Until {@link markServerReady}, `/health` returns 503 and API routes refuse traffic.
 */

let serverReady: boolean = false;

/** True after DB init + catalog audit succeeded. */
export function isServerReady(): boolean {
    return serverReady;
}

/** Mark the process ready to serve storefront / checkout traffic. */
export function markServerReady(): void {
    serverReady = true;
}
