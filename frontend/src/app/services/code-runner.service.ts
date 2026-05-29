import { Injectable, signal, computed } from '@angular/core';

export interface BreakpointInfo { line: number; enabled: boolean; }
export interface DebugVariable { name: string; value: string; type: string; }
export interface DebugState {
  running: boolean; paused: boolean; currentLine: number;
  variables: DebugVariable[]; callStack: string[];
}
export interface TerminalLine {
  type: 'input' | 'stdout' | 'stderr' | 'info' | 'warn';
  text: string;
}

export interface TerminalSession {
  id: number;
  name: string;
  lines: TerminalLine[];
  cwd: string;
  connected: boolean;
  commandRunning: boolean;
  ws: WebSocket | null;
}

@Injectable({ providedIn: 'root' })
export class CodeRunnerService {

  readonly breakpoints = signal<Map<number, BreakpointInfo>>(new Map());
  readonly debugState = signal<DebugState>({ running: false, paused: false, currentLine: -1, variables: [], callStack: [] });

  /** All terminal sessions */
  readonly sessions = signal<TerminalSession[]>([]);
  /** Currently active terminal index */
  readonly activeIdx = signal<number>(0);

  /** Computed: active session's lines */
  readonly terminalLines = computed(() => {
    const s = this.sessions();
    const i = this.activeIdx();
    return s[i]?.lines || [];
  });
  /** Computed: active session's cwd */
  readonly cwd = computed(() => {
    const s = this.sessions();
    const i = this.activeIdx();
    return s[i]?.cwd || '';
  });
  /** Computed: active session's connected state */
  readonly connected = computed(() => {
    const s = this.sessions();
    const i = this.activeIdx();
    return s[i]?.connected || false;
  });
  /** Computed: active session's running state */
  readonly commandRunning = computed(() => {
    const s = this.sessions();
    const i = this.activeIdx();
    return s[i]?.commandRunning || false;
  });

