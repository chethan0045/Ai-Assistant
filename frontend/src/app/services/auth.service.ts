import { Injectable, signal } from '@angular/core';

export interface AuthUser {
  name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
  user?: AuthUser;
  email?: string;
  requiresVerification?: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AuthUser | null>(null);
  readonly token = signal<string | null>(null);
  readonly loggedIn = signal(false);

  private baseUrl = '';

  constructor() {
    this.detectBackend();
    this.loadFromStorage();
  }

  private async detectBackend(): Promise<void> {
    // In production (deployed), the backend serves the SPA from the same origin,
    // so API calls are relative. Only probe localhost ports during local dev,
    // where the Angular dev server (4200) and backend (4100+) are split.
    const host = window.location.hostname;
    const isLocalDev = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalDev) {
      this.baseUrl = '/api/auth';
      return;
    }
    for (let port = 4100; port <= 4106; port++) {
      try {
        const res = await fetch(`http://localhost:${port}/api/health`);
        if (res.ok) { this.baseUrl = `http://localhost:${port}/api/auth`; return; }
      } catch {}
    }
    // Fallback to same-origin if no local backend was found.
    this.baseUrl = '/api/auth';
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('ai_token');
    const userJson = localStorage.getItem('ai_user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.token.set(token);
        this.user.set(user);
        this.loggedIn.set(true);
      } catch { this.logout(); }
    }
  }

  private saveToStorage(token: string, user: AuthUser): void {
    localStorage.setItem('ai_token', token);
    localStorage.setItem('ai_user', JSON.stringify(user));
    this.token.set(token);
    this.user.set(user);
    this.loggedIn.set(true);
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return res.json();
  }

  async verifyOTP(email: string, otp: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data: AuthResponse = await res.json();
    if (data.token && data.user) {
      this.saveToStorage(data.token, data.user);
    }
    return data;
  }

  async resendOTP(email: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data: AuthResponse = await res.json();
    if (data.token && data.user) {
      this.saveToStorage(data.token, data.user);
    }
    return data;
  }

  async checkToken(): Promise<boolean> {
    const t = this.token();
    if (!t) return false;
    try {
      const res = await fetch(`${this.baseUrl}/me`, {
        headers: { 'Authorization': `Bearer ${t}` },
      });
      if (!res.ok) { this.logout(); return false; }
      const data = await res.json();
      this.user.set(data.user);
      this.loggedIn.set(true);
      return true;
    } catch { this.logout(); return false; }
  }

  logout(): void {
    localStorage.removeItem('ai_token');
    localStorage.removeItem('ai_user');
    this.token.set(null);
    this.user.set(null);
    this.loggedIn.set(false);
  }

  isLoggedIn(): boolean {
    return this.loggedIn();
  }
}
