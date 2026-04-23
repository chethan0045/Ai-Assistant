# AI — Angular + Express Code Assistant IDE

A full-stack AI code assistant with an in-browser IDE, offline knowledge base, a defect dashboard with RAG-backed root-cause suggestions, and MongoDB-backed code generation.

## Features

- **In-browser IDE** — file explorer, code editor with syntax highlighting, integrated terminal (real shell via WebSocket), debugger
- **Offline AI chat** — answers 60+ programming topics with zero API keys; falls back to MongoDB KB, then to cloud bridge if configured
- **MongoDB knowledge base** — 67 curated entries across 14 categories, plus a 20-entry defect knowledge base for RAG retrieval
- **Project scaffolding** — generates full Angular + Express + MongoDB projects from purpose-specific templates (Todo, Calculator, Snake, Chess, Chat, Quiz, and dynamic custom scaffolds)
- **Defect dashboard** — auto-captures runtime errors (Express + Angular global handler), runs rule-based classification + MiniLM-embedded RAG against a curated bug/fix KB, and one-click imports static-analysis issues from the project scanner
- **Static code scanning** — 30+ rules across security, runtime, performance, style, DB, and accessibility; syncs flagged issues into the defect dashboard with file:line context
- **JWT + OTP auth** — register/login with email verification via Gmail
- **LeetCode practice** — curated problem set with editor, tests, and solutions
- **Git integration** — status, diff, log, branch switching from the UI
- **Light/dark themes** — persisted across sessions
- **Global search** — full-text search across KB, chat history, and defects
- **Live code execution** — paste JS, see output; paste backend code, get static analysis

For a detailed walkthrough of how a user request flows through the system (command router, RAG, code gen, chat history, file writes, terminal), see [`workflow.md`](./workflow.md).

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Angular 17 standalone components, signals, RxJS |
| Backend | Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, nodemailer, ws (WebSocket) |
| AI | `@xenova/transformers` MiniLM embeddings (local, offline), optional Python AI module |
| Storage | MongoDB Atlas |

## Setup

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier works)
- Gmail account with App Password
- Python 3.10+ (optional — only needed for the extra AI module)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: MONGO_URI, JWT_SECRET, MAIL_USER, MAIL_PASS
# Optional: DEEPSEEK_API_KEY — unlocks /api/knowledge/generate-code-rag

# One command: Node + optional Python AI module in the same terminal
npm start

# Just the Node server (skip Python even if installed)
npm run start:node

# First-time on a fresh DB: seed everything, backfill embeddings, then start
npm run start:fresh
```
Runs at `http://localhost:4100` (auto-fallback to 4101+ if taken). Python AI module, when started, runs on port 5100 and is proxied through the Node server.

### Frontend
```bash
cd frontend
npm install
npm start
```
Open `http://localhost:4500`.

### Seed the knowledge bases (first run)
```bash
cd backend

# One-shot: seeds everything + backfills MiniLM embeddings
npm run setup

# Or just seeds (no embedding backfill)
npm run seed:all

# Or individually
node seed-knowledge.js
node seed-fullstack.js
node seed-angular-concepts.js
node seed-production-patterns.js
node seed-ai-concepts.js            # RAG / embeddings / LLM explainers
node seed-defect-knowledge.js       # defect RAG corpus (20 entries)
node seed-leetcode-1.js             # original problem bank (1, 2, 3, 87, 112, 273)
node seed-leetcode-2.js
node seed-leetcode-3.js
node seed-leetcode-13.js            # #13 Roman to Integer
node seed-leetcode-87.js
node seed-leetcode-112.js
node seed-leetcode-273.js
node seed-algorithms-bulk.js        # 30 classic problems across every major category
node seed-algorithms-multilang.js   # C + C++ variants for 16 core problems
node seed-project-blueprints.js     # 5 project blueprints for AI project generator
```

### One-off maintenance scripts
```bash
cd backend
node analyze-defects-now.js      # Re-run RAG on every defect that lacks suggestions
node backfill-embeddings.js      # Universal: computes missing embeddings across KnowledgeEntry, DefectKnowledge, Defect, ChatMessage, LeetProblem, DirectAnswer
node purge-defects.js            # Delete every defect (keeps DefectKnowledge)
```

## Multi-language code generation

