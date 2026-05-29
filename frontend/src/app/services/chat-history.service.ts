import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface PersistedMessage {
  _id?: string;
  conversationId?: string;
  role: 'user' | 'ai';
  text: string;
  artifacts?: any[];
  steps?: any[];
  thinking?: string;
  createdAt?: string;
}

export interface Conversation {
  _id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  isPinned?: boolean;
}

export interface ChatMemoryHit {
  id: string;
  conversationId?: string;
  role: 'user' | 'ai';
  text: string;
  createdAt: string;
  /** Final blended score: cosine + recency boost + pin boost. */
  score: number;
  /** Raw cosine similarity before boosts — useful for debugging relevance. */
  cosine?: number;
  /** True when this message lives in a pinned conversation. */
  pinned?: boolean;
}

/**
 * Backend-backed chat history + conversations. Requires an authenticated user.
 * Silently no-ops when logged out or backend unreachable — UI still works in memory.
 */
@Injectable({ providedIn: 'root' })
export class ChatHistoryService {
  private auth = inject(AuthService);
  private baseUrl = '';
  private detected = false;

  constructor() { this.detect(); }

  private async detect(): Promise<void> {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      this.baseUrl = '/api/chat'; this.detected = true; return;
    }
    for (let p = 4100; p <= 4106; p++) {
      try {
        const r = await fetch(`http://localhost:${p}/api/health`);
        if (r.ok) { this.baseUrl = `http://localhost:${p}/api/chat`; this.detected = true; return; }
      } catch {}
    }
    this.baseUrl = '/api/chat'; this.detected = true;
  }

  private async ensureUrl(): Promise<string> {
    if (!this.detected) await this.detect();
    return this.baseUrl;
  }

  private headers(): HeadersInit {
    const token = this.auth.token();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private available(): boolean {
    return this.auth.isLoggedIn() && !!this.auth.token();
  }

  // ===== CONVERSATIONS =====

  async listConversations(): Promise<Conversation[]> {
    if (!this.available()) return [];
    try {
      const url = await this.ensureUrl();
      if (!url) return [];
      const res = await fetch(`${url}/conversations`, { headers: this.headers() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.conversations || [];
    } catch { return []; }
  }

  async createConversation(title?: string): Promise<Conversation | null> {
    if (!this.available()) return null;
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/conversations`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  /**
   * Load messages in a conversation. Defaults to most-recent 30; pass limit=0 for the full thread.
   */
  async loadConversation(
    id: string,
    limit = 30,
  ): Promise<{ conversation: Conversation; messages: PersistedMessage[]; total: number; hasMore: boolean } | null> {
    if (!this.available()) return null;
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const qs = `?limit=${limit}`;
      const res = await fetch(`${url}/conversations/${id}/messages${qs}`, { headers: this.headers() });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async renameConversation(id: string, title: string): Promise<boolean> {
    if (!this.available()) return false;
    try {
      const url = await this.ensureUrl();
      if (!url) return false;
      const res = await fetch(`${url}/conversations/${id}`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify({ title }),
      });
      return res.ok;
    } catch { return false; }
  }

  /** Pin/unpin a conversation. Pinned threads float to the top AND get a score boost in memory recall. */
  async setPinned(id: string, isPinned: boolean): Promise<Conversation | null> {
    if (!this.available()) return null;
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/conversations/${id}`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async deleteConversation(id: string): Promise<boolean> {
    if (!this.available()) return false;
    try {
      const url = await this.ensureUrl();
      if (!url) return false;
      const res = await fetch(`${url}/conversations/${id}`, { method: 'DELETE', headers: this.headers() });
      return res.ok;
    } catch { return false; }
  }

  // ===== MESSAGES =====

  /**
   * Save a message into a conversation. If conversationId is omitted, the backend
   * creates a new conversation on the fly and returns its id.
   */
  async saveMessage(msg: PersistedMessage & { conversationId?: string }): Promise<{ message: PersistedMessage; conversationId: string } | null> {
    if (!this.available()) return null;
    try {
      const url = await this.ensureUrl();
      if (!url) return null;
      const res = await fetch(`${url}/message`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(msg),
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  async clearAllHistory(): Promise<boolean> {
    if (!this.available()) return false;
    try {
      const url = await this.ensureUrl();
      if (!url) return false;
      const res = await fetch(`${url}/history`, { method: 'DELETE', headers: this.headers() });
      return res.ok;
    } catch { return false; }
  }

  async searchMemory(q: string, limit = 5, conversationId?: string): Promise<ChatMemoryHit[]> {
    if (!this.available()) return [];
    try {
      const url = await this.ensureUrl();
      if (!url) return [];
      const qs = new URLSearchParams({ q, limit: String(limit) });
      if (conversationId) qs.set('conversationId', conversationId);
      const res = await fetch(`${url}/search-vector?${qs.toString()}`, {
        headers: this.headers(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    } catch { return []; }
  }
}
