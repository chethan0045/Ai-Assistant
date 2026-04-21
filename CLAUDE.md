# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Node.js + Express, port 4100)
```bash
cd backend
npm install
npm start                          # just the Node server (terminal-server.js); auto-falls back to 4101+ if 4100 taken
npm run dev                        # Node + Python AI module in one terminal (colored prefixes, Ctrl-C kills both)
npm run seed:all                   # runs every seed-*.js script in order (one-shot)
```
Requires `.env` with `MONGO_URI`, `JWT_SECRET`, `MAIL_USER`, `MAIL_PASS`. A fallback Mongo URI is hardcoded in `terminal-server.js`; the server stays up even if Mongo fails to connect (auth + persistence features degrade, everything else still works).

### Frontend (Angular 17, port 4200)
```bash
cd frontend
npm install
npm start                          # ng serve
npm run build                      # ng build
npm run watch                      # dev build with watch
```
No test runner is configured in either `package.json` — there is no `npm test`. For verification, run `npm run build` and check for type errors.

### Seed MongoDB knowledge bases (individually, run once)
```bash
cd backend
node seed-knowledge.js             # core 67-entry KB across 14 categories
node seed-fullstack.js
node seed-angular-concepts.js
node seed-production-patterns.js
node seed-ai-concepts.js           # RAG / embeddings / LLM / prompt-engineering explainers (8 entries)
node seed-defect-knowledge.js      # 20-entry defect RAG corpus (required for defect AI suggestions)
node seed-leetcode-1.js            # problem bank (1, 2, 3, 87, 112, 273)
node seed-leetcode-2.js
node seed-leetcode-3.js
node seed-leetcode-87.js
node seed-leetcode-112.js
node seed-leetcode-273.js
```

### One-off maintenance scripts (`backend/`)
- `analyze-defects-now.js` — re-runs RAG on every defect that lacks `aiSuggestions`. Safe to re-run.
- `backfill-embeddings.js` — universal embedding backfill across all 5 embed-able collections (KnowledgeEntry, DefectKnowledge, Defect, ChatMessage, LeetProblem). Skips docs that already have a vector. Run `BACKFILL_ONLY=knowledge,leetcode node backfill-embeddings.js` to scope to specific collections.
- `purge-defects.js` — deletes every document in the Defect collection (keeps `DefectKnowledge`). Destructive; confirm before running.

### Optional Python AI module (port 5100)
```bash
cd backend
python ai-server.py                # stdlib only, no pip install needed
```
`ai-server.py` is the HTTP entry; it imports the `backend/ai/` package (`session`, `engine`, `cache`, `telemetry`, `models`, `prompt`, `usage`, `client`) which handles conversation orchestration with token budgets + auto-compaction. `terminal-server.js` proxies `/api/ai-module/*` to this process when running. `npm run dev` starts it alongside the Node server; if Python isn't on PATH the dev script skips it gracefully and keeps the Node backend alive.

## Architecture

For detailed request-flow diagrams (command router priority chain, RAG path, code-gen pipeline, file-write two-backends logic, chat history, terminal WS), see [`workflow.md`](./workflow.md) at the repo root. It's the fastest way to build the mental model before editing `ai-engine.service.ts` or the backend routes.

This is a **single-backend-process, single-frontend-SPA** app that functions as an in-browser IDE + AI code assistant + defect tracker. There is no microservice split — understand these two files first:

- `backend/terminal-server.js` (~1500 lines): the entire Node backend surface. Hosts Express REST, a WebSocket shell server (spawns real child processes, streams stdout/stderr to the browser terminal), filesystem endpoints (`/api/write-file`, `/api/read-file`, `/api/list-dir`, `/api/delete`, `/api/find-folder`), AI endpoints (`/api/ai/*`), the DeepSeek bridge (`cloud-ai.service.js`), and proxies `/api/ai-module/*` to the optional Python server. Mounts every route module and the error-capture middleware at the top of the file.
- `frontend/src/app/scanner-ide.component.ts` (~3000 lines): the main IDE component. File tree, Monaco-style editor, terminal (WebSocket client), debugger, chat panel, issue list, scaffolding UI — all in one standalone component. Most user-visible behavior threads through here.

### Route modules (`backend/routes/`)
Mounted in `terminal-server.js` in this order: `auth.js`, `knowledge.js`, `git.js`, `leetcode.js`, `chat.js`, `defects.js`, `search.js`. After every route mount comes `errorCapture()` middleware so any thrown/`next(err)`'d error in an upstream handler lands in the Defect collection. Order matters — the error middleware must be last.

### Defect pipeline (the important flow to understand)
Defects come from three sources, all unified in the `Defect` model (`source` field distinguishes them):

