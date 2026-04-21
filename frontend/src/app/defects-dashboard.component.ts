import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DefectsService, Defect, DefectStats, AnalyzeResult, ScanIssuePayload, FixProposal } from './services/defects.service';
import { ThemeService } from './services/theme.service';
import { ProjectScannerService } from './services/project-scanner.service';

@Component({
  selector: 'app-defects-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="wrap">
    <div class="top">
      <button class="back" (click)="goHome()">&larr; Back</button>
      <h1>Defect Dashboard</h1>
      <select class="project-picker" [(ngModel)]="projectScope" (change)="onScopeChange()" title="Project scope">
        <option [value]="currentProject()" *ngIf="currentProject()">This project ({{ currentProject() }})</option>
        <option value="__all__">All projects</option>
        <option value="">Unassigned</option>
        <option *ngFor="let p of knownProjects()" [value]="p" [disabled]="p === currentProject()">{{ p }}</option>
      </select>
      <button class="refresh" (click)="load()">Refresh</button>
      <button class="theme-btn" (click)="themeSvc.toggle()" [title]="themeSvc.isDark() ? 'Switch to Light' : 'Switch to Dark'">
        <svg *ngIf="themeSvc.isDark()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg *ngIf="themeSvc.isLight()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>

    <!-- Scope banner -->
    <div class="scope-banner">
      <div class="scope-text">
        <span *ngIf="projectScope === '__all__'">Showing defects from <strong>all projects</strong>.</span>
        <span *ngIf="projectScope === ''">Showing <strong>unassigned</strong> defects (no project tag — e.g. server-side or manual curl logs).</span>
        <span *ngIf="projectScope && projectScope !== '__all__'">Scoped to project: <strong>{{ projectScope }}</strong></span>
      </div>
      <div class="scope-actions" *ngIf="currentProject()">
        <button class="scope-btn primary" (click)="syncFromScan()"
                [disabled]="syncRunning() || !scanner.report()"
                [title]="scanner.report() ? 'Pull static-analysis issues from the last project scan into the defect dashboard' : 'Scan the project in the IDE first (no scan report available)'">
          {{ syncRunning() ? 'Syncing...' : 'Sync from project scan' }}
        </button>
        <button class="scope-btn" (click)="logTestDefect()" title="Create a test defect tagged with this project">
          + Log test defect
        </button>
      </div>
    </div>
    <div class="scope-hint" *ngIf="!currentProject()">
      Open a folder in the IDE first to scope defects to that workspace.
    </div>

    <!-- Stats -->
    <div class="stats-grid" *ngIf="stats()">
      <!-- Status row: fixed order so the layout stays stable across refreshes -->
      <div class="stat-row">
        <div class="stat-card total">
          <span class="stat-label">Total</span>
          <span class="stat-value">{{ stats()!.total }}</span>
        </div>
        <div *ngFor="let st of STATUS_ORDER"
             class="stat-card clickable"
             [class.active]="filterStatus === st"
             [ngClass]="'card-st-' + st"
             (click)="quickFilter('status', st)"
             [title]="'Filter by status: ' + st">
          <span class="stat-label">{{ st }}</span>
          <span class="stat-value">{{ count('byStatus', st) }}</span>
        </div>
      </div>

      <!-- Severity pills -->
      <div class="stat-row compact">
        <span class="row-label">Severity</span>
        <button *ngFor="let sv of SEVERITY_ORDER"
                class="pill"
                [class.active]="filterSeverity === sv"
                [ngClass]="'sev-bg-' + sv"
                (click)="quickFilter('severity', sv)">
          {{ sv }}
          <span class="pill-count">{{ count('bySeverity', sv) }}</span>
        </button>
      </div>

      <!-- Category breakdown -->
      <div class="stat-row compact" *ngIf="stats()!.byCategory?.length">
        <span class="row-label">Category</span>
        <button *ngFor="let c of stats()!.byCategory"
                class="pill cat-pill"
                [class.active]="filterCategory === c._id"
                (click)="quickFilter('category', c._id)">
          {{ c._id }}
          <span class="pill-count">{{ c.count }}</span>
        </button>
      </div>
    </div>

    <!-- Preview analyzer: paste any error and see classification + AI matches without persisting -->
    <div class="analyzer">
      <button class="analyzer-toggle" (click)="analyzerOpen = !analyzerOpen">
        <span>{{ analyzerOpen ? '▾' : '▸' }}</span> Analyze an error (no save)
      </button>
      <div class="analyzer-panel" *ngIf="analyzerOpen">
        <textarea [(ngModel)]="analyzerInput"
                  placeholder="Paste an error message or stack trace here..."
                  rows="3"></textarea>
        <div class="analyzer-actions">
          <button class="primary" (click)="runAnalyzer()" [disabled]="analyzerRunning() || !analyzerInput.trim()">
            {{ analyzerRunning() ? 'Analyzing...' : 'Analyze' }}
          </button>
          <button class="ghost" (click)="clearAnalyzer()" *ngIf="analyzerResult() || analyzerInput">Clear</button>
        </div>
        <div class="analyzer-result" *ngIf="analyzerResult() as r">
          <div class="row1">
            <span class="badge cat">{{ r.classification.category }}</span>
            <span class="badge sev" [ngClass]="'sev-bg-' + r.classification.severity">{{ r.classification.severity }}</span>
            <span class="badge" *ngIf="r.classification.ruleId">rule: {{ r.classification.ruleId }}</span>
          </div>
          <div class="fix" *ngIf="r.classification.rootCause || r.classification.suggestedFix">
            <div *ngIf="r.classification.rootCause"><strong>Root cause:</strong> {{ r.classification.rootCause }}</div>
            <pre *ngIf="r.classification.suggestedFix" class="fix-block">{{ r.classification.suggestedFix }}</pre>
          </div>
          <div class="ai-block" *ngIf="r.suggestions.length > 0">
            <div class="ai-hdr"><span>Similar known issues</span></div>
            <div *ngFor="let s of r.suggestions" class="ai-item">
              <div class="ai-prob"><strong>{{ s.problem }}</strong> <span class="ai-score">{{ (s.score * 100).toFixed(0) }}%</span></div>
              <div class="ai-sol">{{ s.solution }}</div>
            </div>
          </div>
          <div class="ai-empty" *ngIf="r.suggestions.length === 0 && !r.classification.ruleId">
            <em>No rule matched and no similar known issue found. This looks like a new defect pattern.</em>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input type="text" [(ngModel)]="q" (keyup.enter)="load()" placeholder="Search message or endpoint..." />
      <select [(ngModel)]="filterStatus" (change)="load()">
        <option value="">All status</option>
        <option value="open">Open</option>
        <option value="investigating">Investigating</option>
        <option value="fixed">Fixed</option>
        <option value="ignored">Ignored</option>
      </select>
      <select [(ngModel)]="filterCategory" (change)="load()">
        <option value="">All categories</option>
        <option value="database">Database</option>
        <option value="runtime">Runtime</option>
        <option value="filesystem">Filesystem</option>
        <option value="api">API</option>
        <option value="auth">Auth</option>
        <option value="network">Network</option>
        <option value="unknown">Unknown</option>
      </select>
      <select [(ngModel)]="filterSeverity" (change)="load()">
        <option value="">All severity</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select [(ngModel)]="filterSource" (change)="load()" title="Where the defect came from">
        <option value="">All sources</option>
        <option value="runtime">Runtime (caught errors)</option>
        <option value="static">Static (code scan)</option>
        <option value="manual">Manual</option>
      </select>
    </div>

    <!-- Sync status banner -->
    <div class="sync-result" *ngIf="lastSyncResult() as r">
      Synced scan to dashboard: <strong>{{ r.inserted }}</strong> new,
      <strong>{{ r.updated }}</strong> updated
      ({{ r.total }} issues scanned).
    </div>

    <!-- Empty state -->
    <div class="empty" *ngIf="!loading() && defects().length === 0">
      <p>No defects match your filter.</p>
      <p class="small">When errors are logged (via Express middleware or <code>POST /api/defects/log</code>), they'll show up here.</p>
    </div>

    <!-- AI Fix modal -->
    <div class="fix-modal-backdrop" *ngIf="activeFix()" (click)="closeFix()">
      <div class="fix-modal" (click)="$event.stopPropagation()">
        <div class="fix-modal-hdr">
          <h2>AI Fix Proposal</h2>
          <span class="confidence" [ngClass]="confidenceClass(activeFix()!.proposal.confidence)">
            Confidence: {{ (activeFix()!.proposal.confidence * 100).toFixed(0) }}%
          </span>
          <button class="close-x" (click)="closeFix()" title="Close">×</button>
        </div>
        <div class="fix-modal-body">
          <p class="fix-summary">{{ activeFix()!.proposal.summary }}</p>
          <div class="fix-section" *ngIf="activeFix()!.proposal.rootCause">
            <h3>Root cause</h3>
            <p>{{ activeFix()!.proposal.rootCause }}</p>
          </div>
          <div class="fix-section" *ngIf="activeFix()!.proposal.steps.length">
            <h3>Steps</h3>
            <ol class="fix-steps">
              <li *ngFor="let s of activeFix()!.proposal.steps">{{ s }}</li>
            </ol>
          </div>
          <div class="fix-section" *ngIf="activeFix()!.proposal.codeSnippets.length">
            <h3>Code</h3>
            <div *ngFor="let snip of activeFix()!.proposal.codeSnippets" class="fix-snippet">
              <div class="snip-hdr">
                <span>{{ snip.label }}</span>
                <span class="lang-tag">{{ snip.language }}</span>
                <button class="copy-btn" (click)="copyToClipboard(snip.code)">Copy</button>
              </div>
              <pre><code>{{ snip.code }}</code></pre>
            </div>
          </div>
          <div class="fix-section" *ngIf="activeFix()!.proposal.references.length">
            <h3>Based on</h3>
            <ul class="fix-refs">
              <li *ngFor="let r of activeFix()!.proposal.references">
                <strong>{{ r.problem }}</strong> <span class="ref-score">{{ (r.score * 100).toFixed(0) }}%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="list">
      <div *ngFor="let d of defects()" class="defect" [ngClass]="'sev-' + d.severity">
        <div class="row1">
          <span class="badge cat">{{ d.category }}</span>
          <span class="badge sev" [ngClass]="'sev-bg-' + d.severity">{{ d.severity }}</span>
          <span class="badge st" [ngClass]="'st-' + d.status">{{ d.status }}</span>
          <span class="badge src" *ngIf="d.source" [ngClass]="'src-' + d.source">{{ d.source }}</span>
          <span class="badge proj" *ngIf="d.projectName">{{ d.projectName }}</span>
          <span class="when">{{ formatDate(d.createdAt) }}</span>
        </div>
        <div class="msg">{{ d.message }}</div>
        <div class="meta" *ngIf="d.endpoint">
          <code>{{ d.method }} {{ d.endpoint }}</code>
          <span *ngIf="d.statusCode">&nbsp;&rarr; {{ d.statusCode }}</span>
        </div>
        <div class="meta static-loc" *ngIf="d.source === 'static' && d.filePath">
          <code>{{ d.filePath }}<span *ngIf="d.lineNumber">:{{ d.lineNumber }}</span></code>
          <span class="rule-tag" *ngIf="d.ruleId">rule: {{ d.ruleId }}</span>
        </div>
        <div class="fix" *ngIf="d.rootCause || d.suggestedFix">
          <div *ngIf="d.rootCause"><strong>Root cause (rule):</strong> {{ d.rootCause }}</div>
          <pre *ngIf="d.suggestedFix" class="fix-block">{{ d.suggestedFix }}</pre>
        </div>

        <!-- AI-retrieved similar issues -->
        <div class="ai-block" *ngIf="d.aiSuggestions && d.aiSuggestions.length > 0">
          <div class="ai-hdr">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 9H5a2 2 0 0 0-2 2v1a7 7 0 0 0 14 0v-1a2 2 0 0 0-2-2z"/></svg>
            <span>AI suggestions</span>
            <span class="ai-when" *ngIf="d.aiAnalyzedAt">analyzed {{ formatDate(d.aiAnalyzedAt) }}</span>
          </div>
          <div *ngFor="let s of d.aiSuggestions" class="ai-item">
            <div class="ai-prob"><strong>{{ s.problem }}</strong> <span class="ai-score">{{ (s.score * 100).toFixed(0) }}%</span></div>
            <div class="ai-sol">{{ s.solution }}</div>
          </div>
        </div>
        <div class="ai-empty" *ngIf="(!d.aiSuggestions || d.aiSuggestions.length === 0) && !d.aiAnalyzedAt">
          <em>No AI analysis yet — click "Run AI analysis" to retrieve similar known issues.</em>
        </div>
        <div class="ai-empty" *ngIf="(!d.aiSuggestions || d.aiSuggestions.length === 0) && d.aiAnalyzedAt">
          <em>No similar issue in the knowledge base (below similarity threshold).</em>
        </div>

        <details *ngIf="d.stack">
          <summary>Stack trace</summary>
          <pre class="stack">{{ d.stack }}</pre>
        </details>
        <div class="actions">
          <select [ngModel]="d.status" (ngModelChange)="setStatus(d, $event)">
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="fixed">Fixed</option>
            <option value="ignored">Ignored</option>
          </select>
          <button (click)="runAi(d)" [disabled]="aiRunning.has(d._id)">
            {{ aiRunning.has(d._id) ? 'Analyzing...' : (d.aiAnalyzedAt ? 'Re-run AI' : 'Run AI analysis') }}
          </button>
          <button class="fix-btn" (click)="generateFix(d)" [disabled]="fixRunning.has(d._id)">
            {{ fixRunning.has(d._id) ? 'Generating...' : 'Fix with AI' }}
          </button>
          <button (click)="reclassify(d)">Reclassify</button>
          <button *ngIf="currentProject() && d.projectName !== currentProject()"
                  (click)="assignToProject(d)"
                  title="Move this defect to the currently-open project">
            Assign to {{ currentProject() }}
          </button>
          <button class="danger" (click)="remove(d)">Delete</button>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    :host { display: block; background: var(--bg-main); color: var(--text-primary); min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 24px 20px 48px; }
    .top { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .top h1 { margin: 0; font-size: 22px; flex: 1; background: linear-gradient(135deg, var(--accent), var(--accent-purple)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .back, .refresh, .theme-btn { background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-primary); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px; }
    .back:hover, .refresh:hover, .theme-btn:hover { background: var(--accent-hover-bg); border-color: var(--accent); color: var(--accent); }
    .theme-btn { padding: 6px 10px; }
    .project-picker { background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-primary); padding: 6px 10px; border-radius: 6px; font-size: 12px; max-width: 280px; }
    .scope-banner { display: flex; align-items: center; gap: 12px; background: var(--accent-hover-bg); border: 1px solid var(--accent-focus-bg); color: var(--text-secondary); padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; font-size: 12px; }
    .scope-banner strong { color: var(--accent); }
    .scope-text { flex: 1; }
    .scope-actions { display: flex; gap: 6px; }
    .scope-btn { background: var(--bg-panel); color: var(--accent); border: 1px solid var(--accent); padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 11px; }
    .scope-btn:hover:not(:disabled) { background: var(--accent); color: var(--bg-panel); }
    .scope-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .scope-btn.primary { background: var(--accent); color: var(--bg-panel); }
    .scope-btn.primary:hover:not(:disabled) { filter: brightness(1.1); }
    .sync-result { background: var(--accent-hover-bg); border: 1px solid var(--accent); color: var(--text-secondary); padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; font-size: 12px; }
    .sync-result strong { color: var(--accent); }
    .badge.src-runtime { background: rgba(234,179,8,0.12); color: var(--warning); border-color: var(--warning); }
    .badge.src-static { background: rgba(129,140,248,0.12); color: var(--accent-purple); border-color: var(--accent-purple); }
    .badge.src-manual { background: var(--bg-code); color: var(--text-muted); }
    .static-loc { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .rule-tag { font-size: 10px; color: var(--text-muted); background: var(--bg-code); padding: 2px 6px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; }
    .scope-hint { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 14px; padding: 6px 12px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-primary); }
    .stats-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .stat-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .stat-row.compact { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .row-label { font-size: 10px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-right: 4px; min-width: 60px; }
    .stat-card { background: var(--bg-panel); border: 1px solid var(--border-primary); border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; transition: border-color 120ms, background 120ms; }
    .stat-card.clickable { cursor: pointer; }
    .stat-card.clickable:hover { border-color: var(--accent); background: var(--accent-hover-bg); }
    .stat-card.active { border-color: var(--accent); background: var(--accent-hover-bg); box-shadow: 0 0 0 1px var(--accent) inset; }
    .stat-card.total .stat-value { color: var(--text-primary); }
    .stat-card.card-st-open .stat-value { color: var(--error); }
    .stat-card.card-st-investigating .stat-value { color: var(--warning); }
    .stat-card.card-st-fixed .stat-value { color: var(--success); }
    .stat-card.card-st-ignored .stat-value { color: var(--text-muted); }
    .stat-label { font-size: 10px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
    .stat-value { font-size: 22px; font-weight: 600; color: var(--accent); }
    .pill { display: inline-flex; align-items: center; gap: 6px; background: var(--bg-panel); color: var(--text-secondary); border: 1px solid var(--border-primary); padding: 5px 10px; border-radius: 999px; cursor: pointer; font-size: 11px; text-transform: capitalize; transition: all 120ms; }
    .pill:hover { border-color: var(--accent); color: var(--accent); }
    .pill.active { border-width: 2px; padding: 4px 9px; font-weight: 600; }
    .pill-count { background: var(--bg-code); border-radius: 999px; padding: 1px 7px; font-size: 10px; font-weight: 600; color: var(--text-primary); }
    .cat-pill { text-transform: none; }
    .analyzer { margin-bottom: 20px; background: var(--bg-panel); border: 1px solid var(--border-primary); border-radius: 8px; }
    .analyzer-toggle { width: 100%; background: none; border: none; text-align: left; padding: 10px 14px; color: var(--text-secondary); cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 8px; }
    .analyzer-toggle:hover { color: var(--accent); }
    .analyzer-panel { border-top: 1px solid var(--border-primary); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
    .analyzer-panel textarea { background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-primary); border-radius: 6px; padding: 8px 10px; font-size: 12px; font-family: 'JetBrains Mono', monospace; resize: vertical; }
    .analyzer-actions { display: flex; gap: 8px; }
    .analyzer-actions button { padding: 6px 14px; border-radius: 5px; cursor: pointer; font-size: 12px; border: 1px solid var(--border-primary); background: var(--bg-code); color: var(--text-primary); }
    .analyzer-actions .primary { background: var(--accent); color: var(--bg-panel); border-color: var(--accent); }
    .analyzer-actions .primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .analyzer-actions .ghost:hover { border-color: var(--accent); color: var(--accent); }
    .analyzer-result { border-top: 1px dashed var(--border-primary); padding-top: 10px; }
    .analyzer-result .row1 { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
    .filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .filters input, .filters select { background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-primary); padding: 6px 10px; border-radius: 6px; font-size: 12px; }
    .filters input { flex: 1; min-width: 220px; }
    .empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .empty .small { font-size: 12px; opacity: 0.7; margin-top: 6px; }
    .empty code { background: var(--bg-code); padding: 2px 6px; border-radius: 3px; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .defect { background: var(--bg-panel); border: 1px solid var(--border-primary); border-left: 4px solid var(--text-dim); border-radius: 8px; padding: 14px 16px; }
    .defect.sev-critical { border-left-color: var(--error-deep); }
    .defect.sev-high { border-left-color: var(--warning-deep); }
    .defect.sev-medium { border-left-color: var(--warning); }
    .defect.sev-low { border-left-color: var(--success); }
    .row1 { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
    .badge { padding: 2px 8px; border-radius: 4px; background: var(--bg-code); border: 1px solid var(--border-primary); text-transform: uppercase; letter-spacing: 0.3px; font-size: 10px; color: var(--text-secondary); }
    .badge.proj { background: var(--accent-hover-bg); color: var(--accent); border-color: var(--accent-focus-bg); text-transform: none; letter-spacing: 0; }
    .sev-bg-critical { background: rgba(220,38,38,0.2); border-color: var(--error-deep); color: var(--error); }
    .sev-bg-high { background: rgba(249,115,22,0.18); border-color: var(--warning-deep); color: var(--warning); }
    .sev-bg-medium { background: rgba(234,179,8,0.15); border-color: var(--warning); color: var(--warning); }
    .sev-bg-low { background: rgba(16,185,129,0.15); border-color: var(--success); color: var(--success); }
    .st-open { color: var(--error); border-color: var(--error); }
    .st-investigating { color: var(--warning); border-color: var(--warning); }
    .st-fixed { color: var(--success); border-color: var(--success); }
    .st-ignored { color: var(--text-muted); border-color: var(--text-muted); }
    .when { margin-left: auto; color: var(--text-muted); font-size: 11px; }
    .msg { font-size: 14px; font-weight: 500; margin: 4px 0 6px; word-break: break-word; color: var(--text-primary); }
    .meta { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
    .meta code { background: var(--bg-code); padding: 2px 6px; border-radius: 3px; font-size: 11px; color: var(--text-secondary); }
    .fix { background: var(--bg-code); border: 1px solid var(--border-primary); padding: 10px 12px; border-radius: 6px; margin: 8px 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
    .fix strong { color: var(--accent); }
    .fix-block { margin: 6px 0 0; font-size: 12px; white-space: pre-wrap; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; }
    .ai-block { background: linear-gradient(135deg, rgba(129,140,248,0.06), rgba(167,139,250,0.06)); border: 1px solid var(--border-primary); border-left: 3px solid var(--accent-purple); padding: 10px 12px; border-radius: 6px; margin: 8px 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
    .ai-hdr { display: flex; align-items: center; gap: 6px; font-size: 11px; text-transform: uppercase; color: var(--accent-purple); font-weight: 600; letter-spacing: 0.5px; margin-bottom: 6px; }
    .ai-when { margin-left: auto; font-size: 10px; color: var(--text-muted); text-transform: none; letter-spacing: 0; font-weight: 400; }
    .ai-item { padding: 6px 0; border-top: 1px dashed var(--border-secondary); }
    .ai-item:first-of-type { border-top: none; padding-top: 0; }
    .ai-prob { display: flex; gap: 8px; align-items: baseline; font-size: 12px; margin-bottom: 3px; color: var(--text-primary); }
    .ai-score { font-size: 10px; background: var(--accent-hover-bg); color: var(--accent); padding: 1px 6px; border-radius: 3px; margin-left: auto; font-weight: 600; }
    .ai-sol { font-size: 12px; color: var(--text-secondary); }
    .ai-empty { font-size: 11px; color: var(--text-muted); margin: 6px 0; }
    details { margin-top: 8px; font-size: 12px; }
    summary { cursor: pointer; color: var(--text-muted); }
    .stack { background: var(--bg-code); padding: 10px; border-radius: 4px; font-size: 11px; overflow-x: auto; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; }
    .actions { display: flex; gap: 8px; margin-top: 10px; }
    .actions select, .actions button { background: var(--bg-code); color: var(--text-primary); border: 1px solid var(--border-primary); padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; }
    .actions button:hover { background: var(--accent-hover-bg); border-color: var(--accent); color: var(--accent); }
    .actions .danger:hover { background: rgba(220,38,38,0.12); border-color: var(--error); color: var(--error); }
    .actions .fix-btn { background: linear-gradient(135deg, var(--accent), var(--accent-purple)); color: var(--bg-panel); border-color: var(--accent-purple); font-weight: 600; }
    .actions .fix-btn:hover:not(:disabled) { filter: brightness(1.1); color: var(--bg-panel); }
    .actions .fix-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .fix-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .fix-modal { background: var(--bg-panel); border: 1px solid var(--border-primary); border-radius: 10px; max-width: 720px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    .fix-modal-hdr { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border-primary); }
    .fix-modal-hdr h2 { margin: 0; font-size: 18px; flex: 1; background: linear-gradient(135deg, var(--accent), var(--accent-purple)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .confidence { font-size: 11px; padding: 4px 10px; border-radius: 999px; border: 1px solid; }
    .confidence.conf-high { color: var(--success); border-color: var(--success); background: rgba(16,185,129,0.1); }
    .confidence.conf-med { color: var(--warning); border-color: var(--warning); background: rgba(234,179,8,0.1); }
    .confidence.conf-low { color: var(--text-muted); border-color: var(--text-muted); background: var(--bg-code); }
    .close-x { background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer; line-height: 1; padding: 0 4px; }
    .close-x:hover { color: var(--error); }
    .fix-modal-body { padding: 20px; }
    .fix-summary { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; padding: 10px 12px; background: var(--accent-hover-bg); border-left: 3px solid var(--accent); border-radius: 6px; }
    .fix-section { margin-bottom: 18px; }
    .fix-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--accent); margin: 0 0 8px; }
    .fix-section p { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0; }
    .fix-steps { margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    .fix-steps li { margin-bottom: 4px; }
    .fix-snippet { background: var(--bg-code); border: 1px solid var(--border-primary); border-radius: 6px; margin-bottom: 10px; overflow: hidden; }
    .snip-hdr { display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: var(--bg-main); border-bottom: 1px solid var(--border-primary); font-size: 11px; color: var(--text-muted); }
    .snip-hdr > span:first-child { flex: 1; }
    .lang-tag { background: var(--accent-hover-bg); color: var(--accent); padding: 1px 6px; border-radius: 3px; font-size: 10px; font-family: 'JetBrains Mono', monospace; }
    .copy-btn { background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-primary); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
    .fix-snippet pre { margin: 0; padding: 10px 12px; overflow-x: auto; font-size: 12px; color: var(--text-primary); font-family: 'JetBrains Mono', monospace; }
    .fix-refs { margin: 0; padding-left: 20px; font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
    .ref-score { background: var(--accent-hover-bg); color: var(--accent); padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-left: 6px; font-weight: 600; }
  `]
})
export class DefectsDashboardComponent implements OnInit {
  private defectsSvc = inject(DefectsService);
  private router = inject(Router);
  readonly scanner = inject(ProjectScannerService);
  readonly themeSvc = inject(ThemeService);

  readonly defects = signal<Defect[]>([]);
  readonly stats = signal<DefectStats | null>(null);
  readonly loading = signal(false);
  readonly knownProjects = signal<string[]>([]);
  readonly aiRunning = new Set<string>();

  readonly STATUS_ORDER = ['open', 'investigating', 'fixed', 'ignored'] as const;
  readonly SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

  analyzerOpen = false;
  analyzerInput = '';
  readonly analyzerResult = signal<AnalyzeResult | null>(null);
  readonly analyzerRunning = signal(false);

  readonly syncRunning = signal(false);
  readonly lastSyncResult = signal<{ inserted: number; updated: number; total: number } | null>(null);

  readonly fixRunning = new Set<string>();
  readonly activeFix = signal<{ defectId: string; proposal: FixProposal } | null>(null);

  /** Current open-folder name from the scanner — empty string when no folder is open. */
  readonly currentProject = (): string => this.scanner.report()?.tree?.name || '';

  /** '__all__' = no filter; '' = unassigned; otherwise exact project name match. */
  projectScope = '__all__';

  q = '';
  filterStatus = '';
  filterCategory = '';
  filterSeverity = '';
  filterSource = '';

  ngOnInit(): void {
    // Default scope: if a folder is open, show defects for that project; otherwise show all.
    const current = this.currentProject();
    this.projectScope = current || '__all__';
    this.refreshProjectList();
    this.load();
  }

  onScopeChange(): void { this.load(); }

  private async refreshProjectList(): Promise<void> {
    const names = await this.defectsSvc.listProjects();
    this.knownProjects.set(names);
  }

  goHome(): void { this.router.navigate(['/']); }

  async load(): Promise<void> {
    this.loading.set(true);
    const [res, st] = await Promise.all([
      this.defectsSvc.list({
        status: this.filterStatus || undefined,
        category: this.filterCategory || undefined,
        severity: this.filterSeverity || undefined,
        source: this.filterSource || undefined,
        q: this.q || undefined,
        projectName: this.projectScope,
      }),
      this.defectsSvc.stats(this.projectScope),
    ]);
    this.defects.set(res.items);
    this.stats.set(st);
    this.loading.set(false);
  }

  /** Lookup a count from a stats bucket by key. Returns 0 when missing. */
  count(bucket: 'byStatus' | 'bySeverity' | 'byCategory', key: string): number {
    const arr = this.stats()?.[bucket] || [];
    return arr.find(x => x._id === key)?.count ?? 0;
  }

  /** Toggle-filter: clicking the same pill clears it, clicking a different one replaces. */
  quickFilter(kind: 'status' | 'severity' | 'category', value: string): void {
    if (kind === 'status') this.filterStatus = this.filterStatus === value ? '' : value;
    if (kind === 'severity') this.filterSeverity = this.filterSeverity === value ? '' : value;
    if (kind === 'category') this.filterCategory = this.filterCategory === value ? '' : value;
    this.load();
  }

  /** Pull issues from the last project-scan report and push them into the defect dashboard. */
  async syncFromScan(): Promise<void> {
    const report = this.scanner.report();
    const project = this.currentProject();
    if (!report || !project) return;

    // Flatten report.files[*].issues → ScanIssuePayload[]. Skip 'info'-level by default —
    // those are noise (TODOs, console.log) and would flood the dashboard.
    const issues: ScanIssuePayload[] = [];
    for (const f of report.files || []) {
      for (const i of f.issues || []) {
        if (i.severity === 'info') continue;
        issues.push({
          filePath: f.path,
          lineNumber: i.line,
          ruleId: i.rule,
          message: i.message,
          severity: i.severity,
        });
      }
    }

    this.syncRunning.set(true);
    try {
      const result = await this.defectsSvc.syncScan(project, issues);
      this.lastSyncResult.set(result);
      await this.load();
      this.refreshProjectList();
    } finally {
      this.syncRunning.set(false);
    }
  }

  async runAnalyzer(): Promise<void> {
    const input = this.analyzerInput.trim();
    if (!input) return;
    this.analyzerRunning.set(true);
    try {
      const result = await this.defectsSvc.analyze(input);
      this.analyzerResult.set(result);
    } finally {
      this.analyzerRunning.set(false);
    }
  }

  clearAnalyzer(): void {
    this.analyzerInput = '';
    this.analyzerResult.set(null);
  }

  async setStatus(d: Defect, status: string): Promise<void> {
    const updated = await this.defectsSvc.update(d._id, { status: status as any });
    if (updated) this.load();
  }

  async reclassify(d: Defect): Promise<void> {
    const updated = await this.defectsSvc.reclassify(d._id);
    if (updated) this.load();
  }

  async generateFix(d: Defect): Promise<void> {
    this.fixRunning.add(d._id);
    try {
      const result = await this.defectsSvc.generateFix(d._id);
      if (result) this.activeFix.set(result);
    } finally {
      this.fixRunning.delete(d._id);
    }
  }

  closeFix(): void { this.activeFix.set(null); }

  confidenceClass(c: number): string {
    if (c >= 0.7) return 'conf-high';
    if (c >= 0.4) return 'conf-med';
    return 'conf-low';
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  async runAi(d: Defect): Promise<void> {
    this.aiRunning.add(d._id);
    try {
      const updated = await this.defectsSvc.runRag(d._id);
      if (updated) {
        this.defects.update(list => list.map(x => x._id === d._id ? updated : x));
      }
    } finally {
      this.aiRunning.delete(d._id);
    }
  }

  /** Creates a quick test defect tagged with the currently-open folder. */
  async logTestDefect(): Promise<void> {
    const projectName = this.currentProject();
    if (!projectName) return;
    const samples = [
      'MongoNetworkError: sample connection refused',
      'Cannot read properties of undefined (reading "user")',
      'EADDRINUSE: port already in use',
      'CORS error blocked by browser',
      'jwt expired',
    ];
    const message = samples[Math.floor(Math.random() * samples.length)];
    await this.defectsSvc.logError({
      message,
      endpoint: '/test/' + projectName,
      method: 'TEST',
      projectName,
    });
    // Give the background RAG a moment before refreshing
    setTimeout(() => this.load(), 400);
    this.refreshProjectList();
  }

  /** Re-tags an existing defect onto the currently-open project. */
  async assignToProject(d: Defect): Promise<void> {
    const projectName = this.currentProject();
    if (!projectName) return;
    const updated = await this.defectsSvc.update(d._id, { projectName });
    if (updated) this.load();
  }

  async remove(d: Defect): Promise<void> {
    if (!confirm(`Delete "${d.message.slice(0, 60)}..."?`)) return;
    const ok = await this.defectsSvc.remove(d._id);
    if (ok) this.load();
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString();
  }
}
