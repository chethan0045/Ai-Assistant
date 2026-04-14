/**
 * Seed script — populates MongoDB with the full AI knowledge base.
 *
 * Run: node seed-knowledge.js
 *
 * This inserts all knowledge entries and direct answers into MongoDB.
 * Safe to re-run — drops existing data and re-inserts fresh.
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';

const { KnowledgeEntry, DirectAnswer } = require('./models/Knowledge');

// =====================================================================
// KNOWLEDGE ENTRIES (topic, category, keywords, title, summary, details, examples, related)
// =====================================================================

const ENTRIES = [
  // ===== JAVASCRIPT =====
  {
    topic: 'javascript', category: 'JavaScript',
    keywords: ['javascript', 'js', 'what is javascript', 'ecmascript'],
    title: 'JavaScript',
    summary: 'JavaScript is a high-level, interpreted programming language that is one of the core technologies of the World Wide Web. It enables interactive web pages and is an essential part of web applications.',
    details: `**JavaScript** is a lightweight, interpreted (or just-in-time compiled) programming language with first-class functions.

**Key Features:**
- **Dynamic typing** — Variables don't need type declarations
- **Prototype-based OOP** — Objects can inherit directly from other objects
- **First-class functions** — Functions are treated as values
- **Event-driven** — Built around event loops and callbacks
- **Single-threaded** — Uses an event loop for async operations
- **Multi-paradigm** — Supports OOP, functional, and imperative styles

**Where JavaScript runs:**
- **Browser** — DOM manipulation, user interaction, animations
- **Server** — Node.js for backend development
- **Mobile** — React Native, Ionic for mobile apps
- **Desktop** — Electron for desktop applications

**ECMAScript versions:**
- ES5 (2009) — strict mode, JSON, array methods
- ES6/ES2015 — let/const, arrow functions, classes, modules, promises, template literals
- ES2017 — async/await
- ES2020 — optional chaining, nullish coalescing
- ES2022 — top-level await, private fields`,
    examples: [
      '```javascript\nlet name = "Alice";\nconst age = 25;\nconst greet = (name) => `Hello, ${name}!`;\nconst doubled = [1,2,3].map(n => n * 2);\n```',
      '```javascript\nasync function fetchUser(id) {\n  const res = await fetch(`/api/users/${id}`);\n  return res.json();\n}\n```'
    ],
    related: ['typescript', 'nodejs', 'dom', 'es6']
  },
  {
    topic: 'javascript-basics', category: 'JavaScript',
    keywords: ['js basics', 'javascript basics', 'variables', 'data types', 'operators', 'learn javascript', 'js fundamentals'],
    title: 'JavaScript Basics',
    summary: 'The fundamental building blocks of JavaScript: variables, data types, operators, control flow, and functions.',
    details: `## Variables
- \`var\` — function-scoped, hoisted (avoid in modern code)
- \`let\` — block-scoped, can be reassigned
- \`const\` — block-scoped, cannot be reassigned

## Data Types
**Primitive:** string, number, bigint, boolean, undefined, null, symbol
**Reference:** object, array, function, date, regexp, map, set

## Operators
- **Arithmetic:** \`+ - * / % **\`
- **Comparison:** \`=== !== > < >= <=\` (always use \`===\`)
- **Logical:** \`&& || ! ??\`
- **Optional chaining:** \`obj?.prop?.nested\`

## Functions
\`\`\`javascript
function add(a, b) { return a + b; }
const add = (a, b) => a + b;
function greet(name = 'World') { return \`Hello, \${name}!\`; }
\`\`\``,
    related: ['javascript', 'es6', 'typescript']
  },
  {
    topic: 'es6', category: 'JavaScript',
    keywords: ['es6', 'es2015', 'modern javascript', 'arrow functions', 'destructuring', 'template literals', 'promises', 'classes', 'modules', 'let const', 'spread operator'],
    title: 'ES6+ Modern JavaScript Features',
    summary: 'ES6 introduced major improvements: arrow functions, classes, template literals, destructuring, modules, promises, let/const, and more.',
    details: `## Arrow Functions
\`\`\`javascript
const add = (a, b) => a + b;
const square = x => x * x;
\`\`\`

## Destructuring
\`\`\`javascript
const { name, age } = person;
const [first, ...rest] = array;
\`\`\`

## Template Literals
\`\`\`javascript
const greeting = \`Hello, \${name}!\`;
\`\`\`

## Classes
\`\`\`javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return \`\${this.name} makes a noise\`; }
}
class Dog extends Animal {
  speak() { return \`\${this.name} barks\`; }
}
\`\`\`

## Modules
\`\`\`javascript
export const PI = 3.14;
export default class MyComponent { }
import MyComponent, { PI } from './module';
\`\`\`

## Promises & Async/Await
\`\`\`javascript
async function getData() {
  const res = await fetch('/api/data');
  return res.json();
}
\`\`\``,
    related: ['javascript', 'typescript', 'nodejs']
  },
  {
    topic: 'dom', category: 'JavaScript',
    keywords: ['dom', 'document object model', 'queryselector', 'getelementbyid', 'addeventlistener', 'dom manipulation'],
    title: 'DOM (Document Object Model)',
    summary: 'The DOM is a programming interface for HTML documents. It represents the page as a tree of nodes that JavaScript can manipulate.',
    details: `## Selecting Elements
\`\`\`javascript
document.getElementById('myId');
document.querySelector('.myClass');
document.querySelectorAll('div.card');
\`\`\`

## Modifying
\`\`\`javascript
element.textContent = 'New text';
element.innerHTML = '<strong>Bold</strong>';
element.classList.add('visible');
element.style.color = 'red';
\`\`\`

## Events
\`\`\`javascript
button.addEventListener('click', (e) => {
  e.preventDefault();
  console.log('Clicked!', e.target);
});
\`\`\``,
    related: ['javascript', 'html', 'css']
  },
  {
    topic: 'javascript-arrays', category: 'JavaScript',
    keywords: ['array', 'arrays', 'map', 'filter', 'reduce', 'foreach', 'find', 'sort', 'array methods'],
    title: 'JavaScript Array Methods',
    summary: 'JavaScript arrays have powerful methods: map, filter, reduce, find, sort, some, every, and more.',
    details: `## Transform
\`\`\`javascript
[1,2,3].map(n => n * 2);          // [2,4,6]
[1,2,3,4].filter(n => n % 2===0); // [2,4]
[1,2,3].reduce((a,b) => a+b, 0);  // 6
\`\`\`

## Find
\`\`\`javascript
[1,2,3].find(n => n > 1);         // 2
[1,2,3].findIndex(n => n > 1);    // 1
[1,2,3].includes(2);              // true
\`\`\`

## Test
\`\`\`javascript
[1,2,3].some(n => n > 2);         // true
[1,2,3].every(n => n > 0);        // true
\`\`\`

## Modify
\`\`\`javascript
arr.push(item);  arr.pop();
arr.unshift(item);  arr.shift();
arr.sort((a,b) => a-b);
[...new Set(arr)];  // remove duplicates
\`\`\``,
    related: ['javascript', 'es6']
  },
  {
    topic: 'async-javascript', category: 'JavaScript',
    keywords: ['async', 'await', 'promise', 'callback', 'fetch', 'event loop', 'asynchronous', 'then', 'catch'],
    title: 'Asynchronous JavaScript',
    summary: 'JavaScript handles async via callbacks, promises, and async/await. The event loop processes tasks non-blockingly.',
    details: `## Promises
\`\`\`javascript
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 1000);
});
promise.then(r => console.log(r)).catch(e => console.error(e));

Promise.all([p1, p2, p3]);       // all succeed
Promise.allSettled([p1, p2]);     // wait for all
Promise.race([p1, p2]);          // first to settle
\`\`\`

## Async/Await
\`\`\`javascript
async function loadData() {
  try {
    const [users, posts] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/posts').then(r => r.json()),
    ]);
    return { users, posts };
  } catch (error) {
    console.error('Failed:', error);
  }
}
\`\`\`

## Fetch API
\`\`\`javascript
// GET
const data = await fetch('/api/items').then(r => r.json());

// POST
await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'New' }),
});
\`\`\``,
    related: ['javascript', 'nodejs', 'api']
  },
  {
    topic: 'closures', category: 'JavaScript',
    keywords: ['closure', 'closures', 'scope', 'lexical scope', 'hoisting'],
    title: 'Closures & Scope',
    summary: 'A closure is a function that remembers variables from its lexical scope even after the outer function finishes.',
    details: `\`\`\`javascript
function createCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
}
const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
\`\`\`

## Practical Uses
- **Data privacy** — encapsulate state
- **Function factories** — create specialized functions
- **Memoization** — cache computed results

\`\`\`javascript
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}
\`\`\``,
    related: ['javascript', 'javascript-basics']
  },

  // ===== TYPESCRIPT =====
  {
    topic: 'typescript', category: 'TypeScript',
    keywords: ['typescript', 'ts', 'what is typescript', 'type system', 'typed javascript'],
    title: 'TypeScript',
    summary: 'TypeScript is a strongly-typed superset of JavaScript by Microsoft. Adds static typing, interfaces, generics, and advanced tooling.',
    details: `## Basic Types
\`\`\`typescript
let name: string = 'Alice';
let age: number = 25;
let items: string[] = ['a', 'b'];
let anything: any = 'whatever';
let unknown: unknown = getValue();
\`\`\`

## Interfaces & Types
\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  readonly createdAt: Date;
}

type Status = 'active' | 'inactive' | 'pending';
type ApiResponse<T> = { data: T; error?: string };
\`\`\`

## Generics
\`\`\`typescript
function first<T>(arr: T[]): T | undefined { return arr[0]; }

interface Repository<T> {
  findById(id: string): Promise<T>;
  save(entity: T): Promise<T>;
}
\`\`\`

## Utility Types
\`\`\`typescript
Partial<User>       // all fields optional
Required<User>      // all fields required
Pick<User, 'name'>  // only name field
Omit<User, 'id'>    // everything except id
Record<string, any> // key-value map
\`\`\``,
    related: ['javascript', 'angular', 'nodejs']
  },

  // ===== ANGULAR =====
  {
    topic: 'angular', category: 'Angular',
    keywords: ['angular', 'what is angular', 'angular framework', 'ng', 'angular basics'],
    title: 'Angular',
    summary: 'Angular is a full-featured frontend framework by Google for building single-page apps with TypeScript, components, services, routing, and dependency injection.',
    details: `**Core Concepts:**
- **Components** — UI building blocks (template + logic + styles)
- **Services** — shared logic via Dependency Injection
- **Routing** — navigation with lazy loading
- **Signals** — reactive state (Angular 17+)
- **Standalone components** — no NgModules needed

**Angular vs React vs Vue:**
| Feature | Angular | React | Vue |
|---------|---------|-------|-----|
| Type | Full framework | Library | Progressive |
| Language | TypeScript | JS/TSX | JS/TS |
| Binding | Two-way | One-way | Two-way |

**CLI Commands:**
\`\`\`bash
npm install -g @angular/cli
ng new my-app
ng serve              # dev server at localhost:4200
ng generate component my-comp
ng generate service my-service
ng build --configuration=production
ng test
\`\`\``,
    examples: ['```typescript\n@Component({\n  selector: \'app-counter\',\n  standalone: true,\n  template: `<h2>{{ count() }}</h2><button (click)="count.update(n=>n+1)">+1</button>`\n})\nexport class CounterComponent {\n  count = signal(0);\n}\n```'],
    related: ['typescript', 'rxjs', 'angular-components', 'angular-services']
  },
  {
    topic: 'angular-components', category: 'Angular',
    keywords: ['component', 'angular component', 'template', 'directive', 'pipe', 'ngif', 'ngfor', 'binding', 'input', 'output', 'signal', 'standalone'],
    title: 'Angular Components & Templates',
    summary: 'Components are the building blocks of Angular apps. Each has a TypeScript class, HTML template, and CSS styles.',
    details: `## Data Binding
- **Interpolation:** \`{{ expression }}\`
- **Property:** \`[property]="value"\`
- **Event:** \`(event)="handler()"\`
- **Two-way:** \`[(ngModel)]="value"\`

## Signals (Angular 17+)
\`\`\`typescript
count = signal(0);
doubled = computed(() => this.count() * 2);
effect(() => console.log(this.count()));
\`\`\`

## Directives
- \`*ngIf\` / \`@if\` — conditional
- \`*ngFor\` / \`@for\` — loops
- \`[ngClass]\` — dynamic CSS classes
- \`[ngStyle]\` — dynamic inline styles

## Lifecycle
\`constructor()\` → \`ngOnInit()\` → \`ngOnChanges()\` → \`ngAfterViewInit()\` → \`ngOnDestroy()\``,
    related: ['angular', 'angular-services', 'typescript']
  },
  {
    topic: 'angular-services', category: 'Angular',
    keywords: ['service', 'angular service', 'injectable', 'dependency injection', 'di', 'httpclient', 'http', 'provider'],
    title: 'Angular Services & Dependency Injection',
    summary: 'Services handle business logic and data access. Angular DI manages their lifecycle and provides them to components.',
    details: `\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }
  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>('/api/users', user);
  }
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(\`/api/users/\${id}\`);
  }
}
\`\`\`

## Using in Component
\`\`\`typescript
export class UserListComponent {
  private userService = inject(UserService);
  users = signal<User[]>([]);

  ngOnInit() {
    this.userService.getUsers().subscribe(data => this.users.set(data));
  }
}
\`\`\`

## DI Scopes
- \`providedIn: 'root'\` — singleton app-wide
- \`providers: [Service]\` in component — new instance per component`,
    related: ['angular', 'angular-components', 'rxjs']
  },
  {
    topic: 'angular-routing', category: 'Angular',
    keywords: ['routing', 'angular routing', 'router', 'route', 'navigate', 'lazy loading', 'routerlink', 'guard'],
    title: 'Angular Routing',
    summary: 'Angular Router enables navigation between views with lazy loading, route guards, and parameter passing.',
    details: `## Routes
\`\`\`typescript
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users', loadComponent: () => import('./users.component').then(m => m.UsersComponent) },
  { path: 'users/:id', component: UserDetailComponent },
  { path: 'admin', canActivate: [authGuard], children: [...] },
  { path: '**', component: NotFoundComponent },
];
\`\`\`

## Navigation
\`\`\`html
<a routerLink="/users" routerLinkActive="active">Users</a>
\`\`\`
\`\`\`typescript
this.router.navigate(['/users', id]);
\`\`\`

## Auth Guard
\`\`\`typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};
\`\`\``,
    related: ['angular', 'angular-components']
  },
  {
    topic: 'rxjs', category: 'Angular',
    keywords: ['rxjs', 'observable', 'subscribe', 'pipe', 'switchmap', 'subject', 'behaviorsubject', 'reactive'],
    title: 'RxJS (Reactive Extensions)',
    summary: 'RxJS provides Observables for handling async streams. Heavily used in Angular for HTTP, events, and state.',
    details: `## Common Operators
\`\`\`typescript
source$.pipe(
  map(val => val * 2),
  filter(val => val > 5),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => this.http.get(\`/api/search?q=\${query}\`)),
  catchError(err => of(fallbackValue)),
  takeUntil(this.destroy$),
);
\`\`\`

## Subjects
\`\`\`typescript
const subject = new Subject<string>();
const behavior = new BehaviorSubject<number>(0);
subject.next('hello');
behavior.getValue(); // current value
\`\`\`

## Unsubscribe (prevent leaks)
\`\`\`typescript
private destroy$ = new Subject<void>();
ngOnInit() {
  this.data$.pipe(takeUntil(this.destroy$)).subscribe(...);
}
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
\`\`\``,
    related: ['angular', 'angular-services', 'async-javascript']
  },
  {
    topic: 'angular-signals', category: 'Angular',
    keywords: ['signal', 'signals', 'computed', 'effect', 'angular signal', 'writable signal', 'angular 17'],
    title: 'Angular Signals (Angular 17+)',
    summary: 'Signals are Angular\'s reactive primitive: signal() for state, computed() for derived values, effect() for side effects.',
    details: `\`\`\`typescript
import { signal, computed, effect } from '@angular/core';

const count = signal(0);
count.set(5);
count.update(n => n + 1);
console.log(count()); // 6

const doubled = computed(() => count() * 2); // auto-updates

effect(() => console.log('Count:', count()));
\`\`\`

## Signals vs RxJS
| Use | Signals | RxJS |
|-----|---------|------|
| Component state | signal() | - |
| Derived values | computed() | - |
| HTTP requests | - | Observable |
| Debounce/throttle | - | debounceTime |`,
    related: ['angular', 'angular-components', 'rxjs']
  },
  {
    topic: 'angular-forms', category: 'Angular',
    keywords: ['form', 'forms', 'ngmodel', 'formgroup', 'validation', 'reactive form', 'template driven', 'angular form'],
    title: 'Angular Forms',
    summary: 'Template-driven forms (ngModel) for simple cases, Reactive forms (FormGroup) for complex validation.',
    details: `## Template-Driven
\`\`\`html
<input [(ngModel)]="email" name="email" required />
<input [(ngModel)]="password" name="password" type="password" minlength="6" />
<button (click)="submit()" [disabled]="loading">Submit</button>
\`\`\`

## Reactive Forms
\`\`\`typescript
form = inject(FormBuilder).group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(6)]],
});
\`\`\``,
    related: ['angular', 'angular-components']
  },

  // ===== NODE.JS & EXPRESS =====
  {
    topic: 'nodejs', category: 'Node.js & Express',
    keywords: ['nodejs', 'node', 'node.js', 'what is node', 'server javascript', 'backend javascript', 'npm', 'runtime'],
    title: 'Node.js',
    summary: 'Node.js is a JavaScript runtime built on V8. Enables server-side JS with non-blocking I/O.',
    details: `## Core Modules
\`\`\`javascript
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
\`\`\`

## HTTP Server
\`\`\`javascript
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Hello' }));
});
server.listen(3000);
\`\`\`

## File System
\`\`\`javascript
const data = fs.readFileSync('file.txt', 'utf-8');
fs.writeFileSync('out.txt', 'Hello');
fs.mkdirSync('dir', { recursive: true });
const files = fs.readdirSync('./src');
\`\`\`

## npm
\`\`\`bash
npm init -y
npm install express mongoose
npm install -D nodemon jest
npm run dev
\`\`\``,
    related: ['javascript', 'express', 'api']
  },
  {
    topic: 'express', category: 'Node.js & Express',
    keywords: ['express', 'expressjs', 'middleware', 'rest api', 'routes', 'express middleware', 'express routes'],
    title: 'Express.js',
    summary: 'Express is a minimal Node.js framework for building APIs and web apps with routing and middleware.',
    details: `## Basic Server
\`\`\`javascript
const express = require('express');
const app = express();
app.use(express.json());
app.use(cors());

app.get('/api/users', (req, res) => res.json(users));
app.post('/api/users', (req, res) => {
  const user = { id: Date.now(), ...req.body };
  users.push(user);
  res.status(201).json(user);
});

app.listen(3000);
\`\`\`

## Middleware
\`\`\`javascript
// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  req.user = jwt.verify(token, SECRET);
  next();
};
app.get('/api/profile', auth, (req, res) => res.json(req.user));
\`\`\`

## Router
\`\`\`javascript
const router = express.Router();
router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
app.use('/api/products', router);
\`\`\`

## Error Handler
\`\`\`javascript
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});
\`\`\``,
    related: ['nodejs', 'api', 'mongodb']
  },
  {
    topic: 'nodemailer', category: 'Node.js & Express',
    keywords: ['nodemailer', 'send email', 'email', 'smtp', 'gmail', 'mail', 'transporter'],
    title: 'Nodemailer — Sending Emails',
    summary: 'Nodemailer sends emails from Node.js. Supports SMTP, Gmail, HTML templates, attachments.',
    details: `\`\`\`bash
npm install nodemailer
\`\`\`

\`\`\`javascript
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your@gmail.com',
    pass: 'your-app-password', // App Password, NOT login password
  },
});

await transporter.sendMail({
  from: '"App" <your@gmail.com>',
  to: 'user@example.com',
  subject: 'Verification',
  html: '<h1>Your code: 123456</h1>',
});
\`\`\`

**Important:** Enable Google 2FA, then create App Password at myaccount.google.com/apppasswords`,
    related: ['express', 'otp-verification', 'security']
  },
  {
    topic: 'websocket', category: 'Node.js & Express',
    keywords: ['websocket', 'ws', 'real time', 'realtime', 'socket', 'live', 'push'],
    title: 'WebSocket — Real-Time',
    summary: 'WebSocket enables bidirectional real-time communication. Used for chat, terminals, live updates.',
    details: `## Server
\`\`\`javascript
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    // Broadcast
    wss.clients.forEach(c => {
      if (c.readyState === 1) c.send(JSON.stringify(msg));
    });
  });
});
\`\`\`

## Client
\`\`\`javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.send(JSON.stringify({ type: 'chat', text: 'Hi' }));
\`\`\``,
    related: ['nodejs', 'express']
  },
  {
    topic: 'node-filesystem', category: 'Node.js & Express',
    keywords: ['fs', 'file system', 'read file', 'write file', 'mkdir', 'readdir', 'path'],
    title: 'Node.js File System',
    summary: 'Node fs module: read, write, create directories, list files, path manipulation.',
    details: `\`\`\`javascript
const fs = require('fs');
const path = require('path');

// Read
const data = fs.readFileSync('file.txt', 'utf-8');
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

// Write
fs.writeFileSync('out.json', JSON.stringify(obj, null, 2));
fs.appendFileSync('log.txt', 'line\\n');

// Directories
fs.mkdirSync('path/to/dir', { recursive: true });
const items = fs.readdirSync('./src', { withFileTypes: true });

// Path
path.join(__dirname, 'data', 'file.txt');
path.basename('/a/b/file.txt');  // 'file.txt'
path.extname('file.txt');        // '.txt'
\`\`\``,
    related: ['nodejs', 'express']
  },

  // ===== DATABASES =====
  {
    topic: 'mongodb', category: 'Databases',
    keywords: ['mongodb', 'mongo', 'mongoose', 'nosql', 'document database', 'schema', 'collection'],
    title: 'MongoDB & Mongoose',
    summary: 'MongoDB is a NoSQL document database. Mongoose is the ODM for Node.js with schemas, validation, and queries.',
    details: `## Schema
\`\`\`javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);
\`\`\`

## CRUD
\`\`\`javascript
await User.create({ name, email });
const users = await User.find({ role: 'admin' }).sort({ createdAt: -1 }).limit(10);
const user = await User.findById(id);
await User.findByIdAndUpdate(id, { name: 'New' }, { new: true });
await User.findByIdAndDelete(id);
\`\`\`

## Connection
\`\`\`javascript
mongoose.connect('mongodb+srv://user:pass@cluster.mongodb.net/mydb')
  .then(() => console.log('Connected'));
\`\`\``,
    related: ['nodejs', 'express', 'mongoose-advanced']
  },
  {
    topic: 'mongoose-advanced', category: 'Databases',
    keywords: ['mongoose', 'populate', 'middleware', 'pre save', 'virtual', 'aggregate', 'index', 'hooks'],
    title: 'Mongoose Advanced Patterns',
    summary: 'Middleware hooks, population (joins), virtuals, indexes, custom validators, aggregation.',
    details: `## Pre-save Hook
\`\`\`javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
\`\`\`

## Population
\`\`\`javascript
const post = await Post.findById(id)
  .populate('author', 'name email')
  .populate('comments');
\`\`\`

## Indexes
\`\`\`javascript
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ name: 'text', bio: 'text' }); // text search
\`\`\`

## Aggregation
\`\`\`javascript
await Order.aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: '$category', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
]);
\`\`\``,
    related: ['mongodb', 'express']
  },
  {
    topic: 'sql', category: 'Databases',
    keywords: ['sql', 'database', 'mysql', 'postgresql', 'select', 'insert', 'join', 'relational'],
    title: 'SQL Databases',
    summary: 'SQL manages relational databases (PostgreSQL, MySQL). Data in tables with schemas and relationships.',
    details: `## Queries
\`\`\`sql
SELECT name, email FROM users WHERE active = true ORDER BY name LIMIT 10;
INSERT INTO users (name, email) VALUES ('Alice', 'alice@test.com');
UPDATE users SET role = 'admin' WHERE id = 1;
DELETE FROM users WHERE id = 1;
\`\`\`

## Joins
\`\`\`sql
SELECT u.name, COUNT(p.id) as posts FROM users u
LEFT JOIN posts p ON u.id = p.author_id GROUP BY u.id;
\`\`\``,
    related: ['nodejs']
  },

  // ===== WEB FUNDAMENTALS =====
  {
    topic: 'html', category: 'Web Fundamentals',
    keywords: ['html', 'html5', 'what is html', 'markup', 'semantic html', 'tags'],
    title: 'HTML',
    summary: 'HTML is the standard markup language for web pages. Describes structure with elements like headings, paragraphs, links, forms.',
    details: `## Semantic Tags
\`<header>\`, \`<nav>\`, \`<main>\`, \`<footer>\`, \`<article>\`, \`<section>\`, \`<aside>\`

## Forms
\`\`\`html
<form action="/api/submit" method="POST">
  <label for="email">Email:</label>
  <input type="email" id="email" name="email" required />
  <select name="role">
    <option value="user">User</option>
    <option value="admin">Admin</option>
  </select>
  <button type="submit">Submit</button>
</form>
\`\`\``,
    related: ['css', 'javascript', 'dom']
  },
  {
    topic: 'css', category: 'Web Fundamentals',
    keywords: ['css', 'css3', 'what is css', 'styling', 'flexbox', 'grid', 'responsive', 'media queries', 'animation'],
    title: 'CSS',
    summary: 'CSS styles web pages. Modern CSS includes Flexbox, Grid, animations, variables, responsive design.',
    details: `## Flexbox
\`\`\`css
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
\`\`\`

## Grid
\`\`\`css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
\`\`\`

## Responsive
\`\`\`css
@media (min-width: 768px) {
  .container { max-width: 720px; }
}
\`\`\`

## Variables
\`\`\`css
:root { --primary: #6366f1; --bg: #0f172a; }
.btn { background: var(--primary); }
\`\`\``,
    related: ['html', 'javascript']
  },
  {
    topic: 'api', category: 'Web Fundamentals',
    keywords: ['api', 'rest', 'restful', 'rest api', 'endpoint', 'http methods', 'get', 'post', 'put', 'delete', 'status codes'],
    title: 'REST APIs',
    summary: 'REST uses HTTP methods (GET, POST, PUT, DELETE) to perform CRUD on resources.',
    details: `## HTTP Methods
| Method | Purpose |
|--------|---------|
| GET | Read | POST | Create | PUT | Update | DELETE | Remove |

## Status Codes
- **200** OK — **201** Created — **204** No Content
- **400** Bad Request — **401** Unauthorized — **403** Forbidden — **404** Not Found
- **409** Conflict — **500** Server Error

## Design
\`\`\`
GET    /api/users          # list
GET    /api/users/123      # get one
POST   /api/users          # create
PUT    /api/users/123      # update
DELETE /api/users/123      # delete
GET    /api/users?role=admin&page=2  # filter
\`\`\``,
    related: ['express', 'nodejs']
  },

  // ===== AUTH & SECURITY =====
  {
    topic: 'otp-verification', category: 'Security',
    keywords: ['otp', 'verification', 'verify email', 'email verification', 'two factor', '2fa', 'one time password'],
    title: 'OTP Email Verification',
    summary: 'OTP confirms email ownership. 6-digit code sent on register, user enters it, account verified.',
    details: `## Flow
1. Register → generate OTP → save to DB with expiry → email to user
2. User enters 6-digit code
3. Compare, check expiry, mark verified, issue JWT

## Schema
\`\`\`javascript
{ verified: Boolean, otp: String, otpExpiresAt: Date }
\`\`\`

## Generate & Verify
\`\`\`javascript
const otp = Math.floor(100000 + Math.random() * 900000).toString();
user.otp = otp;
user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

// Verify
if (user.otp !== submitted) return res.status(400).json({ error: 'Invalid' });
if (user.otpExpiresAt < new Date()) return res.status(400).json({ error: 'Expired' });
user.verified = true; user.otp = null; await user.save();
\`\`\``,
    related: ['nodemailer', 'security', 'mongodb']
  },
  {
    topic: 'security', category: 'Security',
    keywords: ['security', 'jwt', 'authentication', 'authorization', 'xss', 'csrf', 'cors', 'bcrypt', 'hashing', 'owasp'],
    title: 'Web Security',
    summary: 'Protects against XSS, CSRF, injection. Key: JWT auth, bcrypt hashing, input validation, CORS.',
    details: `## JWT Auth
\`\`\`javascript
const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '7d' });
const decoded = jwt.verify(token, SECRET);
\`\`\`

## Password Hashing
\`\`\`javascript
const hash = await bcrypt.hash(password, 10);
const match = await bcrypt.compare(password, hash);
\`\`\`

## OWASP Top Vulnerabilities
1. Injection — use parameterized queries
2. Broken Auth — strong passwords, token expiry
3. XSS — escape user input
4. CSRF — use CSRF tokens
5. Misconfiguration — no default credentials`,
    related: ['express', 'nodejs', 'otp-verification']
  },

  // ===== ERROR HANDLING =====
  {
    topic: 'error-handling', category: 'Real-World Backend',
    keywords: ['error handling', 'try catch', 'error middleware', 'validation error', 'status code'],
    title: 'Error Handling Patterns',
    summary: 'Prevents crashes and gives users meaningful feedback. Express middleware, async errors, validation.',
    details: `## Express Error Middleware
\`\`\`javascript
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});
\`\`\`

## Async Handler
\`\`\`javascript
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
\`\`\`

## Validation
\`\`\`javascript
if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
if (password.length < 6) return res.status(400).json({ error: 'Min 6 chars' });
\`\`\``,
    related: ['express', 'api', 'angular']
  },
  {
    topic: 'common-bugs', category: 'Real-World Backend',
    keywords: ['bug', 'common error', 'cannot read property', 'undefined', 'cors error', 'eaddrinuse', 'debug', 'troubleshoot'],
    title: 'Common Bugs & Fixes',
    summary: 'Quick fixes for the most common JavaScript, Node.js, and Angular errors.',
    details: `## Cannot read properties of undefined
\`\`\`javascript
// Fix: optional chaining
const name = user?.profile?.name ?? 'Unknown';
\`\`\`

## CORS Error
\`\`\`javascript
app.use(cors({ origin: 'http://localhost:4200' }));
\`\`\`

## EADDRINUSE
\`\`\`bash
netstat -ano | findstr :4100   # Windows
kill -9 $(lsof -t -i:4100)    # Mac/Linux
\`\`\`

## MongoDB DNS Error
\`\`\`javascript
const dns = require('dns');
dns.setServers(['8.8.8.8']);
mongoose.connect(uri, { family: 4 });
\`\`\``,
    related: ['javascript', 'nodejs', 'express']
  },

  // ===== MISC =====
  {
    topic: 'react', category: 'React',
    keywords: ['react', 'reactjs', 'what is react', 'jsx', 'hooks', 'usestate', 'useeffect', 'virtual dom'],
    title: 'React',
    summary: 'React is a UI library by Meta using components, JSX, hooks, and virtual DOM.',
    details: `\`\`\`jsx
import { useState, useEffect } from 'react';

function Counter({ initial = 0 }) {
  const [count, setCount] = useState(initial);
  useEffect(() => { document.title = \`Count: \${count}\`; }, [count]);
  return <button onClick={() => setCount(c => c+1)}>Count: {count}</button>;
}
\`\`\`

## Hooks
- \`useState\` — state
- \`useEffect\` — side effects
- \`useContext\` — shared state
- \`useMemo\` / \`useCallback\` — performance
- \`useRef\` — DOM refs`,
    related: ['javascript', 'typescript']
  },
  {
    topic: 'python', category: 'Python',
    keywords: ['python', 'what is python', 'python basics', 'pip'],
    title: 'Python',
    summary: 'Python is a high-level language for web dev, data science, AI/ML, and automation.',
    details: `\`\`\`python
name = "Alice"
scores = [90, 85, 92]
squares = [x**2 for x in range(10)]

def greet(name: str = "World") -> str:
    return f"Hello, {name}!"

class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
\`\`\`

## Libraries
- Flask / FastAPI — web
- pandas — data
- pytest — testing
- SQLAlchemy — DB ORM`,
    related: ['api', 'testing']
  },
  {
    topic: 'git', category: 'Tools',
    keywords: ['git', 'version control', 'github', 'commit', 'branch', 'merge', 'pull request', 'clone', 'push'],
    title: 'Git',
    summary: 'Git is a distributed version control system for tracking code changes and collaboration.',
    details: `\`\`\`bash
git init / git clone <url>
git add . / git add file.ts
git commit -m "message"
git push origin main
git pull origin main
git checkout -b feature/x
git merge feature/x
git stash / git stash pop
git log --oneline -10
\`\`\``,
    related: ['nodejs']
  },
  {
    topic: 'testing', category: 'Tools',
    keywords: ['testing', 'test', 'unit test', 'jest', 'e2e', 'cypress', 'playwright'],
    title: 'Testing',
    summary: 'Unit tests verify functions, integration tests check interactions, E2E tests simulate users.',
    details: `## Jest
\`\`\`javascript
test('adds numbers', () => {
  expect(add(2, 3)).toBe(5);
});
test('async', async () => {
  const user = await getUser(1);
  expect(user.name).toBe('Alice');
});
\`\`\`

## API Test (supertest)
\`\`\`javascript
const res = await request(app).post('/api/auth/register')
  .send({ name: 'Test', email: 'a@b.com', password: '123456' });
expect(res.status).toBe(200);
\`\`\``,
    related: ['javascript', 'angular', 'nodejs']
  },
  {
    topic: 'docker', category: 'DevOps',
    keywords: ['docker', 'container', 'dockerfile', 'docker compose', 'image'],
    title: 'Docker',
    summary: 'Docker packages apps into containers — portable units with code, runtime, and dependencies.',
    details: `## Dockerfile
\`\`\`dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

## Commands
\`\`\`bash
docker build -t myapp .
docker run -p 3000:3000 myapp
docker compose up -d
\`\`\``,
    related: ['nodejs', 'git']
  },
  {
    topic: 'design-patterns', category: 'Design Patterns',
    keywords: ['design pattern', 'singleton', 'factory', 'observer', 'mvc', 'solid', 'dry'],
    title: 'Design Patterns & Principles',
    summary: 'SOLID, DRY, KISS, and patterns like Singleton, Observer, Factory.',
    details: `## SOLID
- **S** — Single Responsibility
- **O** — Open/Closed
- **L** — Liskov Substitution
- **I** — Interface Segregation
- **D** — Dependency Inversion

## Singleton
\`\`\`typescript
class DB {
  private static instance: DB;
  static getInstance() {
    if (!this.instance) this.instance = new DB();
    return this.instance;
  }
}
\`\`\`

## Observer
\`\`\`typescript
class EventEmitter {
  private listeners = new Map<string, Function[]>();
  on(event: string, fn: Function) { ... }
  emit(event: string, data: any) { ... }
}
\`\`\``,
    related: ['typescript', 'angular']
  },
];

// =====================================================================
// DIRECT ANSWERS (pattern regex strings → exact answers)
// =====================================================================

const DIRECT_ANSWERS_DATA = [
  {
    patterns: ['angular.*(version|ver)\\b', 'version.*angular', 'ng version', 'check.*angular.*version', 'get.*angular.*version'],
    answer: 'To check Angular version:\\n\\n```bash\\nng version\\n```\\n\\nOr check package.json:\\n```bash\\ncat package.json | grep @angular/core\\n```',
    topic: 'angular', priority: 10
  },
  {
    patterns: ['node.*(version|ver)\\b', 'version.*node', 'check.*node.*version'],
    answer: '```bash\\nnode --version\\n# or\\nnode -v\\n\\nnpm --version\\n```',
    topic: 'nodejs', priority: 10
  },
  {
    patterns: ['install.*angular', 'angular.*install', 'setup.*angular'],
    answer: '```bash\\nnpm install -g @angular/cli\\nng new my-app\\ncd my-app\\nng serve\\n```\\n\\nApp runs at http://localhost:4200',
    topic: 'angular', priority: 10
  },
  {
    patterns: ['create.*component', 'generate.*component', 'ng g.*component'],
    answer: '```bash\\nng generate component my-component\\n# shorthand:\\nng g c my-component\\n# standalone:\\nng g c my-component --standalone\\n```',
    topic: 'angular-components', priority: 10
  },
  {
    patterns: ['create.*service', 'generate.*service', 'ng g.*service'],
    answer: '```bash\\nng generate service my-service\\n# shorthand:\\nng g s my-service\\n```',
    topic: 'angular-services', priority: 10
  },
  {
    patterns: ['npm install', 'npm i\\b', 'install.*package'],
    answer: '```bash\\nnpm install package-name        # dependencies\\nnpm install -D package-name     # devDependencies\\nnpm install -g package-name     # global\\nnpm install                     # all from package.json\\nnpm ci                          # clean install\\n```',
    topic: 'nodejs', priority: 5
  },
  {
    patterns: ['git.*commit', 'how.*commit'],
    answer: '```bash\\ngit add .\\ngit status\\ngit commit -m "feat: your message"\\ngit push origin main\\n```',
    topic: 'git', priority: 10
  },
  {
    patterns: ['run.*angular', 'start.*angular', 'ng serve', 'angular.*start'],
    answer: '```bash\\ncd your-project\\nnpm install\\nng serve            # http://localhost:4200\\nng serve --port 4500\\nng serve --open\\n```',
    topic: 'angular', priority: 10
  },
  {
    patterns: ['send.*email', 'email.*node', 'nodemailer.*setup', 'how.*send.*mail'],
    answer: '```bash\\nnpm install nodemailer\\n```\\n\\n```javascript\\nconst transporter = nodemailer.createTransport({\\n  service: "gmail",\\n  auth: { user: "you@gmail.com", pass: "app-password" }\\n});\\nawait transporter.sendMail({ from: "App <you@gmail.com>", to, subject, html });\\n```\\n\\nUse Google App Password (not login password).',
    topic: 'nodemailer', priority: 10
  },
  {
    patterns: ['otp.*implement', 'email.*verif', 'verif.*email', 'how.*otp'],
    answer: '1. Generate: `Math.floor(100000 + Math.random() * 900000)`\\n2. Save to DB with 10min expiry\\n3. Email to user via nodemailer\\n4. User submits → compare → mark verified',
    topic: 'otp-verification', priority: 10
  },
  {
    patterns: ['cors.*error', 'cors.*block', 'access.control.allow'],
    answer: '```bash\\nnpm install cors\\n```\\n```javascript\\napp.use(cors()); // allow all\\n// or specific:\\napp.use(cors({ origin: "http://localhost:4200" }));\\n```',
    topic: 'common-bugs', priority: 15
  },
  {
    patterns: ['eaddrinuse', 'port.*in.*use', 'address.*already'],
    answer: '**Windows:** `netstat -ano | findstr :4100` then `taskkill /F /PID <pid>`\\n**Mac/Linux:** `lsof -i :4100` then `kill -9 <pid>`',
    topic: 'common-bugs', priority: 15
  },
  {
    patterns: ['cannot read.*propert', 'undefined.*error', 'null.*error'],
    answer: '```javascript\\n// Fix: optional chaining\\nconst name = user?.profile?.name ?? "Unknown";\\n```\\nCommon causes: async data not loaded yet, empty array, misspelled key.',
    topic: 'common-bugs', priority: 15
  },
  {
    patterns: ['mongodb.*connect.*fail', 'mongoose.*connect', 'srv.*refused', 'mongo.*dns'],
    answer: '```javascript\\nconst dns = require("dns");\\ndns.setServers(["8.8.8.8"]);\\nmongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 15000 });\\n```\\nAlso: whitelist IP in MongoDB Atlas Network Access.',
    topic: 'common-bugs', priority: 15
  },
  {
    patterns: ['connect.*mongodb', 'mongodb.*setup', 'mongoose.*setup', 'mongo.*connect'],
    answer: '```bash\\nnpm install mongoose\\n```\\n```javascript\\nconst mongoose = require("mongoose");\\nmongoose.connect("mongodb+srv://user:pass@cluster.mongodb.net/dbname")\\n  .then(() => console.log("Connected"))\\n  .catch(err => console.error(err));\\n```',
    topic: 'mongodb', priority: 10
  },
  {
    patterns: ['jwt.*token', 'json web token', 'create.*token', 'verify.*token'],
    answer: '```bash\\nnpm install jsonwebtoken\\n```\\n```javascript\\nconst jwt = require("jsonwebtoken");\\nconst token = jwt.sign({ userId: user._id }, "secret", { expiresIn: "7d" });\\nconst decoded = jwt.verify(token, "secret");\\n```',
    topic: 'security', priority: 10
  },
  {
    patterns: ['hash.*password', 'bcrypt', 'encrypt.*password'],
    answer: '```bash\\nnpm install bcryptjs\\n```\\n```javascript\\nconst bcrypt = require("bcryptjs");\\nconst hash = await bcrypt.hash(password, 10);\\nconst match = await bcrypt.compare(password, hash);\\n```',
    topic: 'security', priority: 10
  },
];

// =====================================================================
// SEED FUNCTION
// =====================================================================

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Connected. Seeding knowledge base...');

  // Clear existing
  await KnowledgeEntry.deleteMany({});
  await DirectAnswer.deleteMany({});
  console.log('Cleared existing data.');

  // Insert entries
  const inserted = await KnowledgeEntry.insertMany(ENTRIES);
  console.log(`Inserted ${inserted.length} knowledge entries.`);

  // Insert direct answers
  const answers = await DirectAnswer.insertMany(DIRECT_ANSWERS_DATA);
  console.log(`Inserted ${answers.length} direct answers.`);

  // Summary
  const categories = [...new Set(ENTRIES.map(e => e.category))];
  console.log('\n=== Seed Summary ===');
  console.log(`Categories: ${categories.length}`);
  for (const cat of categories) {
    const count = ENTRIES.filter(e => e.category === cat).length;
    console.log(`  ${cat}: ${count} entries`);
  }
  console.log(`Direct Answers: ${answers.length}`);
  console.log(`Total Keywords: ${ENTRIES.reduce((sum, e) => sum + e.keywords.length, 0)}`);
  console.log('=== Done ===\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
