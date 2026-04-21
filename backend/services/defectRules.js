// Rule-based defect classifier. Each rule has a regex tested against the error
// message + stack, and when it hits, provides category/rootCause/suggestedFix/severity.
// Runs fast, is deterministic, and handles ~80% of recurring errors without AI.

const RULES = [
  {
    id: 'mongo-network',
    pattern: /MongoNetworkError|MongooseServerSelectionError|ECONNREFUSED.*27017|querySrv ENOTFOUND/i,
    category: 'database',
    severity: 'high',
    rootCause: 'MongoDB is unreachable — either the connection string is wrong, the server is down, or your network/DNS cannot resolve Atlas SRV records.',
    suggestedFix: [
      '1. Verify MONGO_URI in .env matches your cluster.',
      '2. Check Atlas → Network Access for your current IP.',
      '3. If on a restricted network, set DNS: `dns.setServers(["8.8.8.8", "1.1.1.1"])` before connect.',
      '4. Try `mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 15000 })`.',
    ].join('\n'),
  },
  {
    id: 'port-in-use',
    pattern: /EADDRINUSE|address already in use/i,
    category: 'runtime',
    severity: 'medium',
    rootCause: 'Another process is already listening on the requested port.',
    suggestedFix: 'Windows: `netstat -ano | findstr :<port>` then `taskkill /F /PID <pid>`.\nMac/Linux: `lsof -i :<port>` then `kill -9 <pid>`.',
  },
  {
    id: 'file-not-found',
    pattern: /ENOENT.*no such file or directory/i,
    category: 'filesystem',
    severity: 'medium',
    rootCause: 'A file or directory path does not exist at runtime.',
    suggestedFix: 'Log the exact path from the error and check: (a) relative path is resolved against the expected cwd, (b) the file was created / committed, (c) case mismatch on case-sensitive filesystems.',
  },
  {
    id: 'permission-denied',
    pattern: /EACCES|EPERM|permission denied/i,
    category: 'filesystem',
    severity: 'medium',
    rootCause: 'Process lacks permissions on the target file/port.',
    suggestedFix: 'Fix file permissions (`chmod`/`icacls`) or run on an unprivileged port (>=1024). Never run Node as root to work around this.',
  },
  {
    id: 'undefined-property',
    pattern: /Cannot read propert(?:y|ies).*?(?:undefined|null)/i,
    category: 'runtime',
    severity: 'high',
    rootCause: 'Code accessed a property on a value that turned out to be undefined/null — often async data not loaded yet, missing env var, or an unchecked API response field.',
    suggestedFix: 'Use optional chaining: `user?.profile?.name ?? "Unknown"`. Guard API responses: `if (!data?.items) return;`. For SSR/hydration, check for typeof window before touching DOM.',
  },
  {
    id: 'not-a-function',
    pattern: /is not a function/i,
    category: 'runtime',
    severity: 'high',
    rootCause: 'Called something that isn\'t a function — common when a named import is wrong, default vs. named export mismatch, or the module failed to load.',
    suggestedFix: 'Check the import: `import { thing } from "..."` vs `import thing from "..."`. Verify the function exists on the target object at the moment of the call (add a `console.log(typeof fn)` right before).',
  },
  {
    id: 'cors',
    pattern: /CORS|Cross-Origin|No .Access-Control-Allow-Origin/i,
    category: 'api',
    severity: 'medium',
    rootCause: 'The backend did not return Access-Control-Allow-Origin for this origin, so the browser blocked the response.',
    suggestedFix: '`app.use(cors({ origin: "http://localhost:4200" }))` on the backend, or `app.use(cors())` for permissive dev. Remember preflight (OPTIONS) also needs CORS headers.',
  },
  {
    id: 'jwt-invalid',
    pattern: /jwt (malformed|expired|invalid)|JsonWebTokenError|TokenExpiredError/i,
    category: 'auth',
    severity: 'medium',
    rootCause: 'Token is missing, tampered with, or past its `exp` claim.',
    suggestedFix: 'Re-login to mint a fresh token. Confirm `Authorization: Bearer <token>` header and that JWT_SECRET matches the value used at sign time.',
  },
  {
    id: 'validation-error',
    pattern: /ValidationError|E11000 duplicate key|CastError/i,
    category: 'database',
    severity: 'low',
    rootCause: 'Mongoose rejected the write — either a required field is missing, a field type is wrong, or a unique index collided.',
    suggestedFix: 'Read the error\'s `errors[field]` keys to see which fields failed. For E11000, query the existing doc and decide update-vs-insert.',
  },
  {
    id: 'syntax-error',
    pattern: /SyntaxError|Unexpected token|Unexpected end of (JSON|input)/i,
    category: 'runtime',
    severity: 'high',
    rootCause: 'Parser couldn\'t understand the input — commonly malformed JSON in a response body, or a typo in a source file that esbuild/tsc caught.',
    suggestedFix: 'If runtime JSON.parse: log the raw text first and inspect. If build-time: check the file+line in the error against recent edits.',
  },
  {
    id: 'rate-limit',
    pattern: /429|Too Many Requests|rate limit/i,
    category: 'api',
    severity: 'medium',
    rootCause: 'Upstream service is throttling requests.',
    suggestedFix: 'Respect `Retry-After` header. Add exponential backoff on retry. If you control the upstream, raise the quota for this client.',
  },
  {
    id: 'timeout',
    pattern: /ETIMEDOUT|request timeout|timed out/i,
    category: 'network',
    severity: 'medium',
    rootCause: 'A network call didn\'t complete within the configured window.',
    suggestedFix: 'Increase timeout if the operation is genuinely slow; otherwise investigate upstream latency. Never set infinite timeout — bad requests then hang forever.',
  },
  {
    id: 'module-not-found',
    pattern: /Cannot find module|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/i,
    category: 'runtime',
    severity: 'high',
    rootCause: 'Node could not resolve a require/import target — either the package isn\'t installed or the path is wrong.',
    suggestedFix: 'Run `npm install` to sync dependencies. Check the import path spelling + case. For relative imports, add the file extension on ESM. If the module was recently moved, update the import site.',
  },
  {
    id: 'dns-not-found',
    pattern: /ENOTFOUND|getaddrinfo|EAI_AGAIN/i,
    category: 'network',
    severity: 'high',
    rootCause: 'DNS lookup failed — hostname doesn\'t resolve, or local DNS is broken.',
    suggestedFix: 'Verify the hostname spelling. Test with `nslookup <host>`. On corporate/VPN networks, set `dns.setServers(["8.8.8.8", "1.1.1.1"])` before the connection. For Atlas SRV failures, switch to the standard (non-SRV) connection string.',
  },
  {
    id: 'unhandled-rejection',
    pattern: /UnhandledPromiseRejection|unhandledRejection/i,
    category: 'runtime',
    severity: 'high',
    rootCause: 'A promise rejected with no `.catch()` or surrounding try/catch, so the error escaped the async boundary.',
    suggestedFix: 'Wrap every top-level `await` in try/catch, or chain `.catch()` on the promise. Register `process.on("unhandledRejection", ...)` so these don\'t silently kill the process in future Node versions.',
  },
  {
    id: 'out-of-memory',
    pattern: /JavaScript heap out of memory|FATAL ERROR.*Allocation failed|ERR_WORKER_OUT_OF_MEMORY/i,
    category: 'runtime',
    severity: 'critical',
    rootCause: 'Node process exceeded its V8 heap limit — usually a leak (retained references) or legitimately working with data larger than the default heap.',
    suggestedFix: 'Short-term: raise the cap with `node --max-old-space-size=4096`. Long-term: profile with `--inspect` + Chrome DevTools heap snapshots to find the retainer. Stream large payloads instead of buffering them fully.',
  },
  {
    id: 'angular-ng0100',
    pattern: /NG0100|ExpressionChangedAfterItHasBeenChecked/i,
    category: 'runtime',
    severity: 'low',
    rootCause: 'Dev-mode only — Angular ran change detection twice and a bound value differed between passes. Usually caused by calling a method in the template that returns a new object/string reference each call, or mutating state during a CD cycle.',
    suggestedFix: [
      '1. Don\'t call methods from template bindings. Precompute the value into a property or signal when the input changes:',
      '```typescript',
      '// BAD — runs every CD pass, may return a new reference each time',
      '<div [innerHTML]="formatAiText(msg.text)"></div>',
      '',
      '// GOOD — compute once, store on the model, bind to the property',
      'interface ChatMessage { text: string; formattedHtml: string; }',
      'addMessage(m: ChatMessage) { m.formattedHtml = this.formatAiText(m.text); }',
      '<div [innerHTML]="msg.formattedHtml"></div>',
      '```',
      '2. If the change is genuinely async (e.g. streaming), defer the state mutation:',
      '```typescript',
      'queueMicrotask(() => this.updating.set(value));',
      '// or',
      'setTimeout(() => this.updating.set(value), 0);',
      '```',
      '3. This error never fires in production builds — safe to ignore in telemetry (our GlobalErrorHandler already drops NG0100 by default).',
    ].join('\n'),
  },
];

/**
 * Given a defect's message + stack, returns { category, rootCause, suggestedFix, severity, ruleId }.
 * Falls back to `unknown` when no rule matches.
 */
function classify(message, stack = '') {
  const haystack = `${message}\n${stack}`;
  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) {
      return {
        category: rule.category,
        rootCause: rule.rootCause,
        suggestedFix: rule.suggestedFix,
        severity: rule.severity,
        ruleId: rule.id,
      };
    }
  }
  return {
    category: 'unknown',
    rootCause: '',
    suggestedFix: '',
    severity: 'medium',
    ruleId: null,
  };
}

module.exports = { classify, RULES };
