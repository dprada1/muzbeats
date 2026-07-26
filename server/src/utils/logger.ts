type LogMeta = unknown;

function formatMessage(
    level: 'INFO' | 'WARN' | 'ERROR',
    scope: string,
    message: string
): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${scope}: ${message}`;
}

/** Routine success / progress (boot OK, email sent, etc.). */
export function logInfo(
    scope: string,
    message: string,
    meta?: LogMeta
): void {
    if (meta !== undefined) {
        console.log(formatMessage('INFO', scope, message), meta);
    } else {
        console.log(formatMessage('INFO', scope, message));
    }
}

/** Soft-fail / degraded behavior (missing optional env, email skipped). */
export function logWarn(
    scope: string,
    message: string,
    meta?: LogMeta
): void {
    if (meta !== undefined) {
        console.warn(formatMessage('WARN', scope, message), meta);
    } else {
        console.warn(formatMessage('WARN', scope, message));
    }
}

/** Failures you care about in prod (send failed, unexpected catch). */
export function logError(
    scope: string,
    message: string,
    meta?: LogMeta
): void {
    if (meta !== undefined) {
        console.error(formatMessage('ERROR', scope, message), meta);
    } else {
        console.error(formatMessage('ERROR', scope, message));
    }
}
