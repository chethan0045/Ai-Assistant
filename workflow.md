# AI Assistant Workflow

How a user request flows through this app — what fires, in what order, and where it ends up.

## High-level pieces

```
┌────────────────────────────────────────────────────────────────────┐
│  BROWSER (Angular 17 @ :4200 / :4500)                              │
│                                                                    │
│  scanner-ide.component.ts          (UI: chat panel, editor, tree)  │
│         │                                                          │
│         ▼                                                          │
│  ai-engine.service.ts              (command router, orchestrator)  │
│    ├─ knowledge-base.ts            (offline Q&A — zero network)    │
│    ├─ algorithms.service.ts        (fibonacci / even / ... local)  │
│    ├─ knowledge-api.service.ts     (MongoDB KB + RAG)              │
│    ├─ enhancements.service.ts      (known patches)                 │
│    ├─ project-templates.service.ts (scaffolds: fullstack, otp)     │
│    ├─ file-system.service.ts       (FSA handle ▸ backend writes)   │
│    └─ chat-history.service.ts      (conversations + message save)  │
└────────────────┬───────────────────────────────────────────────────┘
                 │ HTTP + WS
                 ▼
┌────────────────────────────────────────────────────────────────────┐
│  BACKEND (Node/Express @ :4100)                                    │
│                                                                    │
│  terminal-server.js                (entry, WS shell, file I/O)     │
│  routes/auth.js                    (JWT + OTP email)               │
│  routes/knowledge.js               (KB search / RAG / generate)    │
│  routes/chat.js                    (conversations + messages)      │
│  routes/git.js, routes/leetcode.js                                 │
│  services/embeddings.js            (MiniLM — local vectors)        │
│  middleware/auth.js                (Bearer JWT verify)             │
│                 │                                                  │
│                 ▼                                                  │
│           MongoDB (Atlas)                                          │
│    - KnowledgeEntry  (67 entries, with embedding)                  │
│    - ChatMessage     (per-user, with conversationId + embedding)   │
│    - Conversation    (per-user threads)                            │
│    - User            (auth)                                        │
└────────────────────────────────────────────────────────────────────┘
```

## The command router (the one "brain")

`ai-engine.service.ts :: processCommand(input, report, currentFile)` runs a prioritized chain. First match wins.

```
user types "write code for even numbers"
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│ 1. tryMath / tryCompute           — "98 * 23" style     │
│ 2. AlgorithmsService.find()       — ← MATCHES HERE      │
│ 3. OTP / project scaffolding      — "add otp"           │
│ 4. Epics / tests / explain        — project required    │
│ 5. Fix / debug                    — "button not working"│
│ 6. Enhancement library            — "add check mate"    │
│ 7. Bug auto-patch                                       │
│ 8. "code for X" (KB code-gen)     — MongoDB patterns    │
│ 9. Knowledge Q&A (RAG)            — default catch-all   │
└─────────────────────────────────────────────────────────┘
```

