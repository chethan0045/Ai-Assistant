const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mongoose = require('mongoose');

// ===== MONGODB CONNECTION =====
const dns = require('dns');
// Use Google DNS to resolve MongoDB Atlas — fixes networks where default DNS blocks SRV records
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 15000,
  family: 4,
}).then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('Server continues running — auth features unavailable until DB connects.');
  });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===== AUTH ROUTES =====
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ===== KNOWLEDGE BASE ROUTES =====
const knowledgeRoutes = require('./routes/knowledge');
app.use('/api/knowledge', knowledgeRoutes);

// ===== GIT ROUTES =====
const gitRoutes = require('./routes/git');
app.use('/api/git', gitRoutes);

// ===== LEETCODE ROUTES =====
const leetcodeRoutes = require('./routes/leetcode');
app.use('/api/leetcode', leetcodeRoutes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Prevent unhandled WSS errors from crashing the process during port retry
wss.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') console.error('WebSocket error:', err.message);
});

const sessions = new Map();

wss.on('connection', (ws) => {
  const id = Date.now().toString();
  const session = { cwd: os.homedir(), activeProcess: null };
  sessions.set(id, session);

  ws.send(JSON.stringify({ type: 'info', data: `Shell ready — ${os.platform()} ${os.arch()}` }));
  ws.send(JSON.stringify({ type: 'cwd', data: session.cwd }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'command': runCommand(ws, session, msg.data); break;
      case 'kill': killProcess(session, ws); break;
      case 'stdin':
        if (session.activeProcess) session.activeProcess.stdin.write(msg.data);
        break;
      case 'cd': handleCd(ws, session, msg.data); break;
    }
  });

  ws.on('close', () => {
    killProcess(session, null);
    sessions.delete(id);
  });
});