  private nextId = 1;
  private basePort = 4100;
  private detectedPort = 0; // 0 = not yet found
  /** Resolved disk path of the open project; new terminals start here. */
  private projectCwd = '';
  private resolveStep: (() => void) | null = null;
  private abortController: AbortController | null = null;
  private originalConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };

  constructor() {
    this.detectPort().then(() => {
      this.createSession(); // Create first terminal
    });
  }

  // ===== PORT DETECTION =====

  /** True when running against a local dev backend (split ports). */
  private get isLocalHost(): boolean {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  }

  /** HTTP base for REST calls — empty string (same origin) when deployed. */
  private httpBase(): string {
    return this.isLocalHost ? `http://localhost:${this.detectedPort}` : '';
  }

  /** WebSocket URL for the shell — same origin (wss) when deployed. */
  private wsUrl(): string {
    if (this.isLocalHost) return `ws://localhost:${this.detectedPort}`;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}`;
  }

  private async detectPort(): Promise<void> {
    // Deployed: backend HTTP + WebSocket share this origin, so skip port probing.
    // detectedPort = -1 is a sentinel meaning "use same origin" (still truthy,
    // so the connect guards below proceed instead of showing JS-only mode).
    if (!this.isLocalHost) { this.detectedPort = -1; return; }
    for (let p = this.basePort; p < this.basePort + 6; p++) {
      try {
        const res = await fetch(`http://localhost:${p}/api/health`, { signal: AbortSignal.timeout(500) });
        if (res.ok) { this.detectedPort = p; return; }
      } catch {}
    }
    // No backend found
    this.detectedPort = 0;
  }

  // ===== SESSION MANAGEMENT =====

  /**
   * Set the open project's disk path. New terminals start here, and any
   * already-connected terminal is cd'd into it immediately. Call this when a
   * project folder is opened/resolved.
   */
  setProjectCwd(cwdPath: string): void {
    if (!cwdPath) return;
    this.projectCwd = cwdPath;
    this.sessions().forEach((s, idx) => {
      this.updateSession(idx, { cwd: cwdPath });
      if (s.ws && s.ws.readyState === WebSocket.OPEN) {
        s.ws.send(JSON.stringify({ type: 'cd', data: cwdPath }));
      }
    });
  }

  createSession(initialCwd?: string): TerminalSession {
    const session: TerminalSession = {
      id: this.nextId++,
      name: '',
      lines: [],
      cwd: initialCwd || this.projectCwd || '',
      connected: false,
      commandRunning: false,
      ws: null,
    };

    const current = this.sessions();
    this.sessions.set([...current, session]);
    const idx = this.sessions().length - 1;
    session.name = `Terminal ${idx + 1}`;
    this.activeIdx.set(idx);

    // Connect WebSocket for this session
    this.connectSession(idx);

    return session;
  }

  private connectSession(idx: number): void {
    if (!this.detectedPort) {
      this.addLineToSession(idx, 'info', 'JS mode — for shell: cd C:\\AI\\backend && node terminal-server.js');
      return;
    }

    const ws = new WebSocket(this.wsUrl());

    ws.onopen = () => {
      this.updateSession(idx, { connected: true, ws });
      this.addLineToSession(idx, 'info', 'Shell connected');
      // cd to initial cwd if set
      const s = this.sessions()[idx];
      if (s?.cwd) {
        ws.send(JSON.stringify({ type: 'cd', data: s.cwd }));
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'stdout': this.addLineToSession(idx, 'stdout', msg.data.replace(/\r\n/g, '\n').trimEnd()); break;
        case 'stderr': this.addLineToSession(idx, 'stderr', msg.data.replace(/\r\n/g, '\n').trimEnd()); break;
        case 'info': this.addLineToSession(idx, 'info', msg.data.replace(/\r\n/g, '\n').trimEnd()); break;
        case 'cwd': this.updateSession(idx, { cwd: msg.data }); break;
        case 'done': this.updateSession(idx, { commandRunning: false }); break;
        case 'clear': this.clearSessionLines(idx); break;
      }
    };

    ws.onclose = () => {
      this.updateSession(idx, { connected: false, ws: null });
    };

    ws.onerror = () => {};

    this.updateSession(idx, { ws });
  }

  switchSession(idx: number): void {
    if (idx >= 0 && idx < this.sessions().length) {
      this.activeIdx.set(idx);
    }
  }

  closeSession(idx: number): void {
    const all = [...this.sessions()];
    if (all.length <= 1) return; // Keep at least one
    const session = all[idx];
    if (session.ws) {
      try { session.ws.close(); } catch {}
    }
    all.splice(idx, 1);
    this.sessions.set(all);
    if (this.activeIdx() >= all.length) {
      this.activeIdx.set(all.length - 1);
    } else if (this.activeIdx() > idx) {
      this.activeIdx.set(this.activeIdx() - 1);
    }
  }

  // ===== SESSION HELPERS =====

  private updateSession(idx: number, updates: Partial<TerminalSession>): void {
    const all = [...this.sessions()];
    if (!all[idx]) return;
    all[idx] = { ...all[idx], ...updates };
    this.sessions.set(all);
  }

  private addLineToSession(idx: number, type: TerminalLine['type'], text: string): void {
    const all = [...this.sessions()];
    if (!all[idx]) return;
    const lines = [...all[idx].lines];
    for (const part of text.split('\n')) {
      if (part.length > 0) lines.push({ type, text: part });
    }
    if (lines.length > 1000) lines.splice(0, lines.length - 1000);
    all[idx] = { ...all[idx], lines };
    this.sessions.set(all);
  }

  private clearSessionLines(idx: number): void {
    this.updateSession(idx, { lines: [] } as any);
    // Need to properly clear
    const all = [...this.sessions()];
    if (!all[idx]) return;
    all[idx] = { ...all[idx], lines: [] };
    this.sessions.set(all);
  }

  // ===== COMMANDS (operate on active session) =====

  sendCommand(command: string): void {
    const idx = this.activeIdx();
    const session = this.sessions()[idx];
    if (!session) return;

    this.addLineToSession(idx, 'input', command);

    if (session.ws?.readyState === WebSocket.OPEN) {
      this.updateSession(idx, { commandRunning: true });
      session.ws.send(JSON.stringify({ type: 'command', data: command }));
    } else {
      this.executeLocal(idx, command);
    }
  }

  killProcess(): void {
    const idx = this.activeIdx();
    const session = this.sessions()[idx];
    if (session?.ws?.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: 'kill' }));
    }
    this.updateSession(idx, { commandRunning: false });
  }

  cdTo(folderPath: string): void {
    const idx = this.activeIdx();
    const session = this.sessions()[idx];
    if (session?.ws?.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: 'cd', data: folderPath }));
    }
  }

  reconnect(): void {
    this.detectPort().then(() => {
      const idx = this.activeIdx();
      this.connectSession(idx);
    });
  }

  /** Add a line to the currently active terminal */
  addLine(type: TerminalLine['type'], text: string): void {
    this.addLineToSession(this.activeIdx(), type, text);
  }

  clearTerminal(): void {
    this.clearSessionLines(this.activeIdx());
  }

  /** Find a project folder on disk and cd every terminal into it. */
  async cdToProjectByName(folderName: string): Promise<string | null> {
    if (!this.detectedPort) {
      // Try detecting again
      await this.detectPort();
    }
    try {
      const res = await fetch(`${this.httpBase()}/api/find-folder?name=${encodeURIComponent(folderName)}`);
      const data = await res.json();
      if (data.path) {
        // cd all terminals (now + any opened later) into the resolved path.
        this.setProjectCwd(data.path);
        return data.path;
      }
    } catch {}
    return null;
  }

  private executeLocal(idx: number, command: string): void {
    const cmd = command.trim();
    if (cmd === 'clear') { this.clearSessionLines(idx); return; }
    if (cmd === 'help') {
      this.addLineToSession(idx, 'info', 'JS mode — type JavaScript expressions');
      this.addLineToSession(idx, 'info', 'For shell: cd C:\\AI\\backend && node terminal-server.js');
      return;
    }
    if (cmd === 'reconnect') { this.reconnect(); return; }

    try {
      const result = eval(cmd);
      if (result !== undefined) {
        this.addLineToSession(idx, 'stdout', typeof result === 'string' ? result : JSON.stringify(result, null, 2));
      }
    } catch (err: any) {
      this.addLineToSession(idx, 'stderr', err?.message || String(err));
    }
  }

  // ===== BREAKPOINTS =====
  toggleBreakpoint(line: number): void {
    const map = new Map(this.breakpoints());
    if (map.has(line)) map.delete(line); else map.set(line, { line, enabled: true });
    this.breakpoints.set(map);
  }
  clearBreakpoints(): void { this.breakpoints.set(new Map()); }

  // ===== RUN / DEBUG (uses active terminal for output) =====
  async runCode(code: string): Promise<void> {
    const idx = this.activeIdx();
    const session = this.sessions()[idx];

    if (session?.connected && this.needsNode(code)) {
      this.addLineToSession(idx, 'info', '▶ Running via Node.js...');
      this.updateSession(idx, { commandRunning: true });
      const escaped = code.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      session.ws!.send(JSON.stringify({ type: 'command', data: `node -e "${escaped}"` }));
      return;
    }

    if (this.needsNode(code) && !session?.connected) {
      this.addLineToSession(idx, 'stderr', 'This code needs Node.js — start the backend');
      return;
    }

    this.addLineToSession(idx, 'info', '▶ Running in browser...');
    this.debugState.set({ running: true, paused: false, currentLine: -1, variables: [], callStack: [] });
    const restore = this.hookConsole(idx);
    try {
      const result = await eval(`(async function() {\n${code}\n})()`);
      if (result !== undefined) this.addLineToSession(idx, 'stdout', '→ ' + this.stringify(result));
      this.addLineToSession(idx, 'info', '✓ Finished');
    } catch (err: any) {
      this.addLineToSession(idx, 'stderr', '✗ ' + (err?.message || String(err)));
    } finally {
      restore();
      this.debugState.set({ running: false, paused: false, currentLine: -1, variables: [], callStack: [] });
    }
  }

  async debugCode(code: string): Promise<void> {
    const idx = this.activeIdx();
    this.abortController = new AbortController();
    this.addLineToSession(idx, 'info', '⬤ Debug started');
    const bpLines = new Set(Array.from(this.breakpoints().entries()).filter(([_, bp]) => bp.enabled).map(([l]) => l));

    if (bpLines.size === 0) { this.addLineToSession(idx, 'warn', '⚠ No breakpoints — running normally'); await this.runCode(code); return; }
    if (this.needsNode(code)) { this.addLineToSession(idx, 'warn', '⚠ Debugger only works for browser JS'); return; }

    const lines = code.split('\n');
    const restore = this.hookConsole(idx);
    let accumulated = '';
    try {
      for (let i = 0; i < lines.length; i++) {
        if (this.abortController?.signal.aborted) break;
        accumulated += lines[i] + '\n';
        if (bpLines.has(i + 1)) {
          this.debugState.set({ running: true, paused: true, currentLine: i + 1, variables: this.extractVars(accumulated), callStack: [`<script>:${i + 1}`] });
          this.addLineToSession(idx, 'info', `⏸ Paused at line ${i + 1}`);
          await this.waitForStep();
          if (this.abortController?.signal.aborted) break;
        }
      }
      if (!this.abortController?.signal.aborted) {
        this.debugState.update(s => ({ ...s, paused: false, currentLine: -1 }));
        const result = await eval(`(async function() {\n${code}\n})()`);
        if (result !== undefined) this.addLineToSession(idx, 'stdout', '→ ' + this.stringify(result));
        this.addLineToSession(idx, 'info', '✓ Debug finished');
      }
    } catch (err: any) {
      this.addLineToSession(idx, 'stderr', '✗ ' + (err?.message || String(err)));
    } finally {
      restore();
      this.debugState.set({ running: false, paused: false, currentLine: -1, variables: [], callStack: [] });
    }
  }

  stepOver(): void { if (this.resolveStep) { this.resolveStep(); this.resolveStep = null; } }
  continueExecution(): void { this.stepOver(); }
  stopDebug(): void {
    this.abortController?.abort();
    this.stepOver();
    this.debugState.set({ running: false, paused: false, currentLine: -1, variables: [], callStack: [] });
  }

  private needsNode(code: string): boolean {
    return /\brequire\s*\(/.test(code) || /^import\s+.+\s+from\s+/m.test(code) || /\bprocess\.\b/.test(code) || /\b__dirname\b/.test(code);
  }
  private waitForStep(): Promise<void> { return new Promise(resolve => { this.resolveStep = resolve; }); }

  private hookConsole(idx: number): () => void {
    const self = this;
    const orig = { ...this.originalConsole };
    console.log = (...a: any[]) => { self.addLineToSession(idx, 'stdout', a.map(x => self.stringify(x)).join(' ')); orig.log.apply(console, a); };
    console.warn = (...a: any[]) => { self.addLineToSession(idx, 'warn', a.map(x => self.stringify(x)).join(' ')); orig.warn.apply(console, a); };
    console.error = (...a: any[]) => { self.addLineToSession(idx, 'stderr', a.map(x => self.stringify(x)).join(' ')); orig.error.apply(console, a); };
    console.info = (...a: any[]) => { self.addLineToSession(idx, 'info', a.map(x => self.stringify(x)).join(' ')); orig.info.apply(console, a); };
    return () => { console.log = orig.log; console.warn = orig.warn; console.error = orig.error; console.info = orig.info; };
  }

  private extractVars(code: string): DebugVariable[] {
    const vars: DebugVariable[] = [];
    const re = /(?:const|let|var)\s+(\w+)\s*=\s*(.+?)(?:;|$)/gm;
    let m;
    while ((m = re.exec(code)) !== null) {
      let val = m[2].trim().replace(/;$/, '');
      let type = 'unknown';
      if (/^['"`]/.test(val)) type = 'string'; else if (/^\d/.test(val)) type = 'number';
      else if (val === 'true' || val === 'false') type = 'boolean';
      else if (val.startsWith('[')) type = 'array'; else if (val.startsWith('{')) type = 'object';
      else if (val.includes('=>') || val.startsWith('function')) type = 'function';
      const idx = vars.findIndex(v => v.name === m![1]);
      if (idx >= 0) vars[idx] = { name: m[1], value: val, type }; else vars.push({ name: m[1], value: val, type });
    }
    return vars;
  }

  private stringify(val: any): string {
    if (val === undefined) return 'undefined'; if (val === null) return 'null';
    if (typeof val === 'string') return val; if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;
    try { return JSON.stringify(val, null, 2); } catch { return String(val); }
  }
}