Order matters: simple algo requests (#2) resolve before the KB code-gen (#8), so "write code for even numbers" returns the `even-numbers` snippet instead of the security/error-handling fallback.

## Knowledge Q&A — the RAG path

```
cmdKnowledge(input)
  │
  ├─► kicks off history.searchMemory(input)       ─┐ (parallel, for
  │                                                 │  long-term memory)
  │
  ├─► 1. knowledge-base.ts answerQuestion()        ─▶ hit? return
  │     (local, in-bundle, zero network)
  │
  ├─► 2. kbApi.ragAnswer(input, k=3)               ─▶ hit? return
  │     ───────────────────────────────
  │     POST /api/knowledge/rag-answer
  │        ├─ embed(query) via MiniLM
  │        ├─ cosine-sim against stored KB vectors
  │        └─ top-k → compose answer
  │
  ├─► 3. kbApi.answer(input)                        ─▶ hit? return
  │     POST /api/knowledge/answer
  │        └─ keyword + $text search fallback
  │
  └─► 4. local fallback text (with suggestions)

  ── Before returning any of the above, attach ──
      "Related from your history: [past msg snippets]"
      using the memoryPromise result.
```

## Code generation (MongoDB-backed)

```
"write code for login page"
        │
        ▼
cmdGenerateFromKB(input)
   POST /api/knowledge/generate-code
      ├─ extractKeywords()
      ├─ match KnowledgeEntry.keywords / topic / title
      ├─ detectCompanions()   (e.g., login → express-auth-routes, angular-auth-service)
      ├─ always include: security, error-handling, common-bugs
      └─ returns: { code, patterns_used, primary_pattern }
```

## Project scaffolding & enhancements

```
"scaffold a fullstack project"
        │
        ▼
cmdScaffoldProject(templateId, report)
   ├─ templates.getTemplate(templateId)   (local, no network)
   ├─ scanner.scaffoldFromTemplate()      (in-memory tree)
   └─ fs.saveProjectFiles()               (disk — handle OR backend)

"add check/checkmate notification + promotion dialog"
        │
        ▼
cmdEnhanceProject(input, report)
   ├─ enhancements.detect(input, fileContents)
   ├─ (fallback) detectTriggerOnly(input)
   └─ applyEnhancement(match, targetFile)
       ├─ scanner.markPendingDiff()        (green/red editor highlights)
       ├─ scanner.report.set(…)            (in-memory patched)
       └─ fs.saveProjectFile(path, content) (disk)
```

## File writes — two backends, one API

```
fs.saveProjectFile(relPath, content, basePath?)
        │
        ▼
  ┌─────────────────────────────┐
  │ hasHandle()? (FSA active)   │
  └──────┬────────────────┬─────┘
         │ yes            │ no
         ▼                ▼
  writeViaHandle()     basePath set?
  (browser writes      ├─ yes → POST /api/write-file (backend writes abs path)
   straight to disk    └─ no  → returns false ⇒ "⚠️ No disk link"
   via the folder
   handle — no path
   guessing needed)
```

**Why two backends?** The File System Access API (Chrome/Edge) gives a real write-capable handle to the folder the user picked, avoiding the old path-guessing bug. Firefox / Safari fall back to the backend absolute-path writer, which relies on `/api/find-folder` to locate the project by name — less reliable but still works when the folder sits in a common location.

## Chat history & conversations

```
user hits "Send"
        │
        ▼
aiEngine.sendMessage(input, report, currentFile)
   │
   ├─ push user message → messages signal
   ├─ POST /api/chat/message      (user msg)
   │     ├─ if no conversationId → backend creates Conversation
   │     ├─ embed(text) via MiniLM
   │     └─ returns { message, conversationId }
   ├─ aiEngine captures conversationId (first save only)
   │
   ├─ await processCommand(input)  → final AI reply
   ├─ streamText() into streamingText signal
   ├─ push AI message → messages signal
   │
   ├─ POST /api/chat/message       (AI msg, same conversationId)
   └─ refreshConversations()       (bumps sidebar order)

sidebar clock-icon  → GET /api/chat/conversations
click item          → GET /api/chat/conversations/:id/messages
                      → ai-engine restores messages signal
click + (new)       → ai-engine.startNewConversation()
                      (clears activeConversationId; next save creates a new thread)
click trash         → DELETE /api/chat/conversations/:id
                      (cascades to messages)
```

Every message gets an embedding. `cmdKnowledge` calls `POST /api/chat/search-vector` in parallel with KB lookups and appends a *Related from your history* block to the answer, scoped per-user (JWT-gated).

## Auth flow (minimal)

```
POST /api/auth/register        → creates User (verified=false), emails OTP
POST /api/auth/verify-otp      → sets verified=true, returns JWT + user
POST /api/auth/login           → JWT + user (blocks unverified)
GET  /api/auth/me              → verify token

Frontend stores JWT in localStorage `ai_token`.
Every /api/chat/* request sends `Authorization: Bearer <token>`.
authGuard in app.routes.ts blocks /scanner until logged in.
```

## Terminal (WebSocket shell)

The WS server in `terminal-server.js` spawns real child processes per session. When a project opens:

```
scanner-ide.ngOnInit
  → fs.pickDirectory() (FSA) or native <input webkitdirectory>
  → scanner.scanFiles(fileArray)
  → runner.cdToProjectByName(folderName)
      GET /api/find-folder?name=X
      (searches home/Desktop/Documents/drive roots)
      → returns absolute path or null
  → terminal session WS: { type: 'cd', data: foundPath }
```

The terminal's cwd is **independent** of where files are written: writes go through the FSA handle when present, terminal commands run in the path resolved by `find-folder`. Two separate layers.

## Data that lives in MongoDB

| Collection        | Keyed by        | Grows with                          | Used for                               |
|-------------------|-----------------|-------------------------------------|----------------------------------------|
| `KnowledgeEntry`  | topic (unique)  | seed scripts                        | RAG retrieval, code generation         |
| `DirectAnswer`    | pattern regexes | seed scripts                        | fast regex-matched answers             |
| `Conversation`    | userId          | every "New conversation" or 1st msg | sidebar list, per-thread message load  |
| `ChatMessage`     | userId + convId | every turn (user + AI)              | history restore, per-user RAG memory   |
| `User`            | email (unique)  | registration                        | JWT subject, OTP email verification    |

## Offline-first promise

The app works **without any external API key**. Order of graceful degradation:

1. Local JS (`knowledge-base.ts`, `algorithms.service.ts`, math, regex intents)
2. Local MiniLM embeddings (model weights cached in `backend/.models-cache`)
3. MongoDB (required for user accounts + RAG; the server keeps running if Mongo is unreachable — auth just degrades)
4. Optional Python AI module at `:5100` (proxied via `/api/ai-module/*`) — if started

No third-party LLM is in the critical path.

## Ports at a glance

| Port     | What                                 | Required?                         |
|----------|--------------------------------------|-----------------------------------|
| 4100     | Node backend (REST + WS)             | yes (auto-rotates 4101–4106)      |
| 4200     | `ng serve` default                   | yes (may be 4500 in some configs) |
| 5100     | Python AI module                     | optional                          |
| WS @4100 | Terminal / shell streaming           | yes (same port as REST)           |
