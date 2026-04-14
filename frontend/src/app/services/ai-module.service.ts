import { Injectable, signal } from '@angular/core';

/**
 * Angular service for the Python AI Module.
 *
 * Communicates with the backend proxy at /api/ai-module/* which
 * forwards requests to the Python ai-server.py (port 5100).
 */

// ===== TYPES =====

export interface AIProvider {
  configured: boolean;
  models: string[];
}

export interface AIModuleStatus {
  module: string;
  version: string;
  status: string;
  providers: Record<string, AIProvider>;
  sessions_active: number;
  cache_stats: { hits: number; misses: number };
  usage: { total_turns: number; total_cost_events: number };
}

export interface ModelInfo {
  alias: string;
  canonical: string;
  provider: string;
  max_output_tokens: number | null;
  context_window: number | null;
  auth_env?: string | null;
  base_url_env?: string | null;
  default_base_url?: string | null;
  pricing: {
    input_per_million: number;
    output_per_million: number;
    cache_write_per_million: number;
    cache_read_per_million: number;
  } | null;
}

export interface AISession {
  session_id: string;
  model: string;
  created_at_ms: number;
}

export interface TurnResponse {
  output: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  matched_commands: string[];
  matched_tools: string[];
  session_tokens: number;
}

export interface CostEstimate {
  total_tokens: number;
  total_cost_usd: number;
  formatted_cost: string;
  breakdown: {
    input: string;
    output: string;
    cache_write: string;
    cache_read: string;
  };
  summary: string[];
}

export interface CacheStats {
  tracked_requests: number;
  hits: number;
  misses: number;
  writes: number;
  unexpected_breaks: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
}

export interface CodeAnalysis {
  file: string;
  command: string;
  code_length: number;
  line_count: number;
  patterns: {
    functions: { name: string; line: number }[];
    classes: { name: string; line: number }[];
    imports: { statement: string; line: number }[];
    routes: { method: string; line: number }[];
    issues: { line: number; severity: string; message: string }[];
  };
  summary: string;
}

@Injectable({ providedIn: 'root' })
export class AIModuleService {

  readonly moduleStatus = signal<AIModuleStatus | null>(null);
  readonly models = signal<ModelInfo[]>([]);
  readonly currentSession = signal<AISession | null>(null);
  readonly loading = signal(false);

  private baseUrl = '';
  private backendPort = 4100;

  constructor() {
    this.detectBackend();
  }

  // ===== BACKEND DETECTION =====

  private async detectBackend(): Promise<void> {
    for (let port = 4100; port <= 4106; port++) {
      try {
        const res = await fetch(`http://localhost:${port}/api/health`);
        if (res.ok) {
          this.backendPort = port;
          this.baseUrl = `http://localhost:${port}/api/ai-module`;
          return;
        }
      } catch {}
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // ===== STATUS =====

  async getStatus(): Promise<AIModuleStatus> {
    const res = await fetch(this.url('/status'));
    const data = await res.json();
    this.moduleStatus.set(data);
    return data;
  }

  // ===== MODELS =====

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(this.url('/models'));
    const data = await res.json();
    this.models.set(data.models);
    return data.models;
  }

  async resolveModel(alias: string): Promise<ModelInfo> {
    const res = await fetch(this.url(`/models/${alias}`));
    return res.json();
  }

  // ===== SESSIONS =====

  async createSession(model: string = 'sonnet', maxTurns: number = 8): Promise<AISession> {
    this.loading.set(true);
    try {
      const res = await fetch(this.url('/session'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_turns: maxTurns }),
      });
      const session = await res.json();
      this.currentSession.set(session);
      return session;
    } finally {
      this.loading.set(false);
    }
  }

  async getSession(sessionId: string): Promise<any> {
    const res = await fetch(this.url(`/session/${sessionId}`));
    return res.json();
  }

  async sendMessage(sessionId: string, prompt: string, options: {
    matched_commands?: string[];
    matched_tools?: string[];
  } = {}): Promise<TurnResponse> {
    this.loading.set(true);
    try {
      const res = await fetch(this.url(`/session/${sessionId}/message`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          matched_commands: options.matched_commands || [],
          matched_tools: options.matched_tools || [],
        }),
      });
      return res.json();
    } finally {
      this.loading.set(false);
    }
  }

  async streamMessage(
    sessionId: string,
    prompt: string,
    onEvent: (event: any) => void,
  ): Promise<void> {
    const res = await fetch(this.url(`/session/${sessionId}/stream`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          onEvent(JSON.parse(data));
        } catch {}
      }
    }
  }

  // ===== PROMPT BUILDING =====

  async buildPrompt(options: {
    os?: string;
    output_style?: string;
    project_context?: {
      cwd?: string;
      current_date?: string;
      git_status?: string;
    };
    sections?: { title: string; content: string }[];
  }): Promise<{ prompt: string; length: number }> {
    const res = await fetch(this.url('/prompt/build'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return res.json();
  }

  // ===== USAGE & COST =====

  async estimateCost(usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    model?: string;
  }): Promise<CostEstimate> {
    const res = await fetch(this.url('/usage/estimate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usage),
    });
    return res.json();
  }

  // ===== CACHE =====

  async getCacheStats(): Promise<CacheStats> {
    const res = await fetch(this.url('/cache/stats'));
    return res.json();
  }

  // ===== CODE ANALYSIS =====

  async analyzeCode(code: string, filePath: string = '', command: string = 'analyze'): Promise<CodeAnalysis> {
    const res = await fetch(this.url('/analyze'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filePath, command }),
    });
    return res.json();
  }
}
