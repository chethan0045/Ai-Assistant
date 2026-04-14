import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FileSystemService {

  private baseUrl = 'http://localhost:4100';
  readonly connected = signal(false);

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

  /** Write multiple files at once */
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
