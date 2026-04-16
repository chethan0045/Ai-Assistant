import { Injectable, signal } from '@angular/core';

export interface GitFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' | 'conflict';
  staged: boolean;
}

export interface GitStatus {
  initialized: boolean;
  branch: string | null;
  remote: string | null;
  ahead: number;
  behind: number;
  files: GitFile[];
}

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class GitService {
  readonly status = signal<GitStatus | null>(null);
  readonly commits = signal<GitCommit[]>([]);
  readonly loading = signal(false);
  readonly message = signal<string>('');

  private baseUrl = '';

  constructor() { this.detect(); }

  private async detect(): Promise<void> {
    for (let p = 4100; p <= 4106; p++) {
      try {
        const r = await fetch(`http://localhost:${p}/api/health`);
        if (r.ok) { this.baseUrl = `http://localhost:${p}/api/git`; return; }
      } catch {}
    }
  }

  private async ensureUrl() {
    if (!this.baseUrl) await this.detect();
  }

  async refresh(cwd: string): Promise<GitStatus | null> {
    await this.ensureUrl();
    if (!cwd || !this.baseUrl) return null;
    try {
      const r = await fetch(`${this.baseUrl}/status?cwd=${encodeURIComponent(cwd)}`);
      const data = await r.json() as GitStatus;
      this.status.set(data);
      return data;
    } catch { return null; }
  }

  async init(cwd: string): Promise<boolean> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd }),
      });
      return r.ok;
    } catch { return false; }
  }

  async stage(cwd: string, files?: string[]): Promise<boolean> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd, files }),
      });
      return r.ok;
    } catch { return false; }
  }

  async unstage(cwd: string, files?: string[]): Promise<boolean> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/unstage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd, files }),
      });
      return r.ok;
    } catch { return false; }
  }

  async discard(cwd: string, file: string): Promise<boolean> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/discard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd, file }),
      });
      return r.ok;
    } catch { return false; }
  }

  async commit(cwd: string, message: string, userName?: string, userEmail?: string): Promise<{ ok: boolean; error?: string }> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd, message, userName, userEmail }),
      });
      const data = await r.json();
      return r.ok ? { ok: true } : { ok: false, error: data.error };
    } catch (e: any) { return { ok: false, error: e?.message }; }
  }

  async push(cwd: string, remote = 'origin', branch = 'main', setUpstream = false): Promise<{ ok: boolean; error?: string }> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd, remote, branch, setUpstream }),
      });
      const data = await r.json();
      return r.ok ? { ok: true } : { ok: false, error: data.error };
    } catch (e: any) { return { ok: false, error: e?.message }; }
  }

  async pull(cwd: string, remote = 'origin', branch = 'main'): Promise<{ ok: boolean; error?: string }> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd, remote, branch }),
      });
      const data = await r.json();
      return r.ok ? { ok: true } : { ok: false, error: data.error };
    } catch (e: any) { return { ok: false, error: e?.message }; }
  }

  async fetch(cwd: string): Promise<boolean> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd }),
      });
      return r.ok;
    } catch { return false; }
  }

  async addRemote(cwd: string, name: string, url: string): Promise<boolean> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/remote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd, action: 'add', name, url }),
      });
      return r.ok;
    } catch { return false; }
  }

  async log(cwd: string, limit = 20): Promise<GitCommit[]> {
    await this.ensureUrl();
    try {
      const r = await fetch(`${this.baseUrl}/log?cwd=${encodeURIComponent(cwd)}&limit=${limit}`);
      const data = await r.json();
      this.commits.set(data.commits);
      return data.commits;
    } catch { return []; }
  }
}
