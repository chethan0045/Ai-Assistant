import { Component, OnInit, computed, Signal, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectScannerService, ProjectReport, ProjectFile, FolderNode, FileIssue } from './services/project-scanner.service';
import { CodeRunnerService } from './services/code-runner.service';
import { SyntaxHighlightService } from './services/syntax-highlight.service';
import { AIEngineService } from './services/ai-engine.service';
import { FileSystemService } from './services/file-system.service';
import { GitService } from './services/git.service';

@Component({
  selector: 'app-scanner-ide',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- TOP BAR -->
    <div class="top-bar">
      <button class="back-btn" (click)="goHome()">&larr; Home</button>
      <span class="project-name">{{ report()?.tree?.name || 'Project' }}</span>
      <span class="cwd-display" *ngIf="scanner.projectBasePath()" title="Project root">&#128193; {{ scanner.projectBasePath() }}</span>
      <span class="cwd-display faded" *ngIf="!scanner.projectBasePath() && runner.cwd()">{{ runner.cwd() }}</span>
      <div class="stat-pills">
        <span class="pill">{{ report()?.totalFiles }} files</span>
        <span class="pill">{{ report()?.totalLines | number }} lines</span>
        <span class="pill score-pill" [class.good]="(report()?.overallScore ?? 0) >= 80" [class.ok]="(report()?.overallScore ?? 0) >= 50 && (report()?.overallScore ?? 0) < 80" [class.bad]="(report()?.overallScore ?? 0) < 50">
          Score: {{ report()?.overallScore }}
        </span>
        <button class="pill epic-pill click" (click)="goIssues('error')">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          {{ report()?.totalErrors }} Epics
        </button>
        <button class="pill feature-pill click" (click)="goIssues('warning')">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
          {{ report()?.totalWarnings }} Features
        </button>
        <button class="pill story-pill click" (click)="goIssues('info')">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
          {{ report()?.totalInfos }} Stories
        </button>
      </div>
    </div>

    <!-- MAIN LAYOUT -->
    <div class="ide-body">
      <!-- ACTIVITY BAR -->
      <div class="activity-bar">
        <button class="ab-icon" [class.active]="!sidebarCollapsed" (click)="sidebarCollapsed = !sidebarCollapsed" title="Explorer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button class="ab-icon" [class.active]="bottomPanelOpen && bottomTab === 'terminal'" (click)="toggleTerminal()" title="Terminal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        </button>
        <button class="ab-icon" [class.active]="bottomPanelOpen && bottomTab === 'debug'" (click)="bottomPanelOpen = true; bottomTab = 'debug'" title="Debug">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
        </button>
        <button class="ab-icon" [class.active]="scPanelOpen" (click)="toggleSourceControl()" title="Source Control">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
          <span class="ab-badge" *ngIf="git.status()?.files?.length">{{ git.status()!.files.length }}</span>
        </button>
        <button class="ab-icon ai-icon" [class.active]="aiPanelOpen" (click)="aiPanelOpen = !aiPanelOpen" title="AI Assistant">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 9H5a2 2 0 0 0-2 2v1a7 7 0 0 0 14 0v-1a2 2 0 0 0-2-2z"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
        </button>
        <div class="ab-spacer"></div>
        <button class="ab-icon" [class.active]="bottomPanelOpen && bottomTab === 'problems'" (click)="bottomPanelOpen = true; bottomTab = 'problems'" title="Problems">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span class="ab-badge" *ngIf="selectedFile() && selectedFile()!.issues.length > 0">{{ selectedFile()!.issues.length }}</span>
        </button>
      </div>

      <!-- LEFT SIDEBAR -->
      <div class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sb-header" *ngIf="!sidebarCollapsed">
          <span>Explorer</span>
          <div class="sb-actions">
            <button class="sb-act" (click)="openFolderDialog()" title="Open Folder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button class="sb-act" (click)="showNewFileInput = true" title="New File">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </button>
            <button class="sb-act" (click)="showNewFolderInput = true" title="New Folder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
            </button>
          </div>
        </div>
        <!-- Hidden native folder picker -->
        <input #folderPicker type="file" webkitdirectory directory multiple style="display:none" (change)="onNativeFolderSelected($event)" />
        <!-- New file/folder input -->
        <div class="new-item-input" *ngIf="showNewFileInput && !sidebarCollapsed">
          <input #newFileInput class="ni-input" [(ngModel)]="newItemName" placeholder="filename.ts" (keydown.enter)="createNewFile()" (keydown.escape)="showNewFileInput = false" />
          <button class="ni-ok" (click)="createNewFile()">&#10003;</button>
          <button class="ni-cancel" (click)="showNewFileInput = false">&times;</button>
        </div>
        <div class="new-item-input" *ngIf="showNewFolderInput && !sidebarCollapsed">
          <input #newFolderInput class="ni-input" [(ngModel)]="newItemName" placeholder="folder-name" (keydown.enter)="createNewFolder()" (keydown.escape)="showNewFolderInput = false" />
          <button class="ni-ok" (click)="createNewFolder()">&#10003;</button>
          <button class="ni-cancel" (click)="showNewFolderInput = false">&times;</button>
        </div>
        <div class="tree-scroll" *ngIf="!sidebarCollapsed">
          <!-- Scanning spinner -->
          <div class="open-folder-empty" *ngIf="folderScanning">
            <div class="scan-spinner"></div>
            <p class="open-folder-hint">Scanning folder...</p>
          </div>
          <!-- Tree loaded — show it -->
          <ng-container *ngIf="report()?.tree && !folderScanning">
            <ng-container *ngTemplateOutlet="treeNode; context: { $implicit: report()!.tree, depth: 0 }"></ng-container>
          </ng-container>
          <!-- No project loaded -->
          <div class="open-folder-empty" *ngIf="!report() && !folderScanning && !showNewProjectDialog">
            <button class="open-folder-btn" (click)="openFolderDialog()">Open Folder</button>
            <button class="open-folder-btn secondary" (click)="showNewProjectDialog = true">+ New Empty Project</button>
            <p class="open-folder-hint">Open existing folder or start fresh</p>
          </div>
          <!-- New empty project dialog -->
          <div class="open-folder-empty" *ngIf="showNewProjectDialog && !report()">
            <label class="np-label">Project name</label>
            <input class="np-input" [(ngModel)]="newProjectName" placeholder="my-awesome-project" />
            <label class="np-label">Disk path (where to save)</label>
            <input class="np-input" [(ngModel)]="newProjectPath" placeholder="C:\\Users\\you\\Projects" (keydown.enter)="createEmptyProject()" />
            <div class="np-actions">
              <button class="open-folder-btn" (click)="createEmptyProject()" [disabled]="!newProjectName.trim()">Create</button>
              <button class="open-folder-btn secondary" (click)="showNewProjectDialog = false">Cancel</button>
            </div>
            <p class="open-folder-hint">Creates folder on disk. Leave path empty for in-memory only.</p>
          </div>
        </div>
      </div>

      <!-- ===== SOURCE CONTROL PANEL ===== -->
      <div class="sc-panel" *ngIf="scPanelOpen">
        <div class="sc-header">
          <span class="sc-title">Source Control</span>
          <button class="sc-icon-btn" (click)="refreshGit()" title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
          <button class="sc-icon-btn" (click)="scPanelOpen = false" title="Close">&times;</button>
        </div>

        <!-- Not a git repo -->
        <div class="sc-empty" *ngIf="git.status() && !git.status()!.initialized">
          <p>This folder is not a git repository.</p>
          <button class="sc-btn primary" (click)="initGit()">Initialize Repository</button>
        </div>

        <!-- Initialized -->
        <div *ngIf="git.status()?.initialized">
          <!-- Branch + remote info -->
          <div class="sc-branch">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
            <span>{{ git.status()?.branch || 'main' }}</span>
            <span class="sc-remote" *ngIf="git.status()?.remote">↗ {{ shortRemote() }}</span>
            <span class="sc-ahead" *ngIf="(git.status()?.ahead ?? 0) > 0">↑{{ git.status()!.ahead }}</span>
            <span class="sc-behind" *ngIf="(git.status()?.behind ?? 0) > 0">↓{{ git.status()!.behind }}</span>
          </div>

          <!-- Commit message -->
          <div class="sc-commit">
            <textarea
              class="sc-msg"
              [(ngModel)]="commitMessage"
              placeholder="Commit message (Ctrl+Enter to commit)"
              (keydown.control.enter)="doCommit()"
              rows="2"
            ></textarea>
            <div class="sc-actions">
              <button class="sc-btn primary" (click)="doCommit()" [disabled]="!commitMessage.trim() || (git.status()?.files?.length ?? 0) === 0">
                Commit
              </button>
              <button class="sc-btn" (click)="doStageAll()" [disabled]="!hasUnstaged()">Stage All</button>
            </div>
          </div>

          <!-- Push / Pull -->
          <div class="sc-sync" *ngIf="git.status()?.remote">
            <button class="sc-btn" (click)="doPull()">⬇ Pull</button>
            <button class="sc-btn" (click)="doPush()">⬆ Push</button>
            <button class="sc-btn" (click)="doPushUpstream()" *ngIf="!hasUpstream()" title="Push with -u to set upstream">First Push</button>
          </div>

          <!-- Add remote if none -->
          <div class="sc-no-remote" *ngIf="!git.status()?.remote">
            <p>No remote configured</p>
            <div class="sc-remote-add">
              <input [(ngModel)]="remoteUrl" placeholder="https://github.com/user/repo.git" />
              <button class="sc-btn primary" (click)="addRemote()" [disabled]="!remoteUrl.trim()">Add Remote</button>
            </div>
          </div>

          <!-- Status message -->
          <div class="sc-status-msg" *ngIf="gitStatusMsg" [class.error]="gitStatusError">
            {{ gitStatusMsg }}
          </div>

          <!-- Changes -->
          <div class="sc-group" *ngIf="stagedFiles().length > 0">
            <div class="sc-group-head">
              <span>Staged ({{ stagedFiles().length }})</span>
              <button class="sc-mini-btn" (click)="doUnstageAll()" title="Unstage all">−</button>
            </div>
            <div class="sc-file" *ngFor="let f of stagedFiles()" (click)="openGitFile(f.path)">
              <span class="sc-file-icon staged">+</span>
              <span class="sc-file-name">{{ f.path }}</span>
              <span class="sc-file-status" [class]="'status-' + f.status">{{ statusLetter(f.status) }}</span>
              <button class="sc-mini-btn" (click)="$event.stopPropagation(); doUnstage(f.path)" title="Unstage">−</button>
            </div>
          </div>

          <div class="sc-group" *ngIf="unstagedFiles().length > 0">
            <div class="sc-group-head">
              <span>Changes ({{ unstagedFiles().length }})</span>
              <button class="sc-mini-btn" (click)="doStageAll()" title="Stage all">+</button>
            </div>
            <div class="sc-file" *ngFor="let f of unstagedFiles()" (click)="openGitFile(f.path)">
              <span class="sc-file-icon" [class]="'status-' + f.status">{{ statusLetter(f.status) }}</span>
              <span class="sc-file-name">{{ f.path }}</span>
              <button class="sc-mini-btn discard" (click)="$event.stopPropagation(); doDiscard(f.path)" title="Discard changes">⤺</button>
              <button class="sc-mini-btn" (click)="$event.stopPropagation(); doStage(f.path)" title="Stage">+</button>
            </div>
          </div>

          <div class="sc-empty" *ngIf="(git.status()?.files?.length ?? 0) === 0">
            <p>No changes</p>
          </div>
        </div>
      </div>

      <!-- TRUST FOLDER OVERLAY -->
      <div class="trust-overlay" *ngIf="showTrustDialog">
        <div class="trust-card">
          <div class="trust-icon">&#128274;</div>
          <h2>Do you trust the authors of this folder?</h2>
          <p class="trust-folder-name">{{ pendingFolderName }}</p>
          <p class="trust-desc">Opening a folder will allow the IDE to read and edit files in it. Only trust folders from sources you know.</p>
          <div class="trust-actions">
            <button class="trust-btn trust-yes" (click)="confirmTrust()">Yes, I trust this folder</button>
            <button class="trust-btn trust-no" (click)="cancelTrust()">No, cancel</button>
          </div>
        </div>
      </div>

      <!-- CENTER: EDITOR + BOTTOM PANEL -->
      <div class="center">
        <!-- EDITOR -->
        <div class="editor-section" [style.flex]="bottomPanelOpen ? '1 1 60%' : '1 1 100%'">
          <!-- No project loaded yet -->
          <div class="no-file" *ngIf="!report()">
            <div class="nf-icon">&#128193;</div>
            <p>Open a folder to start</p>
            <button class="open-folder-btn-center" (click)="openFolderDialog()">Open Folder</button>
          </div>
          <!-- Project loaded but no file selected -->
          <div class="no-file" *ngIf="!selectedFile() && report()">
            <div class="nf-icon">&#128196;</div>
            <p>Select a file from the explorer to start editing</p>
            <div class="lang-chips" *ngIf="report()">
              <span class="lc" *ngFor="let l of report()!.languageBreakdown.slice(0,6)">{{ l.language }} ({{ l.count }})</span>
            </div>
          </div>

          <!-- File open -->
          <div class="editor-wrap" *ngIf="selectedFile()">
            <!-- Tab bar -->
            <div class="tab-bar">
              <div class="tab active">
                <span class="tab-file-badge" [style.background]="getExtColor(selectedFile()!.extension)" [style.color]="getExtText(selectedFile()!.extension)">{{ getExtLabel(selectedFile()!.extension) }}</span>
                {{ selectedFile()!.name }}
                <button class="tab-x" (click)="closeFile()">&times;</button>
              </div>
              <div class="tab-meta">
                <span class="tm lang">{{ selectedFile()!.language }}</span>
                <span class="tm">{{ (selectedFile()!.size / 1024).toFixed(1) }}KB</span>
                <span class="tm score" [class.good]="selectedFile()!.score>=80" [class.ok]="selectedFile()!.score>=50&&selectedFile()!.score<80" [class.bad]="selectedFile()!.score<50">{{ selectedFile()!.score }}/100</span>
                <span class="tm issues" *ngIf="selectedFile()!.issues.length > 0">{{ selectedFile()!.issues.length }} issues</span>
              </div>
              <!-- Run / Debug buttons -->
              <span class="ai-editing-badge" *ngIf="editorDiffMode">AI EDITING</span>
              <div class="run-controls" *ngIf="isRunnable() && !editorDiffMode">
                <button class="rc-btn run" (click)="runFile()" [disabled]="runner.debugState().running" title="Run (Ctrl+Enter)">&#9654; Run</button>
                <button class="rc-btn debug" (click)="debugFile()" [disabled]="runner.debugState().running" title="Debug">&#9881; Debug</button>
                <button class="rc-btn stop" (click)="runner.stopDebug()" *ngIf="runner.debugState().running" title="Stop">&#9632; Stop</button>
              </div>
            </div>

            <!-- Editor area: gutter + textarea -->
            <div class="editor-main" #editorMain>
              <!-- Line gutter -->
              <div class="gutter" #gutterEl>
                <div class="gutter-line" *ngFor="let ln of gutterLines(); let i = index"
                     [class.bp]="runner.breakpoints().has(i+1)"
                     [class.current]="runner.debugState().currentLine === i+1"
                     [class.has-error]="getIssueSev(i+1) === 'error'"
                     [class.has-warn]="getIssueSev(i+1) === 'warning'"
                     (click)="onGutterClick(i+1)">
                  <span class="bp-dot" *ngIf="runner.breakpoints().has(i+1)">&#9679;</span>
                  <span class="issue-dot error" *ngIf="!runner.breakpoints().has(i+1) && getIssueSev(i+1) === 'error'">&#9679;</span>
                  <span class="issue-dot warn" *ngIf="!runner.breakpoints().has(i+1) && getIssueSev(i+1) === 'warning'">&#9679;</span>
                  <span class="ln-num">{{ i + 1 }}</span>
                </div>
              </div>
              <!-- Normal editor -->
              <div class="code-area" *ngIf="!editorDiffMode">
                <pre class="code-highlight" #highlightEl aria-hidden="true"><code [innerHTML]="highlightedCode"></code></pre>
                <textarea
                  class="code-editor"
                  #codeEditor
                  [value]="editedCode"
                  (input)="onCodeChange($event)"
                  (scroll)="syncScroll($event)"
                  (keydown)="onEditorKeydown($event)"
                  spellcheck="false"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                ></textarea>
              </div>
              <!-- Diff editor -->
              <div class="diff-area" *ngIf="editorDiffMode">
                <div class="diff-toolbar">
                  <span class="diff-title">AI Changes — Review <span class="diff-count">(<span class="added-count">+{{ diffAddedCount() }}</span> <span class="removed-count">-{{ diffRemovedCount() }}</span>)</span></span>
                  <button class="diff-btn accept" (click)="acceptDiff()" title="Keep the changes">&#10003; Accept</button>
                  <button class="diff-btn reject" (click)="rejectDiff()" title="Revert to original">&#8634; Undo</button>
                  <button class="diff-btn close" (click)="closeDiff()" title="Close diff view (keeps changes, shows normal editor)">&#10005; Close</button>
                </div>
                <div class="diff-scroll" #diffScrollEl>
                  <div *ngFor="let dl of editorDiffLines; let i = index"
                       class="diff-line" [ngClass]="'diff-' + dl.type">
                    <span class="diff-gutter">{{ dl.type === 'remove' ? '-' : dl.type === 'add' ? '+' : ' ' }}</span>
                    <span class="diff-num">{{ i + 1 }}</span>
                    <span class="diff-code">{{ dl.text }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM PANEL: Terminal + Debug -->
        <div class="bottom-panel" *ngIf="bottomPanelOpen" [style.height.px]="bottomPanelHeight">
          <!-- Resize handle -->
          <div class="resize-handle" (mousedown)="startResize($event)"></div>

          <!-- Panel tabs -->
          <div class="bp-tabs">
            <button class="bp-tab" [class.active]="bottomTab === 'terminal'" (click)="bottomTab = 'terminal'">
              Terminal
            </button>
            <button class="bp-tab" [class.active]="bottomTab === 'problems'" (click)="bottomTab = 'problems'">
              Problems
              <span class="bp-badge" *ngIf="selectedFile() && selectedFile()!.issues.length > 0">{{ selectedFile()!.issues.length }}</span>
            </button>
            <button class="bp-tab" [class.active]="bottomTab === 'debug'" (click)="bottomTab = 'debug'">
              Debug
              <span class="bp-badge active-debug" *ngIf="runner.debugState().paused">PAUSED</span>
            </button>
            <div class="bp-tab-actions">
              <button class="bp-act" (click)="addTerminal()" *ngIf="bottomTab === 'terminal'" title="New Terminal">+</button>
              <button class="bp-act" (click)="runner.clearTerminal()" *ngIf="bottomTab === 'terminal'" title="Clear">&#128465;</button>
              <button class="bp-act" (click)="bottomPanelOpen = false" title="Close">&times;</button>
            </div>
          </div>

          <!-- Terminal selector (when multiple) -->
          <div class="term-selector" *ngIf="bottomTab === 'terminal' && runner.sessions().length > 1">
            <button *ngFor="let s of runner.sessions(); let i = index"
                    class="ts-btn" [class.active]="runner.activeIdx() === i"
                    (click)="runner.switchSession(i)">
              <span class="ts-dot" [class.on]="s.connected">&#9679;</span>
              {{ s.name }}
              <span class="ts-cwd">{{ s.cwd | slice:-15 }}</span>
              <button class="ts-x" *ngIf="runner.sessions().length > 1" (click)="closeTerminal(i, $event)">&times;</button>
            </button>
          </div>

          <!-- Terminal -->
          <div class="bp-content terminal-content" *ngIf="bottomTab === 'terminal'">
            <div class="terminal" #terminalEl>
              <div class="term-line" *ngFor="let tl of runner.terminalLines()" [ngClass]="'tl-' + tl.type">
                <span class="tl-text">{{ tl.text }}</span>
              </div>
            </div>
            <div class="term-input-row">
              <span class="term-cwd">{{ runner.cwd() || '~' }}</span>
              <span class="term-prompt" [class.connected]="runner.connected()">{{ runner.connected() ? '$' : '>' }}</span>
              <input class="term-input"
                     [(ngModel)]="terminalInput"
                     (keydown.enter)="executeTerminal()"
                     (keydown.control.c)="onCtrlC($event)"
                     [placeholder]="runner.connected() ? 'ng serve, node, npm, cd ...' : 'JS mode — start backend for shell'"
                     spellcheck="false"
                     #terminalInputEl />
              <button class="term-kill" *ngIf="runner.commandRunning()" (click)="runner.killProcess()" title="Ctrl+C">&#9632;</button>
              <button class="term-reconnect" *ngIf="!runner.connected()" (click)="runner.reconnect()">Reconnect</button>
              <span class="term-status" [class.on]="runner.connected()">{{ runner.connected() ? 'SHELL' : 'JS' }}</span>
            </div>
          </div>

          <!-- Problems -->
          <div class="bp-content" *ngIf="bottomTab === 'problems'">
            <div class="problems-list" *ngIf="selectedFile()">
              <div class="prob-row" *ngFor="let iss of selectedFile()!.issues" [ngClass]="iss.severity" (click)="scrollToLine(iss.line)">
                <span class="prob-sev" [ngClass]="iss.severity">{{ iss.severity }}</span>
                <span class="prob-line" *ngIf="iss.line > 0">Ln {{ iss.line }}</span>
                <span class="prob-rule">{{ iss.rule }}</span>
                <span class="prob-msg">{{ iss.message }}</span>
              </div>
              <div class="prob-empty" *ngIf="selectedFile()!.issues.length === 0">No problems detected</div>
            </div>
            <div class="prob-empty" *ngIf="!selectedFile()">Open a file to see problems</div>
          </div>

          <!-- Debug -->
          <div class="bp-content" *ngIf="bottomTab === 'debug'">
            <div class="debug-panel">
              <!-- Debug controls -->
              <div class="dbg-controls" *ngIf="runner.debugState().paused">
                <button class="dbg-btn continue" (click)="runner.continueExecution()">&#9654; Continue</button>
                <button class="dbg-btn step" (click)="runner.stepOver()">&#8631; Step Over</button>
                <button class="dbg-btn stop" (click)="runner.stopDebug()">&#9632; Stop</button>
                <span class="dbg-status">Paused at line {{ runner.debugState().currentLine }}</span>
              </div>
              <div class="dbg-controls" *ngIf="runner.debugState().running && !runner.debugState().paused">
                <span class="dbg-status running">Running...</span>
                <button class="dbg-btn stop" (click)="runner.stopDebug()">&#9632; Stop</button>
              </div>
              <div class="dbg-controls" *ngIf="!runner.debugState().running">
                <span class="dbg-status idle">Idle — Set breakpoints by clicking line numbers, then press Debug</span>
              </div>

              <!-- Breakpoints list -->
              <div class="dbg-section">
                <div class="dbg-sec-title">
                  Breakpoints ({{ runner.breakpoints().size }})
                  <button class="dbg-clear" (click)="runner.clearBreakpoints()" *ngIf="runner.breakpoints().size > 0">Clear All</button>
                </div>
                <div class="dbg-bp-list">
                  <div class="dbg-bp" *ngFor="let bp of getBreakpointList()" (click)="scrollToLine(bp)">
                    <span class="dbg-bp-dot">&#9679;</span> Line {{ bp }}
                  </div>
                  <div class="dbg-bp-empty" *ngIf="runner.breakpoints().size === 0">Click on line numbers to add breakpoints</div>
                </div>
              </div>

              <!-- Variables -->
              <div class="dbg-section" *ngIf="runner.debugState().paused && runner.debugState().variables.length > 0">
                <div class="dbg-sec-title">Variables</div>
                <div class="dbg-var" *ngFor="let v of runner.debugState().variables">
                  <span class="var-name">{{ v.name }}</span>
                  <span class="var-type">{{ v.type }}</span>
                  <span class="var-val">{{ v.value }}</span>
                </div>
              </div>

              <!-- Call Stack -->
              <div class="dbg-section" *ngIf="runner.debugState().paused">
                <div class="dbg-sec-title">Call Stack</div>
                <div class="dbg-stack" *ngFor="let frame of runner.debugState().callStack">{{ frame }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom bar (when panel is closed) -->
        <div class="bottom-statusbar">
          <button class="sb-btn" (click)="bottomPanelOpen = true; bottomTab = 'terminal'">Terminal</button>
          <button class="sb-btn" (click)="bottomPanelOpen = true; bottomTab = 'problems'">
            Problems
            <span class="sb-badge" *ngIf="selectedFile() && selectedFile()!.issues.length > 0">{{ selectedFile()!.issues.length }}</span>
          </button>
          <button class="sb-btn" (click)="bottomPanelOpen = true; bottomTab = 'debug'">Debug</button>
          <span class="sb-spacer"></span>
          <span class="sb-info" *ngIf="selectedFile()">Ln {{ cursorLine }}, Col {{ cursorCol }}</span>
          <span class="sb-info" *ngIf="selectedFile()">{{ selectedFile()!.language }}</span>
        </div>
      </div>

      <!-- AI CHAT PANEL -->
      <div class="ai-panel" *ngIf="aiPanelOpen" (click)="onAiPanelClick($event)">
        <!-- Header -->
        <div class="ai-header">
          <div class="ai-hdr-left">
            <div class="ai-logo">AI</div>
            <span class="ai-title">AI Assistant</span>
            <span class="ai-badge on">Built-in</span>
          </div>
          <div class="ai-hdr-right">
            <button class="ai-icon-btn" (click)="ai.clearChat()" title="New conversation">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button class="ai-icon-btn close" (click)="aiPanelOpen = false" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Project context bar -->
        <div class="ai-ctx" *ngIf="report()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span class="ai-ctx-type">{{ report()!.tree?.name }}</span>
          <span class="ai-ctx-tag">{{ report()!.totalFiles }} files</span>
          <span class="ai-ctx-tag">{{ report()!.totalLines }} lines</span>
        </div>

        <!-- Chat -->
        <div class="ai-chat" #aiChatEl>
          <!-- Welcome -->
          <div class="ai-welcome" *ngIf="ai.messages().length === 0">
            <div class="ai-welcome-logo">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#aiGrad)" stroke-width="1.5">
                <defs><linearGradient id="aiGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#818cf8"/><stop offset="100%" stop-color="#c084fc"/></linearGradient></defs>
                <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 9H5a2 2 0 0 0-2 2v1a7 7 0 0 0 14 0v-1a2 2 0 0 0-2-2z"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
              </svg>
            </div>
            <h3>AI Code Assistant</h3>
            <p class="ai-welcome-sub">Analyze code, generate tests, fix bugs, build features — no API needed</p>

            <div class="ai-status-card connected">
              <div class="ai-sc-dot"></div>
              <span>Built-in AI Engine — Ready</span>
            </div>

            <div class="ai-qa-grid">
              <button class="ai-qa-card" (click)="aiSend('analyze project and extract epics, features, user stories')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>Extract Epics</span>
              </button>
              <button class="ai-qa-card" (click)="aiSend('generate test cases for all API routes and functions')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                <span>Generate Tests</span>
              </button>
              <button class="ai-qa-card" (click)="aiSend('explain this file and suggest improvements')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Analyze File</span>
              </button>
              <button class="ai-qa-card" (click)="aiSend('fix bugs and add error handling in this file')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Fix & Improve</span>
              </button>
              <button class="ai-qa-card" (click)="aiSend('generate automation code for test cases in this project')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                <span>Auto Code</span>
              </button>
              <button class="ai-qa-card" (click)="aiSend('build login page with full authentication')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Build Auth</span>
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div *ngFor="let msg of ai.messages(); trackBy: trackMsg" class="ai-msg" [ngClass]="'ai-msg-' + msg.role">
            <div class="ai-msg-icon" [ngClass]="msg.role">
              <svg *ngIf="msg.role==='user'" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <svg *ngIf="msg.role==='ai'" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 9H5a2 2 0 0 0-2 2v1a7 7 0 0 0 14 0v-1a2 2 0 0 0-2-2z"/></svg>
            </div>
            <div class="ai-msg-body">
              <!-- Thinking -->
              <div class="ai-thinking" *ngIf="msg.thinking" (click)="msg._thinkingOpen = !msg._thinkingOpen">
                <span class="ai-think-label">{{ msg._thinkingOpen ? '&#9660;' : '&#9654;' }} Reasoning</span>
                <pre class="ai-think-pre" *ngIf="msg._thinkingOpen">{{ msg.thinking }}</pre>
              </div>
              <!-- Steps -->
              <div class="ai-steps" *ngIf="msg.steps">
                <div *ngFor="let step of msg.steps" class="ai-step" [ngClass]="step.status">
                  <svg *ngIf="step.status==='done'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg *ngIf="step.status==='running'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" class="spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                  <span class="ai-step-text">{{ step.label }}</span>
                  <span class="ai-step-meta" *ngIf="step.detail">{{ step.detail }}</span>
                </div>
              </div>
              <!-- Text (parsed into segments for reliable code-block rendering) -->
              <div class="ai-msg-text">
                <ng-container *ngFor="let seg of parseMessage(msg.text); trackBy: trackSeg">
                  <div *ngIf="seg.type === 'code'" class="code-block">
                    <div class="code-block-head">
                      <span class="code-block-lang">{{ seg.lang }}</span>
                      <button type="button" class="code-block-copy"
                              (click)="copyToClipboard(seg.content, $event)">Copy</button>
                    </div>
                    <pre class="code-block-body"><code>{{ seg.content }}</code></pre>
                  </div>
                  <div *ngIf="seg.type === 'text'" class="ai-text-segment" [innerHTML]="formatInlineText(seg.content)"></div>
                </ng-container>
              </div>
              <!-- Artifacts -->
              <div *ngFor="let art of msg.artifacts" class="ai-artifact">
                <div class="art-top">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span class="art-name">{{ art.title }}</span>
                  <span class="art-ext">{{ art.language }}</span>
                  <div class="art-btns">
                    <button class="art-b copy" (click)="copyArtifact(art)" title="Copy">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="art-b apply" *ngIf="!art.applied" (click)="applyArtifact(art)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      {{ art.file ? 'Apply' : 'Create' }}
                    </button>
                    <button class="art-b revert" *ngIf="art.applied" (click)="revertArtifact(art)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                      Revert
                    </button>
                    <span class="art-check" *ngIf="art.applied">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  </div>
                </div>
                <pre class="art-code" *ngIf="art.type === 'code' || art.type === 'markdown'">{{ art.content }}</pre>
                <div class="art-diff" *ngIf="art.type === 'diff'">
                  <div *ngFor="let dl of getDiff(art)" class="art-dl" [ngClass]="'dl-' + dl.type">
                    <span class="dl-sym">{{ dl.type === 'add' ? '+' : dl.type === 'remove' ? '-' : ' ' }}</span>
                    <span>{{ dl.text }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Streaming response (live text with cursor) -->
          <div class="ai-msg ai-msg-ai" *ngIf="ai.streamingId()">
            <div class="ai-msg-icon ai">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 9H5a2 2 0 0 0-2 2v1a7 7 0 0 0 14 0v-1a2 2 0 0 0-2-2z"/></svg>
            </div>
            <div class="ai-msg-body">
              <div class="ai-msg-text ai-streaming" [innerHTML]="formatAiText(ai.streamingText())"></div>
              <span class="ai-cursor"></span>
            </div>
          </div>

          <!-- Waiting dots (before first token arrives) -->
          <div class="ai-typing" *ngIf="ai.analyzing() && !ai.streamingId()">
            <div class="ai-msg-icon ai">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 9H5a2 2 0 0 0-2 2v1a7 7 0 0 0 14 0v-1a2 2 0 0 0-2-2z"/></svg>
            </div>
            <div class="ai-dots"><span></span><span></span><span></span></div>
          </div>
        </div>

        <!-- Input -->
        <div class="ai-input-bar">
          <textarea class="ai-input-field" [(ngModel)]="aiIssue" placeholder="Ask anything..." rows="1" (keydown)="onAiKeydown($event)"></textarea>
          <button class="ai-send" (click)="aiSend()" [disabled]="ai.analyzing() || !aiIssue.trim()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Tree template -->
    <ng-template #treeNode let-node let-depth="depth">
      <div class="t-row" [style.padding-left.px]="depth * 16 + 8"
           [class.t-folder]="node.type==='folder'" [class.t-file]="node.type==='file'"
           [class.t-selected]="scanner.selectedFilePath()===node.path"
           [class.t-has-issues]="node.issues>0"
           (click)="onNodeClick(node)"
           (contextmenu)="onTreeRightClick($event, node)">
        <span class="t-arrow" *ngIf="node.type==='folder'">{{ node.expanded ? '&#9660;' : '&#9654;' }}</span>
        <span class="t-arrow" *ngIf="node.type==='file'">&nbsp;</span>
        <span class="t-ico" *ngIf="node.type==='folder'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" [attr.stroke]="node.expanded ? '#818cf8' : '#4a4a6c'" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </span>
        <span class="t-file-badge" *ngIf="node.type==='file'" [style.background]="getExtColor(node.extension)" [style.color]="getExtText(node.extension)">{{ getExtLabel(node.extension) }}</span>
        <span class="t-name">{{ node.name }}</span>
        <span class="t-badge" *ngIf="node.issues>0">{{ node.issues }}</span>
      </div>
      <div *ngIf="node.type==='folder' && node.expanded">
        <ng-container *ngFor="let child of node.children">
          <ng-container *ngTemplateOutlet="treeNode; context:{$implicit:child,depth:depth+1}"></ng-container>
        </ng-container>
      </div>
    </ng-template>

    <!-- Right-click context menu -->
    <div class="ctx-menu" *ngIf="ctxMenu.show" [style.top.px]="ctxMenu.y" [style.left.px]="ctxMenu.x" (mouseleave)="ctxMenu.show = false">
      <button class="ctx-item" (click)="ctxNewFile()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        New File
      </button>
      <button class="ctx-item" (click)="ctxNewFolder()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
        New Folder
      </button>
      <button class="ctx-item" (click)="ctxOpenTerminal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        Open Terminal Here
      </button>
      <button class="ctx-item" *ngIf="ctxMenu.node?.type === 'file'" (click)="ctxOpenFile()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Open File
      </button>
      <button class="ctx-item" *ngIf="ctxMenu.node?.type === 'file'" (click)="ctxCopyPath()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy Path
      </button>
      <button class="ctx-item" *ngIf="ctxMenu.node?.type === 'folder'" (click)="ctxCopyPath()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy Path
      </button>
      <button class="ctx-item" *ngIf="ctxMenu.node?.type === 'file' && isRunnable()" (click)="ctxRunFile()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Run File
      </button>
      <div class="ctx-divider"></div>
      <button class="ctx-item danger" (click)="ctxDelete()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Delete
      </button>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100vh; background: #08081a; overflow: hidden; font-family: 'Inter',-apple-system,sans-serif; }

    /* TOP BAR */
    .top-bar { display: flex; align-items: center; gap: 10px; padding: 0 14px; height: 38px; background: #0c0c1e; border-bottom: 1px solid #1a1a30; flex-shrink: 0; overflow-x: auto; }
    .back-btn { padding: 4px 12px; background: rgba(129,140,248,0.06); border: 1px solid #1e1e36; border-radius: 6px; color: #818cf8; font-size: 11px; cursor: pointer; font-family: 'Inter',sans-serif; white-space: nowrap; transition: all 0.15s; }
    .back-btn:hover { background: rgba(129,140,248,0.12); border-color: rgba(129,140,248,0.3); }
    .project-name { font-size: 12px; font-weight: 600; color: #e0e0f0; white-space: nowrap; letter-spacing: -0.2px; }
    .path-input-wrap { display: flex; gap: 4px; align-items: center; }
    .path-input { padding: 2px 8px; background: #0d0d1a; border: 1px solid #2a2a44; border-radius: 4px; color: #e0e0f0; font-size: 11px; font-family: 'JetBrains Mono',monospace; width: 220px; outline: none; }
    .path-input:focus { border-color: #818cf8; }
    .path-input::placeholder { color: #4a4a6c; }
    .path-go { padding: 2px 8px; background: rgba(16,185,129,0.2); border: none; border-radius: 4px; color: #34d399; font-size: 10px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; }
    .path-go:hover { background: rgba(16,185,129,0.3); }
    .cwd-display { font-size: 10px; color: #818cf8; font-family: 'JetBrains Mono',monospace; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
    .cwd-display.faded { color: #6a6a8a; }
    .stat-pills { display: flex; gap: 5px; margin-left: auto; }
    .pill { padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; background: #0e0e20; border: 1px solid #1e1e36; color: #8888a8; white-space: nowrap; font-family: 'Inter',sans-serif; letter-spacing: -0.1px; }
    .pill.click { cursor: pointer; border: none; } .pill.click:hover { filter: brightness(1.3); }
    .score-pill.good { background: rgba(16,185,129,0.15); color: #34d399; } .score-pill.ok { background: rgba(245,158,11,0.15); color: #fbbf24; } .score-pill.bad { background: rgba(239,68,68,0.15); color: #f87171; }
    .epic-pill { background: rgba(167,139,250,0.1); color: #a78bfa; display: flex; align-items: center; gap: 4px; }
    .feature-pill { background: rgba(16,185,129,0.1); color: #34d399; display: flex; align-items: center; gap: 4px; }
    .story-pill { background: rgba(96,165,250,0.1); color: #60a5fa; display: flex; align-items: center; gap: 4px; }

    /* LAYOUT */
    .ide-body { display: flex; flex: 1; overflow: hidden; }
    .sidebar { width: 260px; background: #0c0c1e; border-right: 1px solid #1a1a30; display: flex; flex-direction: column; flex-shrink: 0; transition: width 0.2s; }
    .sidebar.collapsed { width: 0; overflow: hidden; }
    .sb-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #1a1a30; font-size: 10px; font-weight: 700; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.8px; }
    .sb-actions { display: flex; gap: 2px; }
    .sb-act { width: 24px; height: 24px; background: none; border: 1px solid transparent; border-radius: 5px; color: #4a4a6c; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .sb-act:hover { color: #c8c8e0; background: rgba(129,140,248,0.06); border-color: #1e1e36; }
    .new-item-input { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-bottom: 1px solid #1a1a30; background: #080818; }

    .open-folder-empty { display: flex; flex-direction: column; align-items: center; padding: 32px 16px; gap: 12px; }
    .scan-spinner { width: 28px; height: 28px; border: 3px solid rgba(129,140,248,0.2); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .open-folder-btn { padding: 10px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
    .open-folder-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
    .open-folder-btn.secondary { background: rgba(255,255,255,0.06); color: #a0a0c0; border: 1px solid #2a2a44; }
    .open-folder-btn.secondary:hover { background: rgba(255,255,255,0.1); box-shadow: none; }
    .np-label { font-size: 11px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px; align-self: flex-start; margin-left: 5%; margin-top: 4px; }
    .np-input { background: #060614; border: 1px solid #2a2a44; border-radius: 6px; color: #e0e0f0; font-size: 12px; padding: 8px 12px; outline: none; width: 90%; font-family: 'JetBrains Mono', monospace; }
    .np-input:focus { border-color: #818cf8; }
    .np-actions { display: flex; gap: 8px; margin-top: 4px; width: 90%; }
    .np-actions .open-folder-btn { flex: 1; padding: 8px 12px; font-size: 12px; }
    .open-folder-btn-center { padding: 12px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; margin-top: 12px; transition: all 0.2s; }
    .open-folder-btn-center:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
    .open-folder-hint { font-size: 11px; color: #6a6a8a; text-align: center; }

    .trust-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.2s ease; }
    .trust-card { background: #1a1a32; border: 1px solid #2a2a44; border-radius: 16px; padding: 36px 40px; max-width: 460px; width: 90vw; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .trust-icon { font-size: 48px; margin-bottom: 16px; }
    .trust-card h2 { color: #e0e0f0; font-size: 18px; font-weight: 700; margin: 0 0 12px; }
    .trust-folder-name { color: #818cf8; font-size: 14px; font-weight: 600; font-family: 'JetBrains Mono', monospace; margin: 0 0 12px; word-break: break-all; }
    .trust-desc { color: #8888a8; font-size: 13px; line-height: 1.6; margin: 0 0 24px; }
    .trust-actions { display: flex; gap: 12px; justify-content: center; }
    .trust-btn { padding: 11px 24px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
    .trust-yes { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
    .trust-yes:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
    .trust-no { background: rgba(255,255,255,0.06); color: #a0a0c0; border: 1px solid #2a2a44; }
    .trust-no:hover { background: rgba(255,255,255,0.1); }
    .ni-input { flex: 1; background: #060614; border: 1px solid rgba(129,140,248,0.3); border-radius: 5px; color: #e0e0f0; font-size: 11px; padding: 5px 8px; outline: none; font-family: 'JetBrains Mono',monospace; }
    .ni-ok { background: none; border: none; color: #34d399; font-size: 14px; cursor: pointer; }
    .ni-cancel { background: none; border: none; color: #f87171; font-size: 14px; cursor: pointer; }
    .tree-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 0; }
    .tree-scroll::-webkit-scrollbar { width: 6px; }
    .tree-scroll::-webkit-scrollbar-thumb { background: #1e1e36; border-radius: 3px; }
    .tree-scroll::-webkit-scrollbar-thumb:hover { background: #2a2a44; }
    .t-row { display: flex; align-items: center; gap: 4px; padding: 3px 8px; cursor: pointer; color: #8888a8; transition: all 0.1s; white-space: nowrap; border-left: 2px solid transparent; }
    .t-row:hover { background: rgba(129,140,248,0.04); color: #c8c8e0; }
    .t-row.t-selected { background: rgba(129,140,248,0.08); color: #e0e0f0; border-left-color: #818cf8; }
    .t-row.t-has-issues .t-name { color: #fbbf24; }
    .t-arrow { font-size: 7px; width: 10px; text-align: center; color: #4a4a6c; }
    .t-ico { width: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .t-file-badge { font-size: 7px; font-weight: 800; padding: 2px 4px; border-radius: 3px; font-family: 'Inter',sans-serif; letter-spacing: 0.3px; flex-shrink: 0; line-height: 1; text-transform: uppercase; min-width: 20px; text-align: center; }
    .tab-file-badge { font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-family: 'Inter',sans-serif; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1; }
    .t-name { flex: 1; overflow: hidden; text-overflow: ellipsis; font-family: 'JetBrains Mono',monospace; font-size: 12px; }
    .t-badge { font-size: 8px; padding: 1px 5px; background: rgba(245,158,11,0.15); color: #fbbf24; border-radius: 8px; font-weight: 700; border: 1px solid rgba(245,158,11,0.15); }

    /* CENTER */
    .center { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

    .no-file { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; color: #6a6a8a; }
    .nf-icon { font-size: 56px; opacity: 0.3; margin-bottom: 12px; }
    .no-file p { font-size: 13px; margin-bottom: 20px; }
    .lang-chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .lc { font-size: 11px; padding: 3px 10px; background: #16162a; border: 1px solid #2a2a44; border-radius: 12px; color: #a0a0c0; }

    /* EDITOR */
    .editor-section { display: flex; flex-direction: column; overflow: hidden; }
    .editor-wrap { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .tab-bar { display: flex; align-items: center; background: #0a0a1a; border-bottom: 1px solid #1a1a30; height: 36px; flex-shrink: 0; padding: 0; gap: 0; }
    .tab { display: flex; align-items: center; gap: 6px; padding: 0 14px; font-size: 12px; color: #c8c8e0; background: #0e0e1e; border-top: 2px solid #6366f1; height: 100%; font-family: 'JetBrains Mono',monospace; border-right: 1px solid #1a1a30; }
    .tab-icon { font-size: 12px; }
    .tab-x { width: 18px; height: 18px; background: none; border: none; color: #4a4a6c; cursor: pointer; font-size: 14px; margin-left: 6px; line-height: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    .tab-x:hover { color: #f87171; background: rgba(239,68,68,0.1); }
    .tab-meta { display: flex; align-items: center; gap: 6px; margin-left: 12px; }
    .tm { font-size: 10px; color: #8888a8; }
    .tm.lang { color: #818cf8; background: rgba(129,140,248,0.1); padding: 1px 6px; border-radius: 3px; }
    .tm.score { font-weight: 600; padding: 1px 6px; border-radius: 3px; }
    .tm.score.good { background: rgba(16,185,129,0.15); color: #34d399; }
    .tm.score.ok { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .tm.score.bad { background: rgba(239,68,68,0.15); color: #f87171; }
    .tm.issues { font-weight: 600; color: #fbbf24; background: rgba(245,158,11,0.12); padding: 1px 6px; border-radius: 3px; }

    .run-controls { display: flex; gap: 4px; margin-left: auto; padding-right: 8px; }
    .rc-btn { padding: 3px 10px; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; transition: all 0.2s; }
    .rc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .rc-btn.run { background: rgba(16,185,129,0.2); color: #34d399; }
    .rc-btn.run:hover:not(:disabled) { background: rgba(16,185,129,0.3); }
    .rc-btn.debug { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .rc-btn.debug:hover:not(:disabled) { background: rgba(245,158,11,0.3); }
    .rc-btn.stop { background: rgba(239,68,68,0.2); color: #f87171; }
    .rc-btn.stop:hover { background: rgba(239,68,68,0.3); }

    /* EDITOR MAIN: Gutter + Textarea */
    .editor-main { display: flex; flex: 1; overflow: hidden; position: relative; }

    .gutter {
      width: 58px; background: #0a0a1a; flex-shrink: 0; overflow: hidden;
      user-select: none; padding-top: 0; border-right: 1px solid #141428;
    }
    .gutter-line {
      display: flex; align-items: center; justify-content: flex-end; gap: 2px;
      height: 22px; padding-right: 6px; cursor: pointer; position: relative;
      font-size: 12px; font-family: 'JetBrains Mono',monospace; color: #4a4a6c;
      transition: background 0.1s;
    }
    .gutter-line:hover { background: rgba(129,140,248,0.06); }
    .gutter-line.current { background: rgba(245,158,11,0.12); }
    .gutter-line.bp .ln-num { color: #f87171; }
    .gutter-line.has-error { background: rgba(239,68,68,0.06); }
    .gutter-line.has-warn { background: rgba(245,158,11,0.06); }
    .bp-dot { color: #ef4444; font-size: 10px; position: absolute; left: 4px; }
    .issue-dot { font-size: 8px; position: absolute; left: 6px; }
    .issue-dot.error { color: #f87171; }
    .issue-dot.warn { color: #fbbf24; }
    .ln-num { font-size: 11px; }

    .code-area { flex: 1; position: relative; overflow: hidden; }

    /* DIFF EDITOR */
    .diff-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #0d0d1a; }
    .diff-toolbar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #1a1a32; border-bottom: 1px solid #2a2a44; flex-shrink: 0; }
    .diff-title { font-size: 11px; font-weight: 700; color: #a78bfa; display: flex; align-items: center; gap: 8px; }
    .diff-count { font-weight: 500; font-size: 10px; color: #6a6a8a; }
    .added-count { color: #34d399; }
    .removed-count { color: #f87171; }
    .diff-btn { padding: 4px 12px; border: none; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; }
    .diff-btn.accept { background: rgba(16,185,129,0.2); color: #34d399; }
    .diff-btn.accept:hover { background: rgba(16,185,129,0.3); }
    .diff-btn.reject { background: rgba(239,68,68,0.15); color: #f87171; }
    .diff-btn.reject:hover { background: rgba(239,68,68,0.25); }
    .diff-btn.close { background: rgba(129,140,248,0.15); color: #818cf8; margin-left: auto; }
    .diff-scroll { flex: 1; overflow-y: auto; }
    .diff-line { display: flex; font-family: 'JetBrains Mono',monospace; font-size: 13px; line-height: 22px; }
    .diff-gutter { width: 20px; text-align: center; font-weight: 700; flex-shrink: 0; padding-left: 4px; }
    .diff-num { width: 40px; text-align: right; padding-right: 8px; color: #4a4a6c; flex-shrink: 0; font-size: 11px; }
    .diff-code { flex: 1; padding-right: 16px; white-space: pre; }
    .diff-same { color: #6a6a8a; }
    .diff-same .diff-gutter { color: #3a3a5c; }
    .diff-add { background: rgba(16,185,129,0.10); color: #34d399; }
    .diff-add .diff-gutter { color: #10b981; }
    .diff-remove { background: rgba(239,68,68,0.10); color: #f87171; text-decoration: line-through; }
    .diff-remove .diff-gutter { color: #ef4444; }

    .ai-editing-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; background: rgba(167,139,250,0.2); color: #a78bfa; border-radius: 4px; margin-left: auto; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

    .code-highlight, .code-editor {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      font-family: 'JetBrains Mono',monospace; font-size: 13px; line-height: 22px;
      padding: 0 16px; margin: 0; border: none; white-space: pre;
      tab-size: 2; -moz-tab-size: 2; overflow: auto; box-sizing: border-box;
    }
    .code-highlight {
      background: #080818; color: #c8c8e0; pointer-events: none; z-index: 0;
    }
    .code-highlight code { font-family: inherit; }
    .code-editor {
      background: transparent; color: transparent; caret-color: #e0e0f0;
      outline: none; resize: none; z-index: 1;
    }
    .code-editor::selection { background: rgba(99,102,241,0.35); }

    /* ===== SYNTAX COLORS (VS Code Dark+ inspired) ===== */
    :host ::ng-deep .hl-kw { color: #569cd6; }          /* keywords: const, let, function, class, import */
    :host ::ng-deep .hl-ctrl { color: #c586c0; }         /* control: if, else, for, while, return */
    :host ::ng-deep .hl-type { color: #4ec9b0; }         /* types/classes: String, Component, PascalCase */
    :host ::ng-deep .hl-fn { color: #dcdcaa; }           /* function calls: myFunc( */
    :host ::ng-deep .hl-str { color: #ce9178; }          /* strings */
    :host ::ng-deep .hl-num { color: #b5cea8; }          /* numbers */
    :host ::ng-deep .hl-cmt { color: #6a9955; font-style: italic; }  /* comments */
    :host ::ng-deep .hl-op { color: #d4d4d4; }           /* operators */
    :host ::ng-deep .hl-br { color: #ffd700; }           /* brackets */
    :host ::ng-deep .hl-dec { color: #dcdcaa; }          /* decorators: @Component */
    :host ::ng-deep .hl-val { color: #569cd6; }          /* true, false, null, undefined */
    :host ::ng-deep .hl-bi { color: #9cdcfe; }           /* builtins: console, document, Math */
    :host ::ng-deep .hl-tag { color: #569cd6; }          /* HTML tags */
    :host ::ng-deep .hl-attr { color: #9cdcfe; }         /* HTML attributes */
    :host ::ng-deep .hl-dir { color: #c586c0; }          /* Angular directives */
    :host ::ng-deep .hl-interp { color: #dcdcaa; }       /* {{ interpolation }} */
    :host ::ng-deep .hl-prop { color: #9cdcfe; }         /* CSS/JSON properties */
    :host ::ng-deep .hl-sel { color: #d7ba7d; }          /* CSS selectors */

    /* BOTTOM PANEL */
    .bottom-panel { background: #0a0a1a; border-top: 1px solid #1a1a30; display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden; }
    .resize-handle { height: 3px; cursor: ns-resize; background: transparent; flex-shrink: 0; transition: background 0.15s; }
    .resize-handle:hover { background: #6366f1; }

    .bp-tabs { display: flex; align-items: center; padding: 0 10px; height: 32px; border-bottom: 1px solid #1a1a30; flex-shrink: 0; gap: 0; background: #0c0c1e; }
    .bp-tab { padding: 0 14px; height: 100%; background: none; border: none; border-bottom: 2px solid transparent; color: #4a4a6c; font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; display: flex; align-items: center; gap: 4px; transition: color 0.15s; }
    .bp-tab:hover { color: #a0a0c0; }
    .bp-tab.active { color: #e0e0f0; border-bottom-color: #6366f1; }
    .bp-badge { font-size: 9px; padding: 0 5px; background: rgba(245,158,11,0.2); color: #fbbf24; border-radius: 8px; font-weight: 700; }
    .bp-badge.active-debug { background: rgba(245,158,11,0.3); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .bp-tab-actions { margin-left: auto; display: flex; gap: 4px; }

    /* ACTIVITY BAR */
    /* Source Control Panel */
    .sc-panel { width: 300px; background: #0c0c1e; border-right: 1px solid #1a1a30; display: flex; flex-direction: column; flex-shrink: 0; font-size: 13px; overflow: hidden; }
    .sc-header { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #1a1a30; gap: 4px; }
    .sc-title { flex: 1; color: #c0c0d8; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .sc-icon-btn { background: none; border: none; color: #8888a8; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 16px; line-height: 1; }
    .sc-icon-btn:hover { background: rgba(255,255,255,0.06); color: #e0e0f0; }
    .sc-empty { padding: 24px 16px; text-align: center; color: #6a6a8a; font-size: 12px; }
    .sc-empty p { margin: 0 0 12px; }
    .sc-branch { display: flex; align-items: center; gap: 6px; padding: 8px 12px; color: #818cf8; font-size: 12px; border-bottom: 1px solid #1a1a30; }
    .sc-remote { color: #6a6a8a; font-size: 11px; }
    .sc-ahead, .sc-behind { background: rgba(129,140,248,0.15); color: #a5b4fc; padding: 1px 6px; border-radius: 8px; font-size: 10px; font-family: monospace; }
    .sc-commit { padding: 10px; border-bottom: 1px solid #1a1a30; }
    .sc-msg { width: 100%; background: #060614; border: 1px solid #2a2a44; border-radius: 6px; color: #e0e0f0; padding: 8px 10px; font-size: 12px; resize: vertical; outline: none; font-family: 'Inter', sans-serif; box-sizing: border-box; }
    .sc-msg:focus { border-color: #818cf8; }
    .sc-actions { display: flex; gap: 6px; margin-top: 8px; }
    .sc-sync { display: flex; gap: 6px; padding: 8px 10px; border-bottom: 1px solid #1a1a30; }
    .sc-sync .sc-btn { flex: 1; }
    .sc-btn { padding: 6px 12px; background: rgba(255,255,255,0.05); border: 1px solid #2a2a44; border-radius: 5px; color: #c0c0d8; font-size: 11px; cursor: pointer; font-family: 'Inter', sans-serif; flex: 1; }
    .sc-btn:hover:not(:disabled) { background: rgba(129,140,248,0.15); border-color: #818cf8; color: #fff; }
    .sc-btn.primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-color: transparent; color: #fff; font-weight: 600; }
    .sc-btn.primary:hover:not(:disabled) { filter: brightness(1.1); }
    .sc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .sc-no-remote { padding: 12px; border-bottom: 1px solid #1a1a30; }
    .sc-no-remote p { margin: 0 0 8px; color: #8888a8; font-size: 11px; }
    .sc-remote-add { display: flex; flex-direction: column; gap: 6px; }
    .sc-remote-add input { padding: 6px 10px; background: #060614; border: 1px solid #2a2a44; border-radius: 4px; color: #e0e0f0; font-size: 11px; font-family: 'JetBrains Mono', monospace; outline: none; }
    .sc-remote-add input:focus { border-color: #818cf8; }
    .sc-status-msg { padding: 8px 12px; background: rgba(16,185,129,0.1); color: #34d399; font-size: 11px; border-bottom: 1px solid #1a1a30; }
    .sc-status-msg.error { background: rgba(239,68,68,0.1); color: #f87171; }
    .sc-group { border-bottom: 1px solid #1a1a30; }
    .sc-group-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: #080818; color: #a0a0c0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .sc-file { display: flex; align-items: center; gap: 6px; padding: 4px 12px; cursor: pointer; font-size: 12px; }
    .sc-file:hover { background: rgba(255,255,255,0.04); }
    .sc-file-icon { width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; border-radius: 3px; flex-shrink: 0; font-family: monospace; }
    .sc-file-icon.staged { background: rgba(52,211,153,0.2); color: #34d399; }
    .sc-file-icon.status-modified { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .sc-file-icon.status-untracked { background: rgba(129,140,248,0.2); color: #a5b4fc; }
    .sc-file-icon.status-added { background: rgba(52,211,153,0.2); color: #34d399; }
    .sc-file-icon.status-deleted { background: rgba(239,68,68,0.2); color: #f87171; }
    .sc-file-icon.status-renamed { background: rgba(139,92,246,0.2); color: #a78bfa; }
    .sc-file-icon.status-conflict { background: rgba(239,68,68,0.3); color: #fca5a5; }
    .sc-file-name { flex: 1; color: #c0c0d8; font-family: 'JetBrains Mono', monospace; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sc-file-status { font-size: 10px; color: #6a6a8a; font-weight: 600; }
    .sc-mini-btn { background: none; border: none; color: #6a6a8a; cursor: pointer; padding: 0 4px; font-size: 14px; line-height: 1; opacity: 0; transition: opacity 0.1s; border-radius: 3px; }
    .sc-file:hover .sc-mini-btn, .sc-group-head:hover .sc-mini-btn { opacity: 1; }
    .sc-mini-btn:hover { background: rgba(129,140,248,0.2); color: #fff; }
    .sc-mini-btn.discard:hover { background: rgba(239,68,68,0.2); color: #fca5a5; }

    .activity-bar {
      width: 44px; background: #080816; border-right: 1px solid #141428; display: flex;
      flex-direction: column; align-items: center; padding: 8px 0; gap: 4px; flex-shrink: 0;
    }
    .ab-icon {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      background: none; border: none; color: #3a3a5c; font-size: 17px; cursor: pointer;
      border-radius: 8px; transition: all 0.2s; position: relative; border-left: 2px solid transparent;
    }
    .ab-icon:hover { color: #a0a0c0; background: rgba(129,140,248,0.05); }
    .ab-icon.active { color: #e0e0f0; background: rgba(129,140,248,0.08); border-left-color: #6366f1; }
    .ab-spacer { flex: 1; }
    .ab-badge { position: absolute; top: 3px; right: 3px; font-size: 7px; background: #ef4444; color: #fff; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-weight: 800; }

    /* Terminal selector strip (when multiple terminals) */
    .term-selector { display: flex; gap: 0; background: #111125; border-bottom: 1px solid #2a2a44; padding: 0 4px; height: 24px; flex-shrink: 0; }
    .ts-btn { display: flex; align-items: center; gap: 3px; padding: 0 10px; background: none; border: none; border-bottom: 2px solid transparent; color: #6a6a8a; font-size: 10px; cursor: pointer; font-family: 'Inter',sans-serif; height: 100%; }
    .ts-btn.active { color: #e0e0f0; border-bottom-color: #818cf8; }
    .ts-btn:hover { color: #c0c0d8; }
    .ts-icon { font-size: 11px; }
    .ts-dot { font-size: 7px; color: #6a6a8a; }
    .ts-dot.on { color: #34d399; }
    .ts-cwd { font-size: 9px; color: #4a4a6c; margin-left: 4px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; }
    .ts-x { background: none; border: none; color: #6a6a8a; cursor: pointer; font-size: 11px; padding: 0 2px; line-height: 1; margin-left: 2px; }
    .ts-x:hover { color: #f87171; }
    .bp-act { background: none; border: none; color: #8888a8; cursor: pointer; font-size: 14px; padding: 2px 6px; }
    .bp-act:hover { color: #e0e0f0; }

    .bp-content { flex: 1; overflow-y: auto; }

    /* TERMINAL */
    .terminal-content { display: flex; flex-direction: column; }
    .terminal { flex: 1; overflow-y: auto; padding: 10px 14px; font-family: 'JetBrains Mono',monospace; font-size: 12.5px; min-height: 0; background: #060612; line-height: 1.5; }
    .terminal::-webkit-scrollbar { width: 6px; }
    .terminal::-webkit-scrollbar-thumb { background: #1e1e36; border-radius: 3px; }
    .term-line { padding: 1px 0; }
    .tl-text { white-space: pre-wrap; word-break: break-all; }
    .tl-stdout .tl-text { color: #c8c8e0; }
    .tl-stderr .tl-text { color: #f87171; }
    .tl-warn .tl-text { color: #fbbf24; }
    .tl-info .tl-text { color: #60a5fa; }
    .tl-input .tl-text { color: #34d399; font-weight: 500; }

    .term-input-row { display: flex; align-items: center; padding: 6px 10px; border-top: 1px solid #1a1a30; flex-shrink: 0; background: #080816; gap: 0; }
    .term-cwd { font-size: 11px; color: #6366f1; font-family: 'JetBrains Mono',monospace; padding-right: 8px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; flex-shrink: 0; opacity: 0.7; }
    .term-prompt { color: #34d399; font-family: 'JetBrains Mono',monospace; font-size: 14px; font-weight: 700; margin-right: 8px; flex-shrink: 0; }
    .term-input { flex: 1; background: none; border: none; outline: none; color: #e0e0f0; font-family: 'JetBrains Mono',monospace; font-size: 12.5px; min-width: 0; }
    .term-input::placeholder { color: #2a2a44; }
    .term-kill { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-size: 10px; padding: 3px 10px; border-radius: 5px; cursor: pointer; margin-left: 6px; flex-shrink: 0; transition: all 0.15s; }
    .term-kill:hover { background: rgba(239,68,68,0.2); }
    .term-reconnect { padding: 3px 10px; background: rgba(129,140,248,0.08); border: 1px solid #1e1e36; border-radius: 5px; color: #818cf8; font-size: 9px; font-weight: 600; cursor: pointer; margin-left: 6px; font-family: 'Inter',sans-serif; transition: all 0.15s; }
    .term-reconnect:hover { background: rgba(129,140,248,0.15); border-color: rgba(129,140,248,0.3); }
    .term-status { font-size: 8px; font-weight: 700; padding: 3px 8px; border-radius: 10px; margin-left: 8px; flex-shrink: 0; background: #0e0e20; color: #4a4a6c; border: 1px solid #1e1e36; letter-spacing: 0.3px; }
    .term-status.on { background: rgba(16,185,129,0.08); color: #34d399; border-color: rgba(16,185,129,0.2); }

    /* PROBLEMS */
    .problems-list { padding: 4px 0; }
    .prob-row { display: flex; align-items: center; gap: 8px; padding: 4px 16px; font-size: 11px; cursor: pointer; transition: background 0.1s; }
    .prob-row:hover { background: rgba(129,140,248,0.04); }
    .prob-sev { padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
    .prob-sev.error { background: rgba(239,68,68,0.2); color: #f87171; }
    .prob-sev.warning { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .prob-sev.info { background: rgba(96,165,250,0.2); color: #60a5fa; }
    .prob-line { font-size: 10px; color: #818cf8; font-family: 'JetBrains Mono',monospace; flex-shrink: 0; }
    .prob-rule { font-size: 9px; color: #6a6a8a; background: #1e1e36; padding: 0 4px; border-radius: 2px; flex-shrink: 0; }
    .prob-msg { color: #c0c0d8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .prob-empty { padding: 24px; text-align: center; color: #34d399; font-size: 12px; }

    /* DEBUG PANEL */
    .debug-panel { padding: 8px 12px; }
    .dbg-controls { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
    .dbg-btn { padding: 4px 12px; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; }
    .dbg-btn.continue { background: rgba(16,185,129,0.2); color: #34d399; }
    .dbg-btn.step { background: rgba(129,140,248,0.2); color: #818cf8; }
    .dbg-btn.stop { background: rgba(239,68,68,0.2); color: #f87171; }
    .dbg-status { font-size: 11px; color: #fbbf24; margin-left: 8px; }
    .dbg-status.running { color: #34d399; }
    .dbg-status.idle { color: #6a6a8a; }

    .dbg-section { margin-bottom: 12px; }
    .dbg-sec-title { font-size: 10px; font-weight: 600; color: #818cf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    .dbg-clear { background: none; border: none; color: #8888a8; font-size: 10px; cursor: pointer; margin-left: auto; }
    .dbg-clear:hover { color: #f87171; }
    .dbg-bp-list { }
    .dbg-bp { padding: 2px 8px; font-size: 11px; color: #c0c0d8; cursor: pointer; }
    .dbg-bp:hover { background: rgba(129,140,248,0.06); }
    .dbg-bp-dot { color: #ef4444; font-size: 8px; }
    .dbg-bp-empty { font-size: 11px; color: #6a6a8a; padding: 4px 8px; }

    .dbg-var { display: flex; gap: 8px; padding: 2px 8px; font-size: 11px; }
    .var-name { color: #818cf8; font-family: 'JetBrains Mono',monospace; font-weight: 600; min-width: 80px; }
    .var-type { color: #6a6a8a; font-size: 10px; min-width: 50px; }
    .var-val { color: #c8c8e0; font-family: 'JetBrains Mono',monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dbg-stack { font-size: 11px; color: #c0c0d8; padding: 2px 8px; font-family: 'JetBrains Mono',monospace; }

    /* STATUS BAR */
    .bottom-statusbar { display: flex; align-items: center; height: 22px; background: #6366f1; padding: 0 8px; flex-shrink: 0; gap: 0; }
    .sb-btn { padding: 0 10px; height: 100%; background: none; border: none; color: rgba(255,255,255,0.7); font-size: 10px; cursor: pointer; font-family: 'Inter',sans-serif; display: flex; align-items: center; gap: 3px; }
    .sb-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
    .sb-badge { font-size: 8px; padding: 0 5px; background: rgba(255,255,255,0.2); color: #fff; border-radius: 8px; font-weight: 700; }
    .sb-spacer { flex: 1; }
    .sb-info { font-size: 10px; color: rgba(255,255,255,0.6); padding: 0 8px; }

    /* AI PANEL — Clean Sidebar Style */
    .ai-panel {
      width: 420px; background: #0e0e1e; border-left: 1px solid #1e1e36; display: flex;
      flex-direction: column; flex-shrink: 0; overflow: hidden;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn { from { width: 0; opacity: 0; } to { width: 420px; opacity: 1; } }

    /* Header */
    .ai-header { display: flex; align-items: center; padding: 0 10px; height: 40px; border-bottom: 1px solid #1e1e36; flex-shrink: 0; background: #0a0a18; }
    .ai-hdr-left { display: flex; align-items: center; gap: 8px; }
    .ai-hdr-right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
    .ai-logo { width: 24px; height: 24px; background: linear-gradient(135deg,#6366f1,#a78bfa); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
    .ai-title { font-size: 12px; font-weight: 600; color: #c8c8e0; }
    .ai-badge { font-size: 8px; font-weight: 700; padding: 2px 7px; border-radius: 10px; letter-spacing: 0.3px; }
    .ai-badge.on { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }
    .ai-badge:not(.on) { background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.15); }
    .ds-key-bar { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid #1a1a30; align-items: center; }
    .ds-key-input { flex: 1; background: #060614; border: 1px solid #1e1e36; border-radius: 6px; color: #e0e0f0; font-size: 11px; padding: 6px 10px; outline: none; font-family: 'JetBrains Mono',monospace; }
    .ds-key-input:focus { border-color: rgba(99,102,241,0.4); }
    .ds-key-save { padding: 6px 14px; background: linear-gradient(135deg,#6366f1,#818cf8); border: none; border-radius: 6px; color: #fff; font-size: 10px; font-weight: 700; cursor: pointer; }
    .ds-key-link { font-size: 9px; color: #818cf8; white-space: nowrap; }
    .ai-icon-btn { width: 28px; height: 28px; background: none; border: 1px solid transparent; border-radius: 6px; color: #4a4a6c; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .ai-icon-btn:hover { color: #c8c8e0; background: rgba(129,140,248,0.06); border-color: #1e1e36; }
    .ai-icon-btn.close:hover { color: #f87171; }

    /* Context bar */
    .ai-ctx { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-bottom: 1px solid #1a1a30; flex-shrink: 0; color: #4a4a6c; }
    .ai-ctx-type { font-size: 10px; color: #818cf8; font-weight: 600; }
    .ai-ctx-tag { font-size: 8px; color: #4a4a6c; background: #141428; padding: 1px 6px; border-radius: 4px; border: 1px solid #1e1e36; }

    /* Chat */
    .ai-chat { flex: 1; overflow-y: auto; padding: 16px 14px; }

    /* Welcome */
    .ai-welcome { text-align: center; padding: 24px 8px; }
    .ai-welcome-logo { margin-bottom: 12px; opacity: 0.7; }
    .ai-welcome h3 { font-size: 18px; color: #e0e0f0; margin: 0 0 6px; font-weight: 700; }
    .ai-welcome-sub { font-size: 12px; color: #6a6a8a; margin: 0 0 20px; }
    .ai-status-card { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 8px; font-size: 11px; margin-bottom: 20px; border: 1px solid #1e1e36; background: #0a0a18; color: #6a6a8a; }
    .ai-status-card.connected { border-color: rgba(16,185,129,0.2); }
    .ai-sc-dot { width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; }
    .ai-status-card.connected .ai-sc-dot { background: #34d399; box-shadow: 0 0 8px rgba(52,211,153,0.4); }
    .ai-status-card code { background: #141428; padding: 1px 5px; border-radius: 3px; font-family: 'JetBrains Mono',monospace; font-size: 10px; color: #a78bfa; }

    /* Quick action grid */
    .ai-qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
    .ai-qa-card { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #0a0a18; border: 1px solid #1e1e36; border-radius: 10px; color: #8888a8; font-size: 11px; cursor: pointer; font-family: 'Inter',sans-serif; transition: all 0.15s; text-align: left; }
    .ai-qa-card:hover { border-color: #818cf8; color: #c8c8e0; background: rgba(129,140,248,0.04); }
    .ai-qa-card svg { flex-shrink: 0; color: #6a6a8a; }
    .ai-qa-card:hover svg { color: #818cf8; }

    /* Messages */
    .ai-msg { display: flex; gap: 10px; margin-bottom: 18px; animation: fadeUp 0.2s ease; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .ai-msg-icon { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ai-msg-icon.user { background: rgba(129,140,248,0.12); color: #818cf8; }
    .ai-msg-icon.ai { background: linear-gradient(135deg,rgba(99,102,241,0.15),rgba(167,139,250,0.15)); color: #a78bfa; }
    .ai-msg-body { flex: 1; min-width: 0; }
    .ai-msg-user .ai-msg-body { background: rgba(129,140,248,0.05); border: 1px solid rgba(129,140,248,0.08); border-radius: 12px 12px 12px 4px; padding: 10px 14px; }
    .ai-msg-ai .ai-msg-body { padding: 2px 0; }
    .ai-msg-text { font-size: 12.5px; color: #c8c8e0; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
    :host ::ng-deep .ai-msg-text strong { color: #e0e0f0; font-weight: 600; }
    :host ::ng-deep .ai-msg-text em { color: #d0d0e8; font-style: italic; }
    :host ::ng-deep .ai-msg-text .ai-h1 { font-size: 18px; font-weight: 700; color: #fff; margin: 14px 0 8px; }
    :host ::ng-deep .ai-msg-text .ai-h2 { font-size: 15px; font-weight: 700; color: #fff; margin: 12px 0 6px; }
    :host ::ng-deep .ai-msg-text .ai-h3 { font-size: 13.5px; font-weight: 600; color: #e0e0f0; margin: 10px 0 4px; }
    :host ::ng-deep .ai-msg-text code { background: rgba(129,140,248,0.08); padding: 2px 5px; border-radius: 4px; font-family: 'JetBrains Mono',monospace; font-size: 11px; color: #a78bfa; border: 1px solid rgba(129,140,248,0.1); }
    :host ::ng-deep .ai-msg-text .code-block { background: #0a0a1a; border: 1px solid #1f1f35; border-radius: 10px; margin: 10px 0; overflow: hidden; white-space: normal; cursor: text; }
    :host ::ng-deep .ai-msg-text .code-block-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: #14142a; border-bottom: 1px solid #1f1f35; }
    :host ::ng-deep .ai-msg-text .code-block-lang { font-size: 10px; color: #8888a8; text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    :host ::ng-deep .ai-msg-text .code-block-copy { padding: 4px 12px; background: rgba(129,140,248,0.12); border: 1px solid rgba(129,140,248,0.25); border-radius: 5px; color: #a5b4fc; font-size: 11px; cursor: pointer !important; font-family: 'Inter', sans-serif; font-weight: 600; transition: all 0.15s; user-select: none; -webkit-user-select: none; pointer-events: auto; outline: none; }
    :host ::ng-deep .ai-msg-text .code-block-copy * { cursor: pointer !important; pointer-events: none; }
    :host ::ng-deep .ai-msg-text .code-block-copy:hover { background: rgba(129,140,248,0.22); border-color: #818cf8; color: #fff; }
    :host ::ng-deep .ai-msg-text .code-block-copy:active { transform: scale(0.96); }
    :host ::ng-deep .ai-msg-text .code-block-copy.copied { background: rgba(52,211,153,0.2); border-color: #34d399; color: #6ee7b7; }
    :host ::ng-deep .ai-msg-text .code-block-copy.failed { background: rgba(239,68,68,0.2); border-color: #f87171; color: #fca5a5; }
    :host ::ng-deep .ai-msg-text .code-block-body { background: #0a0a1a; padding: 12px 14px; margin: 0; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; color: #d8d8e8; border: none; }
    :host ::ng-deep .ai-msg-text .code-block-body code { background: none; border: none; padding: 0; color: inherit; font-size: inherit; }

    /* Thinking */
    .ai-thinking { margin-bottom: 8px; cursor: pointer; }
    .ai-think-label { font-size: 10px; color: #4a4a6c; display: flex; align-items: center; gap: 4px; }
    .ai-think-pre { font-size: 10px; color: #3a3a5c; margin: 4px 0 0; padding: 8px; background: #0a0a18; border-radius: 6px; border: 1px solid #1e1e36; white-space: pre-wrap; }

    /* Steps */
    .ai-steps { margin-bottom: 10px; padding: 8px 0; }
    .ai-step { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #8888a8; padding: 3px 0; }
    .ai-step svg { flex-shrink: 0; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    .ai-step-text { flex: 1; }
    .ai-step-meta { color: #4a4a6c; font-size: 10px; }

    /* Artifacts */
    .ai-artifact { margin: 10px 0; border: 1px solid #1e1e36; border-radius: 10px; overflow: hidden; background: #080814; }
    .art-top { display: flex; align-items: center; gap: 6px; padding: 7px 12px; background: #0e0e1e; border-bottom: 1px solid #1e1e36; color: #6a6a8a; }
    .art-name { font-size: 11px; color: #c8c8e0; font-weight: 600; font-family: 'JetBrains Mono',monospace; }
    .art-ext { font-size: 8px; color: #4a4a6c; background: #141428; padding: 1px 5px; border-radius: 4px; border: 1px solid #1e1e36; }
    .art-btns { margin-left: auto; display: flex; gap: 4px; align-items: center; }
    .art-b { display: flex; align-items: center; gap: 3px; padding: 3px 8px; border: 1px solid #1e1e36; border-radius: 5px; font-size: 9px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; background: none; transition: all 0.15s; }
    .art-b.copy { color: #6a6a8a; }  .art-b.copy:hover { color: #818cf8; border-color: #818cf8; }
    .art-b.apply { color: #34d399; border-color: rgba(16,185,129,0.2); }  .art-b.apply:hover { background: rgba(16,185,129,0.08); }
    .art-b.revert { color: #f87171; border-color: rgba(239,68,68,0.2); }
    .art-check { color: #34d399; }
    .art-code { margin: 0; padding: 12px 14px; font-size: 11.5px; color: #c8c8e0; white-space: pre-wrap; font-family: 'JetBrains Mono',monospace; max-height: 280px; overflow-y: auto; line-height: 1.55; background: #060610; }

    /* Diff */
    .art-diff { max-height: 280px; overflow-y: auto; font-family: 'JetBrains Mono',monospace; font-size: 11px; background: #060610; }
    .art-dl { padding: 0 12px; white-space: pre-wrap; word-break: break-all; line-height: 20px; }
    .art-dl .dl-sym { display: inline-block; width: 14px; font-weight: 700; }
    .dl-remove { background: rgba(239,68,68,0.05); color: #f87171; }
    .dl-add { background: rgba(16,185,129,0.05); color: #34d399; }
    .dl-same { color: #2a2a44; }

    /* Typing */
    .ai-typing { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
    .ai-dots { display: flex; gap: 5px; padding: 8px 0; }
    .ai-dots span { width: 7px; height: 7px; background: #a78bfa; border-radius: 50%; animation: bounce 1.2s infinite; }
    .ai-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ai-dots span:nth-child(3) { animation-delay: 0.4s; }

    /* Streaming cursor */
    .ai-streaming { display: inline; }
    .ai-cursor {
      display: inline-block; width: 2px; height: 14px; background: #a78bfa;
      margin-left: 1px; vertical-align: text-bottom;
      animation: blink 0.8s step-end infinite;
    }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* Input */
    .ai-input-bar { display: flex; align-items: flex-end; gap: 8px; padding: 10px 14px; border-top: 1px solid #1e1e36; background: #0a0a18; flex-shrink: 0; }
    .ai-input-field { flex: 1; background: #060610; border: 1px solid #1e1e36; border-radius: 10px; color: #e0e0f0; font-size: 12.5px; padding: 10px 14px; resize: none; outline: none; font-family: 'Inter',sans-serif; max-height: 100px; min-height: 40px; line-height: 1.4; transition: border-color 0.15s; }
    .ai-input-field:focus { border-color: rgba(129,140,248,0.4); }
    .ai-input-field::placeholder { color: #3a3a5c; }
    .ai-send { width: 40px; height: 40px; background: linear-gradient(135deg,#6366f1,#a78bfa); border: none; border-radius: 10px; color: #fff; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .ai-send:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
    .ai-send:disabled { opacity: 0.3; cursor: not-allowed; }

    .ai-icon.active { color: #a78bfa !important; border-left-color: #a78bfa !important; background: rgba(167,139,250,0.08) !important; }

    /* CONTEXT MENU */
    .ctx-menu {
      position: fixed; z-index: 9999; background: #141428; border: 1px solid #1e1e36;
      border-radius: 10px; padding: 4px; min-width: 210px; box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2);
      animation: ctxIn 0.12s ease; backdrop-filter: blur(12px);
    }
    @keyframes ctxIn { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: none; } }
    .ctx-item {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 12px; background: none;
      border: none; border-radius: 6px; color: #8888a8; font-size: 12px; cursor: pointer; font-family: 'Inter',sans-serif;
      text-align: left; transition: all 0.1s;
    }
    .ctx-item svg { flex-shrink: 0; color: #4a4a6c; transition: color 0.1s; }
    .ctx-item:hover { background: rgba(99,102,241,0.08); color: #e0e0f0; }
    .ctx-item:hover svg { color: #818cf8; }
    .ctx-item.danger { color: #f87171; }
    .ctx-item.danger svg { color: #f87171; }
    .ctx-item.danger:hover { background: rgba(239,68,68,0.08); }
    .ctx-divider { height: 1px; background: #1e1e36; margin: 3px 6px; }

    .path-section { display: flex; align-items: center; gap: 8px; flex-shrink: 1; min-width: 0; overflow: hidden; }
    .path-label { font-size: 10px; color: #8888a8; white-space: nowrap; }

    @media (max-width: 768px) {
      .sidebar { width: 180px; } .sidebar.collapsed { width: 32px; }
      .stat-pills { display: none; }
      .tab-meta { display: none; }
      .path-section { display: none; }
    }
  `]
})
export class ScannerIdeComponent implements OnInit, AfterViewChecked {
  @ViewChild('codeEditor') codeEditor!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('highlightEl') highlightEl!: ElementRef<HTMLPreElement>;
  @ViewChild('gutterEl') gutterEl!: ElementRef<HTMLDivElement>;
  @ViewChild('terminalEl') terminalEl!: ElementRef<HTMLDivElement>;
  @ViewChild('folderPicker') folderPicker!: ElementRef<HTMLInputElement>;

  sidebarCollapsed = false;
  bottomPanelOpen = true;
  bottomPanelHeight = 220;
  bottomTab: 'terminal' | 'problems' | 'debug' = 'terminal';
  editedCode = '';
  highlightedCode = '';
  terminalInput = '';
  ctxMenu = { show: false, x: 0, y: 0, node: null as FolderNode | null };
  cursorLine = 1;
  aiPanelOpen = true;
  aiIssue = '';
  editorDiffMode = false;
  editorDiffLines: { type: string; lineNum: number; text: string }[] = [];
  editorOriginalCode = '';
  editorDiffFile = '';
  showNewFileInput = false;
  showNewFolderInput = false;
  newItemName = '';
  ctxTargetPath = '';
  cursorCol = 1;
  copied = false;
  showTrustDialog = false;
  pendingFolderName = '';
  folderScanning = false;
  showNewProjectDialog = false;
  newProjectName = '';
  newProjectPath = '';
  // Source control state
  scPanelOpen = false;
  commitMessage = '';
  remoteUrl = '';
  gitStatusMsg = '';
  gitStatusError = false;
  private pendingFileArray: File[] = [];

  report: Signal<ProjectReport | null>;
  selectedFile: Signal<ProjectFile | null>;
  issueMapSignal: Signal<Record<number, FileIssue>>;
  gutterLines: Signal<number[]>;

  private resizing = false;
  private shouldScrollTerminal = false;
  private lastTerminalCount = 0;

  constructor(
    public scanner: ProjectScannerService,
    public runner: CodeRunnerService,
    private router: Router,
    private highlighter: SyntaxHighlightService,
    public ai: AIEngineService,
    public fs: FileSystemService,
    public git: GitService,
    private cdr: ChangeDetectorRef
  ) {
    this.report = this.scanner.report;

    this.selectedFile = computed(() => {
      const path = this.scanner.selectedFilePath();
      const r = this.scanner.report();
      if (!path || !r) return null;
      return r.files.find(f => f.path === path) || null;
    });

    this.issueMapSignal = computed(() => {
      const file = this.selectedFile();
      if (!file) return {};
      const map: Record<number, FileIssue> = {};
      for (const iss of file.issues) {
        if (iss.line > 0 && !map[iss.line]) map[iss.line] = iss;
      }
      return map;
    });

    this.gutterLines = computed(() => {
      const count = this.editedCode.split('\n').length;
      return Array.from({ length: count }, (_, i) => i);
    });

    // React whenever selected file OR report changes (via click OR programmatic AI enhancement/scaffold)
    effect(() => {
      const file = this.selectedFile();
      const pendingMap = this.scanner.pendingDiffs();
      // Also read report signal to re-run when report changes even if same file path
      const _report = this.scanner.report();
      if (!file) return;

      // Force sync editor content from the latest file data
      this.editedCode = file.content;
      this.updateHighlight(file.extension);

      // Check if this file has a pending enhancement diff → show green/red highlights
      const original = pendingMap.get(file.path);
      if (original && original !== file.content) {
        this.editorOriginalCode = original;
        this.editorDiffFile = file.path;
        this.editorDiffLines = this.ai.calculateDiff(original, file.content);
        this.editorDiffMode = true;
      } else if (this.editorDiffFile === file.path && !original) {
        // Diff was accepted/cleared → exit diff mode
        this.editorDiffMode = false;
      }
    });
  }

  ngOnInit(): void {
    // Attach copy-button listener immediately (works even before any chat message renders)
    this.ensureCopyListener();

    if (!this.scanner.report()) {
      // No project loaded — sidebar shows "Open Folder" button automatically
      return;
    }
    const file = this.selectedFile();
    if (file) { this.editedCode = file.content; this.updateHighlight(file.extension); }
  }

  goHome(): void { this.router.navigate(['/']); }
  goIssues(sev: string): void { this.router.navigate(['/scanner/issues', sev]); }

  openFolderDialog(): void {
    // Trigger native folder picker
    this.folderPicker?.nativeElement?.click();
  }

  onNativeFolderSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    // Copy file references BEFORE anything can clear the input
    const fileArray = Array.from(input.files);

    // Get folder name from first file's relative path
    const firstFile = fileArray[0] as any;
    const relPath = firstFile.webkitRelativePath || firstFile.name || '';
    const folderName = relPath.split('/')[0] || 'project';

    // Store as array (FileList gets cleared when input resets)
    this.pendingFolderName = folderName;
    this.pendingFileArray = fileArray;
    this.showTrustDialog = true;

    // Reset input so same folder can be re-selected later
    input.value = '';
  }

  async confirmTrust(): Promise<void> {
    this.showTrustDialog = false;
    const fileArray = this.pendingFileArray;
    const folderName = this.pendingFolderName;
    this.pendingFileArray = [];

    if (fileArray.length === 0) return;

    this.folderScanning = true;
    this.cdr.detectChanges();

    // Small delay so spinner renders before blocking scan
    await new Promise(r => setTimeout(r, 50));

    try {
      // Scan the folder
      let report;
      if (fileArray.length === 0) {
        report = this.scanner.createEmptyReport(folderName);
      } else {
        report = await this.scanner.scanFiles(fileArray);
      }

      this.scanner.report.set(report);
      this.scanner.selectedFilePath.set(null);
      this.cdr.detectChanges();

      // Try to find the project path on disk for terminal
      try {
        const foundPath = await this.runner.cdToProjectByName(folderName);
        if (foundPath) {
          this.scanner.projectBasePath.set(foundPath);
        }
      } catch {}

      // Open first file if available
      if (report.files.length > 0) {
        this.scanner.selectedFilePath.set(report.files[0].path);
        this.editedCode = report.files[0].content;
        this.updateHighlight(report.files[0].extension);
      }

      // Inject scanner + project path into AI engine
      this.ai.injectScanner(this.scanner);
      this.ai.projectBasePath = this.scanner.projectBasePath() || '';
    } finally {
      this.folderScanning = false;
      this.cdr.detectChanges();
    }
  }

  cancelTrust(): void {
    this.showTrustDialog = false;
    this.pendingFileArray = [];
    this.pendingFolderName = '';
  }

  async createEmptyProject(): Promise<void> {
    const name = this.newProjectName.trim();
    const diskPath = this.newProjectPath.trim();
    if (!name) return;

    let fullPath = '';

    // If user provided a path, create the folder on disk
    if (diskPath) {
      // Normalize — append project name if not already included
      fullPath = diskPath.replace(/[/\\]+$/, '');
      if (!fullPath.toLowerCase().endsWith(name.toLowerCase())) {
        fullPath = fullPath + (fullPath.includes('\\') ? '\\' : '/') + name;
      }
      const ok = await this.fs.createFolder(fullPath);
      if (ok) {
        this.runner.addLine('info', `Created folder on disk: ${fullPath}`);
      } else {
        this.runner.addLine('stderr', `Failed to create folder on disk. Is the backend running? Continuing in memory.`);
        fullPath = '';
      }
    }

    // Create in-memory workspace
    const report = this.scanner.createEmptyReport(name);
    this.scanner.report.set(report);
    this.scanner.selectedFilePath.set(null);
    this.scanner.projectBasePath.set(fullPath);
    if (fullPath) this.runner.cdTo(fullPath);
    this.showNewProjectDialog = false;
    this.newProjectName = '';
    this.newProjectPath = '';
    this.cdr.detectChanges();

    // Inject scanner into AI so it can scaffold
    this.ai.injectScanner(this.scanner);
    this.aiPanelOpen = true;
  }

  // ===== SOURCE CONTROL =====

  toggleSourceControl(): void {
    this.scPanelOpen = !this.scPanelOpen;
    if (this.scPanelOpen) {
      this.sidebarCollapsed = true; // collapse explorer to make room
      this.refreshGit();
    } else {
      this.sidebarCollapsed = false;
    }
  }

  async refreshGit(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) {
      this.gitStatusMsg = 'Open a folder on disk first (New Empty Project with a disk path)';
      this.gitStatusError = true;
      return;
    }
    this.gitStatusMsg = '';
    await this.git.refresh(cwd);
  }

  async initGit(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    const ok = await this.git.init(cwd);
    this.showGitMessage(ok ? 'Initialized git repo' : 'Init failed', !ok);
    await this.refreshGit();
  }

  stagedFiles() {
    return this.git.status()?.files.filter(f => f.staged) || [];
  }

  unstagedFiles() {
    return this.git.status()?.files.filter(f => !f.staged) || [];
  }

  hasUnstaged(): boolean {
    return this.unstagedFiles().length > 0;
  }

  hasUpstream(): boolean {
    const s = this.git.status();
    return !!(s?.remote && (s.ahead > 0 || s.behind > 0 || (s.ahead === 0 && s.behind === 0)));
  }

  shortRemote(): string {
    const r = this.git.status()?.remote || '';
    const m = r.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
    return m ? m[1] : r;
  }

  statusLetter(status: string): string {
    const map: Record<string, string> = { modified: 'M', added: 'A', deleted: 'D', untracked: 'U', renamed: 'R', conflict: 'C' };
    return map[status] || '?';
  }

  async doStage(file: string): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    await this.git.stage(cwd, [file]);
    await this.refreshGit();
  }

  async doStageAll(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    await this.git.stage(cwd);
    await this.refreshGit();
  }

  async doUnstage(file: string): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    await this.git.unstage(cwd, [file]);
    await this.refreshGit();
  }

  async doUnstageAll(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    await this.git.unstage(cwd);
    await this.refreshGit();
  }

  async doDiscard(file: string): Promise<void> {
    if (!confirm(`Discard changes in ${file}?`)) return;
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    await this.git.discard(cwd, file);
    await this.refreshGit();
  }

  async doCommit(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd || !this.commitMessage.trim()) return;

    // Auto-stage if nothing staged
    if (this.stagedFiles().length === 0) {
      await this.git.stage(cwd);
    }

    const res = await this.git.commit(
      cwd,
      this.commitMessage.trim(),
      'IDE User',
      'ide-user@local'
    );

    if (res.ok) {
      this.showGitMessage(`Committed: "${this.commitMessage.trim().slice(0, 50)}"`);
      this.commitMessage = '';
    } else {
      this.showGitMessage(res.error || 'Commit failed', true);
    }
    await this.refreshGit();
  }

  async doPush(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    this.showGitMessage('Pushing...');
    const res = await this.git.push(cwd);
    this.showGitMessage(res.ok ? 'Pushed successfully' : (res.error || 'Push failed'), !res.ok);
    await this.refreshGit();
  }

  async doPushUpstream(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    this.showGitMessage('Pushing (with upstream)...');
    const branch = this.git.status()?.branch || 'main';
    const res = await this.git.push(cwd, 'origin', branch, true);
    this.showGitMessage(res.ok ? 'Pushed & set upstream' : (res.error || 'Push failed'), !res.ok);
    await this.refreshGit();
  }

  async doPull(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd) return;
    this.showGitMessage('Pulling...');
    const branch = this.git.status()?.branch || 'main';
    const res = await this.git.pull(cwd, 'origin', branch);
    this.showGitMessage(res.ok ? 'Pulled' : (res.error || 'Pull failed'), !res.ok);
    await this.refreshGit();
  }

  async addRemote(): Promise<void> {
    const cwd = this.scanner.projectBasePath();
    if (!cwd || !this.remoteUrl.trim()) return;
    const ok = await this.git.addRemote(cwd, 'origin', this.remoteUrl.trim());
    this.showGitMessage(ok ? 'Remote added' : 'Failed to add remote', !ok);
    if (ok) this.remoteUrl = '';
    await this.refreshGit();
  }

  openGitFile(path: string): void {
    // Try to find the file in the scanner and open it
    const cwd = this.scanner.projectBasePath();
    const report = this.scanner.report();
    if (!report) return;
    const folderName = report.tree?.name || '';
    const match = report.files.find(f =>
      f.path === folderName + '/' + path ||
      f.path.endsWith('/' + path) ||
      f.path === path
    );
    if (match) this.scanner.selectedFilePath.set(match.path);
  }

  private showGitMessage(msg: string, error = false): void {
    this.gitStatusMsg = msg;
    this.gitStatusError = error;
    setTimeout(() => { if (this.gitStatusMsg === msg) this.gitStatusMsg = ''; }, 4000);
  }

  private async findBackendPort(): Promise<number> {
    for (let p = 4100; p <= 4106; p++) {
      try {
        const r = await fetch(`http://localhost:${p}/api/health`);
        if (r.ok) return p;
      } catch {}
    }
    return 4100;
  }

  /** Get full filesystem path for a tree node */
  getNodeFullPath(node: FolderNode): string {
    const base = this.scanner.projectBasePath();
    if (!base) return node.path;
    const parts = node.path.split('/');
    const subPath = parts.slice(1).join('/');
    if (!subPath) return base;
    return base + '\\' + subPath.replace(/\//g, '\\');
  }

  onTreeRightClick(event: MouseEvent, node: FolderNode): void {
    event.preventDefault();
    event.stopPropagation();
    this.ctxMenu = { show: true, x: event.clientX, y: event.clientY, node };
    // Close on click anywhere
    const close = () => { this.ctxMenu.show = false; document.removeEventListener('click', close); };
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  ctxOpenTerminal(): void {
    if (!this.ctxMenu.node) return;
    const node = this.ctxMenu.node;
    let folderPath: string;
    if (node.type === 'folder') {
      folderPath = this.getNodeFullPath(node);
    } else {
      const parts = node.path.split('/');
      parts.pop();
      const parentNode = { ...node, path: parts.join('/') } as FolderNode;
      folderPath = this.getNodeFullPath(parentNode);
    }

    // Open a new terminal tab at that folder
    this.addTerminal(folderPath);
    this.ctxMenu.show = false;
  }

  ctxOpenFile(): void {
    if (!this.ctxMenu.node || this.ctxMenu.node.type !== 'file') return;
    this.scanner.selectedFilePath.set(this.ctxMenu.node.path);
    const file = this.scanner.report()?.files.find(f => f.path === this.ctxMenu.node!.path);
    if (file) { this.editedCode = file.content; this.updateHighlight(file.extension); }
    this.ctxMenu.show = false;
  }

  ctxCopyPath(): void {
    if (!this.ctxMenu.node) return;
    const fullPath = this.getNodeFullPath(this.ctxMenu.node);
    navigator.clipboard.writeText(fullPath).then(() => {
      this.runner.addLine('info', `Copied: ${fullPath}`);
    });
    this.ctxMenu.show = false;
  }

  ctxRunFile(): void {
    if (!this.ctxMenu.node || this.ctxMenu.node.type !== 'file') return;
    this.ctxOpenFile();
    setTimeout(() => this.runFile(), 100);
    this.ctxMenu.show = false;
  }

  async ctxDelete(): Promise<void> {
    if (!this.ctxMenu.node) return;
    const node = this.ctxMenu.node;
    const fullPath = this.getNodeFullPath(node);
    const name = node.name;

    // Delete from disk
    if (this.scanner.projectBasePath() && this.fs.connected()) {
      const ok = await this.fs.deleteItem(fullPath);
      if (ok) {
        this.runner.addLine('info', `Deleted: ${fullPath}`);
      } else {
        this.runner.addLine('stderr', `Failed to delete: ${fullPath}`);
        this.ctxMenu.show = false;
        return;
      }
    }

    // Remove from explorer tree
    this.scanner.removeFromReport(node.path);

    // If the deleted file was open, clear the editor
    if (this.scanner.selectedFilePath() === node.path) {
      this.scanner.selectedFilePath.set(null);
      this.editedCode = '';
      this.highlightedCode = '';
    }

    this.ctxMenu.show = false;
  }

  onNodeClick(node: FolderNode): void {
    if (node.type === 'folder') {
      node.expanded = !node.expanded;
    } else {
      this.scanner.selectedFilePath.set(node.path);
      const file = this.scanner.report()?.files.find(f => f.path === node.path);
      if (file) {
        this.editedCode = file.content;
        this.updateHighlight(file.extension);
        this.runner.clearBreakpoints();
        // Auto-show diff if there's a pending enhancement for this file
        this.checkPendingDiff(file);
      }
    }
  }

  diffAddedCount(): number {
    return this.editorDiffLines.filter(l => l.type === 'add').length;
  }
  diffRemovedCount(): number {
    return this.editorDiffLines.filter(l => l.type === 'remove').length;
  }

  /** If this file has a pending enhancement diff, open the diff view. */
  checkPendingDiff(file: ProjectFile): void {
    const original = this.scanner.getPendingOriginal(file.path);
    if (original && original !== file.content) {
      this.editorOriginalCode = original;
      this.editorDiffFile = file.path;
      this.editorDiffLines = this.ai.calculateDiff(original, file.content);
      this.editorDiffMode = true;
    } else {
      this.editorDiffMode = false;
    }
  }

  closeFile(): void {
    this.scanner.selectedFilePath.set(null);
    this.editedCode = '';
  }

  onCodeChange(event: Event): void {
    this.editedCode = (event.target as HTMLTextAreaElement).value;
    this.updateHighlight();
    this.updateCursorPos();
  }

  onEditorKeydown(event: KeyboardEvent): void {
    const textarea = event.target as HTMLTextAreaElement;

    // Tab key -> insert 2 spaces
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      textarea.value = val.substring(0, start) + '  ' + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      this.editedCode = textarea.value;
      this.updateHighlight();
    }

    // Ctrl+Enter -> Run
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (this.isRunnable()) this.runFile();
    }

    // Ctrl+S -> prevent default (no save needed)
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.runner.addLine('info', 'Changes saved in memory');
    }

    setTimeout(() => this.updateCursorPos(), 0);
  }

  updateCursorPos(): void {
    if (!this.codeEditor?.nativeElement) return;
    const ta = this.codeEditor.nativeElement;
    const text = ta.value.substring(0, ta.selectionStart);
    const lines = text.split('\n');
    this.cursorLine = lines.length;
    this.cursorCol = lines[lines.length - 1].length + 1;
  }

  syncScroll(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    if (this.gutterEl?.nativeElement) {
      this.gutterEl.nativeElement.scrollTop = ta.scrollTop;
    }
    if (this.highlightEl?.nativeElement) {
      this.highlightEl.nativeElement.scrollTop = ta.scrollTop;
      this.highlightEl.nativeElement.scrollLeft = ta.scrollLeft;
    }
  }

  onGutterClick(line: number): void {
    this.runner.toggleBreakpoint(line);
  }

  getIssueSev(line: number): string | null {
    const map = this.issueMapSignal();
    return map[line]?.severity || null;
  }

  isRunnable(): boolean {
    const file = this.selectedFile();
    if (!file) return false;
    return ['js', 'ts', 'jsx', 'tsx'].includes(file.extension);
  }

  async runFile(): Promise<void> {
    this.bottomPanelOpen = true;
    this.bottomTab = 'terminal';
    const file = this.selectedFile();
    // If connected and we have the project path, run the actual file via node
    if (this.runner.connected() && this.scanner.projectBasePath() && file) {
      const filePath = this.getNodeFullPath({ path: file.path, name: file.name, type: 'file', extension: file.extension, children: [], issues: 0, expanded: false });
      this.runner.sendCommand(`node "${filePath}"`);
      return;
    }
    await this.runner.runCode(this.editedCode);
  }

  async debugFile(): Promise<void> {
    this.bottomPanelOpen = true;
    this.bottomTab = 'debug';
    await this.runner.debugCode(this.editedCode);
  }

  executeTerminal(): void {
    if (!this.terminalInput.trim()) return;
    this.runner.sendCommand(this.terminalInput);
    this.terminalInput = '';
  }

  onCtrlC(event: Event): void {
    event.preventDefault();
    if (this.runner.commandRunning()) {
      this.runner.killProcess();
    }
  }

  toggleTerminal(): void {
    if (this.bottomPanelOpen && this.bottomTab === 'terminal') {
      this.bottomPanelOpen = false;
    } else {
      this.bottomPanelOpen = true;
      this.bottomTab = 'terminal';
    }
  }

  addTerminal(cwd?: string): void {
    const p = cwd || this.scanner.projectBasePath() || this.runner.cwd() || '';
    this.runner.createSession(p);
    this.bottomPanelOpen = true;
    this.bottomTab = 'terminal';
  }

  closeTerminal(idx: number, event: Event): void {
    event.stopPropagation();
    this.runner.closeSession(idx);
  }

  scrollToLine(line: number): void {
    if (!this.codeEditor?.nativeElement || line <= 0) return;
    const lineHeight = 22;
    this.codeEditor.nativeElement.scrollTop = (line - 1) * lineHeight;
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.resizing = true;
    const startY = event.clientY;
    const startH = this.bottomPanelHeight;

    const onMove = (e: MouseEvent) => {
      if (!this.resizing) return;
      const delta = startY - e.clientY;
      this.bottomPanelHeight = Math.max(100, Math.min(500, startH + delta));
    };
    const onUp = () => {
      this.resizing = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  getBreakpointList(): number[] {
    return Array.from(this.runner.breakpoints().keys()).sort((a, b) => a - b);
  }

  copyFile(): void {
    navigator.clipboard.writeText(this.editedCode).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  getExtLabel(ext: string): string {
    const m: Record<string, string> = {
      ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX', html: 'HTM', css: 'CSS', scss: 'SCS',
      json: 'JSON', py: 'PY', java: 'JV', go: 'GO', rs: 'RS', rb: 'RB', php: 'PHP',
      vue: 'VUE', svelte: 'SV', md: 'MD', sql: 'SQL', sh: 'SH', bat: 'BAT',
      yaml: 'YML', yml: 'YML', xml: 'XML', env: 'ENV', txt: 'TXT',
      gitignore: 'GIT', dockerignore: 'DOC'
    };
    return m[ext] || ext.toUpperCase().slice(0, 3) || 'F';
  }

  getExtColor(ext: string): string {
    const m: Record<string, string> = {
      ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
      html: '#e44d26', css: '#264de4', scss: '#c6538c',
      json: '#5b5ea6', py: '#3776ab', java: '#ed8b00', go: '#00add8',
      rs: '#dea584', rb: '#cc342d', php: '#777bb4',
      vue: '#41b883', svelte: '#ff3e00', md: '#555',
      sql: '#e38c00', sh: '#4eaa25', bat: '#c1f12e',
      yaml: '#cb171e', yml: '#cb171e', xml: '#f06529',
      env: '#ecd53f', txt: '#888', gitignore: '#f05032'
    };
    return m[ext] || '#666';
  }

  getExtText(ext: string): string {
    // Dark text for bright backgrounds
    const dark = new Set(['js', 'jsx', 'java', 'env', 'bat', 'rs', 'yml', 'yaml']);
    return dark.has(ext) ? '#000' : '#fff';
  }

  getFileIcon(ext: string): string {
    return this.getExtLabel(ext);
  }

  private updateHighlight(ext?: string): void {
    const fileExt = ext || this.selectedFile()?.extension || 'txt';
    this.highlightedCode = this.highlighter.highlight(this.editedCode, fileExt) + '\n';
  }

  // ===== AI CHAT =====

  @ViewChild('aiChatEl') aiChatEl!: ElementRef<HTMLDivElement>;

  async aiSend(text?: string): Promise<void> {
    const input = text || this.aiIssue;
    if (!input.trim()) return;
    // Use an empty report if no folder is open — AI still works for Q&A, math, algorithms, etc.
    const report = this.report() || this.scanner.createEmptyReport('workspace');
    this.aiIssue = '';
    this.ai.projectBasePath = this.scanner.projectBasePath();
    this.ai.injectScanner(this.scanner);
    setTimeout(() => this.scrollAiChat(), 50);
    await this.ai.sendMessage(input, report, this.selectedFile() || undefined);
    setTimeout(() => this.scrollAiChat(), 200);

    // Auto-open first file in the editor
    const lastMsg = this.ai.messages().at(-1);
    if (lastMsg?.artifacts?.length) {
      const firstArt = lastMsg.artifacts[0];
      if (firstArt.type === 'diff' && firstArt.file && firstArt.originalContent) {
        this.openDiffInEditor(firstArt.file, firstArt.originalContent, firstArt.content);
      } else if (firstArt.content) {
        // Find the file in the report (AI engine already added it)
        const file = this.scanner.report()?.files.find(f => f.name === firstArt.title || f.path.endsWith('/' + firstArt.title));
        if (file) {
          this.scanner.selectedFilePath.set(file.path);
          this.editedCode = file.content;
          this.editorDiffMode = false;
          this.updateHighlight(file.extension);
        } else {
          // Fallback: show content directly
          this.editedCode = firstArt.content;
          this.editorDiffMode = false;
          const ext = firstArt.language === 'typescript' ? 'ts' : firstArt.language === 'javascript' ? 'js' : firstArt.language;
          this.updateHighlight(ext);
        }
      }
    }
  }

  onAiKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.aiSend();
    }
  }

  trackMsg(index: number, msg: any): string { return msg.id; }

  scrollAiChat(): void {
    if (this.aiChatEl?.nativeElement) {
      this.aiChatEl.nativeElement.scrollTo({ top: this.aiChatEl.nativeElement.scrollHeight, behavior: 'smooth' });
    }
  }

  // Auto-scroll during streaming
  private _scrollInterval: any;
  ngAfterViewChecked(): void {
    // Scroll while streaming
    if (this.ai.streamingId() && this.aiChatEl?.nativeElement) {
      const el = this.aiChatEl.nativeElement;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
        el.scrollTop = el.scrollHeight;
      }
    }
    // Terminal auto-scroll
    const lines = this.runner.terminalLines();
    if (lines.length !== this.lastTerminalCount) {
      this.lastTerminalCount = lines.length;
      if (this.terminalEl?.nativeElement) {
        this.terminalEl.nativeElement.scrollTop = this.terminalEl.nativeElement.scrollHeight;
      }
    }
  }

  /**
   * Parse a message into segments: plain text and fenced code blocks.
   * Each segment renders as a real Angular element with proper bindings.
   */
  parseMessage(text: string): { type: 'text' | 'code'; lang: string; content: string }[] {
    const segments: { type: 'text' | 'code'; lang: string; content: string }[] = [];
    const regex = /```(\w+)?\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', lang: '', content: text.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'code', lang: (match[1] || 'text').toLowerCase(), content: match[2] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ type: 'text', lang: '', content: text.slice(lastIndex) });
    }

    // If no code blocks found, return the whole thing as one text segment
    if (segments.length === 0) {
      segments.push({ type: 'text', lang: '', content: text });
    }

    return segments;
  }

  trackSeg(i: number, seg: { type: string; content: string }): string {
    return seg.type + i + seg.content.slice(0, 20);
  }

  /**
   * Format inline text (no code blocks) — markdown-ish: bold, italic, inline code, headings.
   */
  formatInlineText(text: string): string {
    const escape = (s: string) => s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let out = escape(text);
    out = out
      .replace(/^###\s+(.+)$/gm, '<h3 class="ai-h3">$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2 class="ai-h2">$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1 class="ai-h1">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    return out;
  }

  /**
   * Copy code to clipboard with fallback for non-secure contexts.
   */
  copyToClipboard(text: string, event: Event): void {
    const btn = event.target as HTMLElement;
    const showResult = (ok: boolean) => {
      const original = btn.dataset['origText'] || btn.textContent || 'Copy';
      btn.dataset['origText'] = original;
      btn.textContent = ok ? 'Copied!' : 'Failed';
      btn.classList.toggle('copied', ok);
      btn.classList.toggle('failed', !ok);
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied', 'failed');
      }, 1500);
    };

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => showResult(true)).catch(() => {
        this._fallbackCopy(text, () => showResult(true), () => showResult(false));
      });
    } else {
      this._fallbackCopy(text, () => showResult(true), () => showResult(false));
    }
  }

  formatAiText(text: string): string {
    // 1. First, extract fenced code blocks so we don't mangle them in other replacements.
    //    Replace each block with a placeholder, convert to HTML at the end.
    const blocks: { lang: string; code: string }[] = [];
    let placeholderIdx = 0;
    let working = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_m, lang, code) => {
      const i = placeholderIdx++;
      blocks.push({ lang: (lang || 'text').toLowerCase(), code });
      return `__CODEBLOCK_${i}__`;
    });

    // 2. HTML-escape the rest
    const escape = (s: string) => s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    working = escape(working);

    // 3. Markdown-ish inline formatting on non-code text
    working = working
      // Headings: ### H3, ## H2, # H1
      .replace(/^###\s+(.+)$/gm, '<h3 class="ai-h3">$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2 class="ai-h2">$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1 class="ai-h1">$1</h1>')
      // Bold **x**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Inline code `x`
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      // Italic *x*  (simple, non-greedy)
      .replace(/(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
      // Newlines
      .replace(/\n/g, '<br>');

    // 4. Restore code blocks as <pre> with copy button (event delegation handles click)
    working = working.replace(/__CODEBLOCK_(\d+)__/g, (_m, i) => {
      const { lang, code } = blocks[Number(i)];
      const safeCode = escape(code);
      // Store the raw code in a hidden span so event delegation can retrieve it by index
      const id = `__codeblock_${this._codeBlockCounter++}__`;
      this._codeBlockStore.set(id, code);
      return `<div class="code-block" data-code-id="${id}">
        <div class="code-block-head">
          <span class="code-block-lang">${lang}</span>
          <button class="code-block-copy" type="button" data-copy-for="${id}">Copy</button>
        </div>
        <pre class="code-block-body"><code>${safeCode}</code></pre>
      </div>`;
    });

    return working;
  }

  private _codeBlockCounter = 0;
  private _codeBlockStore = new Map<string, string>();
  private _copyListenerAttached = false;

  /** Attach a single document-level click listener that handles copy buttons anywhere. */
  private ensureCopyListener(): void {
    if (this._copyListenerAttached) return;
    this._copyListenerAttached = true;
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;
      // Button might have descendant text — find the nearest copy button
      const btn = target.closest?.('.code-block-copy') as HTMLElement | null;
      if (!btn) return;
      const id = btn.getAttribute('data-copy-for');
      if (!id) return;
      const code = this._codeBlockStore.get(id);
      if (code === undefined) return;

      event.preventDefault();
      event.stopPropagation();
      this._copyToClipboard(code, btn);
    }, true); // capture phase so other handlers can't block
  }

  /**
   * Copy to clipboard with fallback.
   * Tries modern Clipboard API first; falls back to textarea + execCommand
   * for non-secure contexts (http://192.168.x.x, etc.)
   */
  private _copyToClipboard(text: string, btn: HTMLElement): void {
    const showResult = (ok: boolean) => {
      const original = btn.dataset['origText'] || btn.textContent || 'Copy';
      btn.dataset['origText'] = original;
      btn.textContent = ok ? 'Copied!' : 'Failed';
      btn.classList.toggle('copied', ok);
      btn.classList.toggle('failed', !ok);
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied', 'failed');
      }, 1500);
    };

    // Modern API (requires secure context)
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => showResult(true)).catch(() => {
        // Fall back if API throws
        this._fallbackCopy(text, () => showResult(true), () => showResult(false));
      });
      return;
    }

    // Fallback for insecure contexts
    this._fallbackCopy(text, () => showResult(true), () => showResult(false));
  }

  private _fallbackCopy(text: string, onSuccess: () => void, onFail: () => void): void {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? onSuccess() : onFail();
    } catch {
      onFail();
    }
  }

  /** Kept for backward compatibility; the panel-level handler is still attached in template. */
  onAiPanelClick(_event: Event): void {
    // No-op — actual handling done by the document-level listener below (more reliable).
    this.ensureCopyListener();
  }

  getDiff(art: import('./services/ai-engine.service').Artifact): { type: string; lineNum: number; text: string }[] {
    if (!art.originalContent) return [];
    return this.ai.calculateDiff(art.originalContent, art.content);
  }

  copyArtifact(art: import('./services/ai-engine.service').Artifact): void {
    navigator.clipboard.writeText(art.content);
  }

  async applyArtifact(art: import('./services/ai-engine.service').Artifact): Promise<void> {
    const basePath = this.scanner.projectBasePath();

    // If artifact has a file path in the project, edit it
    if (art.file) {
      const file = this.scanner.report()?.files.find(f => f.path === art.file);
      if (file) {
        this._editOriginals.set(art.file, file.content);
        this.scanner.selectedFilePath.set(art.file);
        this.editedCode = art.content;
        this.updateHighlight(file.extension);
        // Also write to disk if backend connected
        if (basePath && this.fs.connected()) {
          const fullPath = this.getNodeFullPath({ path: art.file, name: '', type: 'file', extension: '', children: [], issues: 0, expanded: false });
          await this.fs.writeFile(fullPath, art.content);
          this.runner.addLine('info', `Written to disk: ${fullPath}`);
        }
      } else if (basePath) {
        // New file — create parent folders and file on disk
        const fullPath = basePath + '\\' + art.title.replace(/\//g, '\\');
        const parts = art.title.replace(/\\/g, '/').split('/');
        if (parts.length > 1) {
          for (let i = 1; i < parts.length; i++) {
            const folderPath = basePath + '\\' + parts.slice(0, i).join('\\');
            await this.fs.createFolder(folderPath);
          }
        }
        await this.fs.writeFile(fullPath, art.content);
        this.runner.addLine('info', `Created: ${fullPath}`);
        // Add to IDE file tree so it appears in explorer
        this.scanner.addFileToReport(fullPath, art.content);
        // Show in editor
        this.editedCode = art.content;
        this.highlightedCode = this.highlighter.highlight(art.content, art.language) + '\n';
      }
    } else if (basePath && art.title) {
      // No file path but has a title — create as new file
      const fullPath = basePath + '\\' + art.title.replace(/\//g, '\\');
      // Create parent folders first
      const parts = art.title.replace(/\\/g, '/').split('/');
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const folderPath = basePath + '\\' + parts.slice(0, i).join('\\');
          await this.fs.createFolder(folderPath);
        }
      }
      await this.fs.writeFile(fullPath, art.content);
      this.runner.addLine('info', `Created: ${fullPath}`);
      // Add to IDE file tree so it appears in explorer
      this.scanner.addFileToReport(fullPath, art.content);
      this.editedCode = art.content;
      this.highlightedCode = this.highlighter.highlight(art.content, art.language) + '\n';
    }
    art.applied = true;
  }

  revertArtifact(art: import('./services/ai-engine.service').Artifact): void {
    if (!art.file) return;
    const original = this._editOriginals.get(art.file);
    if (original && this.selectedFile()?.path === art.file) {
      this.editedCode = original;
      this.updateHighlight();
    }
    art.applied = false;
  }

  private _editOriginals = new Map<string, string>();

  openFileByPath(filePath: string): void {
    const file = this.scanner.report()?.files.find(f => f.path === filePath);
    if (file) {
      this.scanner.selectedFilePath.set(file.path);
      this.editedCode = file.content;
      this.updateHighlight(file.extension);
    }
  }

  openFileAtLine(filePath: string, line: number): void {
    this.openFileByPath(filePath);
    setTimeout(() => this.scrollToLine(line), 100);
  }

  // ===== DIFF EDITOR MODE =====

  openDiffInEditor(filePath: string, originalCode: string, newCode: string): void {
    this.editorDiffMode = true;
    this.editorOriginalCode = originalCode;
    this.editorDiffFile = filePath;
    this.editedCode = newCode;
    this.editorDiffLines = this.ai.calculateDiff(originalCode, newCode);

    // Also open the file in the editor selection
    const file = this.scanner.report()?.files.find(f => f.path === filePath);
    if (file) this.scanner.selectedFilePath.set(file.path);
  }

  openNewCodeInEditor(title: string, content: string, language: string): void {
    this.editorDiffMode = false;
    this.editedCode = content;
    this.updateHighlight(language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language);
  }

  async acceptDiff(): Promise<void> {
    const filePath = this.editorDiffFile;
    // Apply new code to editor
    this.editorDiffMode = false;
    this.updateHighlight();

    // Clear pending diff (so reselecting the file won't re-open the diff view)
    if (filePath) this.scanner.acceptPendingDiff(filePath);

    // Write to disk if connected (enhancement applied already wrote, but re-save in case user edited)
    const basePath = this.scanner.projectBasePath();
    if (basePath && this.fs.connected() && filePath) {
      const file = this.scanner.report()?.files.find(f => f.path === filePath);
      if (file) {
        const fullPath = this.getNodeFullPath({ path: file.path, name: file.name, type: 'file', extension: file.extension, children: [], issues: 0, expanded: false });
        await this.fs.writeFile(fullPath, this.editedCode);
        this.runner.addLine('info', `Accepted & saved: ${fullPath}`);
      }
    }
    this.editorDiffFile = '';
    this.editorOriginalCode = '';
  }

  async rejectDiff(): Promise<void> {
    const filePath = this.editorDiffFile;
    const original = this.editorOriginalCode;
    // Revert in editor
    this.editedCode = original;
    this.editorDiffMode = false;
    this.updateHighlight();

    // Revert in scanner (report.files)
    if (filePath && original) {
      const report = this.scanner.report();
      if (report) {
        const updated = report.files.map(f => f.path === filePath ? { ...f, content: original, size: original.length } : f);
        const tree = this.scanner.buildTree(updated);
        if (report.tree?.name) { tree.name = report.tree.name; tree.path = report.tree.path; }
        this.scanner.report.set({ ...report, files: updated, tree });
      }
      // Revert on disk
      const basePath = this.scanner.projectBasePath();
      if (basePath && this.fs.connected()) {
        const file = this.scanner.report()?.files.find(f => f.path === filePath);
        if (file) {
          const fullPath = this.getNodeFullPath({ path: file.path, name: file.name, type: 'file', extension: file.extension, children: [], issues: 0, expanded: false });
          await this.fs.writeFile(fullPath, original);
          this.runner.addLine('info', `Reverted: ${fullPath}`);
        }
      }
      this.scanner.acceptPendingDiff(filePath); // clear the pending diff marker
    }
    this.editorDiffFile = '';
    this.editorOriginalCode = '';
  }

  closeDiff(): void {
    // Keep new code but exit diff view
    this.editorDiffMode = false;
    this.updateHighlight();
  }

  // ===== FILE/FOLDER CREATION =====

  async createNewFile(): Promise<void> {
    if (!this.newItemName.trim()) return;
    const basePath = this.scanner.projectBasePath();
    if (!basePath) { this.runner.addLine('warn', 'Set project path first'); return; }
    const fullPath = basePath + '\\' + this.newItemName.trim().replace(/\//g, '\\');
    const ok = await this.fs.writeFile(fullPath, '');
    if (ok) {
      this.runner.addLine('info', `Created: ${fullPath}`);
      // Open in editor
      this.editedCode = '';
      this.highlightedCode = '';
    } else {
      this.runner.addLine('stderr', `Failed to create: ${fullPath}`);
    }
    this.showNewFileInput = false;
    this.newItemName = '';
  }

  async createNewFolder(): Promise<void> {
    if (!this.newItemName.trim()) return;
    const basePath = this.scanner.projectBasePath();
    if (!basePath) { this.runner.addLine('warn', 'Set project path first'); return; }
    const fullPath = basePath + '\\' + this.newItemName.trim().replace(/\//g, '\\');
    const ok = await this.fs.createFolder(fullPath);
    if (ok) {
      this.runner.addLine('info', `Created folder: ${fullPath}`);
    } else {
      this.runner.addLine('stderr', `Failed to create folder: ${fullPath}`);
    }
    this.showNewFolderInput = false;
    this.newItemName = '';
  }

  ctxNewFile(): void {
    if (!this.ctxMenu.node) return;
    const node = this.ctxMenu.node;
    const folderPath = node.type === 'folder' ? this.getNodeFullPath(node) : this.getNodeFullPath({ ...node, path: node.path.split('/').slice(0, -1).join('/') } as any);
    this.ctxTargetPath = folderPath;
    this.newItemName = '';
    this.showNewFileInput = true;
    this.ctxMenu.show = false;
    // Override the base path temporarily for creation
    if (folderPath) {
      const origBase = this.scanner.projectBasePath();
      this.scanner.projectBasePath.set(folderPath);
      // Reset after creation
      setTimeout(() => this.scanner.projectBasePath.set(origBase), 100);
    }
  }

  ctxNewFolder(): void {
    if (!this.ctxMenu.node) return;
    const node = this.ctxMenu.node;
    const folderPath = node.type === 'folder' ? this.getNodeFullPath(node) : this.getNodeFullPath({ ...node, path: node.path.split('/').slice(0, -1).join('/') } as any);
    this.ctxTargetPath = folderPath;
    this.newItemName = '';
    this.showNewFolderInput = true;
    this.ctxMenu.show = false;
    if (folderPath) {
      const origBase = this.scanner.projectBasePath();
      this.scanner.projectBasePath.set(folderPath);
      setTimeout(() => this.scanner.projectBasePath.set(origBase), 100);
    }
  }
}
