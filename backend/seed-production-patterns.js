/**
 * Seed production-grade security & quality patterns into MongoDB.
 * Run: node seed-production-patterns.js
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const { KnowledgeEntry, DirectAnswer } = require('./models/Knowledge');

const ENTRIES = [
  {
    topic: 'email-validation', category: 'Security',
    keywords: ['email validation', 'validate email', 'email regex', 'email format', 'check email', 'email pattern', 'valid email'],
    title: 'Email Format Validation',
    summary: 'Validate email format using regex before accepting it. Prevents invalid data from reaching the database and reduces bounce rates.',
    details: `## The Regex
\`\`\`javascript
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
\`\`\`

Breakdown:
- \`[^\\s@]+\` — one or more chars that aren't whitespace or @
- \`@\` — literal @
- \`[^\\s@]+\` — domain part
- \`\\.\` — literal dot
- \`[^\\s@]+\` — TLD

## Use in Express Route
\`\`\`javascript
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

router.post('/register', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Continue...
});
\`\`\`

## Use in Mongoose Schema
\`\`\`javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, 'Invalid email format'],
  },
});
\`\`\`

## Use with validator package
\`\`\`bash
npm install validator
\`\`\`
\`\`\`javascript
const validator = require('validator');
if (!validator.isEmail(email)) {
  return res.status(400).json({ message: 'Invalid email' });
}
\`\`\`

## Advanced: Normalize before validate
\`\`\`javascript
const normalized = email.toLowerCase().trim();
if (!emailRegex.test(normalized)) return res.status(400)...;
\`\`\`

## Why regex over external service?
- **Regex (this):** Instant, no cost, catches 99% of bad emails
- **DNS MX check:** Slow, can fail, rarely needed
- **Email verification link:** Best for production — confirms ownership`,
    examples: [
      '```javascript\nconst emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\nif (!emailRegex.test(email)) {\n  return res.status(400).json({ message: "Invalid email" });\n}\n```'
    ],
    related: ['security', 'error-handling', 'express-auth-routes', 'password-strength']
  },

  {
    topic: 'rate-limiting', category: 'Security',
    keywords: ['rate limit', 'rate limiting', 'brute force', 'express rate limit', 'throttle', 'ddos', 'api throttle', 'request limit'],
    title: 'Rate Limiting — Prevent Brute Force Attacks',
    summary: 'Rate limiting restricts how many requests a single IP can make. Critical for login endpoints (prevents brute force) and public APIs (prevents abuse).',
    details: `## Install
\`\`\`bash
npm install express-rate-limit
\`\`\`

## Protect Login Endpoint
\`\`\`javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per IP
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,       // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', loginLimiter);
\`\`\`

## Global API Rate Limit
\`\`\`javascript
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 100,                     // 100 requests per minute
  message: { error: 'Rate limit exceeded' },
});

app.use('/api/', apiLimiter);
\`\`\`

## Tier-Based Limits
\`\`\`javascript
// Strict for auth
const strictLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'], strictLimit);

// Normal for public reads
const normalLimit = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/public', normalLimit);

// Generous for authenticated users
const authedLimit = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use('/api/protected', authedLimit);
\`\`\`

## Skip Limit for Trusted IPs
\`\`\`javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    const trustedIps = ['127.0.0.1', '::1'];
    return trustedIps.includes(req.ip);
  },
});
\`\`\`

## Distributed Rate Limiting (Redis)
For production with multiple servers:
\`\`\`bash
npm install rate-limit-redis ioredis
\`\`\`
\`\`\`javascript
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
});
\`\`\`

## Best Practices
- **Login endpoint:** 5 attempts / 15 min
- **Register endpoint:** 5 attempts / hour per IP
- **Password reset:** 3 attempts / hour
- **Public API:** 60-100 requests / minute
- Always include \`standardHeaders: true\` so clients can read \`RateLimit-Remaining\``,
    examples: [
      '```javascript\nconst rateLimit = require("express-rate-limit");\napp.use("/api/auth/login", rateLimit({\n  windowMs: 15 * 60 * 1000,\n  max: 5,\n  message: { error: "Too many attempts" }\n}));\n```'
    ],
    related: ['security', 'express', 'express-auth-routes']
  },

  {
    topic: 'password-strength', category: 'Security',
    keywords: ['password strength', 'strong password', 'password policy', 'password validation', 'password regex', 'password complexity'],
    title: 'Password Strength Validation',
    summary: 'Enforce strong passwords: minimum length, uppercase, lowercase, digit, special character. Blocks common weak passwords.',
    details: `## Simple Regex
\`\`\`javascript
// At least 6 chars, 1 uppercase, 1 digit
const strongPassword = /^(?=.*[A-Z])(?=.*\\d).{6,}$/;

if (!strongPassword.test(password)) {
  return res.status(400).json({
    message: 'Password must be 6+ chars with 1 uppercase and 1 number'
  });
}
\`\`\`

## Stricter Pattern
\`\`\`javascript
// 8+ chars, uppercase, lowercase, digit, special char
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$/;
\`\`\`

## Structured Validation (more helpful error messages)
\`\`\`javascript
function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push('Must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter');
  if (!/\\d/.test(password)) errors.push('Must contain a number');
  if (!/[@$!%*?&#]/.test(password)) errors.push('Must contain a special character');
  return errors;
}

// In route
const errors = validatePassword(password);
if (errors.length) return res.status(400).json({ errors });
\`\`\`

## Check Against Common Passwords
\`\`\`bash
npm install zxcvbn
\`\`\`
\`\`\`javascript
const zxcvbn = require('zxcvbn');

const result = zxcvbn(password);
// score: 0 (weak) to 4 (strong)
if (result.score < 3) {
  return res.status(400).json({
    message: 'Password is too weak',
    feedback: result.feedback.suggestions,
  });
}
\`\`\`

## Best Practices
- **Minimum 8 characters** (not 6 — too weak by 2024 standards)
- **Max length** around 128 to prevent DoS via bcrypt
- **Never** cap at 20 or less (breaks password managers)
- **Block common passwords** (\`password123\`, \`qwerty\`, etc.)
- **Don't force** frequent rotation (NIST recommends against it)
- **Compare case-sensitive** with bcrypt.compare (handles edge cases)`,
    examples: [
      '```javascript\nconst strongPassword = /^(?=.*[A-Z])(?=.*\\d).{8,}$/;\nif (!strongPassword.test(password)) {\n  return res.status(400).json({ message: "Need 8+ chars, uppercase, number" });\n}\n```'
    ],
    related: ['security', 'email-validation', 'express-auth-routes']
  },

  {
    topic: 'env-enforcement', category: 'Security',
    keywords: ['env enforcement', 'environment variable', 'jwt secret', 'process.env', 'env check', 'required env', 'dotenv', 'secret management'],
    title: 'Secure Environment Variable Enforcement',
    summary: 'Never use fallback defaults for secrets. Throw on startup if critical env vars are missing — fail fast, never run with insecure defaults.',
    details: `## The Problem
\`\`\`javascript
// BAD — silently uses insecure fallback
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
// If env is missing in production, tokens can be forged!
\`\`\`

## The Fix — Fail Fast
\`\`\`javascript
// Good — crashes immediately if missing
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
\`\`\`

## Validate All Required Env Vars at Startup
\`\`\`javascript
// config/env.js
const required = ['MONGO_URI', 'JWT_SECRET', 'PORT', 'MAIL_USER', 'MAIL_PASS'];

function validateEnv() {
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('Missing required env vars:', missing.join(', '));
    console.error('Create a .env file with these keys.');
    process.exit(1);
  }
}

module.exports = validateEnv;

// In server.js
require('dotenv').config();
require('./config/env')();
\`\`\`

## Enforce Minimum Secret Length
\`\`\`javascript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
\`\`\`

## Using joi for schema validation
\`\`\`bash
npm install joi
\`\`\`
\`\`\`javascript
const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().default(3000),
  MONGO_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
}).unknown();

const { value, error } = envSchema.validate(process.env);
if (error) throw new Error(\`Invalid env: \${error.message}\`);
module.exports = value;
\`\`\`

## .env.example (commit this)
\`\`\`
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/myapp
JWT_SECRET=use-a-long-random-string-at-least-32-chars
JWT_EXPIRES_IN=7d
MAIL_USER=you@gmail.com
MAIL_PASS=your-app-password
\`\`\`

## Generate Strong Secrets
\`\`\`bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
\`\`\`

## Never commit .env
\`\`\`
# .gitignore
.env
.env.local
.env.production
\`\`\`

## Production deployment
- Use hosting secrets manager: Vercel env, Heroku Config Vars, AWS Secrets Manager
- Rotate secrets regularly
- Never log secrets`,
    examples: [
      '```javascript\nif (!process.env.JWT_SECRET) {\n  throw new Error("JWT_SECRET is required");\n}\nconst JWT_SECRET = process.env.JWT_SECRET;\n```'
    ],
    related: ['security', 'express-auth-routes']
  },

  {
    topic: 'async-handler', category: 'Real-World Backend',
    keywords: ['async handler', 'express async', 'async wrapper', 'error wrapper', 'try catch wrapper', 'async error', 'express async error'],
    title: 'Async Handler — DRY Error Handling',
    summary: 'Wrap async routes to auto-catch errors without repetitive try/catch. Errors bubble up to the error-handling middleware.',
    details: `## The Problem
Every async route needs try/catch:
\`\`\`javascript
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Repeated in every route!
\`\`\`

## The Solution — Higher Order Function
\`\`\`javascript
// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
\`\`\`

## Clean Routes
\`\`\`javascript
const asyncHandler = require('./utils/asyncHandler');

router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));

router.post('/users', asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
}));
// Errors auto-caught and forwarded to error middleware
\`\`\`

## Pair with Error-Handling Middleware
\`\`\`javascript
// server.js — AFTER all routes
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});
\`\`\`

## Custom Error Class
\`\`\`javascript
// utils/AppError.js
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;

// In route
const AppError = require('./utils/AppError');

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  res.json(user);
}));
\`\`\`

## Alternative: express-async-errors
\`\`\`bash
npm install express-async-errors
\`\`\`
\`\`\`javascript
// At the top of server.js — patches Express
require('express-async-errors');

// Now all async routes auto-catch
router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});
\`\`\`

## Combining patterns
\`\`\`javascript
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Credentials required', 400);

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new AppError('User not found', 404);

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError('Invalid password', 401);

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
}));
\`\`\``,
    examples: [
      '```javascript\nconst asyncHandler = fn => (req, res, next) =>\n  Promise.resolve(fn(req, res, next)).catch(next);\n\nrouter.get("/users", asyncHandler(async (req, res) => {\n  res.json(await User.find());\n}));\n```'
    ],
    related: ['error-handling', 'express', 'express-auth-routes']
  },

  {
    topic: 'logging-middleware', category: 'Real-World Backend',
    keywords: ['logging', 'logger', 'morgan', 'winston', 'log', 'request logging', 'http logging', 'access log'],
    title: 'Logging Middleware',
    summary: 'Log HTTP requests and application events. Morgan for request logs, Winston/Pino for app logs. Essential for debugging, monitoring, and audits.',
    details: `## Morgan — HTTP Request Logging
\`\`\`bash
npm install morgan
\`\`\`

\`\`\`javascript
const morgan = require('morgan');

// Development — colorized
app.use(morgan('dev'));
// :method :url :status :response-time ms - :res[content-length]
// Example: GET /api/users 200 23ms - 1.2kb

// Production — Apache-style
app.use(morgan('combined'));

// Custom format
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
\`\`\`

## Log to File
\`\`\`javascript
const fs = require('fs');
const path = require('path');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));
\`\`\`

## Skip Health Checks
\`\`\`javascript
app.use(morgan('dev', {
  skip: (req) => req.url === '/api/health',
}));
\`\`\`

## Winston — Application Logging
\`\`\`bash
npm install winston
\`\`\`

\`\`\`javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }));
}

module.exports = logger;
\`\`\`

## Usage
\`\`\`javascript
const logger = require('./utils/logger');

logger.info('User registered', { userId: user._id, email });
logger.warn('Rate limit approaching', { ip: req.ip });
logger.error('Database connection lost', { error: err.message });

// In error middleware
app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, url: req.url, method: req.method });
  res.status(500).json({ error: 'Server error' });
});
\`\`\`

## Pino — Fastest Logger
\`\`\`bash
npm install pino pino-http
\`\`\`

\`\`\`javascript
const pinoHttp = require('pino-http');
app.use(pinoHttp());

// In routes
req.log.info('Processing request');
req.log.error({ err }, 'Failed to save user');
\`\`\`

## Best Practices
- **Log levels:** error, warn, info, http, debug
- **Never log:** passwords, tokens, credit cards, PII
- **Always log:** errors, auth failures, payment events, user actions
- **Use structured logs** (JSON) for machine parsing
- **Rotate log files** to prevent disk fill
- **Central log aggregation:** CloudWatch, Datadog, Loggly for production
- **Correlation IDs:** Add request ID to trace across services`,
    examples: [
      '```javascript\nconst morgan = require("morgan");\napp.use(morgan("dev"));\n\n// Combined with Winston\nconst logger = require("./utils/logger");\nlogger.info("Server started", { port: 3000 });\n```'
    ],
    related: ['express', 'error-handling', 'security']
  },
];

const DIRECT_ANSWERS = [
  {
    patterns: ['validate.*email', 'email.*regex', 'email.*format', 'check.*email.*valid', 'email.*validation'],
    answer: '```javascript\nconst emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n\nif (!emailRegex.test(email)) {\n  return res.status(400).json({ message: "Invalid email format" });\n}\n```\n\nOr use **validator** package: `npm install validator`\n```javascript\nconst validator = require("validator");\nif (!validator.isEmail(email)) { ... }\n```',
    topic: 'email-validation', priority: 15
  },
  {
    patterns: ['rate limit', 'brute force', 'prevent.*attack', 'throttle.*request', 'express.*limit'],
    answer: '```bash\nnpm install express-rate-limit\n```\n```javascript\nconst rateLimit = require("express-rate-limit");\n\napp.use("/api/auth/login", rateLimit({\n  windowMs: 15 * 60 * 1000,   // 15 min\n  max: 5,                      // 5 attempts per IP\n  message: { error: "Too many attempts. Try again in 15 minutes." }\n}));\n```\n\n**Recommended limits:**\n- Login/register: 5 / 15min\n- Password reset: 3 / hour\n- Public API: 60-100 / min',
    topic: 'rate-limiting', priority: 15
  },
  {
    patterns: ['password.*strength', 'strong.*password', 'password.*policy', 'password.*regex', 'password.*complex'],
    answer: '```javascript\n// Min 8 chars, 1 uppercase, 1 number\nconst strongPassword = /^(?=.*[A-Z])(?=.*\\d).{8,}$/;\n\nif (!strongPassword.test(password)) {\n  return res.status(400).json({\n    message: "Password needs 8+ chars, 1 uppercase, 1 number"\n  });\n}\n```\n\nOr detailed validation:\n```javascript\nfunction validatePassword(pw) {\n  const errors = [];\n  if (pw.length < 8) errors.push("Min 8 chars");\n  if (!/[A-Z]/.test(pw)) errors.push("Need uppercase");\n  if (!/[a-z]/.test(pw)) errors.push("Need lowercase");\n  if (!/\\d/.test(pw)) errors.push("Need number");\n  if (!/[@$!%*?&#]/.test(pw)) errors.push("Need special char");\n  return errors;\n}\n```',
    topic: 'password-strength', priority: 15
  },
  {
    patterns: ['jwt.*secret.*fallback', 'secret.*default', 'env.*enforcement', 'env.*required', 'validate.*env'],
    answer: '**Never use fallback defaults for secrets — fail fast instead:**\n\n```javascript\n// BAD — silently insecure\nconst JWT_SECRET = process.env.JWT_SECRET || "change-me";\n\n// GOOD — crash on startup if missing\nif (!process.env.JWT_SECRET) {\n  throw new Error("JWT_SECRET environment variable is required");\n}\nconst JWT_SECRET = process.env.JWT_SECRET;\n```\n\n**Validate all required envs at startup:**\n```javascript\nconst required = ["MONGO_URI", "JWT_SECRET", "PORT"];\nconst missing = required.filter(k => !process.env[k]);\nif (missing.length) {\n  console.error("Missing env:", missing.join(", "));\n  process.exit(1);\n}\n```',
    topic: 'env-enforcement', priority: 15
  },
  {
    patterns: ['async.*handler', 'async.*wrapper', 'express.*try.*catch', 'auto.*catch.*error'],
    answer: '**Avoid repeating try/catch in every route:**\n\n```javascript\n// utils/asyncHandler.js\nconst asyncHandler = fn => (req, res, next) =>\n  Promise.resolve(fn(req, res, next)).catch(next);\n\nmodule.exports = asyncHandler;\n```\n\n**Clean usage:**\n```javascript\nrouter.get("/users", asyncHandler(async (req, res) => {\n  const users = await User.find();\n  res.json(users);\n}));\n// Errors auto-caught → forwarded to error middleware\n```\n\nAlternative — patches Express:\n```bash\nnpm install express-async-errors\n```\n```javascript\nrequire("express-async-errors");  // at top of server.js\n```',
    topic: 'async-handler', priority: 15
  },
  {
    patterns: ['logging.*middleware', 'morgan', 'request.*log', 'http.*log', 'winston', 'pino', 'access.*log'],
    answer: '**Morgan — HTTP request logging:**\n```bash\nnpm install morgan\n```\n```javascript\nconst morgan = require("morgan");\napp.use(morgan("dev"));  // colorized for dev\n// Or "combined" for production Apache-style\n```\n\n**Winston — application logging:**\n```bash\nnpm install winston\n```\n```javascript\nconst winston = require("winston");\nconst logger = winston.createLogger({\n  level: "info",\n  format: winston.format.json(),\n  transports: [\n    new winston.transports.File({ filename: "error.log", level: "error" }),\n    new winston.transports.File({ filename: "combined.log" })\n  ]\n});\nlogger.info("User registered", { userId, email });\n```\n\n**Rules:**\n- Never log: passwords, tokens, PII\n- Always log: errors, auth failures, payment events',
    topic: 'logging-middleware', priority: 15
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  let insertedE = 0, updatedE = 0;
  for (const entry of ENTRIES) {
    const result = await KnowledgeEntry.findOneAndUpdate(
      { topic: entry.topic }, entry,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) insertedE++;
    else updatedE++;
  }
  console.log(`Entries: ${insertedE} inserted, ${updatedE} updated`);

  let insertedA = 0, updatedA = 0;
  for (const da of DIRECT_ANSWERS) {
    const result = await DirectAnswer.findOneAndUpdate(
      { patterns: da.patterns[0] }, da,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) insertedA++;
    else updatedA++;
  }
  console.log(`Direct answers: ${insertedA} inserted, ${updatedA} updated`);

  const total = await KnowledgeEntry.countDocuments();
  const totalA = await DirectAnswer.countDocuments();
  console.log(`\nTotal entries: ${total} | Total direct answers: ${totalA}`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
