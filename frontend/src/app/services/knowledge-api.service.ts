import { Injectable } from '@angular/core';

/**
 * Client for the MongoDB-backed knowledge base API (/api/knowledge/*).
 * Uses the full knowledge graph to answer questions and generate code.
 */

export interface GenerateCodeResponse {
  code: string;
  patterns_used: { topic: string; title: string; category: string }[];
  primary_pattern?: string;
  companions?: string[];
  message?: string;
}

export interface AnswerResponse {
  answer: string;
  topic?: string;
  source: string;
}

export interface VectorHit {
  topic: string;
  category: string;
  title: string;
  summary: string;
  details: string;
  examples?: string[];
  related?: string[];
  score: number;
}

export interface VectorSearchResponse {
  results: VectorHit[];
  count: number;
  source: string;
}

export interface RagAnswerResponse {
  answer: string;
  topic?: string;
  source: string;
  context?: { topic: string; title: string; score: number }[];
  topScore?: number;
}

@Injectable({ providedIn: 'root' })
export class KnowledgeApiService {
  private baseUrl = '';
  private detected = false;

  constructor() {
    this.detect();
  }

  private async detect(): Promise<void> {
    for (let p = 4100; p <= 4106; p++) {
      try {
        const r = await fetch(`http://localhost:${p}/api/health`);
        if (r.ok) { this.baseUrl = `http://localhost:${p}/api/knowledge`; this.detected = true; return; }
      } catch {}
    }
  }

  private async ensureUrl(): Promise<string> {
    if (!this.detected) await this.detect();
    return this.baseUrl;
  }

  async answer(question: string): Promise<AnswerResponse | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async generateCode(request: string): Promise<GenerateCodeResponse | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async searchVector(q: string, limit = 5): Promise<VectorSearchResponse | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/search-vector?q=${encodeURIComponent(q)}&limit=${limit}`);
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async ragAnswer(question: string, k = 3): Promise<RagAnswerResponse | null> {
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/rag-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, k }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async isConnected(): Promise<boolean> {
    await this.ensureUrl();
    return this.detected;
  }
}
