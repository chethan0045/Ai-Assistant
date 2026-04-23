/**
 * Seed ProjectBlueprint collection with reusable Angular + Express project
 * shapes. Each blueprint stores a description + file skeletons. The semantic
 * generator retrieves the best match for a user request; the LLM path expands
 * the skeletons into full files, the offline path writes them as-is.
 *
 * Run: node seed-project-blueprints.js
 * Then: node backfill-embeddings.js
 */
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const ProjectBlueprint = require('./models/ProjectBlueprint');

const BLUEPRINTS = [
  {
    slug: 'express-mongo-crud-api',
    title: 'Express + MongoDB CRUD API',
    description: 'REST API with Express, Mongoose, JSON CRUD endpoints, CORS, dotenv. Good starting point for a backend-only project.',
    stack: ['node', 'express', 'mongoose', 'mongodb'],
    keywords: ['rest api', 'express crud', 'mongoose', 'backend api', 'node api', 'express mongo', 'json api'],
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "express-crud-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mongoose": "^8.5.1"
  }
}
`,
      },
      {
        path: '.env.example',
        content: `PORT=3000\nMONGO_URI=mongodb://localhost:27017/crudapi\n`,
      },
      {
        path: 'server.js',
        content: `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const itemsRouter = require('./routes/items');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/items', itemsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log('API on :' + PORT)))
  .catch(err => { console.error('Mongo connect failed:', err.message); process.exit(1); });
`,
      },
      {
        path: 'models/Item.js',
        content: `const mongoose = require('mongoose');
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model('Item', itemSchema);
`,
      },
      {
        path: 'routes/items.js',
        content: `const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

router.get('/', async (_req, res, next) => {
  try { res.json(await Item.find().sort({ createdAt: -1 })); }
  catch (err) { next(err); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  try { res.status(201).json(await Item.create(req.body)); }
  catch (err) { next(err); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});
module.exports = router;
`,
      },
      {
        path: 'README.md',
        content: `# Express + MongoDB CRUD API

## Run
\`\`\`
npm install
cp .env.example .env
npm run dev
\`\`\`

Endpoints: GET/POST \`/api/items\`, GET/PUT/DELETE \`/api/items/:id\`
`,
      },
    ],
    instructions: 'Run `npm install`, set MONGO_URI in .env, then `npm run dev`. API at http://localhost:3000/api/items.',
  },

  {
    slug: 'express-jwt-auth',
    title: 'Express + JWT Auth API',
    description: 'Node/Express backend with user registration, bcrypt password hashing, JWT login, and protected /me route. Uses MongoDB.',
    stack: ['node', 'express', 'jwt', 'bcrypt', 'mongoose'],
    keywords: ['jwt auth', 'express authentication', 'login api', 'bcrypt', 'register login', 'protected routes', 'auth backend'],
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "express-jwt-auth",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.5.1"
  }
}
`,
      },
      {
        path: '.env.example',
        content: `PORT=3000\nMONGO_URI=mongodb://localhost:27017/authapp\nJWT_SECRET=change-me-in-production\n`,
      },
      {
        path: 'server.js',
        content: `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRouter = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log('Auth API on :' + PORT)))
  .catch(err => { console.error(err); process.exit(1); });
`,
      },
      {
        path: 'models/User.js',
        content: `const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
`,
      },
      {
        path: 'middleware/auth.js',
        content: `const jwt = require('jsonwebtoken');
module.exports = function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};
`,
      },
      {
        path: 'routes/auth.js',
        content: `const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email + password required' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already used' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, name });
  res.status(201).json({ id: user._id, email: user.email });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-passwordHash');
  res.json(user);
});

module.exports = router;
`,
      },
    ],
    instructions: 'POST /api/auth/register, /api/auth/login, GET /api/auth/me (Authorization: Bearer <token>).',
  },

  {
    slug: 'angular-todo-standalone',
    title: 'Angular Todo App (standalone components)',
    description: 'Angular 17 standalone-component todo app with signals, local-storage persistence, add/toggle/delete.',
    stack: ['angular', 'typescript', 'signals'],
    keywords: ['angular todo', 'todo app', 'angular standalone', 'angular signals', 'task manager ui', 'angular crud ui'],
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "angular-todo",
  "version": "0.0.0",
  "scripts": {
    "start": "ng serve",
    "build": "ng build"
  },
  "dependencies": {
    "@angular/common": "^17.3.0",
    "@angular/compiler": "^17.3.0",
    "@angular/core": "^17.3.0",
    "@angular/forms": "^17.3.0",
    "@angular/platform-browser": "^17.3.0",
    "@angular/platform-browser-dynamic": "^17.3.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.3"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.3.0",
    "@angular/cli": "^17.3.0",
    "@angular/compiler-cli": "^17.3.0",
    "typescript": "~5.4.0"
  }
}
`,
      },
      {
        path: 'src/main.ts',
        content: `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
