# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Node.js + Express, port 4100)
```bash
cd backend
npm install
npm start                          # runs terminal-server.js; auto-falls back to 4101+ if 4100 taken
```
Requires `.env` with `MONGO_URI`, `JWT_SECRET`, `MAIL_USER`, `MAIL_PASS`. A fallback Mongo URI is hardcoded in `terminal-server.js`; the server stays up even if Mongo fails to connect (auth features degrade).

### Frontend (Angular 17, port 4200)
```bash
cd frontend
npm install
npm start                          # ng serve
npm run build                      # ng build
npm run watch                      # dev build with watch
```
No test runner is configured in either `package.json` — there is no `npm test`.

### Seed MongoDB knowledge base (run once after DB is reachable)
```bash
cd backend
node seed-knowledge.js
node seed-fullstack.js
node seed-angular-concepts.js
node seed-production-patterns.js
```

### Optional Python AI module (port 5100)
```bash
cd backend
python ai-server.py                # stdlib only, no pip install needed
```
`terminal-server.js` proxies `/api/ai-module/*` to this process when running.

## Architecture

This is a **single-backend-process, single-frontend-SPA** app that functions as an in-browser IDE + AI code assistant. There is no microservice split — understand these two files first:

- `backend/terminal-server.js` (~1550 lines): the entire Node backend. Hosts Express REST, a WebSocket shell server (spawns real child processes, streams stdout/stderr to the browser terminal), filesystem endpoints (`/api/write-file`, `/api/read-file`, `/api/list-dir`, `/api/delete`, `/api/find-folder`), AI endpoints (`/api/ai/*`), a DeepSeek bridge (`cloud-ai.service.js`), and proxies `/api/ai-module/*` to the optional Python server. Route modules live in `backend/routes/` (`auth.js`, `knowledge.js`, `git.js`) and are mounted at the top of the file.
- `frontend/src/app/scanner-ide.component.ts` (~2225 lines): the main IDE component. File tree, Monaco-style editor, terminal (WebSocket client), debugger, chat panel, issue list, scaffolding UI — all in one standalone component. Most user-visible behavior threads through here.

### Request flow for AI features
Frontend services in `frontend/src/app/services/` are the API surface the IDE uses:
- `ai-engine.service.ts` (~2368 lines) — **offline-first** AI. Answers from local `knowledge-base.ts` and patterns before hitting the network. This is the primary "thinking" path.
- `knowledge-api.service.ts` — hits MongoDB-backed `/api/knowledge/*` for 67 curated entries across 14 categories.
- `enhancements.service.ts`, `code-generator.service.ts`, `improver.service.ts`, `project-scanner.service.ts`, `project-templates.service.ts`, `algorithms.service.ts`, `debugger.service.ts`, `code-runner.service.ts`, `file-system.service.ts`, `git.service.ts` — each owns a narrow capability (generate code, patch files, scan for issues, scaffold projects, etc.). The IDE component orchestrates them; do not duplicate their logic inline.

### Auth
JWT + email OTP via Nodemailer. Flow: `POST /api/auth/register` → OTP email → `POST /api/auth/verify-otp` returns JWT → stored client-side, used by `authGuard` in `app.routes.ts` to protect `/scanner`.

### MongoDB connection quirk
`terminal-server.js` sets custom DNS servers (`8.8.8.8`, `1.1.1.1`) before connecting, because SRV resolution for Atlas fails on some ISPs. Do not remove this; it is load-bearing on Windows dev machines.

### Frontend state model
Angular 17 standalone components with signals + RxJS. No NgModules. Routing is lazy-loaded via `loadComponent` in `app.routes.ts`. Only three routes exist: `/` (home/login), `/scanner` (the IDE), `/scanner/issues/:severity`.

## Conventions observed in the code

- Backend is CommonJS (`require`), not ESM.
- Frontend services are `providedIn: 'root'` singletons.
- Large files (`scanner-ide.component.ts`, `ai-engine.service.ts`, `terminal-server.js`) are the norm here — the project favors big, cohesive files over many small ones. Prefer editing in place over extracting.
- Offline/KB-first behavior is intentional: the app must work without any external API key. Preserve this when adding AI features.