`LeetProblem` has a `codes: [{ language, code, tests }]` array alongside the JavaScript `code` default. Currently seeded with C + C++ variants for 16 core problems (Two Sum, Binary Search, Kadane's Maximum Subarray, Coin Change, LIS, etc.). The semantic and RAG endpoints accept a `language` body param and auto-detect it from the query text.

```bash
# JavaScript (default)
curl -X POST http://localhost:4100/api/knowledge/generate-code-semantic \
  -H "Content-Type: application/json" \
  -d '{"request":"binary search"}'

# C++
curl -X POST http://localhost:4100/api/knowledge/generate-code-semantic \
  -H "Content-Type: application/json" \
  -d '{"request":"binary search","language":"cpp"}'

# Language inferred from the query text
curl -X POST http://localhost:4100/api/knowledge/generate-code-semantic \
  -H "Content-Type: application/json" \
  -d '{"request":"coin change in c"}'

# Full RAG + LLM generation (needs DEEPSEEK_API_KEY)
curl -X POST http://localhost:4100/api/knowledge/generate-code-rag \
  -H "Content-Type: application/json" \
  -d '{"request":"rotate a matrix 90 degrees in c++","language":"cpp"}'
```

## Endpoints

### Auth (`/api/auth`)
- `POST /register` — sends OTP
- `POST /verify-otp` — activates account, returns JWT
- `POST /resend-otp`
- `POST /login` — returns JWT
- `GET /me` — current user

### Knowledge (`/api/knowledge`)
- `GET /stats`, `GET /entries?category=...`, `GET /entries/:topic`, `GET /search?q=...`
- `GET /search-vector?q=...` — cosine-similarity retrieval over `KnowledgeEntry` (MiniLM)
- `POST /answer` — smart Q&A (regex → semantic → keyword → text search)
- `POST /rag-answer` — top-k retrieval + composed answer
- `POST /generate-code` — keyword-based code assembly from KB
- `POST /generate-code-semantic` — vector retrieval across `KnowledgeEntry` + `LeetProblem`; accepts `language` (`javascript`/`c`/`cpp`/`python`/`java`) and falls back to JS when a requested variant isn't seeded
- `POST /generate-code-rag` — retrieval + DeepSeek LLM generation (needs `DEEPSEEK_API_KEY`); falls back to retrieval-only when no key is set
- `POST /generate-project` — retrieves best-matching `ProjectBlueprint` and writes a full multi-file project under `targetPath/projectName`. With `DEEPSEEK_API_KEY`, DeepSeek expands the blueprint into tailored files; without, the blueprint skeleton is written verbatim. Body: `{ description, projectName, targetPath, useLLM?, k? }`

### Search (`/api/search`)
- `GET /?q=...&root=...` — recursive file grep
- `GET /vector?q=...` — cross-collection semantic search over `KnowledgeEntry`, `DefectKnowledge`, `Defect`, `ChatMessage`, `LeetProblem`, `DirectAnswer`

### Defects (`/api/defects`)
- `POST /log` — record a runtime error (unauthed; used by the frontend global error handler)
- `POST /analyze` — preview classification + RAG suggestions without persisting
- `POST /sync-scan` — bulk-import static-analysis issues from the project scanner; upserts by (project, file, line, rule)
- `GET /` — list with filters (status / category / severity / source / projectName / q)
- `GET /stats` — counts grouped by status, category, severity
- `GET /projects` — distinct project names seen in defects
- `PATCH /:id` — update status / severity / tags / rootCause
- `POST /:id/rag` — re-run RAG on a specific defect
- `POST /:id/reclassify` — re-run the rule engine
- `DELETE /:id`

### Chat (`/api/chat`)
- CRUD over conversations + persisted message history

### Git (`/api/git`)
- `GET /status`, `GET /log`, `GET /diff`, `POST /branch`, etc.

### LeetCode (`/api/leetcode`)
- `GET /problems`, `GET /problems/:slug`, `POST /submit`

### AI module (proxied when Python server is running)
- `/api/ai-module/*` → `http://localhost:5100/*`

## Project structure

```
AI/
├── backend/
│   ├── terminal-server.js        # Main Express + WebSocket server (shell, FS, AI endpoints)
│   ├── cloud-ai.service.js       # Optional DeepSeek bridge
│   ├── start-all.js              # `npm run dev` — spawns Node + Python together
│   ├── ai-server.py              # Optional Python AI module — HTTP entry (port 5100)
│   ├── ai/                       # Python conversation-orchestration package (session, engine, cache, telemetry)
│   ├── middleware/
│   │   ├── auth.js               # requireAuth (JWT)
│   │   └── errorCapture.js       # Auto-logs Express errors as defects
│   ├── models/
│   │   ├── User.js, Knowledge.js, LeetProblem.js
│   │   ├── Defect.js, DefectKnowledge.js     # Runtime + static defects, curated RAG corpus
│   │   └── ChatMessage.js, Conversation.js
│   ├── routes/
│   │   ├── auth.js, knowledge.js, git.js, leetcode.js
│   │   ├── chat.js, defects.js, search.js
│   ├── services/
│   │   ├── defectRules.js        # 16 rule-engine patterns (rule-based classifier)
│   │   ├── defectRag.js          # Semantic retrieval over DefectKnowledge
│   │   └── embeddings.js         # MiniLM wrapper (`@xenova/transformers`)
│   └── seed-*.js, analyze-defects-now.js, backfill-embeddings.js, purge-defects.js
└── frontend/
    └── src/app/
        ├── home.component.ts              # Login / register / OTP
        ├── scanner-ide.component.ts       # Main IDE
        ├── issue-list.component.ts        # Severity-filtered issues view
        ├── defects-dashboard.component.ts # Defect dashboard (runtime + static + AI suggestions)
        └── services/
            ├── auth.service.ts, ai-engine.service.ts, ai-module.service.ts
            ├── knowledge-api.service.ts, knowledge-base.ts
            ├── project-scanner.service.ts # Static code scanner (30+ rules)
            ├── project-templates.service.ts, code-generator.service.ts
            ├── enhancements.service.ts, improver.service.ts
            ├── algorithms.service.ts, debugger.service.ts, code-runner.service.ts
            ├── file-system.service.ts, git.service.ts, leetcode.service.ts
            ├── defects.service.ts, global-error-handler.ts
            ├── chat-history.service.ts, search.service.ts
            ├── theme.service.ts, syntax-highlight.service.ts
```

## License

Personal project — all rights reserved.
