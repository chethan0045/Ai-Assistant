import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface SearchHit {
  path: string;
  line: number;
  text: string;
}

export interface SearchResponse {
  query: string;
  root: string;
  count: number;
  results: SearchHit[];
}

/** A single hit from the cross-collection vector search. */
export interface VectorHit {
  source: 'knowledge' | 'defect-knowledge' | 'defects' | 'chat' | 'leetcode' | 'direct-answers';
  id: string;
  title: string;
  snippet: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface VectorSearchResponse {
  query: string;
  authed: boolean;
  collectionsSearched: string[];
  countsBySource: Record<string, number>;
  total: number;
  results: VectorHit[];
}

export interface VectorSearchOpts {
  /** Top-k per collection (1-20). Default 5. */
  k?: number;
  /** Minimum cosine similarity to keep. Default 0.3. */
  minScore?: number;
  /** Which collections to search. Default: all four. */
  collections?: Array<'knowledge' | 'defect-knowledge' | 'defects' | 'chat' | 'leetcode' | 'direct-answers'>;
}

/**
 * Global search across the currently-open project folder.
 * Backend does the grep (honors skip lists, caps matches) — front-end just renders.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private auth = inject(AuthService);
  private baseUrl = 'http://localhost:4100';
  private detected = false;

  constructor() { this.detect(); }

  private async detect(): Promise<void> {
    for (let p = 4100; p <= 4106; p++) {
      try {
        const r = await fetch(`http://localhost:${p}/api/health`);
        if (r.ok) { this.baseUrl = `http://localhost:${p}`; this.detected = true; return; }
      } catch {}
    }
  }

  async search(q: string, root: string, opts: { case?: boolean; regex?: boolean } = {}): Promise<SearchResponse | null> {
    if (!this.detected) await this.detect();
    if (!this.detected) return null;
    try {
      const qs = new URLSearchParams({ q, root });
      if (opts.case) qs.set('case', '1');
      if (opts.regex) qs.set('regex', '1');
      const res = await fetch(`${this.baseUrl}/api/search?${qs.toString()}`);
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  /**
   * Cross-collection semantic search over every embedded MongoDB collection.
   * Public collections (knowledge, defect-knowledge) are always searched.
   * User-scoped collections (defects, chat) join automatically when logged in — the
   * JWT gets passed to the backend which opportunistically widens the result set.
   */
  async vectorSearch(q: string, opts: VectorSearchOpts = {}): Promise<VectorSearchResponse | null> {
    if (!this.detected) await this.detect();
    if (!this.detected) return null;
    try {
      const qs = new URLSearchParams({ q });
      if (opts.k !== undefined) qs.set('k', String(opts.k));
      if (opts.minScore !== undefined) qs.set('minScore', String(opts.minScore));
      if (opts.collections && opts.collections.length) {
        qs.set('collections', opts.collections.join(','));
      }
      const token = this.auth.token();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${this.baseUrl}/api/search/vector?${qs.toString()}`, { headers });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }
}
