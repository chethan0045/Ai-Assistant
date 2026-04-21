// Seeds the DefectKnowledge collection with common bug/fix pairs.
// Run: node seed-defect-knowledge.js (safe to re-run; drops old entries first)

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';

const DefectKnowledge = require('./models/DefectKnowledge');
const { embed } = require('./services/embeddings');

const ENTRIES = [
  {
    problem: 'MongoNetworkError: connection refused to Atlas cluster',
    solution: 'Verify MONGO_URI. Whitelist your IP in Atlas Network Access. On restrictive networks set dns.setServers(["8.8.8.8","1.1.1.1"]). Try mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 15000 }).',
    category: 'database', tags: ['mongo', 'atlas', 'dns', 'srv'], severity: 'high',
  },
  {
    problem: 'MongooseServerSelectionError: could not connect to any servers',
    solution: 'Same class as MongoNetworkError. Check that the cluster is reachable with ping/telnet on port 27017. If SRV is blocked, use the standard connection string from Atlas instead of the SRV one.',
    category: 'database', tags: ['mongo', 'timeout'], severity: 'high',
  },
  {
    problem: 'E11000 duplicate key error on unique index',
    solution: 'Insert collided with an existing doc on a unique field. Either (a) switch to findOneAndUpdate with upsert, (b) catch the 11000 code and treat as conflict (409), or (c) drop the unique constraint if business rule changed.',
    category: 'database', tags: ['mongoose', 'unique', 'validation'], severity: 'low',
  },
  {
    problem: 'Mongoose ValidationError: Path `email` is required',
    solution: 'Schema marked field required but request payload did not include it. Add Joi/Zod validation before hitting Mongoose, and return 400 with per-field errors.',
    category: 'database', tags: ['mongoose', 'validation'], severity: 'low',
  },
  {
    problem: 'EADDRINUSE: port already in use',
    solution: 'A previous process did not exit. Windows: `netstat -ano | findstr :<port>` then `taskkill /F /PID <pid>`. Mac/Linux: `lsof -i :<port>` then `kill -9 <pid>`. Consider letting the server auto-rotate to next free port.',
    category: 'runtime', tags: ['port', 'startup'], severity: 'medium',
  },
  {
    problem: 'ENOENT: no such file or directory',
    solution: 'Resolve the path with `path.resolve(__dirname, ...)` instead of relative strings. Confirm the file is committed, not ignored by gitignore. On Linux check case sensitivity.',
    category: 'filesystem', tags: ['fs', 'path'], severity: 'medium',
  },
  {
    problem: 'EACCES: permission denied on file write',
    solution: 'Check directory permissions (chmod/icacls). Do not run Node as root. If writing to a system dir, pick a user-writable location (e.g. os.homedir()). On Windows, antivirus may block writes to certain folders.',
    category: 'filesystem', tags: ['permission'], severity: 'medium',
  },
  {
    problem: 'Cannot read properties of undefined (reading "x")',
    solution: 'Guard the access with optional chaining: `obj?.x ?? fallback`. Common triggers: async data not yet loaded, missing env var, API response shape drift. Add a log right before the access to see the actual value.',
    category: 'runtime', tags: ['null', 'undefined', 'typescript'], severity: 'high',
  },
  {
    problem: 'TypeError: X is not a function',
    solution: 'Likely a bad import: default vs named mismatch, wrong path, or the module failed to load. `console.log(typeof fn)` just before the call reveals whether it is undefined or something else.',
    category: 'runtime', tags: ['import', 'module'], severity: 'high',
  },
  {
    problem: 'CORS error: No Access-Control-Allow-Origin header',
    solution: 'On the Express backend: `app.use(cors({ origin: "http://localhost:4200" }))`. For dev, `app.use(cors())` is fine. Ensure preflight OPTIONS requests also pass through cors middleware.',
    category: 'api', tags: ['cors', 'browser', 'preflight'], severity: 'medium',
  },
  {
    problem: 'JsonWebTokenError: jwt malformed',
    solution: 'Client is sending a garbage token. Log req.headers.authorization and confirm format is "Bearer <token>". On logout, clear localStorage. Re-login to mint a fresh JWT.',
    category: 'auth', tags: ['jwt', 'token'], severity: 'medium',
  },
  {
    problem: 'TokenExpiredError: jwt expired',
    solution: 'Token\'s exp claim is past. Add a refresh-token flow or auto-logout + redirect to login. Extend expiresIn if the current window is too short for your session UX.',
    category: 'auth', tags: ['jwt', 'expiry'], severity: 'low',
  },
  {
    problem: 'SyntaxError: Unexpected token < in JSON at position 0',
    solution: 'response.json() was called on an HTML error page (typically a 404 or proxy error). Guard with `if (!res.ok) throw ...` before parsing, and log the raw text for visibility.',
    category: 'runtime', tags: ['json', 'parse'], severity: 'medium',
  },
  {
    problem: 'Request timeout / ETIMEDOUT on upstream call',
    solution: 'Either the upstream is genuinely slow or the network blocked the connection. Set a reasonable timeout (never infinite). Add retry with exponential backoff for transient failures. Consider circuit-breaker pattern for repeat offenders.',
    category: 'network', tags: ['timeout', 'retry'], severity: 'medium',
  },
  {
    problem: 'HTTP 429 Too Many Requests from upstream API',
    solution: 'Respect the Retry-After header if present. Implement exponential backoff. Batch requests if the upstream supports it. If you control the upstream, raise quota for this client.',
    category: 'api', tags: ['rate-limit', 'throttle'], severity: 'medium',
  },
  {
    problem: 'Cannot GET / 404 on known route',
    solution: 'Route not mounted, or middleware misordering. Verify with `app.get("/debug/routes", ...)` that prints app._router.stack. A 404 from Express is `Cannot GET /path`; a 404 from your code has your own error handler.',
    category: 'api', tags: ['express', 'routing'], severity: 'low',
  },
  {
    problem: 'Nodemailer Invalid login: 535 Authentication failed',
    solution: 'Gmail requires an App Password, not your account password. Enable 2FA on the Google account, create an App Password at myaccount.google.com/apppasswords, then use that 16-char token in MAIL_PASS.',
    category: 'auth', tags: ['nodemailer', 'gmail', 'smtp'], severity: 'high',
  },
  {
    problem: 'Angular NG0100 ExpressionChangedAfterItHasBeenCheckedError',
    solution: [
      'A value changed between Angular\'s two change-detection passes in dev mode. Three common causes and fixes:',
      '',
      '1. Method call in a template binding that returns a new reference each time — cache it instead:',
      '```typescript',
      '// BAD — formatAiText runs every CD pass',
      '<div [innerHTML]="formatAiText(msg.text)"></div>',
      '',
      '// GOOD — precompute once when the message arrives',
      'interface ChatMessage { text: string; formattedHtml: string; }',
      'addMessage(m: { text: string }) {',
      '  this.messages.update(list => [...list, {',
      '    ...m,',
      '    formattedHtml: this.formatAiText(m.text),',
      '  }]);',
      '}',
      '<div [innerHTML]="msg.formattedHtml"></div>',
      '```',
      '',
      '2. Parent setting state in a child lifecycle — defer to the next tick:',
      '```typescript',
      'ngAfterViewInit() {',
      '  queueMicrotask(() => this.parent.updateState(this.localValue));',
      '  // or: setTimeout(() => ..., 0);',
      '}',
      '```',
      '',
      '3. Signal being written during read — move writes out of template expressions.',
      '',
      'This error only fires in dev mode; prod builds skip the second CD pass entirely. Our GlobalErrorHandler drops NG0100 by default so it stops flooding the defect dashboard.',
    ].join('\n'),
    category: 'runtime', tags: ['angular', 'change-detection', 'ng0100'], severity: 'low',
  },
  {
    problem: 'UnhandledPromiseRejection',
    solution: 'Some async operation rejected without a catch. Every `await` should be in a try/catch or have `.catch()` downstream. Enable `process.on("unhandledRejection", ...)` to log these and prevent the process from exiting silently.',
    category: 'runtime', tags: ['async', 'promise'], severity: 'high',
  },
  {
    problem: 'WebSocket connection closed unexpectedly (code 1006)',
    solution: 'Abnormal closure — usually network, proxy, or load-balancer idle timeout. Implement client reconnection with exponential backoff. Send periodic pings to keep the connection alive.',
    category: 'network', tags: ['websocket', 'ws'], severity: 'medium',
  },
];

function embedText(e) {
  return `${e.problem}\n${(e.tags || []).join(' ')}\n${e.category}`;
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Seeding defect knowledge base...');

  await DefectKnowledge.deleteMany({});
  console.log(`Cleared. Computing embeddings for ${ENTRIES.length} entries (first run downloads MiniLM ~25 MB)...`);

  for (let i = 0; i < ENTRIES.length; i++) {
    ENTRIES[i].embedding = await embed(embedText(ENTRIES[i]));
    if ((i + 1) % 5 === 0 || i === ENTRIES.length - 1) {
      console.log(`  embedded ${i + 1}/${ENTRIES.length}`);
    }
  }

  const inserted = await DefectKnowledge.insertMany(ENTRIES);
  console.log(`Inserted ${inserted.length} defect-knowledge entries across ${new Set(ENTRIES.map(e => e.category)).size} categories.`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
