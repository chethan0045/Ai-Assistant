import { Component, OnInit, computed, Signal, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, effect, HostBinding, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ProjectScannerService, ProjectReport, ProjectFile, FolderNode, FileIssue } from './services/project-scanner.service';
import { CodeRunnerService } from './services/code-runner.service';
import { SyntaxHighlightService } from './services/syntax-highlight.service';
import { AIEngineService } from './services/ai-engine.service';
import { FileSystemService } from './services/file-system.service';
import { GitService } from './services/git.service';
import { ThemeService } from './services/theme.service';
import { SearchService, SearchHit } from './services/search.service';

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
        <button class="pill defect-pill click" (click)="goDefects()" title="View defects dashboard">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Defects
        </button>
      </div>
      <button class="theme-toggle" (click)="toggleTheme()" [title]="darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
        <svg *ngIf="darkMode" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg *ngIf="!darkMode" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>

    <!-- MAIN LAYOUT -->
    <div class="ide-body">
      <!-- ACTIVITY BAR -->
      <div class="activity-bar">
        <img class="ab-brand" src="assets/ai-logo-transparent.png" alt="AI Assistant" title="AI Assistant" />
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <!-- Sketched A-mascot outline with tail curl -->
            <path d="M4 20 C 5 11 8 3.5 12 2.5 C 16 3.5 19 11 20 20 C 18.5 20 16.5 19 15 20 L 14 21.5 C 13 20.5 11.5 20 10.5 20.5"/>
            <!-- Face bubble -->
            <rect x="8.5" y="9.5" width="7" height="5" rx="2.3"/>
            <!-- Smiling eyes -->
            <path d="M10.3 12 Q 11 12.8 11.7 12"/>
            <path d="M12.3 12 Q 13 12.8 13.7 12"/>
            <!-- Sparkle (filled 4-point star) -->
            <path d="M20.5 3.5 L 21 5.5 L 23 6 L 21 6.5 L 20.5 8.5 L 20 6.5 L 18 6 L 20 5.5 Z" fill="currentColor" stroke="none"/>
          </svg>
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
            <p class="open-folder-hint">
              <ng-container *ngIf="scanner.scanProgress().total > 0; else scanStarting">
                Scanning folder... {{ scanner.scanProgress().current }} / {{ scanner.scanProgress().total }} files
              </ng-container>
              <ng-template #scanStarting>Scanning folder...</ng-template>
            </p>
            <div class="scan-bar" *ngIf="scanner.scanProgress().total > 0">
              <div class="scan-bar-fill" [style.width.%]="(scanner.scanProgress().current / scanner.scanProgress().total) * 100"></div>
            </div>
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

      <!-- FOLDER-COLLECTING OVERLAY (FSA walk — runs before the trust dialog) -->
      <div class="trust-overlay" *ngIf="folderCollecting">
        <div class="trust-card">
          <div class="scan-spinner"></div>
          <h2>Reading folder...</h2>
          <p class="trust-folder-name">{{ fs.collectProgress().count | number }} files found</p>
          <p class="trust-desc">Walking the folder tree (skipping node_modules, .git, test artifacts, etc.). Large folders are capped at 10 000 files — you'll see a warning if we hit that.</p>
        </div>
      </div>

      <!-- TRUST FOLDER OVERLAY -->
      <div class="trust-overlay" *ngIf="showTrustDialog">
        <div class="trust-card">
          <div class="trust-icon">&#128274;</div>
          <h2>Do you trust the authors of this folder?</h2>
          <p class="trust-folder-name">{{ pendingFolderName }} &middot; {{ pendingFileArray.length | number }} files</p>
          <div class="trust-warn" *ngIf="folderTruncated">
            &#9888;&#65039; File count was capped at 10 000. Some files are not loaded. Open a smaller subfolder if you need everything.
          </div>
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
            <img class="nf-logo" src="assets/ai-logo.jpeg" alt="AI Assistant" />
            <p>Open a folder to start</p>
            <button class="open-folder-btn-center" (click)="openFolderDialog()">Open Folder</button>
          </div>
          <!-- Project loaded but no file selected -->
          <div class="no-file" *ngIf="!selectedFile() && report()">
            <img class="nf-logo" src="assets/ai-logo.jpeg" alt="AI Assistant" />
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
            <button class="bp-tab" [class.active]="bottomTab === 'search'" (click)="openSearchTab()">
              Search
              <span class="bp-badge" *ngIf="searchResults().count > 0">{{ searchResults().count }}</span>
            </button>
            <button class="bp-tab" [class.active]="bottomTab === 'preview'" (click)="bottomTab = 'preview'">
              Preview
            </button>
            <div class="bp-tab-actions">
              <button class="bp-act" (click)="addTerminal()" *ngIf="bottomTab === 'terminal'" title="New Terminal">+</button>
              <button class="bp-act" (click)="runner.clearTerminal()" *ngIf="bottomTab === 'terminal'" title="Clear">&#128465;</button>
              <button class="bp-act" (click)="reloadPreview()" *ngIf="bottomTab === 'preview'" title="Reload preview">&#8634;</button>
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

          <!-- Global search -->
          <div class="bp-content search-content" *ngIf="bottomTab === 'search'">
            <div class="search-bar">
              <input class="search-input"
                     [(ngModel)]="searchQuery"
                     (keydown.enter)="runSearch()"
                     placeholder="Search across project..."
                     spellcheck="false" />
              <label class="search-opt" title="Case-sensitive">
                <input type="checkbox" [(ngModel)]="searchCase" /> Aa
              </label>
              <label class="search-opt" title="Treat as regex">
                <input type="checkbox" [(ngModel)]="searchRegex" /> .*
              </label>
              <button class="search-go" (click)="runSearch()" [disabled]="searchRunning()">
                {{ searchRunning() ? '...' : 'Find' }}
              </button>
            </div>
            <div class="search-body">
              <div class="search-summary" *ngIf="searchResults().query">
                {{ searchResults().count }} {{ searchResults().count === 1 ? 'match' : 'matches' }}
                for <strong>"{{ searchResults().query }}"</strong>
                <span *ngIf="searchResults().count >= 200"> (capped)</span>
              </div>
              <div class="search-empty" *ngIf="searchResults().query && searchResults().count === 0">
                No matches.
              </div>
              <div class="search-hit" *ngFor="let h of searchResults().results" (click)="openSearchHit(h)">
                <span class="sh-path">{{ h.path }}</span>
                <span class="sh-line">:{{ h.line }}</span>
                <code class="sh-text">{{ h.text }}</code>
              </div>
            </div>
          </div>

          <!-- Live preview -->
          <div class="bp-content preview-content" *ngIf="bottomTab === 'preview'">
            <div class="preview-bar">
              <input class="preview-url"
                     [(ngModel)]="previewUrl"
                     (keydown.enter)="reloadPreview()"
                     placeholder="http://localhost:4200"
                     spellcheck="false" />
              <button class="preview-go" (click)="reloadPreview()">Go</button>
              <a class="preview-external" [href]="previewUrl" target="_blank" rel="noopener" title="Open in new tab">&#8599;</a>
            </div>
            <iframe class="preview-frame"
                    *ngIf="previewSrc()"
                    [src]="previewSrc()"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
            <div class="preview-empty" *ngIf="!previewSrc()">
              Enter a URL above (e.g., <code>http://localhost:4200</code>) and click <strong>Go</strong>.
              <br><br>
              <span class="preview-hint">Run your dev server in the Terminal tab first (<code>ng serve</code>, <code>npm start</code>, etc.), then preview it here.</span>
            </div>
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
            <img class="ai-logo" src="assets/ai-logo-transparent.png" alt="AI Assistant" />
            <span class="ai-title">AI Assistant</span>
            <span class="ai-badge on">Built-in</span>
          </div>
          <div class="ai-hdr-right">
            <button class="ai-icon-btn" (click)="toggleConvoList()" [class.active]="convoListOpen" title="Chat history">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
            <button class="ai-icon-btn" (click)="onNewConversation()" title="New conversation">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button class="ai-icon-btn close" (click)="aiPanelOpen = false" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Conversations dropdown -->
        <div class="ai-convo-list" *ngIf="convoListOpen">
          <div class="ai-convo-hdr">
            <span>History</span>
            <span class="ai-convo-count">{{ ai.conversations().length }}</span>
          </div>
          <div class="ai-convo-empty" *ngIf="ai.conversations().length === 0">
            No past conversations yet. Start chatting — each new thread will appear here.
          </div>
          <div *ngFor="let c of ai.conversations()"
               class="ai-convo-item"
               [class.active]="c._id === ai.activeConversationId()"
               (click)="onSwitchConversation(c._id)">
            <div class="ai-convo-title" [title]="c.title">{{ c.title }}</div>
            <div class="ai-convo-meta">
              <span>{{ c.messageCount }} msg</span>
              <button class="ai-convo-del" (click)="onDeleteConversation(c._id, $event)" title="Delete">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
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
          <!-- History-hydrating skeleton (holds layout so incoming messages don't become LCP) -->
          <div class="chat-skeleton" *ngIf="historyHydrating && ai.messages().length === 0">
            <div class="sk-row sk-user"><div class="sk-bubble"></div></div>
            <div class="sk-row sk-ai"><div class="sk-bubble wide"></div></div>
            <div class="sk-row sk-user"><div class="sk-bubble narrow"></div></div>
          </div>

          <!-- Welcome -->
          <div class="ai-welcome" *ngIf="!historyHydrating && ai.messages().length === 0">
            <div class="ai-welcome-logo">
              <img class="ai-welcome-img" src="assets/ai-logo-transparent.png" alt="AI Assistant" />
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

          <!-- Load older -->
          <div class="load-older" *ngIf="ai.hasMoreHistory() && ai.messages().length > 0">
            <button class="load-older-btn" (click)="ai.loadFullHistory()">&uarr; Load older messages</button>
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
    /* ===== THEME VARIABLES ===== */
    :host {
      --bg-main: #08081a;
      --bg-surface: #0c0c1e;
      --bg-panel: #0a0a1a;
      --bg-elevated: #0e0e1e;
      --bg-input: #060614;
      --bg-code: #080818;
      --bg-deep: #060612;
      --bg-activity: #080816;
      --bg-status: #6366f1;
      --text-primary: #e0e0f0;
      --text-secondary: #c8c8e0;
      --text-tertiary: #c0c0d8;
      --text-muted: #8888a8;
      --text-faded: #6a6a8a;
      --text-dim: #4a4a6c;
      --text-ghost: #3a3a5c;
      --text-dimmer: #2a2a44;
      --border-primary: #1e1e36;
      --border-secondary: #1a1a30;
      --border-tertiary: #2a2a44;
      --border-gutter: #141428;
      --accent: #818cf8;
      --accent-deep: #6366f1;
      --accent-purple: #a78bfa;
      --accent-purple-deep: #8b5cf6;
      --success: #34d399;
      --success-deep: #10b981;
      --error: #f87171;
      --error-deep: #ef4444;
      --warning: #fbbf24;
      --warning-deep: #f59e0b;
      --info: #60a5fa;
      --accent-hover-bg: rgba(129,140,248,0.06);
      --accent-active-bg: rgba(129,140,248,0.08);
      --accent-focus-bg: rgba(129,140,248,0.12);
      --selection-bg: rgba(99,102,241,0.35);
      --overlay-bg: rgba(0,0,0,0.7);
      --scrollbar-thumb: #1e1e36;
      --scrollbar-hover: #2a2a44;
      display: flex; flex-direction: column; height: 100vh; background: var(--bg-main); overflow: hidden; font-family: 'Inter',-apple-system,sans-serif;
    }

    :host.light-theme {
      --bg-main: #f5f5f7;
      --bg-surface: #ffffff;
      --bg-panel: #fafafa;
      --bg-elevated: #f0f0f4;
      --bg-input: #ffffff;
      --bg-code: #fafafa;
      --bg-deep: #f5f5f8;
      --bg-activity: #f0f0f5;
      --bg-status: #6366f1;
      --text-primary: #1a1a2e;
      --text-secondary: #2d2d44;
      --text-tertiary: #3a3a55;
      --text-muted: #6b6b88;
      --text-faded: #8888a0;
      --text-dim: #a0a0b8;
      --text-ghost: #b8b8cc;
      --text-dimmer: #d0d0dd;
      --border-primary: #e0e0ea;
      --border-secondary: #e8e8f0;
      --border-tertiary: #d0d0dd;
      --border-gutter: #e8e8f0;
      --accent: #6366f1;
      --accent-deep: #4f46e5;
      --accent-purple: #7c3aed;
      --accent-purple-deep: #6d28d9;
      --success: #059669;
      --success-deep: #047857;
      --error: #dc2626;
      --error-deep: #b91c1c;
      --warning: #d97706;
      --warning-deep: #b45309;
      --info: #2563eb;
      --accent-hover-bg: rgba(99,102,241,0.06);
      --accent-active-bg: rgba(99,102,241,0.10);
      --accent-focus-bg: rgba(99,102,241,0.14);
      --selection-bg: rgba(99,102,241,0.2);
      --overlay-bg: rgba(0,0,0,0.3);
      --scrollbar-thumb: #d0d0dd;
      --scrollbar-hover: #b8b8cc;
    }

    /* TOP BAR */
    .top-bar { display: flex; align-items: center; gap: 10px; padding: 0 14px; height: 38px; background: var(--bg-surface); border-bottom: 1px solid var(--border-secondary); flex-shrink: 0; overflow-x: auto; }
    .back-btn { padding: 4px 12px; background: var(--accent-hover-bg); border: 1px solid var(--border-primary); border-radius: 6px; color: var(--accent); font-size: 11px; cursor: pointer; font-family: 'Inter',sans-serif; white-space: nowrap; transition: all 0.15s; }
    .back-btn:hover { background: var(--accent-focus-bg); border-color: var(--accent); }
    .project-name { font-size: 12px; font-weight: 600; color: var(--text-primary); white-space: nowrap; letter-spacing: -0.2px; }
    .path-input-wrap { display: flex; gap: 4px; align-items: center; }
    .path-input { padding: 2px 8px; background: var(--bg-input); border: 1px solid var(--border-tertiary); border-radius: 4px; color: var(--text-primary); font-size: 11px; font-family: 'JetBrains Mono',monospace; width: 220px; outline: none; }
    .path-input:focus { border-color: var(--accent); }
    .path-input::placeholder { color: var(--text-dim); }
    .path-go { padding: 2px 8px; background: rgba(16,185,129,0.2); border: none; border-radius: 4px; color: var(--success); font-size: 10px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; }
    .path-go:hover { background: rgba(16,185,129,0.3); }
    .cwd-display { font-size: 10px; color: var(--accent); font-family: 'JetBrains Mono',monospace; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
    .cwd-display.faded { color: var(--text-faded); }
    .stat-pills { display: flex; gap: 5px; margin-left: auto; }
    .pill { padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; background: var(--bg-elevated); border: 1px solid var(--border-primary); color: var(--text-muted); white-space: nowrap; font-family: 'Inter',sans-serif; letter-spacing: -0.1px; }
    .pill.click { cursor: pointer; border: none; } .pill.click:hover { filter: brightness(1.3); }
    .score-pill.good { background: rgba(16,185,129,0.15); color: var(--success); } .score-pill.ok { background: rgba(245,158,11,0.15); color: var(--warning); } .score-pill.bad { background: rgba(239,68,68,0.15); color: var(--error); }
    .epic-pill { background: rgba(167,139,250,0.1); color: var(--accent-purple); display: flex; align-items: center; gap: 4px; }
    .feature-pill { background: rgba(16,185,129,0.1); color: var(--success); display: flex; align-items: center; gap: 4px; }
    .story-pill { background: rgba(96,165,250,0.1); color: var(--info); display: flex; align-items: center; gap: 4px; }
    .defect-pill { background: rgba(248,113,113,0.12); color: #f87171; display: flex; align-items: center; gap: 4px; }
    .theme-toggle { padding: 4px 8px; background: var(--accent-hover-bg); border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: 6px; flex-shrink: 0; }
    .theme-toggle:hover { background: var(--accent-focus-bg); color: var(--accent); border-color: var(--accent); }

    /* LAYOUT */
    .ide-body { display: flex; flex: 1; overflow: hidden; }
    .sidebar { width: 260px; background: var(--bg-surface); border-right: 1px solid var(--border-secondary); display: flex; flex-direction: column; flex-shrink: 0; transition: width 0.2s; }
    .sidebar.collapsed { width: 0; overflow: hidden; }
    .sb-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border-secondary); font-size: 10px; font-weight: 700; color: var(--text-faded); text-transform: uppercase; letter-spacing: 0.8px; }
    .sb-actions { display: flex; gap: 2px; }
    .sb-act { width: 24px; height: 24px; background: none; border: 1px solid transparent; border-radius: 5px; color: var(--text-dim); font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .sb-act:hover { color: var(--text-secondary); background: var(--accent-hover-bg); border-color: var(--border-primary); }
    .new-item-input { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--border-secondary); background: var(--bg-code); }

    .open-folder-empty { display: flex; flex-direction: column; align-items: center; padding: 32px 16px; gap: 12px; }
    .scan-spinner { width: 28px; height: 28px; border: 3px solid rgba(129,140,248,0.2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .scan-bar { width: 160px; height: 3px; background: var(--border-primary); border-radius: 2px; margin-top: 8px; overflow: hidden; }
    .scan-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-purple)); transition: width 0.15s ease; }
    .open-folder-btn { padding: 10px 24px; background: linear-gradient(135deg, var(--accent-deep), var(--accent-purple-deep)); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
    .open-folder-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
    .open-folder-btn.secondary { background: var(--accent-hover-bg); color: var(--text-muted); border: 1px solid var(--border-tertiary); }
    .open-folder-btn.secondary:hover { background: var(--accent-active-bg); box-shadow: none; }
    .np-label { font-size: 11px; color: var(--text-faded); text-transform: uppercase; letter-spacing: 0.5px; align-self: flex-start; margin-left: 5%; margin-top: 4px; }
    .np-input { background: var(--bg-input); border: 1px solid var(--border-tertiary); border-radius: 6px; color: var(--text-primary); font-size: 12px; padding: 8px 12px; outline: none; width: 90%; font-family: 'JetBrains Mono', monospace; }
    .np-input:focus { border-color: var(--accent); }
    .np-actions { display: flex; gap: 8px; margin-top: 4px; width: 90%; }
    .np-actions .open-folder-btn { flex: 1; padding: 8px 12px; font-size: 12px; }
    .open-folder-btn-center { padding: 12px 28px; background: linear-gradient(135deg, var(--accent-deep), var(--accent-purple-deep)); border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; margin-top: 12px; transition: all 0.2s; }
    .open-folder-btn-center:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
    .open-folder-hint { font-size: 11px; color: var(--text-faded); text-align: center; }

    .trust-overlay { position: fixed; inset: 0; background: var(--overlay-bg); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.2s ease; }
    .trust-card { background: var(--bg-elevated); border: 1px solid var(--border-tertiary); border-radius: 16px; padding: 36px 40px; max-width: 460px; width: 90vw; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .trust-icon { font-size: 48px; margin-bottom: 16px; }
    .trust-card h2 { color: var(--text-primary); font-size: 18px; font-weight: 700; margin: 0 0 12px; }
    .trust-folder-name { color: var(--accent); font-size: 14px; font-weight: 600; font-family: 'JetBrains Mono', monospace; margin: 0 0 12px; word-break: break-all; }
    .trust-desc { color: var(--text-muted); font-size: 13px; line-height: 1.6; margin: 0 0 24px; }
    .trust-warn { background: rgba(234,179,8,0.1); border: 1px solid var(--warning); color: var(--warning); padding: 8px 12px; border-radius: 6px; font-size: 12px; margin: 0 0 16px; line-height: 1.4; }
    .trust-actions { display: flex; gap: 12px; justify-content: center; }
    .trust-btn { padding: 11px 24px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
    .trust-yes { background: linear-gradient(135deg, var(--accent-deep), var(--accent-purple-deep)); color: #fff; }
    .trust-yes:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
    .trust-no { background: var(--accent-hover-bg); color: var(--text-muted); border: 1px solid var(--border-tertiary); }
    .trust-no:hover { background: var(--accent-active-bg); }
    .ni-input { flex: 1; background: var(--bg-input); border: 1px solid rgba(129,140,248,0.3); border-radius: 5px; color: var(--text-primary); font-size: 11px; padding: 5px 8px; outline: none; font-family: 'JetBrains Mono',monospace; }
    .ni-ok { background: none; border: none; color: var(--success); font-size: 14px; cursor: pointer; }
    .ni-cancel { background: none; border: none; color: var(--error); font-size: 14px; cursor: pointer; }
    .tree-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 0; }
    .tree-scroll::-webkit-scrollbar { width: 6px; }
    .tree-scroll::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
    .tree-scroll::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-hover); }
    .t-row { display: flex; align-items: center; gap: 4px; padding: 3px 8px; cursor: pointer; color: var(--text-muted); transition: all 0.1s; white-space: nowrap; border-left: 2px solid transparent; }
    .t-row:hover { background: var(--accent-hover-bg); color: var(--text-secondary); }
    .t-row.t-selected { background: var(--accent-active-bg); color: var(--text-primary); border-left-color: var(--accent); }
    .t-row.t-has-issues .t-name { color: var(--warning); }
    .t-arrow { font-size: 7px; width: 10px; text-align: center; color: var(--text-dim); }
    .t-ico { width: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .t-file-badge { font-size: 7px; font-weight: 800; padding: 2px 4px; border-radius: 3px; font-family: 'Inter',sans-serif; letter-spacing: 0.3px; flex-shrink: 0; line-height: 1; text-transform: uppercase; min-width: 20px; text-align: center; }
    .tab-file-badge { font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-family: 'Inter',sans-serif; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1; }
    .t-name { flex: 1; overflow: hidden; text-overflow: ellipsis; font-family: 'JetBrains Mono',monospace; font-size: 12px; }
    .t-badge { font-size: 8px; padding: 1px 5px; background: rgba(245,158,11,0.15); color: var(--warning); border-radius: 8px; font-weight: 700; border: 1px solid rgba(245,158,11,0.15); }

    /* CENTER */
    .center { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

    .no-file { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; color: var(--text-faded); }
    .nf-icon { font-size: 56px; opacity: 0.3; margin-bottom: 12px; }
    .nf-logo {
      width: 260px; height: 260px; object-fit: contain;
      opacity: 0.18;
      margin-bottom: 24px;
      border-radius: 32px;
      filter: drop-shadow(0 0 48px rgba(99, 102, 241, 0.45))
              drop-shadow(0 0 96px rgba(139, 92, 246, 0.25));
      user-select: none; pointer-events: none;
      animation: nfLogoFloat 6s ease-in-out infinite;
    }
    @keyframes nfLogoFloat {
      0%, 100% { transform: translateY(0); opacity: 0.18; }
      50%      { transform: translateY(-6px); opacity: 0.24; }
    }
    .no-file p { font-size: 13px; margin-bottom: 20px; }
    .lang-chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .lc { font-size: 11px; padding: 3px 10px; background: var(--bg-elevated); border: 1px solid var(--border-tertiary); border-radius: 12px; color: var(--text-muted); }

    /* EDITOR */
    .editor-section { display: flex; flex-direction: column; overflow: hidden; }
    .editor-wrap { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .tab-bar { display: flex; align-items: center; background: var(--bg-panel); border-bottom: 1px solid var(--border-secondary); height: 36px; flex-shrink: 0; padding: 0; gap: 0; }
    .tab { display: flex; align-items: center; gap: 6px; padding: 0 14px; font-size: 12px; color: var(--text-secondary); background: var(--bg-elevated); border-top: 2px solid var(--accent-deep); height: 100%; font-family: 'JetBrains Mono',monospace; border-right: 1px solid var(--border-secondary); }
    .tab-icon { font-size: 12px; }
    .tab-x { width: 18px; height: 18px; background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px; margin-left: 6px; line-height: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    .tab-x:hover { color: var(--error); background: rgba(239,68,68,0.1); }
    .tab-meta { display: flex; align-items: center; gap: 6px; margin-left: 12px; }
    .tm { font-size: 10px; color: var(--text-muted); }
    .tm.lang { color: var(--accent); background: var(--accent-hover-bg); padding: 1px 6px; border-radius: 3px; }
    .tm.score { font-weight: 600; padding: 1px 6px; border-radius: 3px; }
    .tm.score.good { background: rgba(16,185,129,0.15); color: var(--success); }
    .tm.score.ok { background: rgba(245,158,11,0.15); color: var(--warning); }
    .tm.score.bad { background: rgba(239,68,68,0.15); color: var(--error); }
    .tm.issues { font-weight: 600; color: var(--warning); background: rgba(245,158,11,0.12); padding: 1px 6px; border-radius: 3px; }

    .run-controls { display: flex; gap: 4px; margin-left: auto; padding-right: 8px; }
    .rc-btn { padding: 3px 10px; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; transition: all 0.2s; }
    .rc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .rc-btn.run { background: rgba(16,185,129,0.2); color: var(--success); }
    .rc-btn.run:hover:not(:disabled) { background: rgba(16,185,129,0.3); }
    .rc-btn.debug { background: rgba(245,158,11,0.2); color: var(--warning); }
    .rc-btn.debug:hover:not(:disabled) { background: rgba(245,158,11,0.3); }
    .rc-btn.stop { background: rgba(239,68,68,0.2); color: var(--error); }
    .rc-btn.stop:hover { background: rgba(239,68,68,0.3); }

    /* EDITOR MAIN: Gutter + Textarea */
    .editor-main { display: flex; flex: 1; overflow: hidden; position: relative; }

    .gutter {
      width: 58px; background: var(--bg-panel); flex-shrink: 0; overflow: hidden;
      user-select: none; padding-top: 0; border-right: 1px solid var(--border-gutter);
    }
    .gutter-line {
      display: flex; align-items: center; justify-content: flex-end; gap: 2px;
      height: 22px; padding-right: 6px; cursor: pointer; position: relative;
      font-size: 12px; font-family: 'JetBrains Mono',monospace; color: var(--text-dim);
      transition: background 0.1s;
    }
    .gutter-line:hover { background: var(--accent-hover-bg); }
    .gutter-line.current { background: rgba(245,158,11,0.12); }
    .gutter-line.bp .ln-num { color: var(--error); }
    .gutter-line.has-error { background: rgba(239,68,68,0.06); }
    .gutter-line.has-warn { background: rgba(245,158,11,0.06); }
    .bp-dot { color: var(--error-deep); font-size: 10px; position: absolute; left: 4px; }
    .issue-dot { font-size: 8px; position: absolute; left: 6px; }
    .issue-dot.error { color: var(--error); }
    .issue-dot.warn { color: var(--warning); }
    .ln-num { font-size: 11px; }

    .code-area { flex: 1; position: relative; overflow: hidden; }

    /* DIFF EDITOR */
    .diff-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-panel); }
    .diff-toolbar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--bg-elevated); border-bottom: 1px solid var(--border-tertiary); flex-shrink: 0; }
    .diff-title { font-size: 11px; font-weight: 700; color: var(--accent-purple); display: flex; align-items: center; gap: 8px; }
    .diff-count { font-weight: 500; font-size: 10px; color: var(--text-faded); }
    .added-count { color: var(--success); }
    .removed-count { color: var(--error); }
    .diff-btn { padding: 4px 12px; border: none; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; }
    .diff-btn.accept { background: rgba(16,185,129,0.2); color: var(--success); }
    .diff-btn.accept:hover { background: rgba(16,185,129,0.3); }
    .diff-btn.reject { background: rgba(239,68,68,0.15); color: var(--error); }
    .diff-btn.reject:hover { background: rgba(239,68,68,0.25); }
    .diff-btn.close { background: var(--accent-hover-bg); color: var(--accent); margin-left: auto; }
    .diff-scroll { flex: 1; overflow-y: auto; }
    .diff-line { display: flex; font-family: 'JetBrains Mono',monospace; font-size: 13px; line-height: 22px; }
    .diff-gutter { width: 20px; text-align: center; font-weight: 700; flex-shrink: 0; padding-left: 4px; }
    .diff-num { width: 40px; text-align: right; padding-right: 8px; color: var(--text-dim); flex-shrink: 0; font-size: 11px; }
    .diff-code { flex: 1; padding-right: 16px; white-space: pre; }
    .diff-same { color: var(--text-faded); }
    .diff-same .diff-gutter { color: var(--text-ghost); }
    .diff-add { background: rgba(16,185,129,0.10); color: var(--success); }
    .diff-add .diff-gutter { color: var(--success-deep); }
    .diff-remove { background: rgba(239,68,68,0.10); color: var(--error); text-decoration: line-through; }
    .diff-remove .diff-gutter { color: var(--error-deep); }

    .ai-editing-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; background: rgba(167,139,250,0.2); color: var(--accent-purple); border-radius: 4px; margin-left: auto; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

    .code-highlight, .code-editor {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      font-family: 'JetBrains Mono',monospace; font-size: 13px; line-height: 22px;
      padding: 0 16px; margin: 0; border: none; white-space: pre;
      tab-size: 2; -moz-tab-size: 2; overflow: auto; box-sizing: border-box;
    }
    .code-highlight {
      background: var(--bg-code); color: var(--text-secondary); pointer-events: none; z-index: 0;
    }
    .code-highlight code { font-family: inherit; }
    .code-editor {
      background: transparent; color: transparent; caret-color: var(--text-primary);
      outline: none; resize: none; z-index: 1;
    }
    .code-editor::selection { background: var(--selection-bg); }

    /* ===== SYNTAX COLORS (VS Code Dark+ inspired) ===== */
    :host ::ng-deep .hl-kw { color: #569cd6; }
    :host ::ng-deep .hl-ctrl { color: #c586c0; }
    :host ::ng-deep .hl-type { color: #4ec9b0; }
    :host ::ng-deep .hl-fn { color: #dcdcaa; }
    :host ::ng-deep .hl-str { color: #ce9178; }
    :host ::ng-deep .hl-num { color: #b5cea8; }
    :host ::ng-deep .hl-cmt { color: #6a9955; font-style: italic; }
    :host ::ng-deep .hl-op { color: #d4d4d4; }
    :host ::ng-deep .hl-br { color: #ffd700; }
    :host ::ng-deep .hl-dec { color: #dcdcaa; }
    :host ::ng-deep .hl-val { color: #569cd6; }
    :host ::ng-deep .hl-bi { color: #9cdcfe; }
    :host ::ng-deep .hl-tag { color: #569cd6; }
    :host ::ng-deep .hl-attr { color: #9cdcfe; }
    :host ::ng-deep .hl-dir { color: #c586c0; }
    :host ::ng-deep .hl-interp { color: #dcdcaa; }
    :host ::ng-deep .hl-prop { color: #9cdcfe; }
    :host ::ng-deep .hl-sel { color: #d7ba7d; }

    /* Light theme syntax overrides */
    :host.light-theme ::ng-deep .hl-kw { color: #0000ff; }
    :host.light-theme ::ng-deep .hl-ctrl { color: #af00db; }
    :host.light-theme ::ng-deep .hl-type { color: #267f99; }
    :host.light-theme ::ng-deep .hl-fn { color: #795e26; }
    :host.light-theme ::ng-deep .hl-str { color: #a31515; }
    :host.light-theme ::ng-deep .hl-num { color: #098658; }
    :host.light-theme ::ng-deep .hl-cmt { color: #008000; }
    :host.light-theme ::ng-deep .hl-op { color: #383838; }
    :host.light-theme ::ng-deep .hl-br { color: #0431fa; }
    :host.light-theme ::ng-deep .hl-dec { color: #795e26; }
    :host.light-theme ::ng-deep .hl-val { color: #0000ff; }
    :host.light-theme ::ng-deep .hl-bi { color: #001080; }
    :host.light-theme ::ng-deep .hl-tag { color: #800000; }
    :host.light-theme ::ng-deep .hl-attr { color: #e50000; }
    :host.light-theme ::ng-deep .hl-dir { color: #af00db; }
    :host.light-theme ::ng-deep .hl-interp { color: #795e26; }
    :host.light-theme ::ng-deep .hl-prop { color: #001080; }
    :host.light-theme ::ng-deep .hl-sel { color: #800000; }

    /* BOTTOM PANEL */
    .bottom-panel { background: var(--bg-panel); border-top: 1px solid var(--border-secondary); display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden; }
    .resize-handle { height: 3px; cursor: ns-resize; background: transparent; flex-shrink: 0; transition: background 0.15s; }
    .resize-handle:hover { background: var(--accent-deep); }

    .bp-tabs { display: flex; align-items: center; padding: 0 10px; height: 32px; border-bottom: 1px solid var(--border-secondary); flex-shrink: 0; gap: 0; background: var(--bg-surface); }
    .bp-tab { padding: 0 14px; height: 100%; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-dim); font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; display: flex; align-items: center; gap: 4px; transition: color 0.15s; }
    .bp-tab:hover { color: var(--text-muted); }
    .bp-tab.active { color: var(--text-primary); border-bottom-color: var(--accent-deep); }
    .bp-badge { font-size: 9px; padding: 0 5px; background: rgba(245,158,11,0.2); color: var(--warning); border-radius: 8px; font-weight: 700; }
    .bp-badge.active-debug { background: rgba(245,158,11,0.3); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .bp-tab-actions { margin-left: auto; display: flex; gap: 4px; }

    /* ACTIVITY BAR */
    /* Source Control Panel */
    .sc-panel { width: 300px; background: var(--bg-surface); border-right: 1px solid var(--border-secondary); display: flex; flex-direction: column; flex-shrink: 0; font-size: 13px; overflow: hidden; }
    .sc-header { display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border-secondary); gap: 4px; }
    .sc-title { flex: 1; color: var(--text-tertiary); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .sc-icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 16px; line-height: 1; }
    .sc-icon-btn:hover { background: var(--accent-hover-bg); color: var(--text-primary); }
    .sc-empty { padding: 24px 16px; text-align: center; color: var(--text-faded); font-size: 12px; }
    .sc-empty p { margin: 0 0 12px; }
    .sc-branch { display: flex; align-items: center; gap: 6px; padding: 8px 12px; color: var(--accent); font-size: 12px; border-bottom: 1px solid var(--border-secondary); }
    .sc-remote { color: var(--text-faded); font-size: 11px; }
    .sc-ahead, .sc-behind { background: var(--accent-hover-bg); color: var(--accent); padding: 1px 6px; border-radius: 8px; font-size: 10px; font-family: monospace; }
    .sc-commit { padding: 10px; border-bottom: 1px solid var(--border-secondary); }
    .sc-msg { width: 100%; background: var(--bg-input); border: 1px solid var(--border-tertiary); border-radius: 6px; color: var(--text-primary); padding: 8px 10px; font-size: 12px; resize: vertical; outline: none; font-family: 'Inter', sans-serif; box-sizing: border-box; }
    .sc-msg:focus { border-color: var(--accent); }
    .sc-actions { display: flex; gap: 6px; margin-top: 8px; }
    .sc-sync { display: flex; gap: 6px; padding: 8px 10px; border-bottom: 1px solid var(--border-secondary); }
    .sc-sync .sc-btn { flex: 1; }
    .sc-btn { padding: 6px 12px; background: var(--accent-hover-bg); border: 1px solid var(--border-tertiary); border-radius: 5px; color: var(--text-tertiary); font-size: 11px; cursor: pointer; font-family: 'Inter', sans-serif; flex: 1; }
    .sc-btn:hover:not(:disabled) { background: var(--accent-focus-bg); border-color: var(--accent); color: var(--text-primary); }
    .sc-btn.primary { background: linear-gradient(135deg, var(--accent-deep), var(--accent-purple-deep)); border-color: transparent; color: #fff; font-weight: 600; }
    .sc-btn.primary:hover:not(:disabled) { filter: brightness(1.1); }
    .sc-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .sc-no-remote { padding: 12px; border-bottom: 1px solid var(--border-secondary); }
    .sc-no-remote p { margin: 0 0 8px; color: var(--text-muted); font-size: 11px; }
    .sc-remote-add { display: flex; flex-direction: column; gap: 6px; }
    .sc-remote-add input { padding: 6px 10px; background: var(--bg-input); border: 1px solid var(--border-tertiary); border-radius: 4px; color: var(--text-primary); font-size: 11px; font-family: 'JetBrains Mono', monospace; outline: none; }
    .sc-remote-add input:focus { border-color: var(--accent); }
    .sc-status-msg { padding: 8px 12px; background: rgba(16,185,129,0.1); color: var(--success); font-size: 11px; border-bottom: 1px solid var(--border-secondary); }
    .sc-status-msg.error { background: rgba(239,68,68,0.1); color: var(--error); }
    .sc-group { border-bottom: 1px solid var(--border-secondary); }
    .sc-group-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--bg-code); color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .sc-file { display: flex; align-items: center; gap: 6px; padding: 4px 12px; cursor: pointer; font-size: 12px; }
    .sc-file:hover { background: var(--accent-hover-bg); }
    .sc-file-icon { width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; border-radius: 3px; flex-shrink: 0; font-family: monospace; }
    .sc-file-icon.staged { background: rgba(52,211,153,0.2); color: var(--success); }
    .sc-file-icon.status-modified { background: rgba(245,158,11,0.2); color: var(--warning); }
    .sc-file-icon.status-untracked { background: rgba(129,140,248,0.2); color: var(--accent); }
    .sc-file-icon.status-added { background: rgba(52,211,153,0.2); color: var(--success); }
    .sc-file-icon.status-deleted { background: rgba(239,68,68,0.2); color: var(--error); }
    .sc-file-icon.status-renamed { background: rgba(139,92,246,0.2); color: var(--accent-purple); }
    .sc-file-icon.status-conflict { background: rgba(239,68,68,0.3); color: var(--error); }
    .sc-file-name { flex: 1; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sc-file-status { font-size: 10px; color: var(--text-faded); font-weight: 600; }
    .sc-mini-btn { background: none; border: none; color: var(--text-faded); cursor: pointer; padding: 0 4px; font-size: 14px; line-height: 1; opacity: 0; transition: opacity 0.1s; border-radius: 3px; }
    .sc-file:hover .sc-mini-btn, .sc-group-head:hover .sc-mini-btn { opacity: 1; }
    .sc-mini-btn:hover { background: var(--accent-focus-bg); color: var(--text-primary); }
    .sc-mini-btn.discard:hover { background: rgba(239,68,68,0.2); color: var(--error); }

    .activity-bar {
      width: 44px; background: var(--bg-activity); border-right: 1px solid var(--border-gutter); display: flex;
      flex-direction: column; align-items: center; padding: 8px 0; gap: 4px; flex-shrink: 0;
    }
    .ab-brand {
      width: 32px; height: 32px; object-fit: contain; margin-bottom: 6px;
      filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))
              drop-shadow(0 0 16px rgba(139, 92, 246, 0.25));
      user-select: none; pointer-events: none;
      animation: abBrandGlow 4s ease-in-out infinite;
    }
    @keyframes abBrandGlow {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(99,102,241,0.5)) drop-shadow(0 0 16px rgba(139,92,246,0.25)); }
      50%      { filter: drop-shadow(0 0 12px rgba(99,102,241,0.7)) drop-shadow(0 0 24px rgba(139,92,246,0.4)); }
    }
    .ab-icon {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      background: none; border: none; color: var(--text-ghost); font-size: 17px; cursor: pointer;
      border-radius: 8px; transition: all 0.2s; position: relative; border-left: 2px solid transparent;
    }
    .ab-icon:hover { color: var(--text-muted); background: var(--accent-hover-bg); }
    .ab-icon.active { color: var(--text-primary); background: var(--accent-active-bg); border-left-color: var(--accent-deep); }
    .ab-spacer { flex: 1; }
    .ab-badge { position: absolute; top: 3px; right: 3px; font-size: 7px; background: var(--error-deep); color: #fff; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-weight: 800; }

    /* Terminal selector strip (when multiple terminals) */
    .term-selector { display: flex; gap: 0; background: var(--bg-elevated); border-bottom: 1px solid var(--border-tertiary); padding: 0 4px; height: 24px; flex-shrink: 0; }
    .ts-btn { display: flex; align-items: center; gap: 3px; padding: 0 10px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-faded); font-size: 10px; cursor: pointer; font-family: 'Inter',sans-serif; height: 100%; }
    .ts-btn.active { color: var(--text-primary); border-bottom-color: var(--accent); }
    .ts-btn:hover { color: var(--text-tertiary); }
    .ts-icon { font-size: 11px; }
    .ts-dot { font-size: 7px; color: var(--text-faded); }
    .ts-dot.on { color: var(--success); }
    .ts-cwd { font-size: 9px; color: var(--text-dim); margin-left: 4px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; }
    .ts-x { background: none; border: none; color: var(--text-faded); cursor: pointer; font-size: 11px; padding: 0 2px; line-height: 1; margin-left: 2px; }
    .ts-x:hover { color: var(--error); }
    .bp-act { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; padding: 2px 6px; }
    .bp-act:hover { color: var(--text-primary); }

    .bp-content { flex: 1; overflow-y: auto; }

    /* Global search panel */
    .search-content { display: flex; flex-direction: column; height: 100%; }
    .search-bar { display: flex; gap: 6px; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--border-primary); background: var(--bg-panel); }
    .search-input { flex: 1; background: var(--bg-input); border: 1px solid var(--border-primary); border-radius: 4px; color: var(--text-primary); padding: 5px 8px; font-size: 12px; outline: none; }
    .search-input:focus { border-color: var(--accent); }
    .search-opt { display: flex; align-items: center; gap: 3px; font-size: 10px; color: var(--text-muted); cursor: pointer; user-select: none; }
    .search-opt input { margin: 0; }
    .search-go { background: var(--accent); color: #fff; border: none; border-radius: 4px; padding: 5px 12px; font-size: 11px; cursor: pointer; }
    .search-go:disabled { opacity: 0.6; cursor: not-allowed; }
    .search-body { flex: 1; overflow-y: auto; padding: 6px 0; }
    .search-summary { padding: 6px 10px; font-size: 11px; color: var(--text-muted); }
    .search-summary strong { color: var(--accent); }
    .search-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px; }
    .search-hit { display: flex; align-items: baseline; gap: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; border-top: 1px solid var(--border-secondary); }
    .search-hit:hover { background: var(--accent-hover-bg); }
    .sh-path { color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; font-weight: 500; flex-shrink: 0; }
    .sh-line { color: var(--accent); font-family: 'JetBrains Mono', monospace; flex-shrink: 0; }
    .sh-text { color: var(--text-muted); font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; background: transparent; padding: 0; }

    /* Live preview panel */
    .preview-content { display: flex; flex-direction: column; height: 100%; }
    .preview-bar { display: flex; gap: 6px; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--border-primary); background: var(--bg-panel); }
    .preview-url { flex: 1; background: var(--bg-input); border: 1px solid var(--border-primary); border-radius: 4px; color: var(--text-primary); padding: 5px 8px; font-size: 12px; outline: none; font-family: 'JetBrains Mono', monospace; }
    .preview-url:focus { border-color: var(--accent); }
    .preview-go { background: var(--accent); color: #fff; border: none; border-radius: 4px; padding: 5px 12px; font-size: 11px; cursor: pointer; }
    .preview-external { color: var(--accent); text-decoration: none; padding: 5px 8px; font-size: 14px; border: 1px solid var(--border-primary); border-radius: 4px; }
    .preview-external:hover { background: var(--accent-hover-bg); }
    .preview-frame { flex: 1; border: none; background: #fff; width: 100%; }
    .preview-empty { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: var(--text-muted); padding: 30px; font-size: 13px; line-height: 1.6; }
    .preview-empty code { background: var(--bg-code); padding: 2px 6px; border-radius: 3px; }
    .preview-hint { font-size: 11px; opacity: 0.75; }

    /* TERMINAL */
    .terminal-content { display: flex; flex-direction: column; }
    .terminal { flex: 1; overflow-y: auto; padding: 10px 14px; font-family: 'JetBrains Mono',monospace; font-size: 12.5px; min-height: 0; background: var(--bg-deep); line-height: 1.5; }
    .terminal::-webkit-scrollbar { width: 6px; }
    .terminal::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
    .term-line { padding: 1px 0; }
    .tl-text { white-space: pre-wrap; word-break: break-all; }
    .tl-stdout .tl-text { color: var(--text-secondary); }
    .tl-stderr .tl-text { color: var(--error); }
    .tl-warn .tl-text { color: var(--warning); }
    .tl-info .tl-text { color: var(--info); }
    .tl-input .tl-text { color: var(--success); font-weight: 500; }

    .term-input-row { display: flex; align-items: center; padding: 6px 10px; border-top: 1px solid var(--border-secondary); flex-shrink: 0; background: var(--bg-activity); gap: 0; }
    .term-cwd { font-size: 11px; color: var(--accent-deep); font-family: 'JetBrains Mono',monospace; padding-right: 8px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; flex-shrink: 0; opacity: 0.7; }
    .term-prompt { color: var(--success); font-family: 'JetBrains Mono',monospace; font-size: 14px; font-weight: 700; margin-right: 8px; flex-shrink: 0; }
    .term-input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-family: 'JetBrains Mono',monospace; font-size: 12.5px; min-width: 0; }
    .term-input::placeholder { color: var(--text-dimmer); }
    .term-kill { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.2); color: var(--error); font-size: 10px; padding: 3px 10px; border-radius: 5px; cursor: pointer; margin-left: 6px; flex-shrink: 0; transition: all 0.15s; }
    .term-kill:hover { background: rgba(239,68,68,0.2); }
    .term-reconnect { padding: 3px 10px; background: var(--accent-hover-bg); border: 1px solid var(--border-primary); border-radius: 5px; color: var(--accent); font-size: 9px; font-weight: 600; cursor: pointer; margin-left: 6px; font-family: 'Inter',sans-serif; transition: all 0.15s; }
    .term-reconnect:hover { background: var(--accent-focus-bg); border-color: var(--accent); }
    .term-status { font-size: 8px; font-weight: 700; padding: 3px 8px; border-radius: 10px; margin-left: 8px; flex-shrink: 0; background: var(--bg-elevated); color: var(--text-dim); border: 1px solid var(--border-primary); letter-spacing: 0.3px; }
    .term-status.on { background: rgba(16,185,129,0.08); color: var(--success); border-color: rgba(16,185,129,0.2); }

    /* PROBLEMS */
    .problems-list { padding: 4px 0; }
    .prob-row { display: flex; align-items: center; gap: 8px; padding: 4px 16px; font-size: 11px; cursor: pointer; transition: background 0.1s; }
    .prob-row:hover { background: var(--accent-hover-bg); }
    .prob-sev { padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
    .prob-sev.error { background: rgba(239,68,68,0.2); color: var(--error); }
    .prob-sev.warning { background: rgba(245,158,11,0.2); color: var(--warning); }
    .prob-sev.info { background: rgba(96,165,250,0.2); color: var(--info); }
    .prob-line { font-size: 10px; color: var(--accent); font-family: 'JetBrains Mono',monospace; flex-shrink: 0; }
    .prob-rule { font-size: 9px; color: var(--text-faded); background: var(--border-primary); padding: 0 4px; border-radius: 2px; flex-shrink: 0; }
    .prob-msg { color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .prob-empty { padding: 24px; text-align: center; color: var(--success); font-size: 12px; }

    /* DEBUG PANEL */
    .debug-panel { padding: 8px 12px; }
    .dbg-controls { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
    .dbg-btn { padding: 4px 12px; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; }
    .dbg-btn.continue { background: rgba(16,185,129,0.2); color: var(--success); }
    .dbg-btn.step { background: var(--accent-focus-bg); color: var(--accent); }
    .dbg-btn.stop { background: rgba(239,68,68,0.2); color: var(--error); }
    .dbg-status { font-size: 11px; color: var(--warning); margin-left: 8px; }
    .dbg-status.running { color: var(--success); }
    .dbg-status.idle { color: var(--text-faded); }

    .dbg-section { margin-bottom: 12px; }
    .dbg-sec-title { font-size: 10px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    .dbg-clear { background: none; border: none; color: var(--text-muted); font-size: 10px; cursor: pointer; margin-left: auto; }
    .dbg-clear:hover { color: var(--error); }
    .dbg-bp-list { }
    .dbg-bp { padding: 2px 8px; font-size: 11px; color: var(--text-tertiary); cursor: pointer; }
    .dbg-bp:hover { background: var(--accent-hover-bg); }
    .dbg-bp-dot { color: var(--error-deep); font-size: 8px; }
    .dbg-bp-empty { font-size: 11px; color: var(--text-faded); padding: 4px 8px; }

    .dbg-var { display: flex; gap: 8px; padding: 2px 8px; font-size: 11px; }
    .var-name { color: var(--accent); font-family: 'JetBrains Mono',monospace; font-weight: 600; min-width: 80px; }
    .var-type { color: var(--text-faded); font-size: 10px; min-width: 50px; }
    .var-val { color: var(--text-secondary); font-family: 'JetBrains Mono',monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dbg-stack { font-size: 11px; color: var(--text-tertiary); padding: 2px 8px; font-family: 'JetBrains Mono',monospace; }

    /* STATUS BAR */
    .bottom-statusbar { display: flex; align-items: center; height: 22px; background: var(--bg-status); padding: 0 8px; flex-shrink: 0; gap: 0; }
    .sb-btn { padding: 0 10px; height: 100%; background: none; border: none; color: rgba(255,255,255,0.7); font-size: 10px; cursor: pointer; font-family: 'Inter',sans-serif; display: flex; align-items: center; gap: 3px; }
    .sb-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
    .sb-badge { font-size: 8px; padding: 0 5px; background: rgba(255,255,255,0.2); color: #fff; border-radius: 8px; font-weight: 700; }
    .sb-spacer { flex: 1; }
    .sb-info { font-size: 10px; color: rgba(255,255,255,0.6); padding: 0 8px; }

    /* AI PANEL — Clean Sidebar Style */
    .ai-panel {
      width: 420px; background: var(--bg-elevated); border-left: 1px solid var(--border-primary); display: flex;
      flex-direction: column; flex-shrink: 0; overflow: hidden;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn { from { width: 0; opacity: 0; } to { width: 420px; opacity: 1; } }

    /* Header */
    .ai-header { display: flex; align-items: center; padding: 0 10px; height: 40px; border-bottom: 1px solid var(--border-primary); flex-shrink: 0; background: var(--bg-panel); }
    .ai-hdr-left { display: flex; align-items: center; gap: 8px; }
    .ai-hdr-right { display: flex; align-items: center; gap: 4px; margin-left: auto; }
    .ai-logo {
      width: 26px; height: 26px; object-fit: contain; border-radius: 6px;
      filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.45));
      user-select: none;
    }
    .ai-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .ai-badge { font-size: 8px; font-weight: 700; padding: 2px 7px; border-radius: 10px; letter-spacing: 0.3px; }
    .ai-badge.on { background: rgba(16,185,129,0.12); color: var(--success); border: 1px solid rgba(16,185,129,0.2); }
    .ai-badge:not(.on) { background: rgba(245,158,11,0.1); color: var(--warning); border: 1px solid rgba(245,158,11,0.15); }
    .ds-key-bar { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--border-secondary); align-items: center; }
    .ds-key-input { flex: 1; background: var(--bg-input); border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-primary); font-size: 11px; padding: 6px 10px; outline: none; font-family: 'JetBrains Mono',monospace; }
    .ds-key-input:focus { border-color: var(--accent); }
    .ds-key-save { padding: 6px 14px; background: linear-gradient(135deg,var(--accent-deep),var(--accent)); border: none; border-radius: 6px; color: #fff; font-size: 10px; font-weight: 700; cursor: pointer; }
    .ds-key-link { font-size: 9px; color: var(--accent); white-space: nowrap; }
    .ai-icon-btn { width: 28px; height: 28px; background: none; border: 1px solid transparent; border-radius: 6px; color: var(--text-dim); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .ai-icon-btn:hover { color: var(--text-secondary); background: var(--accent-hover-bg); border-color: var(--border-primary); }
    .ai-icon-btn.close:hover { color: var(--error); }
    .ai-icon-btn.active { color: var(--accent); border-color: var(--accent); background: var(--accent-hover-bg); }

    /* Conversation history dropdown */
    .ai-convo-list { max-height: 280px; overflow-y: auto; border-bottom: 1px solid var(--border-primary); background: var(--bg-panel); }
    .ai-convo-hdr { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-secondary); }
    .ai-convo-count { background: var(--bg-code); padding: 1px 6px; border-radius: 4px; font-size: 9px; }
    .ai-convo-empty { padding: 14px 12px; font-size: 11px; color: var(--text-dim); line-height: 1.4; }
    .ai-convo-item { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-bottom: 1px solid var(--border-secondary); cursor: pointer; transition: background 0.12s; }
    .ai-convo-item:hover { background: var(--accent-hover-bg); }
    .ai-convo-item.active { background: var(--accent-hover-bg); border-left: 2px solid var(--accent); padding-left: 10px; }
    .ai-convo-title { font-size: 12px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ai-convo-meta { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text-dim); }
    .ai-convo-del { background: none; border: none; color: var(--text-dim); cursor: pointer; padding: 2px; display: flex; align-items: center; border-radius: 3px; }
    .ai-convo-del:hover { color: var(--error); background: var(--accent-hover-bg); }

    /* Context bar */
    .ai-ctx { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-bottom: 1px solid var(--border-secondary); flex-shrink: 0; color: var(--text-dim); }
    .ai-ctx-type { font-size: 10px; color: var(--accent); font-weight: 600; }
    .ai-ctx-tag { font-size: 8px; color: var(--text-dim); background: var(--bg-code); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border-primary); }

    /* Chat */
    .ai-chat { flex: 1; overflow-y: auto; padding: 16px 14px; }

    .load-older { display: flex; justify-content: center; padding: 6px 0 10px; }
    .load-older-btn { background: var(--bg-panel); color: var(--text-muted); border: 1px solid var(--border-primary); border-radius: 6px; padding: 4px 12px; font-size: 11px; cursor: pointer; transition: all 0.15s; }
    .load-older-btn:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-hover-bg); }

    /* Chat hydration skeleton — fixed height so real messages don't cause LCP reshuffles */
    .chat-skeleton { display: flex; flex-direction: column; gap: 10px; padding: 12px 4px; }
    .sk-row { display: flex; }
    .sk-row.sk-user { justify-content: flex-end; }
    .sk-row.sk-ai { justify-content: flex-start; }
    .sk-bubble { width: 160px; height: 40px; border-radius: 12px; background: linear-gradient(90deg, var(--bg-panel), var(--bg-elevated), var(--bg-panel)); background-size: 200% 100%; animation: sk-shimmer 1.4s linear infinite; border: 1px solid var(--border-primary); }
    .sk-bubble.wide { width: 220px; height: 60px; }
    .sk-bubble.narrow { width: 100px; height: 32px; }
    @keyframes sk-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

    /* Welcome */
    .ai-welcome { text-align: center; padding: 24px 8px; }
    .ai-welcome-logo { margin-bottom: 14px; display: flex; justify-content: center; }
    .ai-welcome-img {
      width: 96px; height: 96px; object-fit: contain;
      opacity: 0.9;
      filter: drop-shadow(0 0 18px rgba(99, 102, 241, 0.55))
              drop-shadow(0 0 36px rgba(139, 92, 246, 0.3));
      user-select: none; pointer-events: none;
      animation: aiWelcomeFloat 5s ease-in-out infinite;
    }
    @keyframes aiWelcomeFloat {
      0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 18px rgba(99,102,241,0.55)) drop-shadow(0 0 36px rgba(139,92,246,0.3)); }
      50%      { transform: translateY(-4px); filter: drop-shadow(0 0 26px rgba(99,102,241,0.75)) drop-shadow(0 0 52px rgba(139,92,246,0.45)); }
    }
    .ai-welcome h3 { font-size: 18px; color: var(--text-primary); margin: 0 0 6px; font-weight: 700; }
    .ai-welcome-sub { font-size: 12px; color: var(--text-faded); margin: 0 0 20px; }
    .ai-status-card { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 8px; font-size: 11px; margin-bottom: 20px; border: 1px solid var(--border-primary); background: var(--bg-panel); color: var(--text-faded); }
    .ai-status-card.connected { border-color: rgba(16,185,129,0.2); }
    .ai-sc-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--warning-deep); }
    .ai-status-card.connected .ai-sc-dot { background: var(--success); box-shadow: 0 0 8px rgba(52,211,153,0.4); }
    .ai-status-card code { background: var(--bg-code); padding: 1px 5px; border-radius: 3px; font-family: 'JetBrains Mono',monospace; font-size: 10px; color: var(--accent-purple); }

    /* Quick action grid */
    .ai-qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
    .ai-qa-card { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-panel); border: 1px solid var(--border-primary); border-radius: 10px; color: var(--text-muted); font-size: 11px; cursor: pointer; font-family: 'Inter',sans-serif; transition: all 0.15s; text-align: left; }
    .ai-qa-card:hover { border-color: var(--accent); color: var(--text-secondary); background: var(--accent-hover-bg); }
    .ai-qa-card svg { flex-shrink: 0; color: var(--text-faded); }
    .ai-qa-card:hover svg { color: var(--accent); }

    /* Messages */
    .ai-msg { display: flex; gap: 10px; margin-bottom: 18px; animation: fadeUp 0.2s ease; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .ai-msg-icon { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ai-msg-icon.user { background: var(--accent-focus-bg); color: var(--accent); }
    .ai-msg-icon.ai { background: linear-gradient(135deg,rgba(99,102,241,0.15),rgba(167,139,250,0.15)); color: var(--accent-purple); }
    .ai-msg-body { flex: 1; min-width: 0; }
    .ai-msg-user .ai-msg-body { background: var(--accent-hover-bg); border: 1px solid var(--accent-active-bg); border-radius: 12px 12px 12px 4px; padding: 10px 14px; }
    .ai-msg-ai .ai-msg-body { padding: 2px 0; }
    .ai-msg-text { font-size: 12.5px; color: var(--text-secondary); line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
    :host ::ng-deep .ai-msg-text strong { color: var(--text-primary); font-weight: 600; }
    :host ::ng-deep .ai-msg-text em { color: var(--text-secondary); font-style: italic; }
    :host ::ng-deep .ai-msg-text .ai-h1 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 14px 0 8px; }
    :host ::ng-deep .ai-msg-text .ai-h2 { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 12px 0 6px; }
    :host ::ng-deep .ai-msg-text .ai-h3 { font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin: 10px 0 4px; }
    :host ::ng-deep .ai-msg-text code { background: var(--accent-hover-bg); padding: 2px 5px; border-radius: 4px; font-family: 'JetBrains Mono',monospace; font-size: 11px; color: var(--accent-purple); border: 1px solid var(--accent-active-bg); }
    :host ::ng-deep .ai-msg-text .code-block { background: var(--bg-panel); border: 1px solid var(--border-primary); border-radius: 10px; margin: 10px 0; overflow: hidden; white-space: normal; cursor: text; }
    :host ::ng-deep .ai-msg-text .code-block-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--bg-code); border-bottom: 1px solid var(--border-primary); }
    :host ::ng-deep .ai-msg-text .code-block-lang { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    :host ::ng-deep .ai-msg-text .code-block-copy { padding: 4px 12px; background: var(--accent-focus-bg); border: 1px solid var(--accent); border-radius: 5px; color: var(--accent); font-size: 11px; cursor: pointer !important; font-family: 'Inter', sans-serif; font-weight: 600; transition: all 0.15s; user-select: none; -webkit-user-select: none; pointer-events: auto; outline: none; }
    :host ::ng-deep .ai-msg-text .code-block-copy * { cursor: pointer !important; pointer-events: none; }
    :host ::ng-deep .ai-msg-text .code-block-copy:hover { background: var(--accent-focus-bg); border-color: var(--accent); color: var(--text-primary); }
    :host ::ng-deep .ai-msg-text .code-block-copy:active { transform: scale(0.96); }
    :host ::ng-deep .ai-msg-text .code-block-copy.copied { background: rgba(52,211,153,0.2); border-color: var(--success); color: var(--success); }
    :host ::ng-deep .ai-msg-text .code-block-copy.failed { background: rgba(239,68,68,0.2); border-color: var(--error); color: var(--error); }
    :host ::ng-deep .ai-msg-text .code-block-body { background: var(--bg-panel); padding: 12px 14px; margin: 0; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; color: var(--text-secondary); border: none; }
    :host ::ng-deep .ai-msg-text .code-block-body code { background: none; border: none; padding: 0; color: inherit; font-size: inherit; }

    /* Thinking */
    .ai-thinking { margin-bottom: 8px; cursor: pointer; }
    .ai-think-label { font-size: 10px; color: var(--text-dim); display: flex; align-items: center; gap: 4px; }
    .ai-think-pre { font-size: 10px; color: var(--text-ghost); margin: 4px 0 0; padding: 8px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-primary); white-space: pre-wrap; }

    /* Steps */
    .ai-steps { margin-bottom: 10px; padding: 8px 0; }
    .ai-step { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted); padding: 3px 0; }
    .ai-step svg { flex-shrink: 0; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    .ai-step-text { flex: 1; }
    .ai-step-meta { color: var(--text-dim); font-size: 10px; }

    /* Artifacts */
    .ai-artifact { margin: 10px 0; border: 1px solid var(--border-primary); border-radius: 10px; overflow: hidden; background: var(--bg-deep); }
    .art-top { display: flex; align-items: center; gap: 6px; padding: 7px 12px; background: var(--bg-elevated); border-bottom: 1px solid var(--border-primary); color: var(--text-faded); }
    .art-name { font-size: 11px; color: var(--text-secondary); font-weight: 600; font-family: 'JetBrains Mono',monospace; }
    .art-ext { font-size: 8px; color: var(--text-dim); background: var(--bg-code); padding: 1px 5px; border-radius: 4px; border: 1px solid var(--border-primary); }
    .art-btns { margin-left: auto; display: flex; gap: 4px; align-items: center; }
    .art-b { display: flex; align-items: center; gap: 3px; padding: 3px 8px; border: 1px solid var(--border-primary); border-radius: 5px; font-size: 9px; font-weight: 600; cursor: pointer; font-family: 'Inter',sans-serif; background: none; transition: all 0.15s; }
    .art-b.copy { color: var(--text-faded); }  .art-b.copy:hover { color: var(--accent); border-color: var(--accent); }
    .art-b.apply { color: var(--success); border-color: rgba(16,185,129,0.2); }  .art-b.apply:hover { background: rgba(16,185,129,0.08); }
    .art-b.revert { color: var(--error); border-color: rgba(239,68,68,0.2); }
    .art-check { color: var(--success); }
    .art-code { margin: 0; padding: 12px 14px; font-size: 11.5px; color: var(--text-secondary); white-space: pre-wrap; font-family: 'JetBrains Mono',monospace; max-height: 280px; overflow-y: auto; line-height: 1.55; background: var(--bg-deep); }

    /* Diff */
    .art-diff { max-height: 280px; overflow-y: auto; font-family: 'JetBrains Mono',monospace; font-size: 11px; background: var(--bg-deep); }
    .art-dl { padding: 0 12px; white-space: pre-wrap; word-break: break-all; line-height: 20px; }
    .art-dl .dl-sym { display: inline-block; width: 14px; font-weight: 700; }
    .dl-remove { background: rgba(239,68,68,0.05); color: var(--error); }
    .dl-add { background: rgba(16,185,129,0.05); color: var(--success); }
    .dl-same { color: var(--text-dimmer); }

    /* Typing */
    .ai-typing { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
    .ai-dots { display: flex; gap: 5px; padding: 8px 0; }
    .ai-dots span { width: 7px; height: 7px; background: var(--accent-purple); border-radius: 50%; animation: bounce 1.2s infinite; }
    .ai-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ai-dots span:nth-child(3) { animation-delay: 0.4s; }

    /* Streaming cursor */
    .ai-streaming { display: inline; }
    .ai-cursor {
      display: inline-block; width: 2px; height: 14px; background: var(--accent-purple);
      margin-left: 1px; vertical-align: text-bottom;
      animation: blink 0.8s step-end infinite;
    }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* Input */
    .ai-input-bar { display: flex; align-items: flex-end; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border-primary); background: var(--bg-panel); flex-shrink: 0; }
    .ai-input-field { flex: 1; background: var(--bg-input); border: 1px solid var(--border-primary); border-radius: 10px; color: var(--text-primary); font-size: 12.5px; padding: 10px 14px; resize: none; outline: none; font-family: 'Inter',sans-serif; max-height: 100px; min-height: 40px; line-height: 1.4; transition: border-color 0.15s; }
    .ai-input-field:focus { border-color: var(--accent); }
    .ai-input-field::placeholder { color: var(--text-ghost); }
    .ai-send { width: 40px; height: 40px; background: linear-gradient(135deg,var(--accent-deep),var(--accent-purple)); border: none; border-radius: 10px; color: #fff; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .ai-send:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
    .ai-send:disabled { opacity: 0.3; cursor: not-allowed; }

    .ai-icon.active { color: var(--accent-purple) !important; border-left-color: var(--accent-purple) !important; background: rgba(167,139,250,0.08) !important; }

    /* CONTEXT MENU */
    .ctx-menu {
      position: fixed; z-index: 9999; background: var(--bg-elevated); border: 1px solid var(--border-primary);
      border-radius: 10px; padding: 4px; min-width: 210px; box-shadow: 0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.1);
      animation: ctxIn 0.12s ease; backdrop-filter: blur(12px);
    }
    @keyframes ctxIn { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: none; } }
    .ctx-item {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 12px; background: none;
      border: none; border-radius: 6px; color: var(--text-muted); font-size: 12px; cursor: pointer; font-family: 'Inter',sans-serif;
      text-align: left; transition: all 0.1s;
    }
    .ctx-item svg { flex-shrink: 0; color: var(--text-dim); transition: color 0.1s; }
    .ctx-item:hover { background: var(--accent-active-bg); color: var(--text-primary); }
    .ctx-item:hover svg { color: var(--accent); }
    .ctx-item.danger { color: var(--error); }
    .ctx-item.danger svg { color: var(--error); }
    .ctx-item.danger:hover { background: rgba(239,68,68,0.08); }
    .ctx-divider { height: 1px; background: var(--border-primary); margin: 3px 6px; }

    .path-section { display: flex; align-items: center; gap: 8px; flex-shrink: 1; min-width: 0; overflow: hidden; }
    .path-label { font-size: 10px; color: var(--text-muted); white-space: nowrap; }

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

  get darkMode(): boolean { return this.themeService.isDark(); }
  @HostBinding('class.light-theme') get isLightTheme() { return this.themeService.isLight(); }

  sidebarCollapsed = false;
  bottomPanelOpen = true;
  bottomPanelHeight = 220;
  bottomTab: 'terminal' | 'problems' | 'debug' | 'search' | 'preview' = 'terminal';

  // Search state
  searchQuery = '';
  searchCase = false;
  searchRegex = false;
  readonly searchRunning = signal(false);
  readonly searchResults = signal<{ query: string; count: number; results: SearchHit[] }>({ query: '', count: 0, results: [] });

  // Preview state
  previewUrl = 'http://localhost:4200';
  readonly previewSrc = signal<SafeResourceUrl | null>(null);
  editedCode = '';
  highlightedCode = '';
  terminalInput = '';
  ctxMenu = { show: false, x: 0, y: 0, node: null as FolderNode | null };
  cursorLine = 1;
  aiPanelOpen = true;
  convoListOpen = false;
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
  folderCollecting = false;
  folderTruncated = false;
  historyHydrating = false;
  showNewProjectDialog = false;
  newProjectName = '';
  newProjectPath = '';
  // Source control state
  scPanelOpen = false;
  commitMessage = '';
  remoteUrl = '';
  gitStatusMsg = '';
  gitStatusError = false;
  pendingFileArray: File[] = [];

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
    public themeService: ThemeService,
    public searchSvc: SearchService,
    private sanitizer: DomSanitizer,
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
    // Theme is already applied globally by ThemeService; no per-component load needed.

    // Attach copy-button listener immediately (works even before any chat message renders)
    this.ensureCopyListener();

    // Restore persisted chat history AFTER the initial paint so LCP isn't blocked on
    // the backend round-trip. Chat messages would otherwise become the LCP element.
    this.historyHydrating = true;
    setTimeout(() => {
      this.ai.loadPersistedHistory()
        .catch(() => {})
        .finally(() => { this.historyHydrating = false; });
    }, 0);

    if (!this.scanner.report()) {
      // No project loaded — sidebar shows "Open Folder" button automatically
      return;
    }
    const file = this.selectedFile();
    if (file) { this.editedCode = file.content; this.updateHighlight(file.extension); }
  }

  goHome(): void { this.router.navigate(['/']); }
  goIssues(sev: string): void { this.router.navigate(['/scanner/issues', sev]); }
  goDefects(): void { this.router.navigate(['/defects']); }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  async openFolderDialog(): Promise<void> {
    // Prefer File System Access API when the browser supports it — gives real
    // write access to the exact folder the user picked (no path guessing).
    if (this.fs.supportsFsa()) {
      this.folderCollecting = true;
      try {
        const picked = await this.fs.pickDirectory();
        if (!picked) return; // user cancelled or denied permission
        this.folderTruncated = picked.truncated;
        this.pendingFolderName = picked.name;
        this.pendingFileArray = picked.files;
        this.showTrustDialog = true;
      } finally {
        this.folderCollecting = false;
      }
      return;
    }
    // Fallback: native <input webkitdirectory> (Firefox/Safari/older browsers).
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

      // Always try to locate the project on disk so the terminal has a cwd to cd into
      // (and `ng serve` / shell commands work). This is independent of file writes:
      // writes use the FSA handle when present; the terminal uses this path.
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

    // Bracket auto-close — `{` → `{|}`, `(` → `(|)`, also for [, ", ', `
    if (this.handleBracketAutoClose(event, textarea)) return;

    // Tab key -> snippet expand OR insert 2 spaces
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      if (this.tryExpandSnippet(textarea)) return;
      // Fallback: insert 2 spaces
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

  // ===== SNIPPETS =====
  // Map of trigger → template. `|` in the template marks where the cursor lands after expansion.
  private snippets: Record<string, string> = {
    'for':     'for (let i = 0; i < |.length; i++) {\n  \n}',
    'forof':   'for (const item of |) {\n  \n}',
    'foreach': '|.forEach((item, i) => {\n  \n});',
    'if':      'if (|) {\n  \n}',
    'ifelse':  'if (|) {\n  \n} else {\n  \n}',
    'fn':      'function |() {\n  \n}',
    'afn':     'const | = () => {\n  \n};',
    'log':     'console.log(|);',
    'tryc':    'try {\n  |\n} catch (err) {\n  console.error(err);\n}',
    'async':   'async function |() {\n  \n}',
    'await':   'const | = await ;',
    'imp':     "import { | } from '';",
    'exp':     'export const | = ;',
    'cmp':     "import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-|',\n  standalone: true,\n  template: ``,\n})\nexport class Component { }",
    'svc':     "import { Injectable } from '@angular/core';\n\n@Injectable({ providedIn: 'root' })\nexport class |Service { }",
    'route':   "router.get('/|', (req, res) => {\n  res.json({});\n});",
    'mdl':     'const | = new mongoose.Schema({\n  \n});',
  };

  private tryExpandSnippet(ta: HTMLTextAreaElement): boolean {
    const pos = ta.selectionStart;
    if (pos === ta.selectionEnd === false) return false;
    const upToCursor = ta.value.substring(0, pos);
    // Grab the last word-like token before the cursor
    const wordMatch = upToCursor.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!wordMatch) return false;
    const trigger = wordMatch[1];
    const template = this.snippets[trigger];
    if (!template) return false;

    // Preserve the current line's indent when expanding multi-line snippets.
    const lineStart = upToCursor.lastIndexOf('\n') + 1;
    const indent = upToCursor.slice(lineStart).match(/^[ \t]*/)?.[0] || '';
    const withIndent = template.replace(/\n/g, '\n' + indent);

    const cursorOffset = withIndent.indexOf('|');
    const expanded = cursorOffset >= 0 ? withIndent.replace('|', '') : withIndent;

    const wordStart = pos - trigger.length;
    const before = ta.value.substring(0, wordStart);
    const after = ta.value.substring(pos);
    ta.value = before + expanded + after;
    const newPos = cursorOffset >= 0 ? wordStart + cursorOffset : wordStart + expanded.length;
    ta.selectionStart = ta.selectionEnd = newPos;
    this.editedCode = ta.value;
    this.updateHighlight();
    return true;
  }

  // ===== GLOBAL SEARCH =====
  openSearchTab(): void {
    this.bottomPanelOpen = true;
    this.bottomTab = 'search';
  }

  async runSearch(): Promise<void> {
    const q = this.searchQuery.trim();
    if (!q) return;
    const root = this.scanner.projectBasePath();
    if (!root) {
      this.runner.addLine('stderr', 'Search needs a disk path — re-open the folder so we can locate it on disk first.');
      return;
    }
    this.searchRunning.set(true);
    try {
      const res = await this.searchSvc.search(q, root, { case: this.searchCase, regex: this.searchRegex });
      if (!res) {
        this.searchResults.set({ query: q, count: 0, results: [] });
        return;
      }
      this.searchResults.set({ query: res.query, count: res.count, results: res.results });
    } finally {
      this.searchRunning.set(false);
    }
  }

  /** Open the file from a search hit and scroll to the matched line. */
  openSearchHit(hit: SearchHit): void {
    // Translate backend relative path into the in-memory tree path.
    const folderName = this.scanner.report()?.tree?.name || '';
    const candidate = folderName ? folderName + '/' + hit.path.replace(/\\/g, '/') : hit.path.replace(/\\/g, '/');
    const file = this.scanner.report()?.files.find(f => f.path === candidate || f.path.endsWith('/' + hit.path.replace(/\\/g, '/')));
    if (!file) {
      this.runner.addLine('stderr', `Couldn't locate "${hit.path}" in the open project.`);
      return;
    }
    this.scanner.selectedFilePath.set(file.path);
    setTimeout(() => this.scrollToLine(hit.line), 80);
  }

  // ===== LIVE PREVIEW =====
  reloadPreview(): void {
    const url = this.previewUrl.trim();
    if (!url) { this.previewSrc.set(null); return; }
    // Bust the iframe cache so "reload" actually refetches.
    const withBust = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
    this.previewSrc.set(this.sanitizer.bypassSecurityTrustResourceUrl(withBust));
  }

  // ===== BRACKET AUTO-CLOSE =====
  private static BRACKET_PAIRS: Record<string, string> = {
    '{': '}', '[': ']', '(': ')', '"': '"', "'": "'", '`': '`',
  };

  private handleBracketAutoClose(event: KeyboardEvent, ta: HTMLTextAreaElement): boolean {
    // Don't trigger on IME composition or with modifiers (Ctrl/Cmd/Alt).
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
    const close = ScannerIdeComponent.BRACKET_PAIRS[event.key];
    if (!close) return false;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start == null || end == null) return false;
    const val = ta.value;

    // If the user typed a quote and the next char is already the same quote, just step over it.
    if ((event.key === '"' || event.key === "'" || event.key === '`') && val[start] === event.key && start === end) {
      event.preventDefault();
      ta.selectionStart = ta.selectionEnd = start + 1;
      return true;
    }

    // If there's a selection, wrap it: "foo" -> "(foo)".
    if (start !== end) {
      event.preventDefault();
      const wrapped = event.key + val.substring(start, end) + close;
      ta.value = val.substring(0, start) + wrapped + val.substring(end);
      ta.selectionStart = start + 1;
      ta.selectionEnd = end + 1;
      this.editedCode = ta.value;
      this.updateHighlight();
      return true;
    }

    // No selection: insert pair and place cursor between.
    event.preventDefault();
    ta.value = val.substring(0, start) + event.key + close + val.substring(start);
    ta.selectionStart = ta.selectionEnd = start + 1;
    this.editedCode = ta.value;
    this.updateHighlight();
    return true;
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

  toggleConvoList(): void {
    this.convoListOpen = !this.convoListOpen;
    if (this.convoListOpen) this.ai.refreshConversations();
  }

  onNewConversation(): void {
    this.ai.startNewConversation();
    this.convoListOpen = false;
  }

  async onSwitchConversation(id: string): Promise<void> {
    await this.ai.switchConversation(id);
    this.convoListOpen = false;
    setTimeout(() => this.scrollAiChat(), 50);
  }

  async onDeleteConversation(id: string, ev: Event): Promise<void> {
    ev.stopPropagation();
    await this.ai.deleteConversation(id);
  }

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
    const canWriteDisk = this.fs.hasHandle() || (!!basePath && this.fs.connected());

    // If artifact has a file path in the project, edit it
    if (art.file) {
      const file = this.scanner.report()?.files.find(f => f.path === art.file);
      if (file) {
        this._editOriginals.set(art.file, file.content);
        this.scanner.selectedFilePath.set(art.file);
        this.editedCode = art.content;
        this.updateHighlight(file.extension);
        if (canWriteDisk) {
          const ok = await this.fs.saveProjectFile(art.file, art.content, basePath || undefined);
          this.runner.addLine(ok ? 'info' : 'stderr', ok ? `Written to disk: ${art.file}` : `⚠️ Disk save failed: ${art.file}`);
        } else {
          this.runner.addLine('stderr', `Applied in memory only — re-open the folder with the picker to save to disk.`);
        }
      } else if (canWriteDisk) {
        // New file — saveProjectFile handles folder creation through the handle automatically.
        const ok = await this.fs.saveProjectFile(art.file, art.content, basePath || undefined);
        this.runner.addLine(ok ? 'info' : 'stderr', ok ? `Created: ${art.file}` : `⚠️ Disk save failed: ${art.file}`);
        // Add to IDE file tree so it appears in explorer
        this.scanner.addFileToReport(art.file, art.content);
        this.editedCode = art.content;
        this.highlightedCode = this.highlighter.highlight(art.content, art.language) + '\n';
      }
    } else if (canWriteDisk && art.title) {
      // No file path but has a title — create as new file relative to project root.
      const ok = await this.fs.saveProjectFile(art.title, art.content, basePath || undefined);
      this.runner.addLine(ok ? 'info' : 'stderr', ok ? `Created: ${art.title}` : `⚠️ Disk save failed: ${art.title}`);
      this.scanner.addFileToReport(art.title, art.content);
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

    // Write to disk: prefer FSA handle, fall back to backend absolute path.
    if (filePath) {
      const basePath = this.scanner.projectBasePath();
      const canWriteDisk = this.fs.hasHandle() || (!!basePath && this.fs.connected());
      if (canWriteDisk) {
        const ok = await this.fs.saveProjectFile(filePath, this.editedCode, basePath || undefined);
        this.runner.addLine(ok ? 'info' : 'stderr', ok ? `Accepted & saved: ${filePath}` : `Accept applied in memory but disk save failed: ${filePath}`);
      } else {
        this.runner.addLine('stderr', `Accepted in memory only — re-open the folder with the picker to enable disk writes.`);
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
