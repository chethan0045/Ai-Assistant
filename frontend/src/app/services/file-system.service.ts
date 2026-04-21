import { Injectable, signal } from '@angular/core';

// Minimal subset of the File System Access API we touch. Avoids depending on DOM lib version.
type FsHandleKind = 'file' | 'directory';
interface FsWritable { write(data: string | BufferSource | Blob): Promise<void>; close(): Promise<void>; }
interface FsFileHandle { kind: 'file'; name: string; getFile(): Promise<File>; createWritable(): Promise<FsWritable>; }
interface FsDirectoryHandle {
  kind: 'directory';
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FsDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileHandle>;
  removeEntry?(name: string, options?: { recursive?: boolean }): Promise<void>;
  values(): AsyncIterable<FsFileHandle | FsDirectoryHandle>;
  requestPermission?(opts: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  queryPermission?(opts: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

@Injectable({ providedIn: 'root' })
export class FileSystemService {

  private baseUrl = 'http://localhost:4100';
  /** Public accessor so sibling services can reuse the detected backend URL without re-probing ports. */
  getBackendUrl(): string { return this.baseUrl; }
  readonly connected = signal(false);
  readonly handleActive = signal(false);
  readonly rootName = signal<string>('');

  /** Live progress while walking a picked folder with FSA. { count, truncated }. */
  readonly collectProgress = signal<{ count: number; truncated: boolean }>({ count: 0, truncated: false });

  /** Safety cap — some folders (QA artifact dirs, symlink loops) have millions of files. */
  private static MAX_FILES = 10000;

  private rootHandle: FsDirectoryHandle | null = null;

  constructor() {
    this.detectPort();
  }

  private async detectPort(): Promise<void> {
    for (let p = 4100; p < 4106; p++) {
      try {
        const res = await fetch(`http://localhost:${p}/api/health`, { signal: AbortSignal.timeout(500) });
        if (res.ok) { this.baseUrl = `http://localhost:${p}`; this.connected.set(true); return; }
      } catch {}
    }
  }

  // ===== FILE SYSTEM ACCESS API (browser-native, no path guessing) =====

  supportsFsa(): boolean {
    return typeof (window as any).showDirectoryPicker === 'function';
  }

  hasHandle(): boolean { return !!this.rootHandle; }

  /**
   * Prompt the user to pick a folder. Returns the root handle + name, or null.
   * Requests readwrite so subsequent writes don't re-prompt.
   */
  async pickDirectory(): Promise<{ handle: FsDirectoryHandle; name: string; files: File[]; truncated: boolean } | null> {
    if (!this.supportsFsa()) return null;
    try {
      const handle: FsDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      if (handle.requestPermission) {
        const state = await handle.requestPermission({ mode: 'readwrite' });
        if (state !== 'granted') return null;
      }
      this.rootHandle = handle;
      this.handleActive.set(true);
      this.rootName.set(handle.name);

      this.collectProgress.set({ count: 0, truncated: false });
      const files: File[] = [];
      const truncated = await this.collectFiles(handle, handle.name, files, 0);
      this.collectProgress.set({ count: files.length, truncated });

      return { handle, name: handle.name, files, truncated };
    } catch {
      return null;
    }
  }

  // Folders never worth walking — cuts collectFiles cost dramatically on large repos.
  // Mirrors ProjectScannerService.skipFolders so files that would be filtered out anyway
  // aren't even surfaced by the File System Access API.
  private static SKIP_DIRS = new Set([
    'node_modules', '.git', '.angular', '.models-cache',
    'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
    '__pycache__', '.vscode', '.idea', 'vendor', '.turbo',
    '.cache', '.parcel-cache', 'target', 'bin', 'obj', '.gradle',
    // QA / test-automation artifact dirs — commonly contain tens of thousands of files
    'test-results', 'allure-results', 'allure-report', 'playwright-report',
    'cypress-results', 'reports', 'screenshots', 'videos', 'downloads',
    'artifacts', 'logs', 'tmp', 'temp', '.pytest_cache', '.mypy_cache', '.tox',
    // Asset sinks that tend to hold thousands of SVGs / PNGs
    'assets-icons', 'icons', 'svg', 'fonts',
  ]);

  // Noisy generated files that never contain anything actionable.
  private static SKIP_FILE_SUFFIXES = [
    '.min.js', '.min.css', '.min.map', '.map', '.d.ts.map',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
    // Binary/asset types — surface them in the tree is not worth the `getFile()` cost
    // when there are thousands of them. Users rarely need to open a raw SVG in the IDE.
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg',
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
    '.class', '.jar', '.war', '.exe', '.dll', '.so', '.dylib', '.pyc',
    '.DS_Store', 'Thumbs.db',
  ];

  /**
   * Recursively walks the directory. Writes into `out`, returns true if we hit the cap
   * (so the caller can surface a truncation warning). Updates `collectProgress` every 50 files.
   */
  private async collectFiles(dir: FsDirectoryHandle, prefix: string, out: File[], depth: number): Promise<boolean> {
    // Hard depth cap so symlink loops don't recurse forever on Windows junctions.
    if (depth > 12) return false;

    for await (const entry of dir.values()) {
      if (out.length >= FileSystemService.MAX_FILES) return true;

      if (entry.kind === 'directory') {
        if (FileSystemService.SKIP_DIRS.has(entry.name)) continue;
        const childPath = `${prefix}/${entry.name}`;
        const hitCap = await this.collectFiles(entry as FsDirectoryHandle, childPath, out, depth + 1);
        if (hitCap) return true;
        continue;
      }

      if (entry.kind === 'file') {
        if (FileSystemService.SKIP_FILE_SUFFIXES.some(s => entry.name.endsWith(s) || entry.name === s)) continue;
        try {
          // Race getFile() against a 3s timeout — OneDrive placeholders, junction
          // targets, and locked files can otherwise hang forever here.
          const f = await Promise.race([
            (entry as FsFileHandle).getFile(),
            new Promise<File>((_, reject) =>
              setTimeout(() => reject(new Error('getFile timeout: ' + entry.name)), 3000)
            ),
          ]);
          const childPath = `${prefix}/${entry.name}`;
          Object.defineProperty(f, 'webkitRelativePath', { value: childPath, configurable: true });
          out.push(f);
          if (out.length % 50 === 0) {
            this.collectProgress.set({ count: out.length, truncated: false });
            // Yield to the browser every 50 files so UI stays responsive.
            await new Promise(r => setTimeout(r, 0));
          }
        } catch (err: any) {
          // Log so we can see which file tripped. Does not abort the walk.
          console.warn('[collectFiles] skipped:', prefix + '/' + entry.name, '-', err?.message || err);
        }
      }
    }
    return false;
  }

  /**
   * Save a file by project-relative path (e.g. "my-app/src/app/foo.ts" or "src/app/foo.ts").
   * Uses FSA handle if present, otherwise fails (caller should fall back to backend writeFile).
   */
  async writeViaHandle(projectRelativePath: string, content: string): Promise<boolean> {
    if (!this.rootHandle) return false;
    try {
      // Strip leading root-folder prefix if the caller included it.
      const rootName = this.rootHandle.name;
      let rel = projectRelativePath.replace(/\\/g, '/').replace(/^\/+/, '');
      if (rel.startsWith(rootName + '/')) rel = rel.slice(rootName.length + 1);

      const parts = rel.split('/').filter(Boolean);
      if (parts.length === 0) return false;
      const fileName = parts.pop()!;

      let dir: FsDirectoryHandle = this.rootHandle;
      for (const segment of parts) {
        dir = await dir.getDirectoryHandle(segment, { create: true });
      }
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('FSA write failed:', err);
      return false;
    }
  }

  /** Create an empty directory by project-relative path via the handle. */
  async createFolderViaHandle(projectRelativePath: string): Promise<boolean> {
    if (!this.rootHandle) return false;
    try {
      const rootName = this.rootHandle.name;
      let rel = projectRelativePath.replace(/\\/g, '/').replace(/^\/+/, '');
      if (rel.startsWith(rootName + '/')) rel = rel.slice(rootName.length + 1);
      const parts = rel.split('/').filter(Boolean);
      let dir: FsDirectoryHandle = this.rootHandle;
      for (const segment of parts) {
        dir = await dir.getDirectoryHandle(segment, { create: true });
      }
      return true;
    } catch { return false; }
  }

  // ===== UNIFIED SAVE =====

  /**
   * Save a project file. Prefers the FSA handle (reliable, no guessed path).
   * Falls back to backend absolute-path write when a basePath was detected server-side.
   */
  async saveProjectFile(projectRelativePath: string, content: string, basePath?: string): Promise<boolean> {
    if (this.rootHandle) {
      return this.writeViaHandle(projectRelativePath, content);
    }
    if (basePath) {
      const sep = basePath.includes('\\') ? '\\' : '/';
      let rel = projectRelativePath.replace(/\\/g, '/');
      // Strip leading root-folder segment if caller prefixed it
      const rootSegment = basePath.split(/[\\/]/).pop() || '';
      if (rootSegment && rel.startsWith(rootSegment + '/')) rel = rel.slice(rootSegment.length + 1);
      const fullPath = basePath + sep + rel.replace(/\//g, sep);
      return this.writeFile(fullPath, content);
    }
    return false;
  }

  async saveProjectFiles(files: { path: string; content: string }[], basePath?: string): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];
    for (const f of files) {
      const ok = await this.saveProjectFile(f.path, f.content, basePath);
      if (ok) success.push(f.path); else failed.push(f.path);
    }
    return { success, failed };
  }

  /** Clear the active handle (e.g. when user closes or switches projects). */
  releaseHandle(): void {
    this.rootHandle = null;
    this.handleActive.set(false);
    this.rootName.set('');
  }

  // ===== BACKEND FALLBACK (absolute path) =====

  async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/write-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content }),
      });
      return res.ok;
    } catch { return false; }
  }

  async createFolder(folderPath: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/create-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath }),
      });
      return res.ok;
    } catch { return false; }
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/read-file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      return data.content || null;
    } catch { return null; }
  }

  async listDir(dirPath: string): Promise<{ name: string; isDirectory: boolean; path: string }[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/list-dir?path=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      return data.items || [];
    } catch { return []; }
  }

  async deleteItem(targetPath: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath }),
      });
      return res.ok;
    } catch { return false; }
  }

  /** Write multiple absolute-path files (backend only). */
  async writeFiles(files: { path: string; content: string }[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];
    for (const f of files) {
      const ok = await this.writeFile(f.path, f.content);
      if (ok) success.push(f.path); else failed.push(f.path);
    }
    return { success, failed };
  }
}
