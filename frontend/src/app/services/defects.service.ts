import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface AiSuggestion {
  problem: string;
  solution: string;
  category?: string;
  score: number;
  source?: string;
}

export interface Defect {
  _id: string;
  userId?: string;
  projectName?: string;
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  category: string;
  rootCause?: string;
  suggestedFix?: string;
  source?: 'runtime' | 'static' | 'manual';
  filePath?: string;
  lineNumber?: number;
  ruleId?: string;
  status: 'open' | 'investigating' | 'fixed' | 'ignored';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  jiraKey?: string;
  aiSuggestions?: AiSuggestion[];
  aiAnalyzedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Issue shape accepted by POST /sync-scan — mirrors ProjectScannerService's FileIssue. */
export interface ScanIssuePayload {
  filePath: string;
  lineNumber: number;
  ruleId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DefectStats {
  total: number;
  byStatus: { _id: string; count: number }[];
  byCategory: { _id: string; count: number }[];
  bySeverity: { _id: string; count: number }[];
}

export interface AnalyzeResult {
  classification: {
    category: string;
    rootCause: string;
    suggestedFix: string;
    severity: string;
    ruleId: string | null;
  };
  suggestions: AiSuggestion[];
}

export interface FixProposal {
  summary: string;
  category: string;
  ruleId: string | null;
  rootCause: string;
  steps: string[];
  codeSnippets: { language: string; label: string; code: string }[];
  confidence: number;
  references: { source: string; problem: string; score: number }[];
}

export interface FixResponse {
  defectId: string;
  proposal: FixProposal;
}

export interface DefectFilter {
  status?: string;
  category?: string;
  severity?: string;
  source?: string;
  q?: string;
  /** Empty string selects unassigned defects; '__all__' bypasses the filter. */
  projectName?: string;
  limit?: number;
  skip?: number;
}

@Injectable({ providedIn: 'root' })
export class DefectsService {
  private auth = inject(AuthService);
  private baseUrl = '';
  private detected = false;

  constructor() { this.detect(); }

  private async detect(): Promise<void> {
    for (let p = 4100; p <= 4106; p++) {
      try {
        const r = await fetch(`http://localhost:${p}/api/health`);
        if (r.ok) { this.baseUrl = `http://localhost:${p}/api/defects`; this.detected = true; return; }
      } catch {}
    }
  }

  private async ensureUrl(): Promise<string> {
    if (!this.detected) await this.detect();
    return this.baseUrl;
  }

  private authHeaders(): HeadersInit {
    const token = this.auth.token();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /** Report an error from the frontend. No auth required — the server accepts anonymous posts. */
  async logError(payload: {
    message: string;
    stack?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    severity?: string;
    tags?: string[];
    projectName?: string;
  }): Promise<Defect | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  /** Bulk-push static-scan issues into the defect collection. Upserts by file+line+rule, so re-scans don't duplicate. */
  async syncScan(projectName: string, issues: ScanIssuePayload[]):
    Promise<{ inserted: number; updated: number; total: number } | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/sync-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, issues }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  /** Preview classification + RAG suggestions for an arbitrary error, without persisting. */
  async analyze(message: string, stack = ''): Promise<AnalyzeResult | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, stack }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async list(filter: DefectFilter = {}): Promise<{ items: Defect[]; total: number }> {
    try {
      const url = await this.ensureUrl();
      if (!url) return { items: [], total: 0 };
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(filter)) if (v !== undefined && v !== '') qs.set(k, String(v));
      const res = await fetch(`${url}?${qs.toString()}`, { headers: this.authHeaders() });
      if (!res.ok) return { items: [], total: 0 };
      return res.json();
    } catch { return { items: [], total: 0 }; }
  }

  async stats(projectName?: string): Promise<DefectStats | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const qs = projectName !== undefined ? `?projectName=${encodeURIComponent(projectName)}` : '';
      const res = await fetch(`${url}/stats${qs}`, { headers: this.authHeaders() });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async listProjects(): Promise<string[]> {
    try {
      const url = await this.ensureUrl();
      if (!url) return [];
      const res = await fetch(`${url}/projects`, { headers: this.authHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.projects || [];
    } catch { return []; }
  }

  async update(id: string, patch: Partial<Defect>): Promise<Defect | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/${id}`, {
        method: 'PATCH',
        headers: this.authHeaders(),
        body: JSON.stringify(patch),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async reclassify(id: string): Promise<Defect | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/${id}/reclassify`, { method: 'POST', headers: this.authHeaders() });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  /** Generate an AI-assisted fix proposal for a defect. Does not modify the defect — read-only. */
  async generateFix(id: string): Promise<FixResponse | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/${id}/fix`, { method: 'POST', headers: this.authHeaders() });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  /** Run or re-run semantic RAG over DefectKnowledge for a specific defect. */
  async runRag(id: string): Promise<Defect | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/${id}/rag`, { method: 'POST', headers: this.authHeaders() });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const url = await this.ensureUrl();
      if (!url) return false;
      const res = await fetch(`${url}/${id}`, { method: 'DELETE', headers: this.authHeaders() });
      return res.ok;
    } catch { return false; }
  }
}
