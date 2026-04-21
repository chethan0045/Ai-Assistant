import { ErrorHandler, Injectable, inject } from '@angular/core';
import { DefectsService } from './defects.service';
import { ProjectScannerService } from './project-scanner.service';

/**
 * Catches any error that bubbles up through Angular and logs it as a defect
 * tagged with the currently-open project (if any). Also hooks the window-level
 * error and unhandledrejection events so truly global failures get captured.
 *
 * Errors are still logged to the console so dev-mode debugging works as usual.
 *
 * Throttling:
 *   - Dev-mode-only errors (e.g. NG0100 ExpressionChangedAfterItHasBeenCheckedError)
 *     are dropped entirely — they never fire in prod builds and just flood the dashboard.
 *   - Everything else is deduped by fingerprint (first 200 chars of the message): the
 *     same error won't be logged more than once per DEDUPE_WINDOW_MS, so a tight loop
 *     that throws 60 times a second ends up as a single defect.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private defects = inject(DefectsService);
  private scanner = inject(ProjectScannerService);
  private installed = false;

  // Dev-only Angular assertions that aren't real bugs in shipped code.
  private readonly IGNORE_PATTERNS: RegExp[] = [
    /NG0100/,                                  // ExpressionChangedAfterItHasBeenCheckedError
    /ExpressionChangedAfterItHasBeenChecked/,
  ];

  // fingerprint → last-logged timestamp (ms). Anything repeated within the window is dropped.
  private readonly DEDUPE_WINDOW_MS = 60_000;
  private readonly recentFingerprints = new Map<string, number>();

  constructor() {
    if (!this.installed) {
      this.installed = true;
      if (typeof window !== 'undefined') {
        window.addEventListener('error', (e) => {
          this.log(e.error || e.message || 'window error', e.filename);
        });
        window.addEventListener('unhandledrejection', (e) => {
          this.log(e.reason || 'Unhandled promise rejection');
        });
      }
    }
  }

  handleError(error: any): void {
    // Mirror Angular's default behavior so the devtools console still shows it.
    console.error(error);
    this.log(error);
  }

  private log(error: any, hint?: string): void {
    const message = String(error?.message || error || 'Unknown error').slice(0, 500);

    // 1. Drop dev-only noise that never affects production.
    if (this.IGNORE_PATTERNS.some(rx => rx.test(message))) return;

    // 2. Dedupe by fingerprint (first 200 chars — stable across identical repeats).
    const fingerprint = message.slice(0, 200);
    const now = Date.now();
    const last = this.recentFingerprints.get(fingerprint);
    if (last !== undefined && now - last < this.DEDUPE_WINDOW_MS) return;

    // Record before the async call so concurrent errors in the same tick also dedupe.
    this.recentFingerprints.set(fingerprint, now);
    this.pruneOldFingerprints(now);

    const projectName = this.scanner.report()?.tree?.name || '';
    const stack = typeof error?.stack === 'string' ? error.stack.slice(0, 4000) : '';
    this.defects.logError({
      message,
      stack,
      endpoint: hint || (typeof location !== 'undefined' ? location.pathname : ''),
      method: 'CLIENT',
      projectName,
    }).catch(() => {});
  }

  private pruneOldFingerprints(now: number): void {
    // Keep the map bounded — drop entries outside the dedupe window.
    for (const [fp, ts] of this.recentFingerprints) {
      if (now - ts > this.DEDUPE_WINDOW_MS) this.recentFingerprints.delete(fp);
    }
  }
}
