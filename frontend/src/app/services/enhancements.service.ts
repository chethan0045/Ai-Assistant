import { Injectable } from '@angular/core';

/**
 * Enhancement library — known feature patches for generated projects.
 * Each enhancement matches on keywords in the user's request and provides
 * a full replacement for the target file.
 */

export interface Enhancement {
  id: string;
  name: string;
  description: string;
  triggers: RegExp[];      // patterns that match user's enhancement request
  detectsProject: RegExp;  // confirms the current project is the right type
  targetFile: string;      // path relative to project root
  newContent: string;      // full replacement content
  changes: string[];       // bullet list for response
}

@Injectable({ providedIn: 'root' })
export class EnhancementsService {
  private enhancements: Enhancement[] = [
    // ===== CHESS: check/checkmate + promotion dialog =====
    {
      id: 'chess-check-promotion',
      name: 'Chess: Check/Checkmate Detection + Promotion Dialog',
      description: 'Ends game on checkmate/king capture, adds promotion piece selector',
      triggers: [
        /\bcheck\s*mate|checkmate|king.*(captur|safe)|game\s*(over|ends|stops)|promot(ion|e).*(dialog|choose|ask|select)/i,
        /asks?\s*for.*promo|choose.*promotion|promotion.*(choice|dialog|popup)/i,
        /game runs.*king.*captured|pawn.*automatically.*promotes/i,
      ],
      detectsProject: /PIECE_SYMBOLS|initialBoard|getLegalMoves/,
      targetFile: 'src/app/app.component.ts',
      changes: [
        'Added check detection (king under threat)',
        'Added checkmate detection (check + no legal moves)',
        'Game over screen when king captured or checkmated',
        'Promotion dialog — choose Queen, Rook, Bishop, or Knight',
        'Legal moves now exclude moves that leave own king in check',
      ],
      newContent: `import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type Piece = { type: PieceType; color: 'w' | 'b'; symbol: string } | null;

const PIECE_SYMBOLS: Record<PieceType, { w: string; b: string }> = {
  king:   { w: '\\u2654', b: '\\u265A' },
  queen:  { w: '\\u2655', b: '\\u265B' },
  rook:   { w: '\\u2656', b: '\\u265C' },
  bishop: { w: '\\u2657', b: '\\u265D' },
  knight: { w: '\\u2658', b: '\\u265E' },
  pawn:   { w: '\\u2659', b: '\\u265F' },
};

function initialBoard(): Piece[][] {
  const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  const board: Piece[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRow[c], color: 'b', symbol: PIECE_SYMBOLS[backRow[c]].b };
    board[1][c] = { type: 'pawn', color: 'b', symbol: PIECE_SYMBOLS['pawn'].b };
    board[6][c] = { type: 'pawn', color: 'w', symbol: PIECE_SYMBOLS['pawn'].w };
    board[7][c] = { type: backRow[c], color: 'w', symbol: PIECE_SYMBOLS[backRow[c]].w };
  }
  return board;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: \\\`
    <div class="page">
      <div class="game">
        <h1>\u265F Chess</h1>
        <div class="status">
          <span [class.active]="turn() === 'w' && !gameOver()">\u2654 White</span>
          <span class="vs">vs</span>
          <span [class.active]="turn() === 'b' && !gameOver()">\u265A Black</span>
        </div>
        <div *ngIf="statusMsg()" class="message" [class.check]="inCheck()" [class.checkmate]="gameOver()">{{ statusMsg() }}</div>

        <div class="board">
          <div *ngFor="let row of board(); let r = index" class="row">
            <div
              *ngFor="let cell of row; let c = index"
              class="cell"
              [class.light]="(r + c) % 2 === 0"
              [class.dark]="(r + c) % 2 === 1"
              [class.selected]="isSelected(r, c)"
              [class.target]="isValidMove(r, c)"
              [class.captured]="isValidMove(r, c) && cell"
              [class.check-cell]="isCheckedKing(r, c)"
              (click)="onCellClick(r, c)"
            >
              <span class="piece" *ngIf="cell" [class.white]="cell.color === 'w'" [class.black]="cell.color === 'b'">
                {{ cell.symbol }}
              </span>
              <span class="coord-r" *ngIf="c === 0">{{ 8 - r }}</span>
              <span class="coord-c" *ngIf="r === 7">{{ 'abcdefgh'[c] }}</span>
            </div>
          </div>
        </div>

        <div class="captures">
          <div class="cap-row"><span class="label">White captured:</span><span class="cap-pieces">{{ capturedByWhite().join(' ') || '\u2014' }}</span></div>
          <div class="cap-row"><span class="label">Black captured:</span><span class="cap-pieces">{{ capturedByBlack().join(' ') || '\u2014' }}</span></div>
        </div>

        <div class="actions">
          <button (click)="undo()" [disabled]="history().length === 0 || gameOver()">Undo</button>
          <button (click)="reset()">New Game</button>
        </div>
      </div>

      <!-- PROMOTION DIALOG -->
      <div class="overlay" *ngIf="promotion()">
        <div class="dialog">
          <h2>Promote Pawn</h2>
          <p>Choose a piece to promote to:</p>
          <div class="choices">
            <button *ngFor="let opt of ['queen','rook','bishop','knight']" (click)="choosePromotion(opt)">
              <span class="choice-symbol">{{ promotion()?.color === 'w' ? PIECE_SYMBOLS[opt].w : PIECE_SYMBOLS[opt].b }}</span>
              <span class="choice-name">{{ opt }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- GAME OVER DIALOG -->
      <div class="overlay" *ngIf="gameOver()">
        <div class="dialog">
          <h2>{{ gameOverTitle() }}</h2>
          <p>{{ gameOverSubtitle() }}</p>
          <button class="primary" (click)="reset()">New Game</button>
        </div>
      </div>
    </div>
  \\\`,
  styles: [\\\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .game { background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;max-width:640px;width:100%; }
    h1 { color:#fff;text-align:center;margin:0 0 12px;font-size:28px; }
    .status { display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:12px;font-size:16px;color:rgba(255,255,255,0.5); }
    .status .active { color:#fff;font-weight:700;background:rgba(129,140,248,0.2);padding:4px 12px;border-radius:8px; }
    .vs { font-size:12px;color:rgba(255,255,255,0.3); }
    .message { text-align:center;padding:10px;background:rgba(129,140,248,0.1);color:#a5b4fc;border-radius:8px;margin-bottom:12px;font-size:14px; }
    .message.check { background:rgba(239,68,68,0.15);color:#fca5a5;font-weight:700; }
    .message.checkmate { background:rgba(239,68,68,0.25);color:#fecaca;font-weight:700;font-size:16px; }
    .board { border:3px solid #1f2937;border-radius:8px;overflow:hidden;user-select:none;margin-bottom:16px; }
    .row { display:flex; }
    .cell { flex:1;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:44px;cursor:pointer;position:relative;transition:background 0.1s; }
    .cell.light { background:#f0d9b5; }
    .cell.dark { background:#b58863; }
    .cell.selected { background:#646d40 !important;box-shadow:inset 0 0 0 3px #fdd835; }
    .cell.target::after { content:'';position:absolute;width:24%;height:24%;background:rgba(0,0,0,0.35);border-radius:50%; }
    .cell.target.captured::after { width:100%;height:100%;background:transparent;border:4px solid rgba(220,53,69,0.6);border-radius:0;box-sizing:border-box; }
    .cell.check-cell { background:rgba(239,68,68,0.4) !important;animation:pulse 0.8s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { box-shadow:inset 0 0 0 3px rgba(239,68,68,0.5); } 50% { box-shadow:inset 0 0 0 3px rgba(239,68,68,0.9); } }
    .piece { z-index:1;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3)); }
    .piece.white { color:#fff;text-shadow:0 0 2px #000; }
    .piece.black { color:#000; }
    .coord-r, .coord-c { position:absolute;font-size:10px;font-weight:700;color:rgba(0,0,0,0.5); }
    .coord-r { top:2px;left:4px; }
    .coord-c { bottom:2px;right:4px; }
    .captures { padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;margin-bottom:12px; }
    .cap-row { display:flex;gap:8px;margin-bottom:4px;font-size:13px; }
    .cap-row:last-child { margin:0; }
    .label { color:rgba(255,255,255,0.5); }
    .cap-pieces { color:#fff;font-size:18px;letter-spacing:2px; }
    .actions { display:flex;gap:8px; }
    .actions button { flex:1;padding:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s; }
    .actions button:hover:not(:disabled) { background:rgba(129,140,248,0.2);border-color:#818cf8; }
    .actions button:disabled { opacity:0.4;cursor:not-allowed; }

    .overlay { position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:100; }
    .dialog { background:#1e1e2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center; }
    .dialog h2 { color:#fff;margin:0 0 8px;font-size:22px; }
    .dialog p { color:rgba(255,255,255,0.6);margin:0 0 20px; }
    .choices { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
    .choices button { display:flex;flex-direction:column;align-items:center;gap:4px;padding:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;cursor:pointer;transition:all 0.15s; }
    .choices button:hover { background:rgba(129,140,248,0.2);border-color:#818cf8;transform:translateY(-2px); }
    .choice-symbol { font-size:40px;line-height:1; }
    .choice-name { font-size:12px;color:rgba(255,255,255,0.6);text-transform:capitalize; }
    .dialog button.primary { padding:12px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px; }
    .dialog button.primary:hover { transform:translateY(-1px);box-shadow:0 8px 20px rgba(99,102,241,0.3); }

    @media (max-width:700px) { .cell { font-size:28px; } .game { padding:16px; } }
  \\\`]
})
export class AppComponent {
  PIECE_SYMBOLS = PIECE_SYMBOLS;
  board = signal<Piece[][]>(initialBoard());
  turn = signal<'w' | 'b'>('w');
  selected = signal<{ r: number; c: number } | null>(null);
  validMoves = signal<{ r: number; c: number }[]>([]);
  capturedByWhite = signal<string[]>([]);
  capturedByBlack = signal<string[]>([]);
  history = signal<{ board: Piece[][]; turn: 'w'|'b'; capW: string[]; capB: string[] }[]>([]);
  statusMsg = signal<string>('');
  promotion = signal<{ r: number; c: number; color: 'w'|'b' } | null>(null);
  gameOver = signal(false);
  gameOverTitle = signal('');
  gameOverSubtitle = signal('');
  inCheck = signal(false);

  isSelected(r: number, c: number): boolean {
    const s = this.selected();
    return s?.r === r && s?.c === c;
  }

  isValidMove(r: number, c: number): boolean {
    return this.validMoves().some(m => m.r === r && m.c === c);
  }

  isCheckedKing(r: number, c: number): boolean {
    if (!this.inCheck()) return false;
    const p = this.board()[r][c];
    return !!p && p.type === 'king' && p.color === this.turn();
  }

  onCellClick(r: number, c: number) {
    if (this.gameOver() || this.promotion()) return;
    const b = this.board();
    const piece = b[r][c];
    const sel = this.selected();

    if (sel && this.isValidMove(r, c)) {
      this.attemptMove(sel.r, sel.c, r, c);
      return;
    }

    if (piece && piece.color === this.turn()) {
      this.selected.set({ r, c });
      this.validMoves.set(this.getLegalMovesFiltered(r, c));
      return;
    }

    this.selected.set(null);
    this.validMoves.set([]);
  }

  attemptMove(fr: number, fc: number, tr: number, tc: number) {
    const newBoard = this.board().map(row => [...row]);
    const piece = newBoard[fr][fc];
    if (!piece) return;

    // Save snapshot for undo
    this.history.update(h => [...h, {
      board: this.board().map(row => [...row]),
      turn: this.turn(),
      capW: [...this.capturedByWhite()],
      capB: [...this.capturedByBlack()],
    }]);

    const captured = newBoard[tr][tc];
    if (captured) {
      if (captured.color === 'b') this.capturedByWhite.update(a => [...a, captured.symbol]);
      else this.capturedByBlack.update(a => [...a, captured.symbol]);

      // KING CAPTURE ends the game immediately (shouldn't happen with legal move filtering,
      // but handles edge case)
      if (captured.type === 'king') {
        newBoard[tr][tc] = piece;
        newBoard[fr][fc] = null;
        this.board.set(newBoard);
        this.endGame(\\\`\\\${piece.color === 'w' ? 'White' : 'Black'} wins!\\\`, 'King captured');
        return;
      }
    }

    newBoard[tr][tc] = piece;
    newBoard[fr][fc] = null;
    this.board.set(newBoard);
    this.selected.set(null);
    this.validMoves.set([]);

    // Check for promotion — pawn reached the last rank
    if (piece.type === 'pawn' && (tr === 0 || tr === 7)) {
      this.promotion.set({ r: tr, c: tc, color: piece.color });
      return; // Wait for user to choose
    }

    this.afterMove();
  }

  choosePromotion(type: string) {
    const p = this.promotion();
    if (!p) return;
    const t = type as PieceType;
    const newBoard = this.board().map(row => [...row]);
    newBoard[p.r][p.c] = { type: t, color: p.color, symbol: PIECE_SYMBOLS[t][p.color] };
    this.board.set(newBoard);
    this.promotion.set(null);
    this.afterMove();
  }

  afterMove() {
    this.turn.update(t => t === 'w' ? 'b' : 'w');
    const check = this.isKingInCheck(this.turn());
    this.inCheck.set(check);

    const legalMovesExist = this.hasAnyLegalMoves(this.turn());
    if (!legalMovesExist) {
      if (check) {
        const winner = this.turn() === 'w' ? 'Black' : 'White';
        this.endGame(\\\`Checkmate! \\\${winner} wins!\\\`, 'No legal moves — king is in check.');
      } else {
        this.endGame('Stalemate!', 'No legal moves — draw.');
      }
      return;
    }

    if (check) {
      this.statusMsg.set(\\\`\\\${this.turn() === 'w' ? 'White' : 'Black'} is in check!\\\`);
    } else {
      this.statusMsg.set('');
    }
  }

  endGame(title: string, subtitle: string) {
    this.gameOver.set(true);
    this.gameOverTitle.set(title);
    this.gameOverSubtitle.set(subtitle);
    this.statusMsg.set(title);
  }

  // Raw piece moves (not filtered for check)
  getRawMoves(r: number, c: number, board: Piece[][]): { r: number; c: number }[] {
    const piece = board[r][c];
    if (!piece) return [];
    const moves: { r: number; c: number }[] = [];
    const dir = piece.color === 'w' ? -1 : 1;
    const inside = (x: number) => x >= 0 && x < 8;
    const canTake = (x: number, y: number) => inside(x) && inside(y) && (!board[x][y] || board[x][y]!.color !== piece.color);

    if (piece.type === 'pawn') {
      if (inside(r + dir) && !board[r + dir][c]) {
        moves.push({ r: r + dir, c });
        const startRow = piece.color === 'w' ? 6 : 1;
        if (r === startRow && !board[r + 2 * dir][c]) moves.push({ r: r + 2 * dir, c });
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (inside(nr) && inside(nc) && board[nr][nc] && board[nr][nc]!.color !== piece.color) {
          moves.push({ r: nr, c: nc });
        }
      }
    } else if (piece.type === 'knight') {
      for (const [dr, dc] of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]]) {
        const nr = r + dr, nc = c + dc;
        if (canTake(nr, nc)) moves.push({ r: nr, c: nc });
      }
    } else if (piece.type === 'king') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (canTake(r + dr, c + dc)) moves.push({ r: r + dr, c: c + dc });
        }
      }
    } else {
      const dirs: number[][] = [];
      if (piece.type === 'rook' || piece.type === 'queen') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      if (piece.type === 'bishop' || piece.type === 'queen') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (inside(nr) && inside(nc)) {
          if (!board[nr][nc]) moves.push({ r: nr, c: nc });
          else { if (board[nr][nc]!.color !== piece.color) moves.push({ r: nr, c: nc }); break; }
          nr += dr; nc += dc;
        }
      }
    }
    return moves;
  }

  // Moves filtered so player doesn't put own king in check
  getLegalMovesFiltered(r: number, c: number): { r: number; c: number }[] {
    const piece = this.board()[r][c];
    if (!piece) return [];
    const raw = this.getRawMoves(r, c, this.board());
    return raw.filter(m => {
      const simBoard = this.board().map(row => [...row]);
      simBoard[m.r][m.c] = simBoard[r][c];
      simBoard[r][c] = null;
      return !this.isKingInCheckOnBoard(piece.color, simBoard);
    });
  }

  isKingInCheck(color: 'w' | 'b'): boolean {
    return this.isKingInCheckOnBoard(color, this.board());
  }

  isKingInCheckOnBoard(color: 'w' | 'b', board: Piece[][]): boolean {
    let kingR = -1, kingC = -1;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.color === color) { kingR = r; kingC = c; }
    }
    if (kingR === -1) return true; // king missing = captured = "in check"

    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color !== color) {
        const moves = this.getRawMoves(r, c, board);
        if (moves.some(m => m.r === kingR && m.c === kingC)) return true;
      }
    }
    return false;
  }

  hasAnyLegalMoves(color: 'w' | 'b'): boolean {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = this.board()[r][c];
      if (p && p.color === color) {
        if (this.getLegalMovesFiltered(r, c).length > 0) return true;
      }
    }
    return false;
  }

  undo() {
    const h = this.history();
    if (h.length === 0) return;
    const last = h[h.length - 1];
    this.board.set(last.board);
    this.turn.set(last.turn);
    this.capturedByWhite.set(last.capW);
    this.capturedByBlack.set(last.capB);
    this.history.update(arr => arr.slice(0, -1));
    this.selected.set(null);
    this.validMoves.set([]);
    this.statusMsg.set('');
    this.gameOver.set(false);
    this.inCheck.set(this.isKingInCheck(this.turn()));
  }

  reset() {
    this.board.set(initialBoard());
    this.turn.set('w');
    this.selected.set(null);
    this.validMoves.set([]);
    this.capturedByWhite.set([]);
    this.capturedByBlack.set([]);
    this.history.set([]);
    this.statusMsg.set('');
    this.promotion.set(null);
    this.gameOver.set(false);
    this.gameOverTitle.set('');
    this.gameOverSubtitle.set('');
    this.inCheck.set(false);
  }
}`,
    },
  ];

  /**
   * Find the best-matching enhancement for the user's request and the project's files.
   */
  detect(request: string, fileContents: { path: string; content: string }[]): Enhancement | null {
    for (const enh of this.enhancements) {
      // Must match at least one trigger phrase
      const triggered = enh.triggers.some(r => r.test(request));
      if (!triggered) continue;

      // Must detect the right project type in files
      const matchesProject = fileContents.some(f => enh.detectsProject.test(f.content));
      if (matchesProject) return enh;
    }
    return null;
  }

  /**
   * Get raw enhancement by ID (for testing / direct use).
   */
  get(id: string): Enhancement | null {
    return this.enhancements.find(e => e.id === id) || null;
  }

  list(): Enhancement[] {
    return this.enhancements;
  }
}