1. **Runtime (Express)** — `backend/middleware/errorCapture.js` catches thrown errors in any Express handler, classifies via `services/defectRules.js` (16 regex patterns), persists, then kicks off background RAG via `services/defectRag.js`.
2. **Runtime (Angular)** — `frontend/src/app/services/global-error-handler.ts` hooks `ErrorHandler` + `window.error` + `unhandledrejection`, posts to `POST /api/defects/log` tagged with the currently-open project name.
3. **Static (scanner)** — the project scanner (`frontend/src/app/services/project-scanner.service.ts`, 30+ rules) produces `FileIssue[]`. The Defect Dashboard's "Sync from project scan" button flattens these and POSTs them to `/api/defects/sync-scan`, which **upserts** by `(projectName, source=static, filePath, lineNumber, ruleId)` so re-scans don't create duplicates.

Everything rendered at `/defects` comes from the unified Defect collection. The RAG layer (`defectRag.js` + `embeddings.js`) uses `@xenova/transformers` MiniLM (local, offline, ~25 MB cached under `backend/.models-cache/`) to match incoming errors against the curated `DefectKnowledge` corpus by cosine similarity.

### Request flow for AI features
Frontend services in `frontend/src/app/services/` are the API surface the IDE uses:
- `ai-engine.service.ts` (~3000 lines) — **offline-first** AI. Answers from local `knowledge-base.ts` and patterns before hitting the network. This is the primary "thinking" path.
- `knowledge-api.service.ts` — hits MongoDB-backed `/api/knowledge/*`.
- `defects.service.ts` — `/api/defects/*`. Log, analyze-without-persisting, sync-scan, list, stats, RAG, reclassify.
- `enhancements.service.ts`, `code-generator.service.ts`, `improver.service.ts`, `project-scanner.service.ts`, `project-templates.service.ts`, `algorithms.service.ts`, `debugger.service.ts`, `code-runner.service.ts`, `file-system.service.ts`, `git.service.ts`, `leetcode.service.ts`, `chat-history.service.ts`, `search.service.ts`, `theme.service.ts`, `syntax-highlight.service.ts` — each owns a narrow capability. The IDE component orchestrates them; **do not duplicate their logic inline**.

### Auth
JWT + email OTP via Nodemailer. Flow: `POST /api/auth/register` → OTP email → `POST /api/auth/verify-otp` returns JWT → stored client-side, used by `authGuard` in `app.routes.ts` to protect authed routes. `backend/middleware/auth.js` exports `requireAuth` used by route modules.

### MongoDB connection quirk
`terminal-server.js` sets custom DNS servers (`8.8.8.8`, `1.1.1.1`) before connecting, because SRV resolution for Atlas fails on some ISPs. Seed scripts and maintenance scripts do the same thing. **Do not remove this**; it is load-bearing on Windows dev machines.

### Frontend state model
Angular 17 standalone components with signals + RxJS. No NgModules. Routing is lazy-loaded via `loadComponent` in `app.routes.ts`. Current routes: `/` (home/login), `/scanner` (the IDE), `/scanner/issues/:severity` (issue detail), `/defects` (defect dashboard). All authed routes share `authGuard`.

### Global error handler registration
`app.config.ts` binds `GlobalErrorHandler` to Angular's `ErrorHandler` DI token so every uncaught Angular error becomes a defect automatically. Don't remove or gate this — the defect dashboard depends on it being always-on.

## Conventions observed in the code

- Backend is **CommonJS** (`require`), not ESM. The only ESM touchpoint is the dynamic `import('@xenova/transformers')` inside `services/embeddings.js` — that's intentional, keep it dynamic.
- Frontend services are `providedIn: 'root'` singletons.
- Large files (`scanner-ide.component.ts` ~3000 lines, `ai-engine.service.ts` ~3000 lines, `terminal-server.js` ~1500 lines, `defects-dashboard.component.ts` ~560 lines) are the norm here — the project favors big, cohesive files over many small ones. **Prefer editing in place over extracting**.
- **Offline/KB-first behavior is intentional**: the app must work without any external API key. Preserve this when adding AI features. New AI features should hit the local KB or MiniLM embeddings first; cloud calls are a fallback.
- Rule engines are regex-based and live next to the model they classify for (`backend/services/defectRules.js`, `frontend/src/app/services/project-scanner.service.ts`). When adding a new rule, match the existing shape — don't introduce AST parsing.
- Port detection: the frontend services probe `http://localhost:4100..4106/api/health` to find the backend. If you add a new service, copy the `ensureUrl()` pattern from `defects.service.ts` or `knowledge-api.service.ts`. Don't hardcode a port.
- Dedup strategy for defects: static-scan defects are upserted on `(projectName, source, filePath, lineNumber, ruleId)` via a partial index in `models/Defect.js`. Runtime defects are always inserted fresh (every error occurrence is worth tracking).
