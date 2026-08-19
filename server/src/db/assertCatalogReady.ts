/**
 * Fail-closed catalog asset gate for server boot.
 *
 * Blocks traffic (via readiness + thrown error) when sellable / fallback assets
 * (or advertised BPM metadata) are wrong in the storage this environment serves:
 * - development → local disk
 * - staging / production → R2 (public MP3 + private WAV + skimask)
 *
 * Also fatal:
 * - BPM filename issues:
 *  - unparseable filename BPM
 *  - out-of-bounds filename BPM,
 *  - DB↔filename BPM mismatch)
 * - inventory |mp3| = |wav| = |DB rows| (stem sets).
 * Skips custom-cover probes and cover UUID mismatches (skimask is the boot fallback).
 * Empty catalog (0 rows): warn only.
 * Escape hatch: CATALOG_AUDIT_SKIP=1 (logs a warning — ops only).
 */

import {
    type CatalogAuditResult,
    type CatalogIssue,
    type StorageMode,
    filterBootFatalIssues,
    runCatalogAudit,
} from '@/db/catalogAudit.js';
import { getAppEnv } from '@/config/env.js';
import { logError, logInfo, logWarn } from '@/utils/logger.js';

function isTruthyEnv(name: string): boolean {
    const raw = process.env[name]?.trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
}

/** Storage mode for the environment's download / preview path. */
export function bootStorageMode(): StorageMode {
    const env = getAppEnv();
    return env === 'development' ? 'local' : 'r2';
}

function formatFatalSummary(issues: CatalogIssue[]): string {
    const issueCountByCode = new Map<string, number>();
    for (const issue of issues) {
        issueCountByCode.set(issue.code, (issueCountByCode.get(issue.code) ?? 0) + 1);
    }
    return [...issueCountByCode.entries()]
        .map(([code, count]) => `${code} (x${count})`)
        .join(', ');
}

/**
 * Probe catalog assets required to take money / serve downloads.
 * @throws If any boot-fatal issue is found (unless CATALOG_AUDIT_SKIP is set)
 */
export async function assertCatalogReady(): Promise<void> {
    if (isTruthyEnv('CATALOG_AUDIT_SKIP')) {
        logWarn(
            'assertCatalogReady',
            'Skipping catalog asset audit (CATALOG_AUDIT_SKIP is set) — server may sell undeliverable beats'
        );
        return;
    }

    const storageMode: StorageMode = bootStorageMode();
    const auditStartedAtMs = Date.now();

    logInfo('assertCatalogReady', 'Running boot catalog audit', {
        storageMode,
        profile: 'boot',
    });

    const catalogAuditResult: CatalogAuditResult = await runCatalogAudit({
        storageMode,
        profile: 'boot',
    });
    const bootFatalIssues: CatalogIssue[] = filterBootFatalIssues(catalogAuditResult.issues);
    const auditElapsedMs = Date.now() - auditStartedAtMs;

    if (catalogAuditResult.inventory.dbRows === 0) {
        logWarn(
            'assertCatalogReady',
            'Catalog has 0 beats — storefront will be empty until rows (and matching mp3/wav) exist',
            { storageMode, inventory: catalogAuditResult.inventory }
        );
    }

    if (bootFatalIssues.length > 0) {
        for (const issue of bootFatalIssues) {
            logError('assertCatalogReady', 'Fatal catalog issue', {
                code: issue.code,
                title: issue.title,
                beatId: issue.beatId,
                detail: issue.detail,
            });
        }
        throw new Error(
            `Catalog assets not ready (${storageMode}): ${bootFatalIssues.length} fatal issue(s) — ${formatFatalSummary(bootFatalIssues)}. ` +
                `Fix storage or run \`npm run audit-catalog -- --${storageMode === 'local' ? 'local-only' : 'r2'}\`. ` +
                `Ops escape hatch: CATALOG_AUDIT_SKIP=1`
        );
    }

    logInfo('assertCatalogReady', 'Catalog assets verified', {
        storageMode,
        inventory: catalogAuditResult.inventory,
        auditElapsedMs,
    });
}
