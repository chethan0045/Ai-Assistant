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

# Start Node server only
npm start

# Or start Node + Python AI module together (Ctrl-C kills both)
npm run dev
```
Runs at `http://localhost:4100` (auto-fallback to 4101+ if taken). Python AI module, when started, runs on port 5100 and is proxied through the Node server.

### Frontend
```bash
cd frontend
npm install
npm start
```
Open `http://localhost:4200`.

### Seed the knowledge bases (first run)
```bash
cd backend

# One-shot: runs every seed script in order
npm run seed:all

# Or individually
node seed-knowledge.js
node seed-fullstack.js
node seed-angular-concepts.js
node seed-production-patterns.js
node seed-ai-concepts.js          # RAG / embeddings / LLM explainers (8 entries + 5 direct answers)
node seed-defect-knowledge.js     # defect RAG corpus (20 entries)
node seed-leetcode-1.js           # LeetCode problem bank (1, 2, 3, 87, 112, 273)
node seed-leetcode-2.js
node seed-leetcode-3.js
node seed-leetcode-87.js
node seed-leetcode-112.js
node seed-leetcode-273.js
```

### One-off maintenance scripts
```bash
cd backend
node analyze-defects-now.js      # Re-run RAG on every defect that lacks suggestions
node backfill-embeddings.js      # Universal: computes missing embeddings across KnowledgeEntry, DefectKnowledge, Defect, ChatMessage, LeetProblem
node purge-defects.js            # Delete every defect (keeps DefectKnowledge)
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
- `POST /answer` — smart Q&A
- `POST /generate-code` — code assembly from KB

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

### Search (`/api/search`)
- `GET /?q=...` — cross-collection full-text search

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
