# AI — Angular + Express Code Assistant IDE

A full-stack AI code assistant with an in-browser IDE, project scaffolding, offline knowledge base, and MongoDB-backed code generation.

## Features

- **In-browser IDE** — file explorer, code editor with syntax highlighting, terminal, debugging
- **Offline AI chat** — answers 60+ programming topics without any API key
- **MongoDB knowledge base** — 67 curated entries across 14 categories
- **Project scaffolding** — generates full Angular + Express + MongoDB projects
- **Purpose-specific templates** — Todo, Counter, Calculator, Notes, Chess, Snake, Tic-Tac-Toe, Number Guessing, Quiz, Stopwatch, Dice, and dynamic custom scaffolds
- **JWT + OTP auth** — register/login with email verification via Gmail
- **Code generation** — paste requirements, get production-ready code using KB patterns
- **Bug analysis** — paste code, get scored report (security/quality/error-handling/scalability) with auto-fixes
- **Live code execution** — paste JS, see output; paste backend code, get static analysis
- **Project enhancement** — describe features, AI patches existing files

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Angular 17 standalone components, signals, RxJS |
| Backend | Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, nodemailer |
| Storage | MongoDB Atlas |

## Setup

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier works)
- Gmail account with App Password

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and fill in MONGO_URI, JWT_SECRET, MAIL_USER, MAIL_PASS
npm start
```
Runs at `http://localhost:4100` (auto-fallback to 4101+ if taken).

### Frontend
```bash
cd frontend
npm install
ng serve
```
Open `http://localhost:4200`.

### Seed the knowledge base (first run)
```bash
cd backend
node seed-knowledge.js
node seed-fullstack.js
node seed-angular-concepts.js
node seed-production-patterns.js
```

## Endpoints

### Auth
- `POST /api/auth/register` — sends OTP
- `POST /api/auth/verify-otp` — activates account, returns JWT
- `POST /api/auth/resend-otp`
- `POST /api/auth/login` — returns JWT
- `GET /api/auth/me` — current user

### Knowledge
- `GET /api/knowledge/stats`
- `GET /api/knowledge/entries?category=Angular`
- `GET /api/knowledge/entries/:topic`
- `GET /api/knowledge/search?q=...`
- `POST /api/knowledge/answer` — smart Q&A
- `POST /api/knowledge/generate-code` — code assembly from KB

## Project structure

```
AI/
├── backend/
│   ├── server.js               # Entry
│   ├── terminal-server.js      # Main server (Express + WebSocket)
│   ├── cloud-ai.service.js     # DeepSeek bridge
│   ├── config/db.js            # MongoDB connection
│   ├── models/
│   │   ├── User.js
│   │   └── Knowledge.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── knowledge.js
│   ├── utils/mailer.js         # Nodemailer OTP
│   ├── ai/                     # Python AI module (optional)
│   └── seed-*.js               # Knowledge seed scripts
└── frontend/
    └── src/app/
        ├── home.component.ts           # Login / register / OTP
        ├── scanner-ide.component.ts    # Main IDE
        └── services/
            ├── auth.service.ts
            ├── ai-engine.service.ts
            ├── project-templates.service.ts
            ├── enhancements.service.ts
            ├── algorithms.service.ts
            ├── knowledge-base.ts       # Offline fallback
            └── knowledge-api.service.ts # MongoDB client
```

## License

Personal project — all rights reserved.
