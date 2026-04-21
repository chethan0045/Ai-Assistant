import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectScannerService, FileIssue } from './services/project-scanner.service';
import { ThemeService } from './services/theme.service';

interface FileGroup {
  path: string;
  language: string;
  issues: FileIssue[];
  expanded: boolean;
}

@Component({
  selector: 'app-issue-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="app-theme-toggle" (click)="themeSvc.toggle()" [title]="themeSvc.isDark() ? 'Switch to Light' : 'Switch to Dark'">
      <svg *ngIf="themeSvc.isDark()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      <svg *ngIf="themeSvc.isLight()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </button>
    <div class="issue-page">
      <!-- Header -->
      <div class="issue-header">
        <button class="back-btn" (click)="goBack()">&larr; Back to Scanner</button>
        <h1>
          <span class="sev-badge" [ngClass]="severity">{{ severity }}</span>
          {{ totalCount }} {{ severity | titlecase }}{{ totalCount !== 1 ? 's' : '' }}
          <span class="across">across {{ groups.length }} file{{ groups.length !== 1 ? 's' : '' }}</span>
        </h1>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar" *ngIf="allSeverities.length > 1">
        <button *ngFor="let sev of allSeverities"
                class="filter-btn"
                [class.active]="severity === sev"
                [ngClass]="sev"
                (click)="switchSeverity(sev)">
          {{ sev | titlecase }} ({{ severityCounts[sev] || 0 }})
        </button>
      </div>

      <!-- File groups -->
      <div class="groups">
        <div class="group" *ngFor="let group of groups">
          <div class="group-header" (click)="group.expanded = !group.expanded">
            <span class="expand-icon">{{ group.expanded ? '&#9660;' : '&#9654;' }}</span>
            <span class="group-path">{{ group.path }}</span>
            <span class="group-lang">{{ group.language }}</span>
            <span class="group-count">{{ group.issues.length }}</span>
          </div>
          <div class="group-issues" *ngIf="group.expanded">
            <div class="g-issue" *ngFor="let iss of group.issues" (click)="goToFile(group.path, iss.line)">
              <span class="g-sev" [ngClass]="iss.severity">{{ iss.severity }}</span>
              <span class="g-line" *ngIf="iss.line > 0">Line {{ iss.line }}</span>
              <span class="g-rule">{{ iss.rule }}</span>
              <span class="g-msg">{{ iss.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="empty" *ngIf="groups.length === 0">
        No {{ severity }} issues found.
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--bg-main); min-height: 100vh; }
    .issue-page { min-height: 100vh; background: var(--bg-main); padding: 24px 32px 64px; max-width: 1100px; margin: 0 auto; }

    .issue-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .back-btn {
      padding: 6px 14px; background: var(--accent-hover-bg); border: 1px solid var(--border-primary);
      border-radius: 8px; color: var(--accent); font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif;
      transition: all 0.2s; flex-shrink: 0;
    }
    .back-btn:hover { background: var(--accent-focus-bg); border-color: var(--accent); }
    h1 { font-size: 22px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; margin: 0; }
    .across { font-size: 14px; font-weight: 400; color: var(--text-muted); }
    .sev-badge { padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .sev-badge.error { background: rgba(239,68,68,0.2); color: var(--error); }
    .sev-badge.warning { background: rgba(245,158,11,0.2); color: var(--warning); }
    .sev-badge.info { background: rgba(96,165,250,0.2); color: var(--info); }

    .filter-bar { display: flex; gap: 8px; margin-bottom: 24px; }
    .filter-btn {
      padding: 6px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;
      border: 1px solid var(--border-tertiary); background: var(--bg-panel); color: var(--text-muted); font-family: 'Inter', sans-serif;
      transition: all 0.2s;
    }
    .filter-btn:hover { border-color: var(--accent); }
    .filter-btn.active.error { background: rgba(239,68,68,0.15); color: var(--error); border-color: rgba(239,68,68,0.3); }
    .filter-btn.active.warning { background: rgba(245,158,11,0.15); color: var(--warning); border-color: rgba(245,158,11,0.3); }
    .filter-btn.active.info { background: rgba(96,165,250,0.15); color: var(--info); border-color: rgba(96,165,250,0.3); }

    .groups { display: flex; flex-direction: column; gap: 8px; }
    .group { background: var(--bg-panel); border-radius: 10px; border: 1px solid var(--border-tertiary); overflow: hidden; }
    .group-header {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer;
      transition: background 0.15s;
    }
    .group-header:hover { background: var(--accent-hover-bg); }
    .expand-icon { font-size: 10px; color: var(--text-faded); width: 14px; text-align: center; }
    .group-path { flex: 1; font-size: 13px; font-weight: 500; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .group-lang { font-size: 11px; color: var(--accent); background: var(--accent-hover-bg); padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
    .group-count { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: rgba(245,158,11,0.15); color: var(--warning); flex-shrink: 0; }

    .group-issues { border-top: 1px solid var(--border-primary); }
    .g-issue {
      display: flex; align-items: center; gap: 8px; padding: 8px 16px 8px 40px;
      font-size: 12px; border-bottom: 1px solid var(--border-primary); cursor: pointer; transition: background 0.1s;
    }
    .g-issue:hover { background: var(--accent-hover-bg); }
    .g-issue:last-child { border-bottom: none; }
    .g-sev { padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
    .g-sev.error { background: rgba(239,68,68,0.2); color: var(--error); }
    .g-sev.warning { background: rgba(245,158,11,0.2); color: var(--warning); }
    .g-sev.info { background: rgba(96,165,250,0.2); color: var(--info); }
    .g-line { font-size: 11px; color: var(--accent); font-family: 'JetBrains Mono', monospace; flex-shrink: 0; min-width: 55px; }
    .g-rule { font-size: 10px; color: var(--text-faded); background: var(--bg-code); padding: 1px 6px; border-radius: 3px; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; }
    .g-msg { color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .empty { text-align: center; padding: 60px; color: var(--success); font-size: 16px; font-weight: 600; background: rgba(16,185,129,0.08); border-radius: 12px; border: 1px solid rgba(16,185,129,0.2); }

    @media (max-width: 768px) {
      .issue-page { padding: 16px; }
      h1 { font-size: 18px; }
      .g-rule { display: none; }
    }
  `]
})
export class IssueListComponent implements OnInit {
  severity = 'error';
  groups: FileGroup[] = [];
  totalCount = 0;
  allSeverities: string[] = [];
  severityCounts: Record<string, number> = {};
  readonly themeSvc = inject(ThemeService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scanner: ProjectScannerService
  ) {}

  ngOnInit(): void {
    const report = this.scanner.report();
    if (!report) {
      this.router.navigate(['/']);
      return;
    }

    this.route.params.subscribe(params => {
      this.severity = params['severity'] || 'error';
      this.buildGroups();
    });

    // Count all severities for the filter bar
    this.severityCounts = { error: report.totalErrors, warning: report.totalWarnings, info: report.totalInfos };
    this.allSeverities = ['error', 'warning', 'info'].filter(s => (this.severityCounts[s] || 0) > 0);
  }

  buildGroups(): void {
    const report = this.scanner.report();
    if (!report) return;

    this.groups = [];
    this.totalCount = 0;

    for (const file of report.files) {
      const issues = file.issues.filter(i => i.severity === this.severity);
      if (issues.length > 0) {
        this.groups.push({
          path: file.path,
          language: file.language,
          issues,
          expanded: true
        });
        this.totalCount += issues.length;
      }
    }

    // Sort: most issues first
    this.groups.sort((a, b) => b.issues.length - a.issues.length);
  }

  switchSeverity(sev: string): void {
    this.router.navigate(['/scanner/issues', sev]);
  }

  goBack(): void {
    this.router.navigate(['/scanner']);
  }

  goToFile(path: string, line: number): void {
    this.scanner.selectedFilePath.set(path);
    this.router.navigate(['/scanner']);
    // Small delay to let the view render, then scroll
    if (line > 0) {
      setTimeout(() => {
        const el = document.querySelector(`tr[data-line="${line}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }
}