bootstrapApplication(AppComponent).catch(err => console.error(err));
`,
      },
      {
        path: 'src/index.html',
        content: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Todo</title><base href="/"></head>
<body><app-root></app-root></body>
</html>
`,
      },
      {
        path: 'src/app/app.component.ts',
        content: `import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Todo { id: number; text: string; done: boolean; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <main class="wrap">
      <h1>Todo</h1>
      <form (submit)="add(); $event.preventDefault()">
        <input [(ngModel)]="draft" name="draft" placeholder="What needs doing?" />
        <button type="submit" [disabled]="!draft.trim()">Add</button>
      </form>
      <ul>
        <li *ngFor="let t of todos()" [class.done]="t.done">
          <input type="checkbox" [checked]="t.done" (change)="toggle(t.id)">
          <span>{{ t.text }}</span>
          <button (click)="remove(t.id)">&times;</button>
        </li>
      </ul>
      <p class="count">{{ remaining() }} left</p>
    </main>
  \`,
  styles: [\`
    .wrap { max-width: 480px; margin: 40px auto; font-family: system-ui; }
    form { display: flex; gap: 8px; margin-bottom: 16px; }
    input[type=text], input:not([type]) { flex: 1; padding: 8px; }
    ul { list-style: none; padding: 0; }
    li { display: flex; gap: 8px; padding: 6px 0; align-items: center; }
    li.done span { text-decoration: line-through; opacity: 0.6; }
    li span { flex: 1; }
    .count { color: #666; font-size: 13px; }
  \`],
})
export class AppComponent {
  draft = '';
  todos = signal<Todo[]>(JSON.parse(localStorage.getItem('todos') || '[]'));
  remaining = computed(() => this.todos().filter(t => !t.done).length);

  constructor() {
    effect(() => localStorage.setItem('todos', JSON.stringify(this.todos())));
  }

  add() {
    const text = this.draft.trim();
    if (!text) return;
    this.todos.update(ts => [...ts, { id: Date.now(), text, done: false }]);
    this.draft = '';
  }
  toggle(id: number) {
    this.todos.update(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }
  remove(id: number) {
    this.todos.update(ts => ts.filter(t => t.id !== id));
  }
}
`,
      },
      {
        path: 'angular.json',
        content: `{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "projects": {
    "angular-todo": {
      "projectType": "application",
      "root": "",
      "sourceRoot": "src",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.json"
          }
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "options": { "port": 4200 }
        }
      }
    }
  }
}
`,
      },
      {
        path: 'tsconfig.json',
        content: `{
  "compileOnSave": false,
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "lib": ["ES2022", "DOM"]
  }
}
`,
      },
    ],
    instructions: 'npm install && npm start. Open http://localhost:4200.',
  },

  {
    slug: 'fullstack-angular-express-auth',
    title: 'Full-stack Angular + Express + Mongo (JWT auth + CRUD)',
    description: 'Full-stack starter: Angular 17 SPA (login, register, protected dashboard) + Express/Mongoose backend (JWT auth, items CRUD). Two folders: backend/, frontend/.',
    stack: ['angular', 'express', 'mongoose', 'jwt', 'fullstack'],
    keywords: ['fullstack', 'full stack', 'mean stack', 'angular express', 'angular backend', 'auth crud', 'protected dashboard', 'login register angular'],
    files: [
      {
        path: 'backend/package.json',
        content: `{
  "name": "fs-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js", "dev": "node --watch server.js" },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.5.1"
  }
}
`,
      },
      {
        path: 'backend/.env.example',
        content: `PORT=3000\nMONGO_URI=mongodb://localhost:27017/fsapp\nJWT_SECRET=change-me\n`,
      },
      {
        path: 'backend/server.js',
        content: `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log('API on :' + PORT)))
  .catch(err => { console.error(err); process.exit(1); });
`,
      },
      {
        path: 'backend/models/User.js',
        content: `const mongoose = require('mongoose');
module.exports = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: { type: String, required: true },
  name: String,
}, { timestamps: true }));
`,
      },
      {
        path: 'backend/models/Item.js',
        content: `const mongoose = require('mongoose');
module.exports = mongoose.model('Item', new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  description: String,
}, { timestamps: true }));
`,
      },
      {
        path: 'backend/middleware/auth.js',
        content: `const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};
`,
      },
      {
        path: 'backend/routes/auth.js',
        content: `const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Taken' });
  const passwordHash = await bcrypt.hash(password, 10);
  const u = await User.create({ email, passwordHash, name });
  res.status(201).json({ id: u._id });
});
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email });
  if (!u || !(await bcrypt.compare(password, u.passwordHash)))
    return res.status(401).json({ error: 'Invalid' });
  const token = jwt.sign({ userId: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: u._id, email: u.email, name: u.name } });
});
module.exports = router;
`,
      },
      {
        path: 'backend/routes/items.js',
        content: `const express = require('express');
const Item = require('../models/Item');
const requireAuth = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res) => res.json(await Item.find({ owner: req.user.userId })));
router.post('/', async (req, res) => res.status(201).json(await Item.create({ ...req.body, owner: req.user.userId })));
router.delete('/:id', async (req, res) => {
  await Item.deleteOne({ _id: req.params.id, owner: req.user.userId });
  res.json({ ok: true });
});
module.exports = router;
`,
      },
      {
        path: 'frontend/package.json',
        content: `{
  "name": "fs-frontend",
  "version": "0.0.0",
  "scripts": { "start": "ng serve", "build": "ng build" },
  "dependencies": {
    "@angular/common": "^17.3.0",
    "@angular/compiler": "^17.3.0",
    "@angular/core": "^17.3.0",
    "@angular/forms": "^17.3.0",
    "@angular/platform-browser": "^17.3.0",
    "@angular/platform-browser-dynamic": "^17.3.0",
    "@angular/router": "^17.3.0",
    "@angular/common/http": "*",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.3"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.3.0",
    "@angular/cli": "^17.3.0",
    "@angular/compiler-cli": "^17.3.0",
    "typescript": "~5.4.0"
  }
}
`,
      },
      {
        path: 'frontend/src/main.ts',
        content: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()],
}).catch(err => console.error(err));
`,
      },
      {
        path: 'frontend/src/app/app.component.ts',
        content: `import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: \`
    <nav><a routerLink="/">Home</a> · <a routerLink="/login">Login</a> · <a routerLink="/dashboard">Dashboard</a></nav>
    <router-outlet></router-outlet>
  \`,
})
export class AppComponent {}
`,
      },
      {
        path: 'frontend/src/app/app.routes.ts',
        content: `import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
export const authGuard = () => {
  if (localStorage.getItem('token')) return true;
  inject(Router).navigate(['/login']);
  return false;
};
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./pages/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard.component').then(m => m.DashboardComponent) },
];
`,
      },
      {
        path: 'frontend/src/app/pages/login.component.ts',
        content: `import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
@Component({
  standalone: true, imports: [FormsModule],
  template: \`
    <h2>Login</h2>
    <form (submit)="submit(); $event.preventDefault()">
      <input [(ngModel)]="email" name="email" placeholder="email" />
      <input [(ngModel)]="password" name="password" type="password" placeholder="password" />
      <button>Login</button>
    </form>
    <p *ngIf="error" style="color:red">{{ error }}</p>
  \`,
})
export class LoginComponent {
  http = inject(HttpClient); router = inject(Router);
  email = ''; password = ''; error = '';
  submit() {
    this.http.post<{token: string}>('http://localhost:3000/api/auth/login', { email: this.email, password: this.password })
      .subscribe({
        next: r => { localStorage.setItem('token', r.token); this.router.navigate(['/dashboard']); },
        error: e => this.error = e.error?.error || 'Login failed',
      });
  }
}
`,
      },
      {
        path: 'frontend/src/app/pages/dashboard.component.ts',
        content: `import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  standalone: true, imports: [CommonModule, FormsModule],
  template: \`
    <h2>Dashboard</h2>
    <form (submit)="add(); $event.preventDefault()">
      <input [(ngModel)]="name" name="n" placeholder="Item name" />
      <button [disabled]="!name.trim()">Add</button>
    </form>
    <ul><li *ngFor="let i of items()">{{ i.name }} <button (click)="remove(i._id)">x</button></li></ul>
  \`,
})
export class DashboardComponent {
  http = inject(HttpClient);
  items = signal<any[]>([]);
  name = '';
  headers() { return new HttpHeaders({ Authorization: 'Bearer ' + localStorage.getItem('token') }); }
  constructor() { this.load(); }
  load() { this.http.get<any[]>('http://localhost:3000/api/items', { headers: this.headers() }).subscribe(i => this.items.set(i)); }
  add() { this.http.post('http://localhost:3000/api/items', { name: this.name }, { headers: this.headers() }).subscribe(() => { this.name = ''; this.load(); }); }
  remove(id: string) { this.http.delete('http://localhost:3000/api/items/' + id, { headers: this.headers() }).subscribe(() => this.load()); }
}
`,
      },
      {
        path: 'frontend/src/app/pages/home.component.ts',
        content: `import { Component } from '@angular/core';
@Component({ standalone: true, template: '<h2>Welcome</h2><p>Login to see your items.</p>' })
export class HomeComponent {}
`,
      },
      {
        path: 'README.md',
        content: `# Full-stack Angular + Express + Mongo

Run backend:
\`\`\`
cd backend && npm install && cp .env.example .env && npm run dev
\`\`\`
Run frontend:
\`\`\`
cd frontend && npm install && npm start
\`\`\`
`,
      },
    ],
    instructions: 'Two folders. Start backend first, then frontend.',
  },

  {
    slug: 'express-websocket-chat',
    title: 'Express + WebSocket Chat Server',
    description: 'Node server with Express + ws (WebSocket). Broadcasts every incoming message to all connected clients. Includes a minimal HTML client.',
    stack: ['node', 'express', 'ws', 'websocket'],
    keywords: ['websocket', 'chat server', 'realtime', 'ws broadcast', 'socket chat', 'live chat', 'node chat'],
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "ws-chat",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js", "dev": "node --watch server.js" },
  "dependencies": { "express": "^4.19.2", "ws": "^8.18.0" }
}
`,
      },
      {
        path: 'server.js',
        content: `const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = data.toString().slice(0, 2000);
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(msg);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Chat on http://localhost:' + PORT));
`,
      },
      {
        path: 'public/index.html',
        content: `<!doctype html>