function runCommand(ws, session, command) {
  let trimmed = command.trim();
  if (!trimmed) return;

  // cd — handle: cd, cd.., cd..\, cd .., cd\folder, cd C:\path
  if (/^cd(?:\s+|\.\.|\\|\/|$)/.test(trimmed)) {
    handleCd(ws, session, trimmed.replace(/^cd\s*/, '').trim() || os.homedir());
    return;
  }

  // clear
  if (trimmed === 'clear' || trimmed === 'cls') {
    ws.send(JSON.stringify({ type: 'clear' }));
    ws.send(JSON.stringify({ type: 'done', code: 0 }));
    return;
  }

  // pwd
  if (trimmed === 'pwd') {
    ws.send(JSON.stringify({ type: 'stdout', data: session.cwd }));
    ws.send(JSON.stringify({ type: 'done', code: 0 }));
    return;
  }

  // Auto-fix common port conflicts
  if (/^ng\s+serve\b/.test(trimmed) && !trimmed.includes('--port')) {
    trimmed += ' --port 0';
    ws.send(JSON.stringify({ type: 'info', data: '→ Auto-picking free port (--port 0)' }));
  }
  if (/^(npx\s+)?vite(\s|$)/.test(trimmed) && !trimmed.includes('--port')) {
    trimmed += ' --port 0';
    ws.send(JSON.stringify({ type: 'info', data: '→ Auto-picking free port' }));
  }

  const isWin = os.platform() === 'win32';
  const shell = isWin ? 'cmd.exe' : '/bin/bash';
  const flag = isWin ? '/c' : '-c';

  // Extract "set VAR=VAL &&" prefixes and add to env
  const extraEnv = {};
  let cmdToRun = trimmed;
  const setPattern = /^set\s+(\w+)=([^\s&]*)(\s*&&\s*)/i;
  let setMatch;
  while ((setMatch = setPattern.exec(cmdToRun)) !== null) {
    extraEnv[setMatch[1]] = setMatch[2];
    cmdToRun = cmdToRun.slice(setMatch[0].length);
  }

  try {
    const child = spawn(shell, [flag, cmdToRun], {
      cwd: session.cwd,
      env: { ...process.env, ...extraEnv, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    session.activeProcess = child;

    child.stdout.on('data', (d) => {
      try { ws.send(JSON.stringify({ type: 'stdout', data: d.toString() })); } catch {}
    });
    child.stderr.on('data', (d) => {
      try { ws.send(JSON.stringify({ type: 'stderr', data: d.toString() })); } catch {}
    });
    child.on('close', (code) => {
      session.activeProcess = null;
      try { ws.send(JSON.stringify({ type: 'done', code: code || 0 })); } catch {}
    });
    child.on('error', (err) => {
      session.activeProcess = null;
      try {
        ws.send(JSON.stringify({ type: 'stderr', data: `Error: ${err.message}` }));
        ws.send(JSON.stringify({ type: 'done', code: 1 }));
      } catch {}
    });
  } catch (err) {
    ws.send(JSON.stringify({ type: 'stderr', data: `Failed: ${err.message}` }));
    ws.send(JSON.stringify({ type: 'done', code: 1 }));
  }
}

function handleCd(ws, session, target) {
  if (!target || target === '~') target = os.homedir();

  // Handle Windows drive letters: C: or C:\
  let resolved;
  if (/^[a-zA-Z]:/.test(target)) {
    resolved = path.resolve(target);
  } else {
    resolved = path.resolve(session.cwd, target);
  }

  try {
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      session.cwd = resolved;
      ws.send(JSON.stringify({ type: 'cwd', data: resolved }));
      ws.send(JSON.stringify({ type: 'done', code: 0 }));
    } else {
      ws.send(JSON.stringify({ type: 'stderr', data: `cd: no such directory: ${target}` }));
      ws.send(JSON.stringify({ type: 'done', code: 1 }));
    }
  } catch (err) {
    ws.send(JSON.stringify({ type: 'stderr', data: `cd: ${err.message}` }));
    ws.send(JSON.stringify({ type: 'done', code: 1 }));
  }
}

function killProcess(session, ws) {
  if (!session.activeProcess) return;
  try {
    if (os.platform() === 'win32') {
      spawn('taskkill', ['/pid', session.activeProcess.pid.toString(), '/f', '/t']);
    } else {
      session.activeProcess.kill('SIGTERM');
    }
  } catch {}
  session.activeProcess = null;
  if (ws) {
    try {
      ws.send(JSON.stringify({ type: 'info', data: 'Process killed' }));
      ws.send(JSON.stringify({ type: 'done', code: -1 }));
    } catch {}
  }
}

// ===== AI ANALYSIS ENGINE (Backend) =====

// POST /api/ai/analyze — Deep code analysis
app.post('/api/ai/analyze', (req, res) => {
  const { command, files, currentFile, projectPath } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });

  try {
    const result = analyzeCode(command, files || [], currentFile, projectPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/scan-folder — Scan a folder on disk and return all files
app.post('/api/ai/scan-folder', (req, res) => {
  const { folderPath, extensions } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'folderPath required' });

  try {
    const exts = extensions || ['.js', '.ts', '.html', '.css', '.json', '.py', '.java', '.jsx', '.tsx', '.scss', '.vue', '.md'];
    const files = scanFolder(folderPath, exts);
    res.json({ files, count: files.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/generate — Generate code for a command
app.post('/api/ai/generate', (req, res) => {
  const { command, projectType, projectPath } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });

  try {
    const result = generateCode(command, projectType || 'express', projectPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/fix — Auto-fix a file
app.post('/api/ai/fix', (req, res) => {
  const { command, filePath, content } = req.body;
  if (!filePath || !content) return res.status(400).json({ error: 'filePath and content required' });

  try {
    const fixed = autoFixFile(command || 'fix all issues', content, filePath);
    res.json(fixed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/write-multiple — Write multiple files at once
app.post('/api/ai/write-multiple', (req, res) => {
  const { files } = req.body; // [{path, content}]
  if (!files || !Array.isArray(files)) return res.status(400).json({ error: 'files array required' });

  const results = { created: [], failed: [] };
  for (const f of files) {
    try {
      const dir = path.dirname(f.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(f.path, f.content || '', 'utf-8');
      results.created.push(f.path);
    } catch (err) {
      results.failed.push({ path: f.path, error: err.message });
    }
  }
  res.json(results);
});

// POST /api/ai/build — Create full project structure, write files, run commands
app.post('/api/ai/build', async (req, res) => {
  const { command, projectPath, projectType } = req.body;
  if (!command || !projectPath) return res.status(400).json({ error: 'command and projectPath required' });

  const cmdLower = command.toLowerCase();
  const results = { files: [], folders: [], commands: [], errors: [] };

  try {
    // Auto-scaffold if project is empty (no package.json)
    const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'))
      || fs.existsSync(path.join(projectPath, 'frontend', 'package.json'))
      || fs.existsSync(path.join(projectPath, 'backend', 'package.json'));
    if (!hasPackageJson) {
      await scaffoldFullProject(projectPath, results);
    }

    // Detect what to build
    if (cmdLower.includes('login') || cmdLower.includes('auth')) {
      await buildAuth(projectPath, projectType || detectProjectType(projectPath), results);
    } else if (cmdLower.match(/crud|api|rest/)) {
      const nameMatch = cmdLower.match(/(?:for|named?|called?)\s+(\w+)/i);
      const name = nameMatch ? nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1) : 'Item';
      await buildCRUD(projectPath, name, projectType || detectProjectType(projectPath), results);
    } else if (cmdLower.includes('component') || cmdLower.includes('page')) {
      const nameMatch = cmdLower.match(/(?:component|page)\s+(?:for\s+|named?\s+|called?\s+)?(\w+)/i) || cmdLower.match(/(?:build|create|generate)\s+(\w+)\s+(?:component|page)/i);
      const name = nameMatch ? nameMatch[1] : 'new';
      await buildAngularComponent(projectPath, name, results);
    } else if (cmdLower.includes('service')) {
      const nameMatch = cmdLower.match(/service\s+(?:for\s+|named?\s+)?(\w+)/i) || cmdLower.match(/(\w+)\s+service/i);
      const name = nameMatch ? nameMatch[1] : 'data';
      await buildAngularService(projectPath, name, results);
    } else if (cmdLower.includes('model') || cmdLower.includes('schema')) {
      const nameMatch = cmdLower.match(/(?:model|schema)\s+(?:for\s+|named?\s+)?(\w+)/i) || cmdLower.match(/(\w+)\s+(?:model|schema)/i);
      const name = nameMatch ? nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1) : 'Item';
      buildMongoModel(projectPath, name, results);
    } else if (cmdLower.includes('route') || cmdLower.includes('endpoint')) {
      const nameMatch = cmdLower.match(/(?:route|endpoint)\s+(?:for\s+|named?\s+)?(\w+)/i) || cmdLower.match(/(\w+)\s+(?:route|endpoint)/i);
      const name = nameMatch ? nameMatch[1] : 'items';
      buildExpressRoute(projectPath, name, results);
    } else if (cmdLower.includes('angular') || cmdLower.includes('project') || cmdLower.includes('init') || cmdLower.includes('scaffold') || cmdLower.includes('setup')) {
      await scaffoldFullProject(projectPath, results);
    } else {
      // Default: scaffold full project + whatever they asked for
      await scaffoldFullProject(projectPath, results);
      if (cmdLower.includes('login') || cmdLower.includes('auth')) {
        await buildAuth(projectPath, 'fullstack', results);
      }
    }

    res.json(results);
  } catch (err) {
    results.errors.push(err.message);
    res.json(results);
  }
});

// POST /api/ai/run-command — Execute a shell command in project directory
app.post('/api/ai/run-command', (req, res) => {
  const { command, cwd } = req.body;
  if (!command || !cwd) return res.status(400).json({ error: 'command and cwd required' });

  const isWin = os.platform() === 'win32';
  const shell = isWin ? 'cmd.exe' : '/bin/bash';
  const flag = isWin ? '/c' : '-c';

  const child = spawn(shell, [flag, command], { cwd, env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', d => stdout += d);
  child.stderr.on('data', d => stderr += d);
  child.on('close', code => {
    res.json({ stdout, stderr, code });
  });
  child.on('error', err => {
    res.json({ stdout, stderr: err.message, code: 1 });
  });
  setTimeout(() => { try { child.kill(); } catch {} }, 30000);
});

function detectProjectType(projectPath) {
  try {
    if (fs.existsSync(path.join(projectPath, 'angular.json'))) return 'angular';
    if (fs.existsSync(path.join(projectPath, 'frontend', 'angular.json'))) return 'fullstack';
    if (fs.existsSync(path.join(projectPath, 'frontend'))) return 'fullstack';
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      if (pkg.dependencies?.express) return 'express';
      if (pkg.dependencies?.['@angular/core']) return 'angular';
    }
  } catch {}
  // Default to fullstack for empty folders — create both frontend and backend
  return 'fullstack';
}

function writeFileSync(filePath, content, results) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); results.folders.push(dir); }
    fs.writeFileSync(filePath, content, 'utf-8');
    results.files.push(filePath);
  } catch (err) {
    results.errors.push(`Failed to create ${filePath}: ${err.message}`);
  }
}

async function buildAuth(projectPath, projectType, results) {
  const isFullStack = projectType === 'fullstack';
  const backendDir = isFullStack ? path.join(projectPath, 'backend') : projectPath;
  const frontendDir = isFullStack ? path.join(projectPath, 'frontend') : projectPath;

  // Backend files
  writeFileSync(path.join(backendDir, 'models', 'User.js'), `const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);`, results);

  writeFileSync(path.join(backendDir, 'middleware', 'auth.js'), `const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-change-this';
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};
module.exports = { authMiddleware, JWT_SECRET };`, results);

  writeFileSync(path.join(backendDir, 'routes', 'auth.js'), `const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed });
    const token = jwt.sign({ userId: user._id, name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Registration successful', token, user: { name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;`, results);

  // Frontend files (if Angular project)
  if (projectType === 'angular' || projectType === 'fullstack') {
    const appDir = path.join(frontendDir, 'src', 'app');

    writeFileSync(path.join(appDir, 'login', 'login.component.ts'), `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isLogin = true;
  name = ''; email = ''; password = '';
  loading = false; error = ''; success = '';

  constructor(private http: HttpClient, private router: Router) {}

  toggleMode() { this.isLogin = !this.isLogin; this.error = ''; }

  submit() {
    this.loading = true; this.error = '';
    const url = this.isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = this.isLogin ? { email: this.email, password: this.password } : { name: this.name, email: this.email, password: this.password };
    this.http.post<any>(url, body).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.router.navigate(['/dashboard']);
      },
      error: (err) => { this.error = err.error?.error || 'Failed'; this.loading = false; },
      complete: () => this.loading = false,
    });
  }
}`, results);

    writeFileSync(path.join(appDir, 'login', 'login.component.html'), `<div class="login-page">
  <div class="login-card">
    <h2>{{ isLogin ? 'Welcome Back' : 'Create Account' }}</h2>
    <div class="alert error" *ngIf="error">{{ error }}</div>
    <div class="alert success" *ngIf="success">{{ success }}</div>
    <div class="field" *ngIf="!isLogin"><label>Name</label><input [(ngModel)]="name" placeholder="Full name" /></div>
    <div class="field"><label>Email</label><input [(ngModel)]="email" type="email" placeholder="Email" /></div>
    <div class="field"><label>Password</label><input [(ngModel)]="password" type="password" placeholder="Password" (keydown.enter)="submit()" /></div>
    <button (click)="submit()" [disabled]="loading">{{ loading ? 'Wait...' : (isLogin ? 'Sign In' : 'Register') }}</button>
    <p class="toggle" (click)="toggleMode()">{{ isLogin ? 'No account? Register' : 'Have account? Login' }}</p>
  </div>
</div>`, results);

    writeFileSync(path.join(appDir, 'login', 'login.component.css'), `.login-page { display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e); }
.login-card { background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px;width:400px; }
h2 { color:#fff;margin:0 0 20px; }
.field { margin-bottom:16px; }
label { display:block;color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:6px; }
input { width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:14px;outline:none;box-sizing:border-box; }
input:focus { border-color:#818cf8; }
button { width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer; }
button:disabled { opacity:0.5; }
.toggle { text-align:center;color:#818cf8;cursor:pointer;margin-top:16px;font-size:13px; }
.alert { padding:10px;border-radius:8px;font-size:13px;margin-bottom:16px; }
.alert.error { background:rgba(239,68,68,0.15);color:#f87171; }
.alert.success { background:rgba(16,185,129,0.15);color:#34d399; }`, results);

    writeFileSync(path.join(appDir, 'services', 'auth.service.ts'), `import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}
  login(email: string, password: string) { return this.http.post<any>('/api/auth/login', { email, password }); }
  register(name: string, email: string, password: string) { return this.http.post<any>('/api/auth/register', { name, email, password }); }
  getToken() { return localStorage.getItem('token'); }
  getUser() { try { return JSON.parse(localStorage.getItem('user')!); } catch { return null; } }
  isLoggedIn() { return !!this.getToken(); }
  logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); }
}`, results);
  }

  results.commands.push('Auth system created: User model + auth routes + login component + auth service');
}

async function buildCRUD(projectPath, name, projectType, results) {
  const isFullStack = projectType === 'fullstack';
  const backendDir = isFullStack ? path.join(projectPath, 'backend') : projectPath;
  const lower = name.toLowerCase();

  buildMongoModel(projectPath, name, results);
  buildExpressRoute(projectPath, lower, results);
  results.commands.push(`CRUD for ${name}: model + routes created`);
}

function buildMongoModel(projectPath, name, results) {
  const isFullStack = fs.existsSync(path.join(projectPath, 'backend'));
  const backendDir = isFullStack ? path.join(projectPath, 'backend') : projectPath;
  const lower = name.toLowerCase();

  writeFileSync(path.join(backendDir, 'models', `${name}.js`), `const mongoose = require('mongoose');
const ${lower}Schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('${name}', ${lower}Schema);`, results);
}

function buildExpressRoute(projectPath, name, results) {
  const isFullStack = fs.existsSync(path.join(projectPath, 'backend'));
  const backendDir = isFullStack ? path.join(projectPath, 'backend') : projectPath;
  const Name = name.charAt(0).toUpperCase() + name.slice(1);

  writeFileSync(path.join(backendDir, 'routes', `${name}.js`), `const express = require('express');
const router = express.Router();
const ${Name} = require('../models/${Name}');

router.get('/', async (req, res) => {
  try { res.json(await ${Name}.find().sort({ createdAt: -1 }).lean()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/:id', async (req, res) => {
  try {
    const item = await ${Name}.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    res.status(201).json(await ${Name}.create({ ...req.body, createdBy: req.user?.userId }));
  } catch (err) { res.status(400).json({ error: err.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const item = await ${Name}.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(400).json({ error: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try {
    const item = await ${Name}.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;`, results);
}

async function buildAngularComponent(projectPath, name, results) {
  const isFullStack = fs.existsSync(path.join(projectPath, 'frontend'));
  const frontendDir = isFullStack ? path.join(projectPath, 'frontend') : projectPath;
  const appDir = path.join(frontendDir, 'src', 'app');
  const kebab = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

  writeFileSync(path.join(appDir, kebab, `${kebab}.component.ts`), `import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-${kebab}',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './${kebab}.component.html',
  styleUrls: ['./${kebab}.component.css']
})
export class ${name.charAt(0).toUpperCase() + name.slice(1)}Component implements OnInit {
  loading = false;
  data: any[] = [];

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading = true;
    // TODO: inject HttpClient and fetch from API
    this.loading = false;
  }
}`, results);

  writeFileSync(path.join(appDir, kebab, `${kebab}.component.html`), `<div class="${kebab}-page">
  <h2>${name.charAt(0).toUpperCase() + name.slice(1)}</h2>
  <div *ngIf="loading">Loading...</div>
  <div *ngIf="!loading">
    <p>Content goes here</p>
  </div>
</div>`, results);

  writeFileSync(path.join(appDir, kebab, `${kebab}.component.css`), `.${kebab}-page { padding: 24px; }
h2 { color: #333; margin-bottom: 16px; }`, results);

  results.commands.push(`Component ${name} created at ${appDir}/${kebab}/`);
}

async function buildAngularService(projectPath, name, results) {
  const isFullStack = fs.existsSync(path.join(projectPath, 'frontend'));
  const frontendDir = isFullStack ? path.join(projectPath, 'frontend') : projectPath;
  const appDir = path.join(frontendDir, 'src', 'app');
  const kebab = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  const className = name.charAt(0).toUpperCase() + name.slice(1);

  writeFileSync(path.join(appDir, 'services', `${kebab}.service.ts`), `import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ${className}Service {
  private baseUrl = '/api/${kebab}s';

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> { return this.http.get<any[]>(this.baseUrl); }
  getById(id: string): Observable<any> { return this.http.get<any>(\`\${this.baseUrl}/\${id}\`); }
  create(data: any): Observable<any> { return this.http.post<any>(this.baseUrl, data); }
  update(id: string, data: any): Observable<any> { return this.http.put<any>(\`\${this.baseUrl}/\${id}\`, data); }
  delete(id: string): Observable<any> { return this.http.delete<any>(\`\${this.baseUrl}/\${id}\`); }
}`, results);

  results.commands.push(`Service ${className}Service created`);
}

async function scaffoldFullProject(projectPath, results) {
  const be = path.join(projectPath, 'backend');
  const fe = path.join(projectPath, 'frontend', 'src', 'app');

  // Backend: server.js
  writeFileSync(path.join(be, 'server.js'), `const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myapp')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
// Add more routes: app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server on port ' + PORT));`, results);

  // Backend: package.json
  writeFileSync(path.join(be, 'package.json'), JSON.stringify({
    name: path.basename(projectPath) + '-backend',
    version: '1.0.0',
    scripts: { start: 'node server.js', dev: 'nodemon server.js' },
    dependencies: { express: '^4.18.2', cors: '^2.8.5', mongoose: '^8.6.0', dotenv: '^16.4.5', bcryptjs: '^2.4.3', jsonwebtoken: '^9.0.2' },
    devDependencies: { nodemon: '^3.1.4' }
  }, null, 2), results);

  // Backend: .env
  writeFileSync(path.join(be, '.env'), `PORT=3000
MONGO_URI=mongodb://localhost:27017/${path.basename(projectPath)}
JWT_SECRET=change-this-secret-key`, results);

  // Frontend: main files
  writeFileSync(path.join(projectPath, 'frontend', 'src', 'main.ts'), `import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()]
});`, results);

  writeFileSync(path.join(projectPath, 'frontend', 'src', 'index.html'), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${path.basename(projectPath)}</title><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></head>
<body><app-root></app-root></body>
</html>`, results);

  writeFileSync(path.join(projectPath, 'frontend', 'src', 'styles.css'), `* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Inter',sans-serif; background:#0f0c29; color:#fff; min-height:100vh; }
a { color:#818cf8; text-decoration:none; }`, results);

  writeFileSync(path.join(fe, 'app.component.ts'), `import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
@Component({ selector: 'app-root', standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
export class AppComponent {}`, results);

  writeFileSync(path.join(fe, 'app.routes.ts'), `import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  // Add routes: { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
];`, results);

  // Home component
  writeFileSync(path.join(fe, 'home', 'home.component.ts'), `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-home', standalone: true, imports: [CommonModule],
  template: '<div class="home"><h1>${path.basename(projectPath)}</h1><p>Welcome! Your project is ready.</p></div>',
  styles: ['.home{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;} h1{font-size:48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;} p{color:#8888a8;margin-top:8px;}']
})
export class HomeComponent {}`, results);

  // Angular config files
  writeFileSync(path.join(projectPath, 'frontend', 'angular.json'), JSON.stringify({
    "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
    version: 1, projects: { app: { projectType: 'application', root: '', sourceRoot: 'src', prefix: 'app',
      architect: {
        build: { builder: '@angular-devkit/build-angular:application', options: { outputPath: 'dist/', index: 'src/index.html', browser: 'src/main.ts', polyfills: ['zone.js'], tsConfig: 'tsconfig.app.json', styles: ['src/styles.css'] },
          configurations: { production: { outputHashing: 'all' }, development: { optimization: false, sourceMap: true } }, defaultConfiguration: 'production' },
        serve: { builder: '@angular-devkit/build-angular:dev-server', options: { port: 4200 }, configurations: { production: { buildTarget: 'app:build:production' }, development: { buildTarget: 'app:build:development' } }, defaultConfiguration: 'development' }
      }
    }}
  }, null, 2), results);

  writeFileSync(path.join(projectPath, 'frontend', 'tsconfig.json'), JSON.stringify({
    compileOnSave: false, compilerOptions: { outDir: './dist', forceConsistentCasingInFileNames: true, strict: true, noImplicitOverride: true, noPropertyAccessFromIndexSignature: true,
      noImplicitReturns: true, noFallthroughCasesInSwitch: true, sourceMap: true, declaration: false, downlevelIteration: true, experimentalDecorators: true,
      moduleResolution: 'node', importHelpers: true, target: 'ES2022', module: 'ES2022', useDefineForClassFields: false, lib: ['ES2022', 'dom'] }
  }, null, 2), results);

  writeFileSync(path.join(projectPath, 'frontend', 'tsconfig.app.json'), JSON.stringify({
    extends: './tsconfig.json', compilerOptions: { outDir: './out-tsc/app', types: [] }, files: ['src/main.ts'], include: ['src/**/*.d.ts', 'src/**/*.ts']
  }, null, 2), results);

  writeFileSync(path.join(projectPath, 'frontend', 'package.json'), JSON.stringify({
    name: path.basename(projectPath) + '-frontend', version: '0.0.0', scripts: { ng: 'ng', start: 'ng serve', build: 'ng build' },
    dependencies: { '@angular/animations': '^18.2.0', '@angular/common': '^18.2.0', '@angular/compiler': '^18.2.0', '@angular/core': '^18.2.0',
      '@angular/forms': '^18.2.0', '@angular/platform-browser': '^18.2.0', '@angular/router': '^18.2.0', rxjs: '~7.8.0', tslib: '^2.3.0', 'zone.js': '~0.14.0' },
    devDependencies: { '@angular-devkit/build-angular': '^18.2.0', '@angular/cli': '^18.2.0', '@angular/compiler-cli': '^18.2.0', typescript: '~5.5.0' }
  }, null, 2), results);

  results.commands.push('Full-stack project scaffolded! Run: cd backend && npm install && npm start');
  results.commands.push('Frontend: cd frontend && npm install && ng serve');
}

// === AI Engine Functions ===

function scanFolder(dir, exts, maxDepth = 5, depth = 0) {
  const files = [];
  if (depth > maxDepth) return files;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      if (entry.isDirectory()) {
        files.push(...scanFolder(full, exts, maxDepth, depth + 1));
      } else if (exts.some(e => entry.name.endsWith(e))) {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          const ext = path.extname(entry.name).slice(1);
          files.push({ name: entry.name, path: full, content, extension: ext, size: content.length, lines: content.split('\n').length });
        } catch {}
      }
    }
  } catch {}
  return files;
}

// System prompt — drives all AI behavior
const AI_SYSTEM_PROMPT = `You are an advanced AI assistant like Claude.
Capabilities: Understand codebases, Debug errors, Suggest improvements, Generate full working code.
Rules: Be clear and structured, Think step by step, Give complete solutions.`;

function analyzeCode(command, files, currentFile, projectPath) {
  const cmdLower = command.toLowerCase();
  const patterns = { routes: [], functions: [], models: [], dbCalls: [], issues: [] };

  // Analyze each file
  for (const file of files) {
    const lines = (file.content || '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Routes
      const routeM = line.match(/(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"](.*?)['"]/);
      if (routeM) patterns.routes.push({ method: routeM[1].toUpperCase(), path: routeM[2], file: file.path || file.name, line: i + 1 });
      // Functions
      const funcM = line.match(/(?:async\s+)?function\s+(\w+)\s*\((.*?)\)/);
      if (funcM) patterns.functions.push({ name: funcM[1], params: funcM[2], file: file.path || file.name, line: i + 1 });
      // Arrow functions
      const arrowM = line.match(/(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\((.*?)\)\s*=>/);
      if (arrowM) patterns.functions.push({ name: arrowM[1], params: arrowM[2], file: file.path || file.name, line: i + 1 });
      // Models
      const modelM = line.match(/mongoose\.model\s*\(\s*['"](.*?)['"]/);
      if (modelM) patterns.models.push({ name: modelM[1], file: file.path || file.name, line: i + 1 });
      // DB calls without null checks
      const dbM = line.match(/(?:const|let)\s+(\w+)\s*=\s*await\s+\w+\.(findOne|findById)\s*\(/);
      if (dbM) {
        const nextLines = lines.slice(i + 1, i + 4).join('\n');
        if (!nextLines.includes('if') || !nextLines.includes('!' + dbM[1])) {
          patterns.issues.push({ type: 'missing-null-check', variable: dbM[1], method: dbM[2], file: file.path || file.name, line: i + 1 });
        }
      }
      // Missing validation
      const bodyM = line.match(/(?:const|let)\s*\{\s*([\w\s,]+)\s*\}\s*=\s*req\.body/);
      if (bodyM) {
        const fields = bodyM[1].split(',').map(f => f.trim()).filter(Boolean);
        const hasCheck = lines.slice(i + 1, i + 6).some(l => l.includes('if') && fields.some(f => l.includes(f)));
        if (!hasCheck) patterns.issues.push({ type: 'missing-validation', fields, file: file.path || file.name, line: i + 1 });
      }
      // console.log in production code
      if (line.includes('console.log') && !line.trimStart().startsWith('//')) {
        patterns.issues.push({ type: 'console-log', file: file.path || file.name, line: i + 1, text: line.trim() });
      }
    }
  }

  return {
    command,
    patterns,
    summary: `Found ${patterns.routes.length} routes, ${patterns.functions.length} functions, ${patterns.models.length} models, ${patterns.issues.length} issues`,
    fileCount: files.length,
  };
}

function generateCode(command, projectType, projectPath) {
  const cmdLower = command.toLowerCase();
  const files = [];

  if (cmdLower.includes('login') || cmdLower.includes('auth')) {
    if (projectType === 'angular' || projectType === 'full-stack') {
      files.push({
        name: 'login.component.ts',
        path: projectPath ? path.join(projectPath, 'frontend', 'src', 'app', 'login', 'login.component.ts') : 'login/login.component.ts',
        content: generateAngularLoginComponent(),
      });
      files.push({
        name: 'login.component.html',
        path: projectPath ? path.join(projectPath, 'frontend', 'src', 'app', 'login', 'login.component.html') : 'login/login.component.html',
        content: generateAngularLoginHTML(),
      });
      files.push({
        name: 'login.component.css',
        path: projectPath ? path.join(projectPath, 'frontend', 'src', 'app', 'login', 'login.component.css') : 'login/login.component.css',
        content: generateLoginCSS(),
      });
      files.push({
        name: 'auth.service.ts',
        path: projectPath ? path.join(projectPath, 'frontend', 'src', 'app', 'services', 'auth.service.ts') : 'services/auth.service.ts',
        content: generateAuthService(),
      });
    }
    files.push({
      name: 'auth.routes.js',
      path: projectPath ? path.join(projectPath, 'backend', 'routes', 'auth.js') : 'routes/auth.js',
      content: generateAuthRoutes(),
    });
    files.push({
      name: 'User.js',
      path: projectPath ? path.join(projectPath, 'backend', 'models', 'User.js') : 'models/User.js',
      content: generateUserModel(),
    });
    files.push({
      name: 'auth.middleware.js',
      path: projectPath ? path.join(projectPath, 'backend', 'middleware', 'auth.js') : 'middleware/auth.js',
      content: generateAuthMiddleware(),
    });
  }

  // CRUD
  const crudMatch = cmdLower.match(/(?:crud|api|rest)\s+(?:for\s+)?(\w+)/i);
  if (crudMatch) {
    const name = crudMatch[1].charAt(0).toUpperCase() + crudMatch[1].slice(1);
    files.push({
      name: `${name}.js`,
      path: projectPath ? path.join(projectPath, 'backend', 'models', `${name}.js`) : `models/${name}.js`,
      content: generateMongoModel(name),
    });
    files.push({
      name: `${name.toLowerCase()}s.js`,
      path: projectPath ? path.join(projectPath, 'backend', 'routes', `${name.toLowerCase()}s.js`) : `routes/${name.toLowerCase()}s.js`,
      content: generateCRUDRoute(name),
    });
  }

  return { files, command, fileCount: files.length };
}

function autoFixFile(command, content, filePath) {
  const lines = content.split('\n');
  const newLines = [...lines];
  const changes = [];
  const cmdLower = command.toLowerCase();

  // Add null checks
  for (let i = newLines.length - 1; i >= 0; i--) {
    const dbM = newLines[i].match(/(?:const|let)\s+(\w+)\s*=\s*await\s+\w+\.(findOne|findById)\s*\(/);
    if (dbM) {
      const next = newLines.slice(i + 1, i + 4).join('\n');
      if (!next.includes('if') || !next.includes('!' + dbM[1])) {
        newLines.splice(i + 1, 0,
          `    if (!${dbM[1]}) {`,
          `      return res.status(404).json({ error: '${dbM[1]} not found' });`,
          `    }`);
        changes.push({ line: i + 1, type: 'null-check', desc: `Added null check for ${dbM[1]}` });
      }
    }
  }

  // Add validation
  for (let i = 0; i < newLines.length; i++) {
    const bodyM = newLines[i].match(/(?:const|let)\s*\{\s*([\w\s,]+)\s*\}\s*=\s*req\.body/);
    if (bodyM) {
      const fields = bodyM[1].split(',').map(f => f.trim()).filter(Boolean);
      const hasCheck = newLines.slice(i + 1, i + 6).some(l => l.includes('if') && fields.some(f => l.includes(f)));
      if (!hasCheck && fields.length > 0) {
        const checks = fields.map(f => `!${f}`).join(' || ');
        newLines.splice(i + 1, 0,
          `    if (${checks}) {`,
          `      return res.status(400).json({ error: '${fields.join(', ')} are required' });`,
          `    }`);
        changes.push({ line: i + 1, type: 'validation', desc: `Added validation for ${fields.join(', ')}` });
      }
    }
  }

  // Add missing field
  const fieldMatch = cmdLower.match(/(?:add|fix|missing)\s+(\w+)\s*(?:field|property)?/);
  if (fieldMatch) {
    const fieldName = fieldMatch[1].replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    for (let i = 0; i < newLines.length; i++) {
      if ((newLines[i].includes('new Schema') || newLines[i].includes('new mongoose.Schema')) && !content.includes(fieldName)) {
        for (let j = i + 1; j < Math.min(i + 50, newLines.length); j++) {
          if (newLines[j].match(/^\s*\}\s*,?\s*\{/) || (newLines[j].trim() === '}' && j > i + 2)) {
            newLines.splice(j, 0, `  ${fieldName}: { type: String, default: '' },`);
            changes.push({ line: j, type: 'add-field', desc: `Added ${fieldName} to schema` });
            break;
          }
        }
        break;
      }
    }
  }

  return {
    original: content,
    fixed: newLines.join('\n'),
    changes,
    changed: newLines.join('\n') !== content,
    filePath,
  };
}

// === Code Generators ===

function generateAngularLoginComponent() {
  return `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isLogin = true;
  name = '';
  email = '';
  password = '';
  loading = false;
  error = '';
  success = '';

  constructor(private auth: AuthService, private router: Router) {}

  toggleMode() { this.isLogin = !this.isLogin; this.error = ''; this.success = ''; }

  submit() {
    this.loading = true;
    this.error = '';
    const obs = this.isLogin
      ? this.auth.login(this.email, this.password)
      : this.auth.register(this.name, this.email, this.password);

    obs.subscribe({
      next: (res) => {
        this.success = res.message;
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setTimeout(() => this.router.navigate(['/dashboard']), 500);
      },
      error: (err) => {
        this.error = err.error?.error || 'Something went wrong';
        this.loading = false;
      },
      complete: () => this.loading = false,
    });
  }
}`;
}

function generateAngularLoginHTML() {
  return `<div class="login-page">
  <div class="login-card">
    <h2>{{ isLogin ? 'Welcome Back' : 'Create Account' }}</h2>
    <p class="subtitle">{{ isLogin ? 'Sign in to continue' : 'Register to get started' }}</p>

    <div class="alert error" *ngIf="error">{{ error }}</div>
    <div class="alert success" *ngIf="success">{{ success }}</div>

    <div class="form-group" *ngIf="!isLogin">
      <label>Full Name</label>
      <input [(ngModel)]="name" placeholder="Enter your name" />
    </div>
    <div class="form-group">
      <label>Email</label>
      <input [(ngModel)]="email" type="email" placeholder="Enter your email" />
    </div>
    <div class="form-group">
      <label>Password</label>
      <input [(ngModel)]="password" type="password" placeholder="Enter password" (keydown.enter)="submit()" />
    </div>

    <button class="submit-btn" (click)="submit()" [disabled]="loading">
      {{ loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account') }}
    </button>

    <p class="toggle-text" (click)="toggleMode()">
      {{ isLogin ? "Don't have an account? Register" : 'Already have account? Sign In' }}
    </p>
  </div>
</div>`;
}

function generateLoginCSS() {
  return `.login-page {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
}
.login-card {
  background: rgba(255,255,255,0.05); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
  padding: 40px; width: 400px; max-width: 90vw;
}
h2 { color: #fff; font-size: 24px; margin: 0 0 4px; }
.subtitle { color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 24px; }
.form-group { margin-bottom: 16px; }
label { display: block; color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 6px; }
input {
  width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
  color: #fff; font-size: 14px; outline: none; box-sizing: border-box;
}
input:focus { border-color: #818cf8; }
input::placeholder { color: rgba(255,255,255,0.3); }
.submit-btn {
  width: 100%; padding: 14px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none; border-radius: 8px; color: #fff; font-size: 16px;
  font-weight: 600; cursor: pointer; margin-top: 8px; transition: all 0.2s;
}
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
.submit-btn:disabled { opacity: 0.5; }
.toggle-text { text-align: center; color: #818cf8; font-size: 13px; cursor: pointer; margin-top: 16px; }
.toggle-text:hover { text-decoration: underline; }
.alert { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.alert.error { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
.alert.success { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }`;
}

function generateAuthService() {
  return `import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(this.baseUrl + '/login', { email, password });
  }

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post(this.baseUrl + '/register', { name, email, password });
  }

  getToken(): string | null { return localStorage.getItem('token'); }
  getUser(): any { try { return JSON.parse(localStorage.getItem('user') || ''); } catch { return null; } }
  isLoggedIn(): boolean { return !!this.getToken(); }
  logout(): void { localStorage.removeItem('token'); localStorage.removeItem('user'); }
}`;
}

function generateAuthRoutes() {
  return `const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed });
    const token = jwt.sign({ userId: user._id, name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Registration successful', token, user: { name, email: user.email } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;`;
}

function generateUserModel() {
  return `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);`;
}

function generateAuthMiddleware() {
  return `const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authMiddleware, JWT_SECRET };`;
}

function generateMongoModel(name) {
  const lower = name.toLowerCase();
  return `const mongoose = require('mongoose');

const ${lower}Schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('${name}', ${lower}Schema);`;
}

function generateCRUDRoute(name) {
  const lower = name.toLowerCase();
  return `const express = require('express');
const router = express.Router();
const ${name} = require('../models/${name}');

// GET all
router.get('/', async (req, res) => {
  try {
    const items = await ${name}.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await ${name}.findById(req.params.id);
    if (!item) return res.status(404).json({ error: '${name} not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const item = await ${name}.create({ ...req.body, createdBy: req.user?.userId });
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const item = await ${name}.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: '${name} not found' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const item = await ${name}.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: '${name} not found' });
    res.json({ message: '${name} deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;`;
}

// ===== PYTHON AI MODULE PROXY =====
const AI_MODULE_PORT = process.env.AI_MODULE_PORT || 5100;

function proxyToAIModule(req, res, method = 'GET') {
  const targetPath = req.url.replace('/api/ai-module', '/api/ai-module');
  const options = {
    hostname: 'localhost',
    port: AI_MODULE_PORT,
    path: targetPath,
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    // Handle SSE streaming
    if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
      return;
    }

    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      try {
        res.status(proxyRes.statusCode || 200).json(JSON.parse(data));
      } catch {
        res.status(proxyRes.statusCode || 200).send(data);
      }
    });
  });

  proxyReq.on('error', (err) => {
    res.status(502).json({
      error: `AI Module not reachable at localhost:${AI_MODULE_PORT}. Start it with: python ai-server.py`,
      detail: err.message,
    });
  });

  if (method === 'POST' && req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
}

// AI Module proxy — GET routes
app.get('/api/ai-module/status', (req, res) => proxyToAIModule(req, res, 'GET'));
app.get('/api/ai-module/models', (req, res) => proxyToAIModule(req, res, 'GET'));
app.get('/api/ai-module/models/:alias', (req, res) => proxyToAIModule(req, res, 'GET'));
app.get('/api/ai-module/session/:id', (req, res) => proxyToAIModule(req, res, 'GET'));
app.get('/api/ai-module/cache/stats', (req, res) => proxyToAIModule(req, res, 'GET'));

// AI Module proxy — POST routes
app.post('/api/ai-module/session', (req, res) => proxyToAIModule(req, res, 'POST'));
app.post('/api/ai-module/session/:id/message', (req, res) => proxyToAIModule(req, res, 'POST'));
app.post('/api/ai-module/session/:id/stream', (req, res) => proxyToAIModule(req, res, 'POST'));
app.post('/api/ai-module/prompt/build', (req, res) => proxyToAIModule(req, res, 'POST'));
app.post('/api/ai-module/usage/estimate', (req, res) => proxyToAIModule(req, res, 'POST'));
app.post('/api/ai-module/analyze', (req, res) => proxyToAIModule(req, res, 'POST'));

// ===== DEEPSEEK AI =====
const { CloudAIService } = require('./cloud-ai.service');
const deepseekAI = new CloudAIService();
try { require('dotenv').config(); } catch {}
if (process.env.DEEPSEEK_API_KEY) deepseekAI.setApiKey(process.env.DEEPSEEK_API_KEY);

app.get('/api/ai/status', (req, res) => res.json(deepseekAI.getStatus()));

app.post('/api/ai/key', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  deepseekAI.setApiKey(key);
  res.json({ success: true });
});

app.post('/api/ai/chat/stream', async (req, res) => {
  const { messages, model, projectContext, currentFile, conversationHistory, userInput } = req.body;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' });
  try {
    const chatMessages = messages || deepseekAI.buildMessages(userInput || '', projectContext || '', conversationHistory || [], currentFile);
    await deepseekAI.streamChat(chatMessages, model, res);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// REST: health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// REST: Write a file (create or overwrite)
app.post('/api/write-file', (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content || '', 'utf-8');
    res.json({ success: true, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST: Create a folder
app.post('/api/create-folder', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'folderPath required' });
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    res.json({ success: true, path: folderPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST: Read a file
app.get('/api/read-file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST: List directory
app.get('/api/list-dir', (req, res) => {
  const dirPath = req.query.path;
  if (!dirPath) return res.status(400).json({ error: 'path required' });
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true }).map(d => ({
      name: d.name, isDirectory: d.isDirectory(),
      path: path.join(dirPath, d.name),
    }));
    res.json({ items, path: dirPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST: Delete file or folder
app.post('/api/delete', (req, res) => {
  const { targetPath } = req.body;
  if (!targetPath) return res.status(400).json({ error: 'targetPath required' });
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    res.json({ success: true, deleted: targetPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REST: find folder path by name — deep search up to 3 levels on all drives
app.get('/api/find-folder', (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name required' });

  const lower = name.toLowerCase();

  // Priority 1: direct children of common locations
  const priority = [
    os.homedir(),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Projects'),
    path.join(os.homedir(), 'source'),
    path.join(os.homedir(), 'repos'),
  ];

  // Add all drive roots
  for (const letter of 'CDEFGH') {
    priority.push(letter + ':\\');
  }

  for (const dir of priority) {
    try {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return res.json({ path: candidate });
      }
    } catch {}
  }

  // Priority 2: search 2 levels deep on each drive
  for (const letter of 'CDEFGH') {
    const drive = letter + ':\\';
    try {
      const l1 = fs.readdirSync(drive, { withFileTypes: true });
      for (const d1 of l1) {
        if (!d1.isDirectory()) continue;
        // Check direct match
        if (d1.name.toLowerCase() === lower) {
          return res.json({ path: path.join(drive, d1.name) });
        }
        // Check children
        try {
          const l2path = path.join(drive, d1.name);
          const l2 = fs.readdirSync(l2path, { withFileTypes: true });
          for (const d2 of l2) {
            if (d2.isDirectory() && d2.name.toLowerCase() === lower) {
              return res.json({ path: path.join(l2path, d2.name) });
            }
          }
        } catch {}
      }
    } catch {}
  }

  res.json({ path: null });
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`Terminal server on http://localhost:${port}`);
    console.log(`WebSocket on ws://localhost:${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}
startServer(4100);
