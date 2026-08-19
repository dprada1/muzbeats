import util from 'util';

type LogMeta = unknown;

function formatMessage(
    level: 'INFO' | 'WARN' | 'ERROR',
    scope: string,
    message: string
): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${scope}: ${message}`;
}

/**
 * Always expand meta on the following line so `{` is Allman (not K&R / compact).
 * Short objects like `{ url: '...' }` used to stay inline because `console.log(msg, obj)`
 * uses `util.inspect` compact mode when the object fits the terminal width.
 */
function inspectMeta(meta: LogMeta): string {
    return util.inspect(meta, {
        colors: Boolean(process.stdout.isTTY),
        compact: false,
        breakLength: 1,
        depth: null,
    });
}

/** Routine success / progress (boot OK, email sent, etc.). */
export function logInfo(
    scope: string,
    message: string,
    meta?: LogMeta
): void {
    if (meta !== undefined) {
        console.log(`${formatMessage('INFO', scope, message)}\n${inspectMeta(meta)}`);
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
        console.warn(`${formatMessage('WARN', scope, message)}\n${inspectMeta(meta)}`);
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
        console.error(`${formatMessage('ERROR', scope, message)}\n${inspectMeta(meta)}`);
    } else {
        console.error(formatMessage('ERROR', scope, message));
    }
}
