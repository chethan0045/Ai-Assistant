import { Injectable, signal } from '@angular/core';

export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
  size: number;
  content: string;
  language: string;
  issues: FileIssue[];
  score: number;
}

export interface FileIssue {
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule: string;
}

export interface FolderNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  extension: string;
  children: FolderNode[];
  issues: number;
  expanded: boolean;
}

export interface ProjectReport {
  totalFiles: number;
  totalLines: number;
  totalIssues: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfos: number;
  overallScore: number;
  languageBreakdown: { language: string; count: number; lines: number }[];
  topIssues: { message: string; count: number; severity: string }[];
  files: ProjectFile[];
  tree: FolderNode;
}

interface Rule {
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  languages: string[];
}

@Injectable({ providedIn: 'root' })
export class ProjectScannerService {

  readonly report = signal<ProjectReport | null>(null);
  readonly selectedFilePath = signal<string | null>(null);
  readonly projectBasePath = signal<string>('');

  /**
   * Pending enhancement diffs: filePath → original content (before the enhancement was applied).
   * Used to show green/red diff highlights in the editor until the user accepts or undoes.
   */
  readonly pendingDiffs = signal<Map<string, string>>(new Map());

  /** Record an original version of a file when an enhancement is about to overwrite it. */
  markPendingDiff(filePath: string, originalContent: string): void {
    const next = new Map(this.pendingDiffs());
    if (!next.has(filePath)) next.set(filePath, originalContent);
    this.pendingDiffs.set(next);
  }

  /** Accept: clear diff, keep the new content. */
  acceptPendingDiff(filePath: string): void {
    const next = new Map(this.pendingDiffs());
    next.delete(filePath);
    this.pendingDiffs.set(next);
  }

  /** Get the original content for a file, or null if no pending diff. */
  getPendingOriginal(filePath: string): string | null {
    return this.pendingDiffs().get(filePath) || null;
  }

  private supportedExtensions = new Set([
    'ts', 'js', 'jsx', 'tsx', 'html', 'css', 'scss', 'json',
    'py', 'java', 'go', 'rs', 'rb', 'php', 'vue', 'svelte',
    'yaml', 'yml', 'xml', 'md', 'txt', 'sh', 'bat', 'sql',
    'env', 'gitignore', 'dockerignore', 'editorconfig'
  ]);

  private skipFolders = new Set([
    'node_modules', '.git', '.angular', 'dist', 'build', 'coverage',
    '.next', '.nuxt', '__pycache__', '.vscode', '.idea', 'vendor',
    '.cache', 'tmp', 'temp'
  ]);