<html><head><meta charset="utf-8"><title>Chat</title>
<style>
  body { font-family: system-ui; max-width: 560px; margin: 40px auto; }
  #log { height: 320px; border: 1px solid #ccc; padding: 8px; overflow-y: auto; margin-bottom: 8px; }
  form { display: flex; gap: 8px; }
  input { flex: 1; padding: 8px; }
</style>
</head><body>
<h1>Chat</h1>
<div id="log"></div>
<form id="f"><input id="m" autocomplete="off" placeholder="Message" /><button>Send</button></form>
<script>
  const ws = new WebSocket('ws://' + location.host);
  const log = document.getElementById('log');
  ws.onmessage = e => { const p = document.createElement('div'); p.textContent = e.data; log.appendChild(p); log.scrollTop = log.scrollHeight; };
  document.getElementById('f').onsubmit = e => {
    e.preventDefault();
    const m = document.getElementById('m');
    if (m.value.trim()) { ws.send(m.value); m.value = ''; }
  };
</script>
</body></html>
`,
      },
      {
        path: 'README.md',
        content: `# WebSocket Chat\n\nnpm install && npm start, open http://localhost:3000 in two tabs.\n`,
      },
    ],
    instructions: 'npm install && npm start. Open http://localhost:3000 in multiple tabs to test.',
  },
];

(async () => {
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  let ins = 0, upd = 0;
  for (const B of BLUEPRINTS) {
    const r = await ProjectBlueprint.findOneAndUpdate(
      { slug: B.slug }, B,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (r.createdAt.getTime() === r.updatedAt.getTime()) ins++; else upd++;
    console.log(`${B.slug}: ${B.files.length} files`);
  }
  const total = await ProjectBlueprint.countDocuments();
  console.log(`\nBlueprints: ${ins} inserted, ${upd} updated. Total: ${total}`);
  console.log('Next: run "node backfill-embeddings.js" to generate vectors.');
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