  private rules: Rule[] = [
    // ===== SECURITY =====
    { pattern: /eval\s*\(/, message: 'eval() is a security risk — avoid executing arbitrary code', severity: 'error', rule: 'no-eval', languages: ['js', 'ts', 'jsx', 'tsx'] },
    { pattern: /innerHTML\s*=/, message: 'innerHTML assignment can cause XSS vulnerabilities', severity: 'error', rule: 'no-inner-html', languages: ['js', 'ts', 'jsx', 'tsx'] },
    { pattern: /\[innerHTML\]/, message: 'Angular innerHTML binding — ensure content is sanitized', severity: 'warning', rule: 'angular-inner-html', languages: ['html', 'ts'] },
    { pattern: /password\s*[:=]\s*['"][^'"]+['"]/, message: 'Hardcoded password detected — use environment variables', severity: 'error', rule: 'no-hardcoded-password', languages: ['js', 'ts', 'py', 'java', 'json'] },
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/, message: 'Hardcoded API key — use environment variables', severity: 'error', rule: 'no-hardcoded-api-key', languages: ['js', 'ts', 'py', 'java', 'json'] },
    { pattern: /secret\s*[:=]\s*['"][A-Za-z0-9+/=]{10,}['"]/, message: 'Possible hardcoded secret — use environment variables', severity: 'error', rule: 'no-hardcoded-secret', languages: ['js', 'ts', 'py', 'java'] },
    { pattern: /\bhttp:\/\/(?!localhost|127\.0\.0\.1)/, message: 'HTTP (insecure) URL found — use HTTPS', severity: 'warning', rule: 'prefer-https', languages: ['js', 'ts', 'html', 'json', 'py', 'java'] },

    // ===== JAVASCRIPT / TYPESCRIPT =====
    { pattern: /\bvar\s+/, message: '"var" is function-scoped — use "const" or "let" instead', severity: 'warning', rule: 'no-var', languages: ['js', 'ts', 'jsx', 'tsx'] },
    { pattern: /[^=!]==[^=]/, message: 'Loose equality (==) — use strict equality (===)', severity: 'warning', rule: 'eqeqeq', languages: ['js', 'ts', 'jsx', 'tsx'] },
    { pattern: /:\s*any\b/, message: '"any" type bypasses TypeScript checking — define proper types', severity: 'warning', rule: 'no-any', languages: ['ts', 'tsx'] },
    { pattern: /console\.(log|warn|error|debug|info)\s*\(/, message: 'Console statement — remove before production', severity: 'info', rule: 'no-console', languages: ['js', 'ts', 'jsx', 'tsx'] },
    { pattern: /debugger\b/, message: 'debugger statement left in code', severity: 'error', rule: 'no-debugger', languages: ['js', 'ts', 'jsx', 'tsx'] },
    { pattern: /TODO|FIXME|HACK|XXX/, message: 'TODO/FIXME comment — needs attention', severity: 'info', rule: 'no-todo', languages: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'html', 'css'] },
    { pattern: /\balert\s*\(/, message: 'alert() blocks the UI thread — use a modal/notification service', severity: 'warning', rule: 'no-alert', languages: ['js', 'ts', 'jsx', 'tsx'] },
    { pattern: /document\.(getElementById|querySelector|getElementsBy)/, message: 'Direct DOM manipulation — use framework methods instead', severity: 'warning', rule: 'no-direct-dom', languages: ['ts', 'tsx'] },
    { pattern: /new Promise\(.*\n?.*async/, message: 'Unnecessary Promise wrapper in async context', severity: 'info', rule: 'no-async-promise', languages: ['js', 'ts'] },
    { pattern: /setTimeout\s*\(\s*['"]/, message: 'String argument in setTimeout — use a function instead', severity: 'error', rule: 'no-implied-eval', languages: ['js', 'ts'] },
    { pattern: /catch\s*\(\s*\w+\s*\)\s*\{\s*\}/, message: 'Empty catch block — at least log the error', severity: 'warning', rule: 'no-empty-catch', languages: ['js', 'ts', 'jsx', 'tsx', 'java'] },

    // ===== ANGULAR SPECIFIC =====
    { pattern: /\.subscribe\s*\(/, message: 'Manual subscription — consider using async pipe or takeUntilDestroyed()', severity: 'info', rule: 'prefer-async-pipe', languages: ['ts'] },
    { pattern: /\*ngFor(?![\s\S]{0,50}trackBy)/, message: '*ngFor without trackBy — hurts performance on large lists', severity: 'warning', rule: 'ngfor-track-by', languages: ['html', 'ts'] },
    { pattern: /ngOnInit[\s\S]{0,200}\.subscribe/, message: 'Subscription in ngOnInit — make sure to unsubscribe in ngOnDestroy', severity: 'warning', rule: 'unsubscribe-on-destroy', languages: ['ts'] },
    { pattern: /\(click\)\s*=\s*"[^"]*\.[^"]*\.[^"]*"/, message: 'Complex expression in template event — move logic to component', severity: 'info', rule: 'no-complex-template-expression', languages: ['html'] },
    { pattern: /style\s*=\s*"[^"]{60,}"/, message: 'Long inline style — move to CSS file', severity: 'info', rule: 'no-long-inline-style', languages: ['html'] },

    // ===== NODE.JS / EXPRESS =====
    { pattern: /app\.(get|post|put|delete|patch)\s*\([^,]+,\s*async[^{]*\{(?:(?!try).)*$/, message: 'Async route without try/catch — unhandled rejection can crash server', severity: 'error', rule: 'async-route-handler', languages: ['js', 'ts'] },
    { pattern: /res\.(send|json|status)\s*\((?!.*return)/, message: 'Response sent without return — may send headers twice', severity: 'warning', rule: 'return-after-response', languages: ['js', 'ts'] },
    { pattern: /require\s*\(\s*['"]child_process['"]/, message: 'child_process usage — validate all inputs to prevent command injection', severity: 'error', rule: 'command-injection-risk', languages: ['js', 'ts'] },
    { pattern: /\.exec\s*\(\s*`/, message: 'Template literal in exec() — command injection risk', severity: 'error', rule: 'no-template-exec', languages: ['js', 'ts'] },

    // ===== MONGODB =====
    { pattern: /\.find\(\s*\{[^}]*\$where/, message: '$where operator can execute arbitrary JS — avoid it', severity: 'error', rule: 'no-where-operator', languages: ['js', 'ts'] },
    { pattern: /mongoose\.connect\((?![\s\S]*try)/, message: 'Database connection without error handling', severity: 'warning', rule: 'db-error-handling', languages: ['js', 'ts'] },
    { pattern: /findById\(req\.params/, message: 'findById without ID validation — CastError if format is wrong', severity: 'warning', rule: 'validate-object-id', languages: ['js', 'ts'] },

    // ===== CSS =====
    { pattern: /!important/, message: '!important override — consider fixing specificity instead', severity: 'info', rule: 'no-important', languages: ['css', 'scss'] },
    { pattern: /\*\s*\{[^}]*margin\s*:\s*0[^}]*padding\s*:\s*0/, message: 'Universal reset — prefer a proper CSS reset or normalize', severity: 'info', rule: 'no-universal-reset', languages: ['css', 'scss'] },

    // ===== JSON =====
    { pattern: /\/\/.*$/, message: 'Comments are not valid in JSON files', severity: 'error', rule: 'no-json-comments', languages: ['json'] },

    // ===== HTML =====
    { pattern: /<script\s+src\s*=\s*["']http:/, message: 'Loading script over HTTP — use HTTPS', severity: 'error', rule: 'no-http-script', languages: ['html'] },
    { pattern: /<img(?![^>]*alt\s*=)/, message: '<img> without alt attribute — accessibility issue', severity: 'warning', rule: 'img-alt', languages: ['html'] },
    { pattern: /<a(?![^>]*rel\s*=\s*["']noopener)(?=[^>]*target\s*=\s*["']_blank)/, message: 'target="_blank" without rel="noopener" — security risk', severity: 'warning', rule: 'no-target-blank', languages: ['html'] },

    // ===== PYTHON =====
    { pattern: /except\s*:/, message: 'Bare except catches all exceptions including SystemExit — specify exception type', severity: 'warning', rule: 'no-bare-except', languages: ['py'] },
    { pattern: /import\s+\*/, message: 'Wildcard import pollutes namespace', severity: 'warning', rule: 'no-wildcard-import', languages: ['py'] },
    { pattern: /print\s*\(/, message: 'print() statement — use logging module instead', severity: 'info', rule: 'no-print', languages: ['py'] },
  ];

  async scanFiles(fileList: FileList | File[]): Promise<ProjectReport> {
    const files: ProjectFile[] = [];
    const fileArray = Array.isArray(fileList) ? fileList : Array.from(fileList);

    // Extract root folder name from first file's webkitRelativePath
    let rootFolderName = 'Project';
    if (fileArray.length > 0) {
      const firstPath = (fileArray[0] as any).webkitRelativePath || '';
      rootFolderName = firstPath.split('/')[0] || 'Project';
    }

    const allTreeFiles: ProjectFile[] = []; // ALL files for tree (including unsupported)

    for (const file of fileArray) {
      const relativePath = (file as any).webkitRelativePath || file.name;
      if (this.shouldSkip(relativePath)) continue;

      const ext = this.getExtension(file.name);
      const canRead = this.supportedExtensions.has(ext) || ext === '';
      const tooLarge = file.size > 500 * 1024;

      if (canRead && !tooLarge) {
        // Supported file — read content, analyze
        try {
          const content = await this.readFile(file);
          const language = this.detectLanguage(ext);
          const issues = this.analyzeFile(content, ext, relativePath);
          const score = this.calculateFileScore(issues, content);
          const pf: ProjectFile = { path: relativePath, name: file.name, extension: ext, size: file.size, content, language, issues, score };
          files.push(pf);
          allTreeFiles.push(pf);
        } catch {}
      } else {
        // Unsupported or too large — still show in tree, just no content
        allTreeFiles.push({
          path: relativePath,
          name: file.name,
          extension: ext,
          size: file.size,
          content: tooLarge ? `// File too large to display (${(file.size / 1024).toFixed(0)} KB)` : `// Binary or unsupported file type (.${ext})`,
          language: this.detectLanguage(ext) || ext || 'binary',
          issues: [],
          score: 100,
        });
      }
    }

    // Build tree from ALL files (so folders with images/binaries still show)
    const tree = this.buildTree(allTreeFiles);
    tree.name = rootFolderName;
    tree.path = rootFolderName;

    // Pass allTreeFiles so clicking any file in tree can open it
    return this.buildReport(allTreeFiles, tree);
  }

  /**
   * Patch existing project — merge new files into report (replaces files with same path).
   */
  patchReport(folderName: string, newFiles: { path: string; content: string }[]): ProjectReport | null {
    const current = this.report();
    if (!current) return null;

    // Build map of existing files by relative path
    const fileMap = new Map<string, ProjectFile>();
    for (const f of current.files) {
      // Strip folder name prefix to get relative path
      const rel = f.path.startsWith(folderName + '/') ? f.path.slice(folderName.length + 1) : f.path;
      fileMap.set(rel, f);
    }

    // Apply patches — replace or add
    for (const nf of newFiles) {
      const name = nf.path.split('/').pop() || nf.path;
      const ext = this.getExtension(name);
      const language = this.detectLanguage(ext) || ext || 'text';
      fileMap.set(nf.path, {
        path: folderName + '/' + nf.path,
        name,
        extension: ext,
        size: nf.content.length,
        content: nf.content,
        language,
        issues: [],
        score: 100,
      });
    }

    const files = Array.from(fileMap.values());
    const tree = this.buildTree(files);
    tree.name = folderName;
    tree.path = folderName;
    return this.buildReport(files, tree);
  }

  /**
   * Scaffold project from a template — creates all files in memory and builds a report.
   */
  scaffoldFromTemplate(folderName: string, files: { path: string; content: string }[]): ProjectReport {
    const projectFiles: ProjectFile[] = files.map(f => {
      const fullPath = folderName + '/' + f.path;
      const name = f.path.split('/').pop() || f.path;
      const ext = this.getExtension(name);
      const language = this.detectLanguage(ext) || ext || 'text';
      return {
        path: fullPath,
        name,
        extension: ext,
        size: f.content.length,
        content: f.content,
        language,
        issues: [],
        score: 100,
      };
    });

    const tree = this.buildTree(projectFiles);
    tree.name = folderName;
    tree.path = folderName;
    return this.buildReport(projectFiles, tree);
  }

  /** Create a report for an empty folder — lets AI build from scratch */
  createEmptyReport(folderName: string): ProjectReport {
    const tree: FolderNode = { name: folderName, path: folderName, type: 'folder', extension: '', children: [], issues: 0, expanded: true };
    return {
      totalFiles: 0, totalLines: 0, totalIssues: 0, totalErrors: 0, totalWarnings: 0, totalInfos: 0,
      overallScore: 100, languageBreakdown: [], topIssues: [], files: [], tree,
    };
  }

  private shouldSkip(path: string): boolean {
    const parts = path.split('/');
    // Only skip known junk folders — NOT dotfiles like .env, .gitignore
    return parts.some(p => this.skipFolders.has(p));
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private getExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length <= 1) return '';
    return parts[parts.length - 1].toLowerCase();
  }

  private detectLanguage(ext: string): string {
    const map: Record<string, string> = {
      ts: 'TypeScript', tsx: 'TypeScript (React)', js: 'JavaScript', jsx: 'JavaScript (React)',
      html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON',
      py: 'Python', java: 'Java', go: 'Go', rs: 'Rust', rb: 'Ruby', php: 'PHP',
      vue: 'Vue', svelte: 'Svelte', yaml: 'YAML', yml: 'YAML',
      xml: 'XML', md: 'Markdown', sql: 'SQL', sh: 'Shell', bat: 'Batch',
      env: 'Environment', gitignore: 'Git Ignore', txt: 'Text'
    };
    return map[ext] || 'Other';
  }

  private analyzeFile(content: string, ext: string, path: string): FileIssue[] {
    const issues: FileIssue[] = [];
    const lines = content.split('\n');

    // Check for .env files with actual values
    if (path.endsWith('.env') && !path.endsWith('.env.example')) {
      const envPatterns = /(PASSWORD|SECRET|KEY|TOKEN)\s*=\s*\S+/i;
      lines.forEach((line, i) => {
        if (envPatterns.test(line) && !line.trim().startsWith('#')) {
          issues.push({
            line: i + 1,
            severity: 'error',
            message: 'Sensitive value in .env file — make sure this file is in .gitignore',
            rule: 'env-secrets'
          });
        }
      });
    }

    // Apply rules per line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comment lines
      if (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;

      for (const rule of this.rules) {
        if (!rule.languages.includes(ext)) continue;
        if (rule.pattern.test(line)) {
          // Avoid duplicating the same rule on the same line
          if (!issues.some(iss => iss.line === i + 1 && iss.rule === rule.rule)) {
            issues.push({
              line: i + 1,
              severity: rule.severity,
              message: rule.message,
              rule: rule.rule
            });
          }
        }
      }
    }

    // File-level checks
    if ((ext === 'ts' || ext === 'js') && content.length > 300) {
      if (lines.length > 300) {
        issues.push({ line: 0, severity: 'info', message: `File has ${lines.length} lines — consider splitting into smaller modules`, rule: 'file-too-long' });
      }

      const functionCount = (content.match(/function\s+\w+|=>\s*\{|(\w+)\s*\([^)]*\)\s*\{/g) || []).length;
      if (functionCount > 15) {
        issues.push({ line: 0, severity: 'info', message: `${functionCount} functions in one file — consider separating concerns`, rule: 'too-many-functions' });
      }
    }

    // Check package.json for outdated patterns
    if (path.endsWith('package.json')) {
      try {
        const pkg = JSON.parse(content);
        if (pkg.dependencies) {
          if (!pkg.dependencies['@angular/core'] && !pkg.dependencies['react'] && !pkg.dependencies['vue'] && !pkg.dependencies['express'] && !pkg.dependencies['next']) {
            // no specific check needed
          }
          // Check for known vulnerable or deprecated packages
          const deprecated = ['request', 'node-uuid', 'nomnom', 'domain', 'sys'];
          for (const dep of deprecated) {
            if (pkg.dependencies[dep] || (pkg.devDependencies && pkg.devDependencies[dep])) {
              issues.push({ line: 0, severity: 'warning', message: `Deprecated package "${dep}" — find a modern alternative`, rule: 'deprecated-package' });
            }
          }
        }
        if (!pkg.scripts?.test || pkg.scripts.test.includes('no test specified')) {
          issues.push({ line: 0, severity: 'info', message: 'No test script configured', rule: 'no-tests' });
        }
      } catch {
        issues.push({ line: 0, severity: 'error', message: 'Invalid JSON in package.json', rule: 'invalid-json' });
      }
    }

    return issues;
  }

  private calculateFileScore(issues: FileIssue[], content: string): number {
    let score = 100;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'error': score -= 10; break;
        case 'warning': score -= 5; break;
        case 'info': score -= 2; break;
      }
    }
    return Math.max(0, Math.min(100, score));
  }

  buildTree(files: ProjectFile[]): FolderNode {
    const root: FolderNode = { name: 'Project', path: '', type: 'folder', extension: '', children: [], issues: 0, expanded: true };

    for (const file of files) {
      const parts = file.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (isFile) {
          current.children.push({
            name: part,
            path: file.path,
            type: 'file',
            extension: file.extension,
            children: [],
            issues: file.issues.length,
            expanded: false
          });
          // Bubble up issue count
          let node: FolderNode | null = current;
          while (node) {
            node.issues += file.issues.length;
            node = null; // we'll handle parent tracking differently
          }
        } else {
          let folder = current.children.find(c => c.name === part && c.type === 'folder');
          if (!folder) {
            folder = { name: part, path: parts.slice(0, i + 1).join('/'), type: 'folder', extension: '', children: [], issues: 0, expanded: i < 2 };
            current.children.push(folder);
          }
          current = folder;
        }
      }
    }

    // Sort: folders first, then files alphabetically
    this.sortTree(root);
    // Recalculate folder issue counts
    this.countIssues(root);

    return root;
  }

  private sortTree(node: FolderNode): void {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) {
      if (child.type === 'folder') this.sortTree(child);
    }
  }

  private countIssues(node: FolderNode): number {
    if (node.type === 'file') return node.issues;
    let total = 0;
    for (const child of node.children) {
      total += this.countIssues(child);
    }
    node.issues = total;
    return total;
  }

  private buildReport(files: ProjectFile[], tree: FolderNode): ProjectReport {
    let totalLines = 0;
    let totalEpics = 0;      // Route groups / modules / main entry points
    let totalFeatures = 0;    // Components / route files / services
    let totalStories = 0;     // Functions / handlers / endpoints
    const langMap = new Map<string, { count: number; lines: number }>();
    const issueMap = new Map<string, { count: number; severity: string }>();

    for (const file of files) {
      const lines = file.content.split('\n').length;
      totalLines += lines;

      // Count ALM items
      const content = file.content;
      // Epics: main modules/route files/entry points
      if (content.includes('app.use(') || content.includes('Router()') || content.includes('@NgModule') || content.includes('loadComponent') || file.name === 'server.js' || file.name === 'index.js') {
        totalEpics++;
      }
      // Features: components, services, models
      if (content.includes('@Component') || content.includes('@Injectable') || content.includes('mongoose.model') || content.includes('new Schema') || file.path.includes('service')) {
        totalFeatures++;
      }
      // Stories: individual route handlers, functions, methods
      const routeCount = (content.match(/\.(get|post|put|delete|patch)\s*\(/g) || []).length;
      const funcCount = (content.match(/(?:async\s+)?function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s+)?\(/g) || []).length;
      totalStories += routeCount + Math.min(funcCount, 10);

      const lang = langMap.get(file.language) || { count: 0, lines: 0 };
      lang.count++;
      lang.lines += lines;
      langMap.set(file.language, lang);

      for (const issue of file.issues) {
        if (issue.severity === 'error') {} // keep for backward compat
        else if (issue.severity === 'warning') {}
        else {}

        const key = issue.message;
        const existing = issueMap.get(key) || { count: 0, severity: issue.severity };
        existing.count++;
        issueMap.set(key, existing);
      }
    }

    const totalIssues = totalEpics + totalFeatures + totalStories;
    const avgScore = files.length > 0
      ? Math.round(files.reduce((sum, f) => sum + f.score, 0) / files.length)
      : 100;

    const languageBreakdown = Array.from(langMap.entries())
      .map(([language, data]) => ({ language, ...data }))
      .sort((a, b) => b.lines - a.lines);

    const topIssues = Array.from(issueMap.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFiles: files.length,
      totalLines,
      totalIssues,
      totalErrors: totalEpics,       // Epics
      totalWarnings: totalFeatures,   // Features
      totalInfos: totalStories,       // User Stories
      overallScore: avgScore,
      languageBreakdown,
      topIssues,
      files,
      tree
    };
  }

  /** Add a new file to the existing report and tree */
  addFileToReport(filePath: string, content: string): void {
    const report = this.report();
    if (!report) return;

    const name = filePath.split(/[/\\]/).pop() || filePath;
    const ext = this.getExtension(name);
    const language = this.detectLanguage(ext);
    const issues = this.analyzeFile(content, ext, filePath);
    const score = this.calculateFileScore(issues, content);

    // Build relative path from project base
    const basePath = this.projectBasePath();
    let relativePath = filePath;
    if (basePath) {
      relativePath = filePath.replace(basePath.replace(/\\/g, '/'), '').replace(/\\/g, '/').replace(/^\//, '');
      // Prefix with project folder name
      const rootName = report.tree?.name || 'Project';
      relativePath = rootName + '/' + relativePath;
    }

    const newFile: ProjectFile = { path: relativePath, name, extension: ext, size: content.length, content, language, issues, score };

    // Add to files array
    const files = [...report.files, newFile];

    // Add to tree
    const tree = report.tree || { name: 'Project', path: '', type: 'folder' as const, extension: '', children: [], issues: 0, expanded: true };
    this.insertIntoTree(tree, relativePath, newFile);

    // Update report
    this.report.set({ ...report, files, tree, totalFiles: files.length, totalLines: files.reduce((s, f) => s + f.content.split('\n').length, 0) });
  }

  /** Remove a file/folder from the report */
  removeFromReport(relativePath: string): void {
    const report = this.report();
    if (!report) return;

    const files = report.files.filter(f => !f.path.startsWith(relativePath));
    const tree = report.tree;
    if (tree) this.removeFromTree(tree, relativePath);

    this.report.set({ ...report, files, tree: tree!, totalFiles: files.length });
  }

  private insertIntoTree(node: FolderNode, filePath: string, file: ProjectFile): void {
    const parts = filePath.split('/');
    let current = node;

    for (let i = (current.name === parts[0] ? 1 : 0); i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        if (!current.children.find(c => c.name === part)) {
          current.children.push({ name: part, path: filePath, type: 'file', extension: file.extension, children: [], issues: file.issues.length, expanded: false });
        }
      } else {
        let folder = current.children.find(c => c.name === part && c.type === 'folder');
        if (!folder) {
          folder = { name: part, path: parts.slice(0, i + 1).join('/'), type: 'folder', extension: '', children: [], issues: 0, expanded: true };
          current.children.push(folder);
        }
        current = folder;
      }
    }
    // Sort children
    current.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  private removeFromTree(node: FolderNode, targetPath: string): void {
    node.children = node.children.filter(c => c.path !== targetPath && !c.path.startsWith(targetPath + '/'));
    for (const child of node.children) {
      if (child.type === 'folder') this.removeFromTree(child, targetPath);
    }
  }
}
