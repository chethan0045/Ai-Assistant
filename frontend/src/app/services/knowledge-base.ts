/**
 * Offline Knowledge Base — Built-in AI brain.
 *
 * No API keys needed. Answers programming questions using a comprehensive
 * knowledge graph extracted from real-world documentation and best practices.
 */

// ===== TYPES =====

export interface KnowledgeEntry {
  topic: string;
  keywords: string[];
  title: string;
  summary: string;
  details: string;
  examples?: string[];
  related?: string[];
}

export interface KnowledgeCategory {
  name: string;
  entries: KnowledgeEntry[];
}

// ===== KNOWLEDGE DATA =====

const JAVASCRIPT: KnowledgeEntry[] = [
  {
    topic: 'javascript',
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
      '```javascript\n// Variables\nlet name = "Alice";\nconst age = 25;\n\n// Arrow function\nconst greet = (name) => `Hello, ${name}!`;\n\n// Array methods\nconst numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(n => n * 2);\nconst evens = numbers.filter(n => n % 2 === 0);\nconst sum = numbers.reduce((a, b) => a + b, 0);\n```',
      '```javascript\n// Async/Await\nasync function fetchUser(id) {\n  try {\n    const response = await fetch(`/api/users/${id}`);\n    const user = await response.json();\n    return user;\n  } catch (error) {\n    console.error("Failed to fetch user:", error);\n  }\n}\n```',
      '```javascript\n// Destructuring & Spread\nconst { name, age, ...rest } = user;\nconst newArray = [...oldArray, newItem];\nconst merged = { ...obj1, ...obj2 };\n```'
    ],
    related: ['typescript', 'nodejs', 'dom', 'es6']
  },
  {
    topic: 'javascript-basics',
    keywords: ['js basics', 'javascript basics', 'variables', 'data types', 'operators', 'learn javascript', 'js fundamentals'],
    title: 'JavaScript Basics',
    summary: 'The fundamental building blocks of JavaScript: variables, data types, operators, control flow, and functions.',
    details: `## Variables
- \`var\` — function-scoped, hoisted (avoid in modern code)
- \`let\` — block-scoped, can be reassigned
- \`const\` — block-scoped, cannot be reassigned (but objects/arrays can be mutated)

## Data Types
**Primitive types:** string, number, bigint, boolean, undefined, null, symbol
**Reference types:** object, array, function, date, regexp, map, set

## Operators
- **Arithmetic:** \`+ - * / % **\`
- **Comparison:** \`=== !== > < >= <=\` (always use \`===\` over \`==\`)
- **Logical:** \`&& || ! ??\` (nullish coalescing)
- **Optional chaining:** \`obj?.prop?.nested\`
- **Spread/Rest:** \`...array\` / \`...args\`

## Control Flow
\`\`\`javascript
if (condition) { } else if (other) { } else { }
switch (value) { case 'a': break; default: break; }
for (let i = 0; i < 10; i++) { }
for (const item of array) { }
while (condition) { }
\`\`\`

## Functions
\`\`\`javascript
// Function declaration (hoisted)
function add(a, b) { return a + b; }

// Arrow function (lexical this)
const add = (a, b) => a + b;

// Default parameters
function greet(name = 'World') { return \\\`Hello, \${name}!\\\`; }
\`\`\``,
    related: ['javascript', 'es6', 'typescript']
  },
  {
    topic: 'es6',
    keywords: ['es6', 'es2015', 'modern javascript', 'arrow functions', 'destructuring', 'template literals', 'promises', 'classes', 'modules', 'let const', 'spread operator'],
    title: 'ES6+ Modern JavaScript Features',
    summary: 'ES6 (ECMAScript 2015) introduced major improvements: arrow functions, classes, template literals, destructuring, modules, promises, let/const, and more.',
    details: `## Arrow Functions
\`\`\`javascript
const add = (a, b) => a + b;
const square = x => x * x;
const getUser = () => ({ name: 'Alice', age: 25 });
\`\`\`

## Template Literals
\`\`\`javascript
const name = 'World';
const greeting = \\\`Hello, \${name}! Today is \${new Date().toLocaleDateString()}\\\`;
const multiline = \\\`
  Line 1
  Line 2
\\\`;
\`\`\`

## Destructuring
\`\`\`javascript
const { name, age } = person;
const [first, second, ...rest] = array;
const { data: { users } } = response;  // nested
\`\`\`

## Classes
\`\`\`javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return \\\`\${this.name} makes a noise\\\`; }
}
class Dog extends Animal {
  speak() { return \\\`\${this.name} barks\\\`; }
}
\`\`\`

## Modules
\`\`\`javascript
// Named exports
export const PI = 3.14;
export function add(a, b) { return a + b; }

// Default export
export default class MyComponent { }

// Imports
import MyComponent, { PI, add } from './module';
\`\`\`

## Promises & Async/Await
\`\`\`javascript
// Promise
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Async/Await (cleaner)
async function getData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  return data;
}
\`\`\`

## Other Features
- **Map/Set** — new collection types
- **for...of** — iterate over iterables
- **Symbol** — unique identifiers
- **Proxy/Reflect** — metaprogramming
- **Optional chaining** \`?.\` and **nullish coalescing** \`??\``,
    related: ['javascript', 'typescript', 'nodejs']
  },
  {
    topic: 'dom',
    keywords: ['dom', 'document object model', 'queryselector', 'getelementbyid', 'addeventlistener', 'dom manipulation'],
    title: 'DOM (Document Object Model)',
    summary: 'The DOM is a programming interface for HTML documents. It represents the page as a tree of nodes that JavaScript can manipulate to change content, structure, and styles.',
    details: `## Selecting Elements
\`\`\`javascript
document.getElementById('myId');
document.querySelector('.myClass');         // first match
document.querySelectorAll('div.card');      // all matches
document.getElementsByClassName('myClass'); // live collection
\`\`\`

## Modifying Elements
\`\`\`javascript
element.textContent = 'New text';
element.innerHTML = '<strong>Bold</strong>';
element.setAttribute('class', 'active');
element.classList.add('visible');
element.classList.toggle('dark-mode');
element.style.color = 'red';
\`\`\`

## Creating & Removing
\`\`\`javascript
const div = document.createElement('div');
div.textContent = 'Hello';
parent.appendChild(div);
parent.removeChild(div);
element.remove();
\`\`\`

## Events
\`\`\`javascript
button.addEventListener('click', (event) => {
  event.preventDefault();
  console.log('Clicked!', event.target);
});

// Event delegation
document.addEventListener('click', (e) => {
  if (e.target.matches('.delete-btn')) {
    e.target.closest('.card').remove();
  }
});
\`\`\``,
    related: ['javascript', 'html', 'css']
  },
  {
    topic: 'javascript-arrays',
    keywords: ['array', 'arrays', 'map', 'filter', 'reduce', 'foreach', 'find', 'sort', 'array methods', 'js array'],
    title: 'JavaScript Array Methods',
    summary: 'JavaScript arrays have powerful built-in methods for transforming, filtering, and processing data: map, filter, reduce, find, sort, some, every, and more.',
    details: `## Transforming
\`\`\`javascript
const doubled = [1,2,3].map(n => n * 2);           // [2,4,6]
const flat = [[1,2],[3,4]].flat();                   // [1,2,3,4]
const mapped = [1,2,3].flatMap(n => [n, n*2]);       // [1,2,2,4,3,6]
\`\`\`

## Filtering
\`\`\`javascript
const evens = [1,2,3,4].filter(n => n % 2 === 0);   // [2,4]
const first = [1,2,3].find(n => n > 1);              // 2
const idx = [1,2,3].findIndex(n => n > 1);           // 1
\`\`\`

## Reducing
\`\`\`javascript
const sum = [1,2,3].reduce((acc, n) => acc + n, 0);  // 6
const grouped = items.reduce((groups, item) => {
  const key = item.category;
  groups[key] = groups[key] || [];
  groups[key].push(item);
  return groups;
}, {});
\`\`\`

## Testing
\`\`\`javascript
[1,2,3].some(n => n > 2);    // true (at least one)
[1,2,3].every(n => n > 0);   // true (all match)
[1,2,3].includes(2);         // true
\`\`\`

## Modifying
\`\`\`javascript
arr.push(item);         // add to end
arr.pop();              // remove from end
arr.unshift(item);      // add to start
arr.shift();            // remove from start
arr.splice(1, 2);       // remove 2 items at index 1
arr.sort((a,b) => a-b); // sort ascending
arr.reverse();          // reverse in place
[...new Set(arr)];      // remove duplicates
\`\`\``,
    related: ['javascript', 'es6']
  },
  {
    topic: 'javascript-objects',
    keywords: ['object', 'objects', 'json', 'prototype', 'this', 'class', 'constructor', 'object methods'],
    title: 'JavaScript Objects & OOP',
    summary: 'Objects are collections of key-value pairs. JavaScript uses prototype-based inheritance and ES6 classes for object-oriented programming.',
    details: `## Object Basics
\`\`\`javascript
const user = {
  name: 'Alice',
  age: 25,
  greet() { return \\\`Hi, I'm \${this.name}\\\`; }
};

// Access
user.name;          // dot notation
user['age'];        // bracket notation

// Object methods
Object.keys(user);        // ['name', 'age', 'greet']
Object.values(user);      // ['Alice', 25, fn]
Object.entries(user);     // [['name','Alice'], ...]
Object.assign({}, obj1, obj2);  // merge
{ ...obj1, ...obj2 };     // spread merge
\`\`\`

## Classes
\`\`\`javascript
class User {
  #password;  // private field

  constructor(name, email) {
    this.name = name;
    this.email = email;
  }

  static create(data) {
    return new User(data.name, data.email);
  }

  get displayName() { return this.name.toUpperCase(); }
  set displayName(val) { this.name = val; }
}

class Admin extends User {
  constructor(name, email, role) {
    super(name, email);
    this.role = role;
  }
}
\`\`\`

## JSON
\`\`\`javascript
const json = JSON.stringify(obj);       // object -> string
const obj = JSON.parse(jsonString);     // string -> object
const pretty = JSON.stringify(obj, null, 2); // formatted
\`\`\``,
    related: ['javascript', 'typescript', 'es6']
  },
  {
    topic: 'async-javascript',
    keywords: ['async', 'await', 'promise', 'callback', 'fetch', 'event loop', 'settimeout', 'asynchronous', 'then', 'catch'],
    title: 'Asynchronous JavaScript',
    summary: 'JavaScript handles async operations through callbacks, promises, and async/await. The event loop processes tasks from the call stack and callback queue.',
    details: `## The Event Loop
JavaScript is single-threaded but non-blocking. The event loop continuously checks:
1. **Call Stack** — synchronous code runs here
2. **Microtask Queue** — promises, queueMicrotask
3. **Macrotask Queue** — setTimeout, setInterval, I/O

## Promises
\`\`\`javascript
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 1000);
});

promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log('cleanup'));

// Combinators
Promise.all([p1, p2, p3]);      // all must succeed
Promise.allSettled([p1, p2]);    // wait for all, regardless
Promise.race([p1, p2]);         // first to settle
Promise.any([p1, p2]);          // first to succeed
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
    throw error;
  }
}
\`\`\`

## Fetch API
\`\`\`javascript
// GET
const data = await fetch('/api/items').then(r => r.json());

// POST
const result = await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'New Item' }),
}).then(r => r.json());
\`\`\``,
    related: ['javascript', 'nodejs', 'api']
  },
  {
    topic: 'closures',
    keywords: ['closure', 'closures', 'scope', 'lexical scope', 'hoisting', 'iife'],
    title: 'Closures & Scope',
    summary: 'A closure is a function that remembers the variables from its lexical scope even after the outer function has finished executing. Closures are fundamental to JavaScript.',
    details: `## What is a Closure?
A closure is created when a function accesses variables from an outer (enclosing) function's scope.

\`\`\`javascript
function createCounter() {
  let count = 0;  // enclosed variable
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
}
const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.getCount();  // 2
\`\`\`

## Scope Chain
- **Global scope** — accessible everywhere
- **Function scope** — \`var\` declarations
- **Block scope** — \`let\`/\`const\` in \`{ }\`

## Practical Uses
- **Data privacy** — encapsulate state
- **Function factories** — create specialized functions
- **Event handlers** — remember context
- **Memoization** — cache computed results

\`\`\`javascript
// Memoization with closure
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
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
];

const TYPESCRIPT: KnowledgeEntry[] = [
  {
    topic: 'typescript',
    keywords: ['typescript', 'ts', 'what is typescript', 'type system', 'typed javascript'],
    title: 'TypeScript',
    summary: 'TypeScript is a strongly-typed superset of JavaScript developed by Microsoft. It adds static type checking, interfaces, generics, and advanced tooling to JavaScript.',
    details: `**TypeScript** adds optional static typing to JavaScript, catching errors at compile time rather than runtime.

**Key Features:**
- **Static type checking** — catch bugs before running code
- **Type inference** — TypeScript often figures out types automatically
- **Interfaces & type aliases** — define shapes of data
- **Generics** — write reusable, type-safe code
- **Enums** — named constants
- **Union & intersection types** — flexible type combinations
- **Decorators** — metadata annotations (used heavily in Angular)
- **IDE support** — autocomplete, refactoring, go-to-definition

**Basic Types:**
\`\`\`typescript
let name: string = 'Alice';
let age: number = 25;
let active: boolean = true;
let items: string[] = ['a', 'b'];
let tuple: [string, number] = ['hello', 42];
let anything: any = 'whatever';
let unknown: unknown = getValue();  // safer than any
\`\`\`

**Interfaces & Types:**
\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  role?: string;       // optional
  readonly createdAt: Date;
}

type Status = 'active' | 'inactive' | 'pending';  // union type
type ApiResponse<T> = { data: T; error?: string }; // generic
\`\`\`

**Generics:**
\`\`\`typescript
function firstItem<T>(arr: T[]): T | undefined {
  return arr[0];
}

interface Repository<T> {
  findById(id: string): Promise<T>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}
\`\`\``,
    examples: [
      '```typescript\n// Type guards\nfunction isString(value: unknown): value is string {\n  return typeof value === "string";\n}\n\n// Utility types\ntype Partial<T> = { [P in keyof T]?: T[P] };\ntype Required<T> = { [P in keyof T]-?: T[P] };\ntype Pick<T, K extends keyof T> = { [P in K]: T[P] };\ntype Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;\n```'
    ],
    related: ['javascript', 'angular', 'nodejs']
  },
];

const ANGULAR: KnowledgeEntry[] = [
  {
    topic: 'angular',
    keywords: ['angular', 'what is angular', 'angular framework', 'ng', 'angular basics'],
    title: 'Angular',
    summary: 'Angular is a platform and framework for building single-page client applications using HTML and TypeScript. Built by Google, it provides a comprehensive solution with routing, forms, HTTP client, and testing utilities.',
    details: `**Angular** is a full-featured frontend framework built with TypeScript.

**Core Concepts:**
- **Components** — building blocks of the UI, each with template + logic + styles
- **Modules** — organize code into cohesive blocks (or standalone components in Angular 17+)
- **Templates** — HTML with Angular syntax (interpolation, directives, bindings)
- **Services** — shared logic & data access (injected via Dependency Injection)
- **Routing** — navigation between views with lazy loading
- **Dependency Injection** — framework manages object creation & lifetime

**Angular vs other frameworks:**
| Feature | Angular | React | Vue |
|---------|---------|-------|-----|
| Type | Full framework | Library | Progressive framework |
| Language | TypeScript | JavaScript/TSX | JavaScript/TS |
| Data binding | Two-way | One-way | Two-way |
| Architecture | Opinionated | Flexible | Flexible |
| CLI | ng CLI | create-react-app | vue-cli |
| State | Services/Signals | useState/Redux | Refs/Pinia |

**Project Structure:**
\`\`\`
src/
  app/
    app.component.ts        # root component
    app.routes.ts           # route definitions
    app.config.ts           # providers
    components/             # feature components
    services/               # shared services
    models/                 # interfaces/types
  assets/                   # static files
  index.html                # entry HTML
  main.ts                   # bootstrap
  styles.css                # global styles
\`\`\``,
    examples: [
      '```typescript\nimport { Component, signal } from \'@angular/core\';\n\n@Component({\n  selector: \'app-counter\',\n  standalone: true,\n  template: `\n    <h2>Count: {{ count() }}</h2>\n    <button (click)="increment()">+1</button>\n  `\n})\nexport class CounterComponent {\n  count = signal(0);\n  increment() { this.count.update(n => n + 1); }\n}\n```'
    ],
    related: ['typescript', 'rxjs', 'angular-components', 'angular-services']
  },
  {
    topic: 'angular-components',
    keywords: ['component', 'angular component', 'template', 'directive', 'pipe', 'ngif', 'ngfor', 'binding', 'input', 'output', 'signal', 'standalone'],
    title: 'Angular Components & Templates',
    summary: 'Components are the fundamental building blocks of Angular applications. Each component has a TypeScript class, an HTML template, and optional CSS styles.',
    details: `## Component Anatomy
\`\`\`typescript
@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule],
  template: \\\`
    <div class="card">
      <h3>{{ user().name }}</h3>
      <p *ngIf="user().active">Active user</p>
      <ul>
        <li *ngFor="let role of user().roles">{{ role }}</li>
      </ul>
      <button (click)="onEdit.emit(user())">Edit</button>
    </div>
  \\\`,
  styleUrl: './user-card.component.css'
})
export class UserCardComponent {
  user = input.required<User>();     // required input signal
  onEdit = output<User>();           // event emitter
}
\`\`\`

## Data Binding
- **Interpolation:** \`{{ expression }}\` — display values
- **Property binding:** \`[property]="value"\` — set element properties
- **Event binding:** \`(event)="handler()"\` — handle events
- **Two-way binding:** \`[(ngModel)]="value"\` — forms

## Signals (Angular 17+)
\`\`\`typescript
count = signal(0);                    // writable signal
doubled = computed(() => this.count() * 2);  // derived
effect(() => console.log(this.count()));     // side effect
\`\`\`

## Built-in Directives
- \`*ngIf\` / \`@if\` — conditional rendering
- \`*ngFor\` / \`@for\` — list rendering
- \`*ngSwitch\` — switch rendering
- \`[ngClass]\` — dynamic CSS classes
- \`[ngStyle]\` — dynamic inline styles

## Lifecycle Hooks
\`constructor()\` → \`ngOnInit()\` → \`ngOnChanges()\` → \`ngDoCheck()\` → \`ngAfterViewInit()\` → \`ngOnDestroy()\``,
    related: ['angular', 'angular-services', 'typescript']
  },
  {
    topic: 'angular-services',
    keywords: ['service', 'angular service', 'injectable', 'dependency injection', 'di', 'httpclient', 'http', 'provider'],
    title: 'Angular Services & Dependency Injection',
    summary: 'Services are classes that handle business logic, data access, and shared state. Angular\'s dependency injection system manages their lifecycle and provides them to components.',
    details: `## Creating a Service
\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = '/api/users';

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(\\\`\${this.baseUrl}/\${id}\\\`);
  }

  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.baseUrl, user);
  }

  updateUser(id: string, data: Partial<User>): Observable<User> {
    return this.http.put<User>(\\\`\${this.baseUrl}/\${id}\\\`, data);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(\\\`\${this.baseUrl}/\${id}\\\`);
  }
}
\`\`\`

## Using a Service in a Component
\`\`\`typescript
@Component({ ... })
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  users = signal<User[]>([]);

  ngOnInit() {
    this.userService.getUsers().subscribe(data => {
      this.users.set(data);
    });
  }
}
\`\`\`

## Dependency Injection Scopes
- \`providedIn: 'root'\` — singleton for entire app
- \`providers: [MyService]\` in component — new instance per component
- \`providedIn: 'any'\` — one instance per lazy module`,
    related: ['angular', 'angular-components', 'rxjs', 'api']
  },
  {
    topic: 'angular-routing',
    keywords: ['routing', 'angular routing', 'router', 'route', 'navigate', 'lazy loading', 'routerlink', 'guard', 'resolver'],
    title: 'Angular Routing',
    summary: 'Angular Router enables navigation between views, supports lazy loading of feature modules, route guards for access control, and resolvers for data pre-fetching.',
    details: `## Route Configuration
\`\`\`typescript
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users', loadComponent: () =>
    import('./users/users.component').then(m => m.UsersComponent) },
  { path: 'users/:id', component: UserDetailComponent },
  { path: 'admin', canActivate: [authGuard], children: [
    { path: 'dashboard', component: DashboardComponent },
  ]},
  { path: '**', component: NotFoundComponent },
];
\`\`\`

## Navigation
\`\`\`html
<a routerLink="/users" routerLinkActive="active">Users</a>
<a [routerLink]="['/users', user.id]">{{ user.name }}</a>
<router-outlet></router-outlet>
\`\`\`
\`\`\`typescript
this.router.navigate(['/users', id]);
this.router.navigate(['/search'], { queryParams: { q: 'test' } });
\`\`\`

## Route Guards
\`\`\`typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};
\`\`\`

## Reading Route Parameters
\`\`\`typescript
private route = inject(ActivatedRoute);
ngOnInit() {
  this.route.params.subscribe(params => {
    this.userId = params['id'];
  });
}
\`\`\``,
    related: ['angular', 'angular-components']
  },
  {
    topic: 'rxjs',
    keywords: ['rxjs', 'observable', 'subscribe', 'pipe', 'map', 'switchmap', 'subject', 'behaviorsubject', 'reactive'],
    title: 'RxJS (Reactive Extensions for JavaScript)',
    summary: 'RxJS is a library for reactive programming using Observables. It is heavily used in Angular for handling async operations, HTTP requests, events, and state management.',
    details: `## Core Concepts
- **Observable** — a stream of values over time
- **Observer** — consumes values from an Observable
- **Subscription** — represents the execution of an Observable
- **Operators** — functions to transform streams (pipe)
- **Subject** — both Observable and Observer

## Common Operators
\`\`\`typescript
import { map, filter, switchMap, debounceTime, distinctUntilChanged,
         catchError, tap, take, takeUntil, combineLatest } from 'rxjs/operators';

// Transform
source$.pipe(map(val => val * 2));
source$.pipe(filter(val => val > 5));

// Flatten (for nested observables)
click$.pipe(switchMap(() => this.http.get('/api/data')));
click$.pipe(mergeMap(id => this.http.get(\\\`/api/items/\${id}\\\`)));

// Search with debounce
searchInput$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => this.search(query)),
);

// Error handling
source$.pipe(
  catchError(err => of(fallbackValue)),
  retry(3),
);
\`\`\`

## Subjects
\`\`\`typescript
const subject = new Subject<string>();
const behavior = new BehaviorSubject<number>(0);  // has initial value
const replay = new ReplaySubject<string>(3);      // replays last 3

subject.next('hello');
behavior.getValue(); // current value synchronously
\`\`\`

## Unsubscribing (prevent memory leaks)
\`\`\`typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.data$.pipe(
    takeUntil(this.destroy$)
  ).subscribe(data => { ... });
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
\`\`\``,
    related: ['angular', 'angular-services', 'async-javascript']
  },
];

const NODEJS: KnowledgeEntry[] = [
  {
    topic: 'nodejs',
    keywords: ['nodejs', 'node', 'node.js', 'what is node', 'server javascript', 'backend javascript', 'npm', 'runtime'],
    title: 'Node.js',
    summary: 'Node.js is a JavaScript runtime built on Chrome\'s V8 engine. It allows running JavaScript on the server side, enabling full-stack JavaScript development with non-blocking I/O.',
    details: `**Node.js** runs JavaScript outside the browser using the V8 engine.

**Key Features:**
- **Non-blocking I/O** — handles thousands of connections concurrently
- **Event-driven** — uses an event loop (libuv)
- **npm** — world's largest package ecosystem
- **Single language** — JavaScript on both client and server
- **Streaming** — process data in chunks

**Core Modules:**
\`\`\`javascript
const fs = require('fs');          // file system
const path = require('path');      // path utilities
const http = require('http');      // HTTP server
const crypto = require('crypto');  // cryptography
const os = require('os');          // system info
const events = require('events');  // event emitter
\`\`\`

**File System:**
\`\`\`javascript
// Read file
const data = fs.readFileSync('file.txt', 'utf-8');
const data = await fs.promises.readFile('file.txt', 'utf-8');

// Write file
fs.writeFileSync('output.txt', 'Hello');

// Directory
fs.mkdirSync('new-dir', { recursive: true });
const files = fs.readdirSync('./src');
\`\`\`

**HTTP Server:**
\`\`\`javascript
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Hello World' }));
});
server.listen(3000);
\`\`\`

**npm scripts (package.json):**
\`\`\`json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "build": "tsc"
  }
}
\`\`\``,
    related: ['javascript', 'express', 'api']
  },
  {
    topic: 'express',
    keywords: ['express', 'expressjs', 'express.js', 'middleware', 'rest api', 'routes', 'express routes', 'express middleware'],
    title: 'Express.js',
    summary: 'Express is a minimal, flexible Node.js web framework for building APIs and web applications. It provides routing, middleware support, and HTTP utility methods.',
    details: `## Basic Server
\`\`\`javascript
const express = require('express');
const app = express();

app.use(express.json());
app.use(cors());

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  const user = { id: Date.now(), name, email };
  users.push(user);
  res.status(201).json(user);
});

app.listen(3000, () => console.log('Server running on :3000'));
\`\`\`

## Middleware
\`\`\`javascript
// Logger middleware
app.use((req, res, next) => {
  console.log(\\\`\${req.method} \${req.url}\\\`);
  next();
});

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api/profile', auth, (req, res) => {
  res.json(req.user);
});
\`\`\`

## Router
\`\`\`javascript
const router = express.Router();
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
app.use('/api/products', router);
\`\`\`

## Error Handling
\`\`\`javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});
\`\`\``,
    related: ['nodejs', 'api', 'mongodb']
  },
];

const DATABASE: KnowledgeEntry[] = [
  {
    topic: 'mongodb',
    keywords: ['mongodb', 'mongo', 'mongoose', 'nosql', 'document database', 'schema', 'collection'],
    title: 'MongoDB & Mongoose',
    summary: 'MongoDB is a NoSQL document database that stores data in flexible JSON-like documents. Mongoose is the most popular ODM (Object Data Modeling) library for MongoDB and Node.js.',
    details: `## Mongoose Schema & Model
\`\`\`javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profile: {
    bio: String,
    avatar: String,
  },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
\`\`\`

## CRUD Operations
\`\`\`javascript
// Create
const user = await User.create({ name: 'Alice', email: 'alice@test.com' });

// Read
const users = await User.find({ role: 'admin' }).sort({ createdAt: -1 }).limit(10);
const user = await User.findById(id).populate('posts');
const user = await User.findOne({ email: 'alice@test.com' });

// Update
await User.findByIdAndUpdate(id, { name: 'Bob' }, { new: true, runValidators: true });

// Delete
await User.findByIdAndDelete(id);
\`\`\`

## Queries
\`\`\`javascript
User.find({ age: { $gte: 18, $lte: 65 } });   // range
User.find({ name: { $regex: /alice/i } });       // regex
User.find({ role: { $in: ['admin', 'mod'] } });  // in array
User.countDocuments({ active: true });            // count
User.aggregate([                                  // aggregation pipeline
  { $match: { active: true } },
  { $group: { _id: '$role', count: { $sum: 1 } } },
]);
\`\`\`

## Connection
\`\`\`javascript
mongoose.connect('mongodb://localhost:27017/myapp')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Connection failed:', err));
\`\`\``,
    related: ['nodejs', 'express', 'api']
  },
  {
    topic: 'sql',
    keywords: ['sql', 'database', 'mysql', 'postgresql', 'postgres', 'select', 'insert', 'join', 'relational database'],
    title: 'SQL Databases',
    summary: 'SQL (Structured Query Language) is used to manage relational databases like PostgreSQL, MySQL, and SQLite. Data is stored in tables with defined schemas and relationships.',
    details: `## Basic Queries
\`\`\`sql
-- Select
SELECT name, email FROM users WHERE active = true ORDER BY name LIMIT 10;
SELECT COUNT(*) as total, role FROM users GROUP BY role HAVING COUNT(*) > 5;

-- Insert
INSERT INTO users (name, email, role) VALUES ('Alice', 'alice@test.com', 'admin');

-- Update
UPDATE users SET role = 'admin' WHERE id = 1;

-- Delete
DELETE FROM users WHERE id = 1;
\`\`\`

## Joins
\`\`\`sql
-- Inner Join
SELECT u.name, p.title FROM users u
INNER JOIN posts p ON u.id = p.author_id;

-- Left Join (all users, even without posts)
SELECT u.name, COUNT(p.id) as post_count FROM users u
LEFT JOIN posts p ON u.id = p.author_id GROUP BY u.id;
\`\`\`

## Schema
\`\`\`sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
\`\`\``,
    related: ['nodejs', 'api']
  },
];

const WEB_FUNDAMENTALS: KnowledgeEntry[] = [
  {
    topic: 'html',
    keywords: ['html', 'html5', 'what is html', 'hypertext', 'markup', 'semantic html', 'tags', 'elements'],
    title: 'HTML (HyperText Markup Language)',
    summary: 'HTML is the standard markup language for creating web pages. It describes the structure of a page using elements like headings, paragraphs, links, images, forms, and semantic tags.',
    details: `## Structure
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header><nav>...</nav></header>
  <main>
    <article>
      <h1>Title</h1>
      <p>Content</p>
    </article>
  </main>
  <footer>...</footer>
  <script src="app.js"></script>
</body>
</html>
\`\`\`

## Semantic Tags
- \`<header>\`, \`<nav>\`, \`<main>\`, \`<footer>\` — page structure
- \`<article>\`, \`<section>\`, \`<aside>\` — content sections
- \`<figure>\`, \`<figcaption>\` — media with captions
- \`<details>\`, \`<summary>\` — collapsible content

## Forms
\`\`\`html
<form action="/api/submit" method="POST">
  <label for="email">Email:</label>
  <input type="email" id="email" name="email" required>
  <select name="role">
    <option value="user">User</option>
    <option value="admin">Admin</option>
  </select>
  <textarea name="bio" rows="4"></textarea>
  <button type="submit">Submit</button>
</form>
\`\`\``,
    related: ['css', 'javascript', 'dom']
  },
  {
    topic: 'css',
    keywords: ['css', 'css3', 'what is css', 'stylesheet', 'styling', 'flexbox', 'grid', 'responsive', 'media queries', 'animation'],
    title: 'CSS (Cascading Style Sheets)',
    summary: 'CSS is used to style and layout web pages. Modern CSS includes Flexbox, Grid, animations, custom properties (variables), media queries for responsive design, and more.',
    details: `## Selectors
\`\`\`css
.class { }           /* class */
#id { }              /* id */
element { }          /* tag */
.parent > .child { } /* direct child */
.item:hover { }      /* pseudo-class */
.item::before { }    /* pseudo-element */
[data-active] { }    /* attribute */
\`\`\`

## Flexbox
\`\`\`css
.container {
  display: flex;
  justify-content: space-between;  /* main axis */
  align-items: center;             /* cross axis */
  gap: 16px;
  flex-wrap: wrap;
}
.item { flex: 1; }
\`\`\`

## Grid
\`\`\`css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto;
  gap: 20px;
}
.full-width { grid-column: 1 / -1; }
\`\`\`

## Responsive Design
\`\`\`css
/* Mobile first */
.container { padding: 16px; }

@media (min-width: 768px) {
  .container { padding: 32px; max-width: 720px; }
}
@media (min-width: 1024px) {
  .container { max-width: 960px; }
}
\`\`\`

## Custom Properties (Variables)
\`\`\`css
:root {
  --primary: #6366f1;
  --bg: #0f172a;
  --text: #e2e8f0;
  --radius: 8px;
}
.btn {
  background: var(--primary);
  border-radius: var(--radius);
  color: white;
}
\`\`\`

## Animations
\`\`\`css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.card { animation: fadeIn 0.3s ease-out; }
.btn { transition: all 0.2s ease; }
.btn:hover { transform: scale(1.05); }
\`\`\``,
    related: ['html', 'javascript', 'angular']
  },
  {
    topic: 'api',
    keywords: ['api', 'rest', 'restful', 'rest api', 'endpoint', 'http methods', 'get', 'post', 'put', 'delete', 'status codes', 'json api', 'web api'],
    title: 'REST APIs',
    summary: 'REST (Representational State Transfer) is an architectural style for designing web APIs. RESTful APIs use HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations on resources.',
    details: `## HTTP Methods
| Method | Purpose | Example |
|--------|---------|---------|
| GET | Read data | GET /api/users |
| POST | Create data | POST /api/users |
| PUT | Update (full) | PUT /api/users/1 |
| PATCH | Update (partial) | PATCH /api/users/1 |
| DELETE | Remove data | DELETE /api/users/1 |

## Status Codes
- **200** OK — success
- **201** Created — resource created
- **204** No Content — success, no body
- **400** Bad Request — invalid input
- **401** Unauthorized — no/invalid auth
- **403** Forbidden — no permission
- **404** Not Found — resource doesn't exist
- **409** Conflict — duplicate/conflict
- **422** Unprocessable — validation failed
- **500** Internal Server Error — server bug

## API Design Best Practices
\`\`\`
GET    /api/users          # list users
GET    /api/users/123      # get single user
POST   /api/users          # create user
PUT    /api/users/123      # update user
DELETE /api/users/123      # delete user
GET    /api/users/123/posts  # user's posts (nested resource)
GET    /api/users?role=admin&page=2  # filtering & pagination
\`\`\`

## Request/Response Example
\`\`\`javascript
// Request
POST /api/users
Content-Type: application/json
Authorization: Bearer eyJhbG...

{ "name": "Alice", "email": "alice@test.com" }

// Response (201 Created)
{
  "id": "abc123",
  "name": "Alice",
  "email": "alice@test.com",
  "createdAt": "2024-01-15T10:30:00Z"
}
\`\`\``,
    related: ['express', 'nodejs', 'javascript']
  },
];

const TOOLS: KnowledgeEntry[] = [
  {
    topic: 'git',
    keywords: ['git', 'version control', 'github', 'commit', 'branch', 'merge', 'pull request', 'clone', 'push', 'pull', 'rebase'],
    title: 'Git & Version Control',
    summary: 'Git is a distributed version control system for tracking changes in code. It enables collaboration through branching, merging, and remote repositories like GitHub.',
    details: `## Basic Commands
\`\`\`bash
git init                    # initialize repo
git clone <url>             # clone remote repo
git status                  # see changes
git add .                   # stage all changes
git add file.ts             # stage specific file
git commit -m "message"     # commit staged changes
git push origin main        # push to remote
git pull origin main        # fetch + merge
\`\`\`

## Branching
\`\`\`bash
git branch feature/login    # create branch
git checkout feature/login  # switch to branch
git checkout -b feature/x   # create + switch
git merge feature/login     # merge into current
git branch -d feature/login # delete branch
\`\`\`

## Common Workflows
\`\`\`bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard changes in a file
git checkout -- file.ts

# Stash changes
git stash
git stash pop

# View history
git log --oneline -10
git diff HEAD~1

# Interactive rebase (squash commits)
git rebase -i HEAD~3
\`\`\`

## GitHub Flow
1. Create a branch from main
2. Make commits
3. Open a Pull Request
4. Code review
5. Merge to main
6. Delete branch`,
    related: ['nodejs']
  },
  {
    topic: 'testing',
    keywords: ['testing', 'test', 'unit test', 'jest', 'jasmine', 'karma', 'mocha', 'tdd', 'bdd', 'test driven', 'e2e', 'cypress', 'playwright'],
    title: 'Testing (Unit, Integration, E2E)',
    summary: 'Software testing ensures code works correctly. Unit tests verify individual functions, integration tests check component interactions, and E2E tests simulate real user behavior.',
    details: `## Test Pyramid
1. **Unit Tests** (most) — test individual functions/methods
2. **Integration Tests** — test component interactions
3. **E2E Tests** (fewest) — test full user workflows

## Jest (Unit Testing)
\`\`\`javascript
describe('Calculator', () => {
  test('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('throws on invalid input', () => {
    expect(() => add('a', 1)).toThrow('Invalid input');
  });

  test('fetches user data', async () => {
    const user = await getUser(1);
    expect(user).toEqual({ id: 1, name: 'Alice' });
    expect(user.name).toContain('Ali');
  });
});

// Mocking
jest.mock('./api');
api.fetchData.mockResolvedValue({ data: 'test' });
\`\`\`

## Angular Testing
\`\`\`typescript
describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent],
      providers: [{ provide: UserService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display user name', () => {
    const el = fixture.nativeElement.querySelector('h2');
    expect(el.textContent).toContain('Alice');
  });
});
\`\`\`

## E2E Testing (Playwright/Cypress)
\`\`\`javascript
test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'alice@test.com');
  await page.fill('[name="password"]', 'secret');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
\`\`\``,
    related: ['javascript', 'angular', 'nodejs']
  },
];

const PYTHON: KnowledgeEntry[] = [
  {
    topic: 'python',
    keywords: ['python', 'what is python', 'python basics', 'python programming', 'pip', 'python language'],
    title: 'Python',
    summary: 'Python is a high-level, interpreted programming language known for its readability and versatility. It is used in web development, data science, AI/ML, automation, and scripting.',
    details: `**Python** emphasizes code readability with significant whitespace.

## Basics
\`\`\`python
# Variables (no type declaration needed)
name = "Alice"
age = 25
scores = [90, 85, 92]
user = {"name": "Alice", "age": 25}

# Functions
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

# List comprehensions
squares = [x**2 for x in range(10)]
evens = [x for x in numbers if x % 2 == 0]

# Classes
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    def __repr__(self) -> str:
        return f"User({self.name})"
\`\`\`

## Data Structures
\`\`\`python
# List — ordered, mutable
items = [1, 2, 3]
items.append(4)
items.sort()

# Dictionary — key-value pairs
data = {"key": "value"}
data.get("missing", "default")
for key, val in data.items(): ...

# Set — unique values
unique = {1, 2, 3}
unique.add(4)

# Tuple — ordered, immutable
point = (10, 20)
\`\`\`

## File I/O
\`\`\`python
with open("file.txt", "r") as f:
    content = f.read()

with open("output.json", "w") as f:
    json.dump(data, f, indent=2)
\`\`\`

## Common Libraries
- **Flask / FastAPI** — web frameworks
- **requests** — HTTP client
- **pandas** — data analysis
- **numpy** — numerical computing
- **pytest** — testing
- **SQLAlchemy** — database ORM`,
    related: ['api', 'testing']
  },
];

const REACT: KnowledgeEntry[] = [
  {
    topic: 'react',
    keywords: ['react', 'reactjs', 'react.js', 'what is react', 'jsx', 'hooks', 'usestate', 'useeffect', 'component', 'virtual dom'],
    title: 'React',
    summary: 'React is a JavaScript library for building user interfaces, developed by Meta. It uses a component-based architecture with JSX syntax and a virtual DOM for efficient rendering.',
    details: `## Core Concepts
- **Components** — reusable UI pieces (functions or classes)
- **JSX** — HTML-like syntax in JavaScript
- **Props** — data passed from parent to child
- **State** — internal component data (useState)
- **Virtual DOM** — efficient re-rendering
- **Hooks** — reusable stateful logic

## Functional Component
\`\`\`jsx
import { useState, useEffect } from 'react';

function Counter({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    document.title = \\\`Count: \${count}\\\`;
  }, [count]);

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
\`\`\`

## Common Hooks
\`\`\`jsx
const [state, setState] = useState(initial);      // state
useEffect(() => { ... }, [deps]);                  // side effects
const value = useContext(MyContext);                // context
const memoized = useMemo(() => compute(a, b), [a, b]); // memoize value
const callback = useCallback(() => { ... }, [deps]); // memoize function
const ref = useRef(null);                          // DOM ref / mutable box
\`\`\`

## Conditional & List Rendering
\`\`\`jsx
{isLoading ? <Spinner /> : <Content data={data} />}
{error && <ErrorMessage text={error} />}
{items.map(item => <Card key={item.id} {...item} />)}
\`\`\``,
    related: ['javascript', 'typescript', 'nodejs']
  },
];

const DEVOPS: KnowledgeEntry[] = [
  {
    topic: 'docker',
    keywords: ['docker', 'container', 'dockerfile', 'docker compose', 'image', 'containerization'],
    title: 'Docker & Containers',
    summary: 'Docker packages applications into containers — lightweight, portable, self-sufficient units that include everything needed to run: code, runtime, libraries, and settings.',
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

## Docker Commands
\`\`\`bash
docker build -t myapp .           # build image
docker run -p 3000:3000 myapp     # run container
docker ps                          # list running
docker stop <id>                   # stop container
docker logs <id>                   # view logs
docker exec -it <id> sh           # shell into container
\`\`\`

## Docker Compose
\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - MONGO_URL=mongodb://db:27017/myapp
    depends_on: [db]
  db:
    image: mongo:7
    volumes: ["mongo-data:/data/db"]
volumes:
  mongo-data:
\`\`\`

\`\`\`bash
docker compose up -d      # start all services
docker compose down        # stop all
docker compose logs -f     # tail logs
\`\`\``,
    related: ['nodejs', 'git']
  },
];

const DESIGN_PATTERNS: KnowledgeEntry[] = [
  {
    topic: 'design-patterns',
    keywords: ['design pattern', 'patterns', 'singleton', 'factory', 'observer', 'strategy', 'mvc', 'solid', 'dry', 'kiss'],
    title: 'Design Patterns & Principles',
    summary: 'Design patterns are reusable solutions to common software design problems. Key principles include SOLID, DRY, KISS, and separation of concerns.',
    details: `## SOLID Principles
- **S** — Single Responsibility: one class = one job
- **O** — Open/Closed: open for extension, closed for modification
- **L** — Liskov Substitution: subtypes must be substitutable
- **I** — Interface Segregation: many specific interfaces > one general
- **D** — Dependency Inversion: depend on abstractions, not concretions

## Common Patterns
**Singleton** — one instance of a class
\`\`\`typescript
class Database {
  private static instance: Database;
  static getInstance(): Database {
    if (!this.instance) this.instance = new Database();
    return this.instance;
  }
}
\`\`\`

**Observer** — publish/subscribe to events
\`\`\`typescript
class EventEmitter {
  private listeners = new Map<string, Function[]>();
  on(event: string, fn: Function) { ... }
  emit(event: string, data: any) { ... }
}
\`\`\`

**Factory** — create objects without specifying exact class
\`\`\`typescript
function createNotification(type: string) {
  switch (type) {
    case 'email': return new EmailNotification();
    case 'sms': return new SmsNotification();
    case 'push': return new PushNotification();
  }
}
\`\`\`

## Other Principles
- **DRY** — Don't Repeat Yourself
- **KISS** — Keep It Simple, Stupid
- **YAGNI** — You Ain't Gonna Need It
- **Composition over Inheritance**
- **Separation of Concerns**`,
    related: ['typescript', 'angular', 'nodejs']
  },
];

const SECURITY: KnowledgeEntry[] = [
  {
    topic: 'security',
    keywords: ['security', 'jwt', 'authentication', 'authorization', 'xss', 'csrf', 'cors', 'oauth', 'bcrypt', 'hashing', 'encryption', 'owasp'],
    title: 'Web Security',
    summary: 'Web security protects applications from attacks like XSS, CSRF, SQL injection, and unauthorized access. Key concepts include authentication (JWT, OAuth), input validation, and CORS.',
    details: `## Authentication with JWT
\`\`\`javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Register: hash password
const hash = await bcrypt.hash(password, 10);

// Login: verify & create token
const isMatch = await bcrypt.compare(password, user.password);
const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '7d' });

// Verify token (middleware)
const decoded = jwt.verify(token, SECRET);
\`\`\`

## Common Vulnerabilities (OWASP Top 10)
1. **Injection** — SQL/NoSQL injection via unsanitized input
2. **Broken Auth** — weak passwords, exposed tokens
3. **XSS** — injecting scripts via user input
4. **CSRF** — forged requests from other sites
5. **Security Misconfiguration** — default credentials, open ports

## Prevention
\`\`\`javascript
// Prevent XSS: escape user input
const safe = input.replace(/[<>&"']/g, char => entities[char]);

// Prevent SQL Injection: use parameterized queries
db.query('SELECT * FROM users WHERE id = $1', [userId]);

// CORS configuration
app.use(cors({ origin: 'https://myapp.com', credentials: true }));

// Rate limiting
app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));

// Helmet (security headers)
app.use(helmet());
\`\`\``,
    related: ['express', 'nodejs', 'api']
  },
];

const REAL_WORLD_BACKEND: KnowledgeEntry[] = [
  {
    topic: 'nodemailer',
    keywords: ['nodemailer', 'send email', 'email', 'otp', 'verification email', 'smtp', 'gmail', 'mail', 'transporter'],
    title: 'Nodemailer — Sending Emails from Node.js',
    summary: 'Nodemailer is the standard Node.js library for sending emails. Supports SMTP, Gmail, OAuth2, HTML templates, and attachments.',
    details: `## Setup
\`\`\`bash
npm install nodemailer
\`\`\`

## Gmail Transporter
\`\`\`javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password',  // Use App Password, NOT your login password
  },
});
\`\`\`

**Important:** Enable 2FA on your Google account, then generate an App Password at https://myaccount.google.com/apppasswords

## Send Email
\`\`\`javascript
async function sendEmail(to, subject, html) {
  const info = await transporter.sendMail({
    from: '"My App" <your-email@gmail.com>',
    to,
    subject,
    html,
  });
  console.log('Email sent:', info.messageId);
}
\`\`\`

## OTP Email Verification Pattern
\`\`\`javascript
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email, otp, name) {
  await transporter.sendMail({
    from: '"App Name" <your@gmail.com>',
    to: email,
    subject: 'Your Verification Code',
    html: \\\`
      <h2>Hello \${name}</h2>
      <p>Your verification code is: <strong>\${otp}</strong></p>
      <p>Expires in 10 minutes.</p>
    \\\`,
  });
}

// In register route:
const otp = generateOTP();
user.otp = otp;
user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
await user.save();
await sendOTP(email, otp, name);
\`\`\``,
    related: ['express', 'mongodb', 'security']
  },
  {
    topic: 'otp-verification',
    keywords: ['otp', 'verification', 'verify email', 'email verification', 'two factor', '2fa', 'one time password', 'verification code'],
    title: 'OTP Email Verification System',
    summary: 'OTP (One-Time Password) email verification confirms user email ownership during registration. A 6-digit code is sent to the email, user enters it, and the account is verified.',
    details: `## Full OTP Flow

**1. User Schema (MongoDB)**
\`\`\`javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
}, { timestamps: true });
\`\`\`

**2. Register — Generate & Send OTP**
\`\`\`javascript
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await User.create({
    name, email, password: hashed,
    otp,
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  await sendOTPEmail(email, otp, name);
  res.json({ message: 'OTP sent to email', requiresVerification: true });
});
\`\`\`

**3. Verify OTP**
\`\`\`javascript
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  if (user.otpExpiresAt < new Date()) return res.status(400).json({ error: 'OTP expired' });

  user.verified = true;
  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();

  const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '7d' });
  res.json({ message: 'Verified', token });
});
\`\`\`

**4. Resend OTP**
\`\`\`javascript
router.post('/resend-otp', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendOTPEmail(user.email, otp, user.name);
  res.json({ message: 'OTP resent' });
});
\`\`\`

## Frontend OTP Input (Angular)
\`\`\`html
<div class="otp-container">
  <input *ngFor="let i of [0,1,2,3,4,5]" maxlength="1" inputmode="numeric"
    (input)="onDigitInput($event, i)" (keydown)="onDigitKeydown($event, i)" />
</div>
\`\`\``,
    related: ['nodemailer', 'security', 'mongodb', 'express']
  },
  {
    topic: 'websocket',
    keywords: ['websocket', 'ws', 'real time', 'realtime', 'socket', 'live', 'push', 'bidirectional'],
    title: 'WebSocket — Real-Time Communication',
    summary: 'WebSocket enables bidirectional real-time communication between client and server over a single TCP connection. Used for chat, live updates, terminals, and streaming.',
    details: `## Server (Node.js with ws)
\`\`\`bash
npm install ws
\`\`\`

\`\`\`javascript
const { WebSocketServer } = require('ws');
const http = require('http');
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    switch (msg.type) {
      case 'chat':
        // Broadcast to all clients
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: 'chat', text: msg.text }));
          }
        });
        break;
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
  ws.send(JSON.stringify({ type: 'info', data: 'Connected' }));
});

server.listen(3000);
\`\`\`

## Client (Browser)
\`\`\`javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('Received:', msg);
};
ws.onerror = (err) => console.error('WS error:', err);
ws.onclose = () => console.log('Disconnected');

// Send message
ws.send(JSON.stringify({ type: 'chat', text: 'Hello!' }));
\`\`\`

## Angular Service
\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;

  connect(url: string): Observable<any> {
    return new Observable(observer => {
      this.ws = new WebSocket(url);
      this.ws.onmessage = (e) => observer.next(JSON.parse(e.data));
      this.ws.onerror = (e) => observer.error(e);
      this.ws.onclose = () => observer.complete();
    });
  }

  send(data: any): void {
    this.ws?.send(JSON.stringify(data));
  }

  disconnect(): void {
    this.ws?.close();
  }
}
\`\`\``,
    related: ['nodejs', 'express', 'angular-services']
  },
  {
    topic: 'error-handling',
    keywords: ['error handling', 'try catch', 'error middleware', 'error response', 'validation error', 'status code', 'error boundary'],
    title: 'Error Handling Patterns',
    summary: 'Proper error handling prevents crashes and gives users meaningful feedback. Covers Express middleware, async/await errors, validation, and client-side error handling.',
    details: `## Express Error Middleware
\`\`\`javascript
// Place AFTER all routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});
\`\`\`

## Async Route Wrapper
\`\`\`javascript
// Catches async errors automatically
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();  // If this throws, error middleware catches it
  res.json(users);
}));
\`\`\`

## Validation Pattern
\`\`\`javascript
router.post('/users', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Input validation
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Duplicate check
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  // Create user...
}));
\`\`\`

## Angular Error Handling
\`\`\`typescript
// In component
async submit(): Promise<void> {
  this.error = '';
  this.loading = true;
  try {
    const res = await this.authService.login(this.email, this.password);
    if (res.error) {
      this.error = res.error;  // Server validation error
    } else {
      this.router.navigate(['/dashboard']);
    }
  } catch (err: any) {
    this.error = 'Server not reachable. Is the backend running?';
  } finally {
    this.loading = false;
  }
}
\`\`\`

## Status Code Guide
| Code | When to use |
|------|------------|
| 400 | Invalid input / validation failure |
| 401 | Not authenticated (no/bad token) |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, etc.) |
| 422 | Valid format but unprocessable |
| 500 | Server bug (never expose details) |`,
    related: ['express', 'api', 'angular']
  },
  {
    topic: 'angular-signals',
    keywords: ['signal', 'signals', 'computed', 'effect', 'angular signal', 'reactive', 'writable signal', 'angular 17', 'angular 18'],
    title: 'Angular Signals (Angular 17+)',
    summary: 'Signals are Angular\'s new reactive primitive replacing many uses of RxJS. They provide fine-grained reactivity with simpler syntax: signal() for state, computed() for derived values, effect() for side effects.',
    details: `## Writable Signal
\`\`\`typescript
import { signal, computed, effect } from '@angular/core';

// Create
const count = signal(0);
const user = signal<User | null>(null);
const items = signal<string[]>([]);

// Read
console.log(count());       // 0

// Write
count.set(5);               // replace value
count.update(n => n + 1);   // update based on current
items.update(list => [...list, 'new item']);
\`\`\`

## Computed Signal (derived)
\`\`\`typescript
const firstName = signal('John');
const lastName = signal('Doe');
const fullName = computed(() => \\\`\${firstName()} \${lastName()}\\\`);

console.log(fullName());    // "John Doe"
firstName.set('Jane');
console.log(fullName());    // "Jane Doe" (auto-updates)
\`\`\`

## Effect (side effects)
\`\`\`typescript
effect(() => {
  console.log('Count changed to:', count());
  // Runs whenever count changes
});
\`\`\`

## In Components
\`\`\`typescript
@Component({
  selector: 'app-todo',
  template: \\\`
    <h2>{{ title() }} ({{ remaining() }} left)</h2>
    <ul>
      <li *ngFor="let t of todos()">
        <input type="checkbox" [checked]="t.done" (change)="toggle(t)" />
        {{ t.text }}
      </li>
    </ul>
    <input #inp /> <button (click)="add(inp.value); inp.value=''">Add</button>
  \\\`
})
export class TodoComponent {
  title = signal('My Todos');
  todos = signal<{text: string, done: boolean}[]>([]);
  remaining = computed(() => this.todos().filter(t => !t.done).length);

  add(text: string) {
    this.todos.update(list => [...list, { text, done: false }]);
  }
  toggle(todo: any) {
    this.todos.update(list =>
      list.map(t => t === todo ? { ...t, done: !t.done } : t)
    );
  }
}
\`\`\`

## Signals vs RxJS
| Use Case | Use Signals | Use RxJS |
|----------|------------|----------|
| Component state | signal() | - |
| Derived values | computed() | - |
| HTTP requests | - | Observable |
| Event streams | - | fromEvent/Subject |
| Debounce/throttle | - | debounceTime |
| Complex async flows | - | switchMap/mergeMap |`,
    related: ['angular', 'angular-components', 'rxjs']
  },
  {
    topic: 'angular-forms',
    keywords: ['form', 'forms', 'ngmodel', 'formgroup', 'formcontrol', 'validation', 'reactive form', 'template driven', 'angular form'],
    title: 'Angular Forms',
    summary: 'Angular provides two approaches to forms: Template-driven (FormsModule with ngModel) for simple forms, and Reactive (ReactiveFormsModule with FormGroup) for complex forms with validation.',
    details: `## Template-Driven Forms (Simple)
\`\`\`typescript
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  template: \\\`
    <form (ngSubmit)="onSubmit()">
      <input [(ngModel)]="name" name="name" required />
      <input [(ngModel)]="email" name="email" type="email" required />
      <input [(ngModel)]="password" name="password" type="password" minlength="6" />
      <button type="submit" [disabled]="loading">Submit</button>
    </form>
  \\\`
})
export class LoginComponent {
  name = '';
  email = '';
  password = '';
  loading = false;

  onSubmit() { ... }
}
\`\`\`

## Reactive Forms (Complex)
\`\`\`typescript
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  template: \\\`
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="email" />
      <div *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
        <span *ngIf="form.get('email')?.errors?.['required']">Email required</span>
        <span *ngIf="form.get('email')?.errors?.['email']">Invalid email</span>
      </div>

      <input formControlName="password" type="password" />
      <button [disabled]="form.invalid">Submit</button>
    </form>
  \\\`
})
export class RegisterComponent {
  form = inject(FormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: [''],
  });

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
\`\`\`

## Custom Validator
\`\`\`typescript
function passwordMatch(group: FormGroup) {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass === confirm ? null : { mismatch: true };
}
\`\`\``,
    related: ['angular', 'angular-components', 'typescript']
  },
  {
    topic: 'mongoose-advanced',
    keywords: ['mongoose', 'populate', 'middleware', 'pre save', 'virtual', 'aggregate', 'index', 'mongoose hooks', 'schema validation'],
    title: 'Mongoose Advanced Patterns',
    summary: 'Advanced Mongoose features: middleware hooks (pre/post save), population (joins), virtuals, indexes, custom validators, aggregation pipeline, and schema design patterns.',
    details: `## Middleware Hooks
\`\`\`javascript
// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Log after save
userSchema.post('save', function(doc) {
  console.log('User saved:', doc.email);
});
\`\`\`

## Population (Joins)
\`\`\`javascript
const postSchema = new Schema({
  title: String,
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
});

// Query with populated data
const post = await Post.findById(id)
  .populate('author', 'name email')         // only name & email
  .populate({ path: 'comments', populate: { path: 'user' } }); // nested
\`\`\`

## Virtuals
\`\`\`javascript
userSchema.virtual('fullName').get(function() {
  return this.firstName + ' ' + this.lastName;
});
// Enable in JSON output
userSchema.set('toJSON', { virtuals: true });
\`\`\`

## Custom Validation
\`\`\`javascript
const userSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    validate: {
      validator: (v) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v),
      message: 'Invalid email format',
    },
  },
  age: {
    type: Number,
    min: [13, 'Must be at least 13'],
    max: [120, 'Invalid age'],
  },
});
\`\`\`

## Indexes
\`\`\`javascript
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', bio: 'text' }); // text search
\`\`\`

## Aggregation
\`\`\`javascript
const stats = await Order.aggregate([
  { $match: { status: 'completed' } },
  { $group: {
    _id: '$category',
    total: { $sum: '$amount' },
    count: { $sum: 1 },
    avg: { $avg: '$amount' },
  }},
  { $sort: { total: -1 } },
]);
\`\`\``,
    related: ['mongodb', 'express', 'nodejs']
  },
  {
    topic: 'node-filesystem',
    keywords: ['fs', 'file system', 'read file', 'write file', 'readfile', 'writefile', 'mkdir', 'readdir', 'path', 'file operations'],
    title: 'Node.js File System Operations',
    summary: 'Node.js fs module provides synchronous and async file operations: reading, writing, creating directories, listing files, and path manipulation.',
    details: `## Reading Files
\`\`\`javascript
const fs = require('fs');
const path = require('path');

// Async (recommended)
const data = await fs.promises.readFile('file.txt', 'utf-8');

// Sync (blocks event loop)
const data = fs.readFileSync('file.txt', 'utf-8');

// JSON
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
\`\`\`

## Writing Files
\`\`\`javascript
// Create/overwrite
fs.writeFileSync('output.txt', 'Hello World');
await fs.promises.writeFile('data.json', JSON.stringify(obj, null, 2));

// Append
fs.appendFileSync('log.txt', 'New line\\n');
\`\`\`

## Directories
\`\`\`javascript
// Create (recursive)
fs.mkdirSync('path/to/dir', { recursive: true });

// List contents
const items = fs.readdirSync('./src', { withFileTypes: true });
const folders = items.filter(d => d.isDirectory()).map(d => d.name);
const files = items.filter(d => d.isFile()).map(d => d.name);

// Check if exists
if (fs.existsSync('file.txt')) { ... }
\`\`\`

## Path Utilities
\`\`\`javascript
path.join(__dirname, 'data', 'file.txt')  // OS-safe join
path.resolve('./relative/path')            // absolute path
path.basename('/a/b/file.txt')             // 'file.txt'
path.extname('file.txt')                   // '.txt'
path.dirname('/a/b/file.txt')              // '/a/b'
\`\`\`

## Recursive File Scanner
\`\`\`javascript
function scanDir(dir, results = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', '.git', 'dist'].includes(item.name)) {
        scanDir(fullPath, results);
      }
    } else {
      results.push({
        name: item.name,
        path: fullPath,
        size: fs.statSync(fullPath).size,
        extension: path.extname(item.name).slice(1),
      });
    }
  }
  return results;
}
\`\`\``,
    related: ['nodejs', 'express']
  },
  {
    topic: 'common-bugs',
    keywords: ['bug', 'common error', 'cannot read property', 'undefined', 'null', 'cors error', 'eaddrinuse', 'module not found', 'troubleshoot', 'debug'],
    title: 'Common Bugs & Fixes',
    summary: 'Quick fixes for the most common JavaScript, Node.js, and Angular errors developers encounter.',
    details: `## Cannot read properties of undefined/null
**Cause:** Accessing a property on something that doesn't exist yet
\`\`\`javascript
// Bug
const name = user.profile.name;  // user or profile is undefined

// Fix: optional chaining
const name = user?.profile?.name ?? 'Unknown';
\`\`\`

## CORS Error
**Cause:** Backend doesn't allow requests from frontend origin
\`\`\`javascript
// Fix: Add cors middleware
const cors = require('cors');
app.use(cors());  // Allow all origins

// Or specific origin
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
\`\`\`

## EADDRINUSE (Port in use)
**Cause:** Another process is already using the port
\`\`\`bash
# Find what's using the port
netstat -ano | findstr :4100        # Windows
lsof -i :4100                       # Mac/Linux

# Kill it
taskkill /F /PID <pid>              # Windows
kill -9 <pid>                        # Mac/Linux
\`\`\`

## Module Not Found
\`\`\`bash
# Fix: Install the missing package
npm install <package-name>

# If it's a local file import error, check the path
# Wrong: import { X } from './services/auth'
# Right: import { X } from './services/auth.service'
\`\`\`

## MongoDB Connection Failed
\`\`\`javascript
// Fix DNS issues with MongoDB Atlas
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);  // Use Google DNS

mongoose.connect(uri, { family: 4 });     // Force IPv4
\`\`\`

## Angular: ExpressionChangedAfterItHasBeenChecked
**Cause:** Value changed during change detection
\`\`\`typescript
// Fix: Use signals instead of mutable properties
count = signal(0);  // Instead of: count = 0;
\`\`\`

## Async/Await Not Working
\`\`\`javascript
// Bug: forgetting await
const data = fetch('/api/data');  // Returns Promise, not data!

// Fix
const response = await fetch('/api/data');
const data = await response.json();
\`\`\``,
    related: ['javascript', 'nodejs', 'express', 'angular']
  },
];

const QA_TESTING: KnowledgeEntry[] = [
  {
    topic: 'api-testing',
    keywords: ['api test', 'postman', 'supertest', 'api testing', 'endpoint test', 'integration test api', 'rest test'],
    title: 'API Testing Patterns',
    summary: 'API testing verifies endpoints work correctly. Covers testing with supertest, common test cases for CRUD operations, authentication, validation, and error scenarios.',
    details: `## Supertest (Node.js)
\`\`\`javascript
const request = require('supertest');
const app = require('../server');

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('OTP sent');
    expect(res.body.requiresVerification).toBe(true);
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'existing@test.com', password: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already registered');
  });

  it('should reject short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'new@test.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('6 characters');
  });

  it('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
  });
});
\`\`\`

## Auth Endpoint Test Cases
| Test | Method | Expected |
|------|--------|----------|
| Register with valid data | POST /register | 200 + OTP sent |
| Register duplicate email | POST /register | 400 + error |
| Register missing fields | POST /register | 400 + error |
| Login valid credentials | POST /login | 200 + token |
| Login wrong password | POST /login | 400 + error |
| Login unverified email | POST /login | 403 + requiresVerification |
| Verify correct OTP | POST /verify-otp | 200 + token |
| Verify wrong OTP | POST /verify-otp | 400 + error |
| Verify expired OTP | POST /verify-otp | 400 + expired |
| Access protected route with token | GET /me | 200 + user |
| Access protected route without token | GET /me | 401 |

## CRUD Test Template
\`\`\`javascript
describe('GET /api/items', () => {
  it('returns all items', async () => {
    const res = await request(app).get('/api/items');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/items', () => {
  it('creates item with valid data', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', \\\`Bearer \${token}\\\`)
      .send({ name: 'Test Item' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Item');
  });
});
\`\`\``,
    related: ['testing', 'express', 'api']
  },
  {
    topic: 'angular-testing',
    keywords: ['angular test', 'testbed', 'component test', 'service test', 'jasmine', 'karma', 'angular unit test', 'fixture'],
    title: 'Angular Component & Service Testing',
    summary: 'Angular testing uses TestBed to configure a testing module, ComponentFixture to interact with components, and jasmine spies/mocks for service dependencies.',
    details: `## Component Test
\`\`\`typescript
describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['login', 'isLoggedIn']);
    authService.isLoggedIn.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show login form', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('input[type="email"]')).toBeTruthy();
    expect(el.querySelector('button')).toBeTruthy();
  });

  it('should call login on submit', async () => {
    authService.login.and.returnValue(Promise.resolve({ token: 'abc' }));
    component.email = 'test@test.com';
    component.password = '123456';
    await component.login();
    expect(authService.login).toHaveBeenCalledWith('test@test.com', '123456');
  });

  it('should show error on failed login', async () => {
    authService.login.and.returnValue(
      Promise.resolve({ error: 'Invalid password' })
    );
    component.email = 'test@test.com';
    component.password = 'wrong';
    await component.login();
    expect(component.error).toBe('Invalid password');
  });
});
\`\`\`

## Service Test
\`\`\`typescript
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  it('should start logged out', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('should store token after login', async () => {
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response(JSON.stringify({
        token: 'jwt-token', user: { name: 'Test', email: 'test@test.com' }
      })))
    );
    await service.login('test@test.com', '123456');
    expect(service.isLoggedIn()).toBeTrue();
    expect(localStorage.getItem('ai_token')).toBe('jwt-token');
  });

  it('should clear data on logout', () => {
    localStorage.setItem('ai_token', 'test');
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('ai_token')).toBeNull();
  });
});
\`\`\``,
    related: ['testing', 'angular', 'angular-services']
  },
];

// ===== COMPILE ALL CATEGORIES =====

export const KNOWLEDGE_BASE: KnowledgeCategory[] = [
  { name: 'JavaScript', entries: JAVASCRIPT },
  { name: 'TypeScript', entries: TYPESCRIPT },
  { name: 'Angular', entries: ANGULAR },
  { name: 'React', entries: REACT },
  { name: 'Node.js & Express', entries: NODEJS },
  { name: 'Databases', entries: DATABASE },
  { name: 'Web Fundamentals', entries: WEB_FUNDAMENTALS },
  { name: 'Python', entries: PYTHON },
  { name: 'Tools & Workflow', entries: TOOLS },
  { name: 'DevOps', entries: DEVOPS },
  { name: 'Design Patterns', entries: DESIGN_PATTERNS },
  { name: 'Security', entries: SECURITY },
  { name: 'Real-World Backend', entries: REAL_WORLD_BACKEND },
  { name: 'QA & Testing', entries: QA_TESTING },
];

// Flat list for quick search
export const ALL_ENTRIES: KnowledgeEntry[] = KNOWLEDGE_BASE.flatMap(c => c.entries);

// ===== SPECIFIC ANSWERS (direct Q&A, not article dumps) =====

interface DirectAnswer {
  patterns: RegExp[];
  answer: string;
  topic?: string;
}

const DIRECT_ANSWERS: DirectAnswer[] = [
  // Angular version
  {
    patterns: [/angular.*(version|ver)\b/, /version.*angular/, /ng version/, /check.*angular.*version/, /know.*angular.*version/, /get.*angular.*version/],
    answer: `To check the Angular version, run this command in terminal:\n\n\`\`\`bash\nng version\n\`\`\`\n\nOr check your \`package.json\`:\n\`\`\`bash\ncat package.json | grep @angular/core\n\`\`\`\n\nThis shows:\n- **Angular CLI** version\n- **Angular Core** version\n- **Node.js** version\n- **TypeScript** version\n- **Package manager** version`,
    topic: 'angular'
  },
  // Node version
  {
    patterns: [/node.*(version|ver)\b/, /version.*node/, /check.*node.*version/],
    answer: `To check the Node.js version:\n\n\`\`\`bash\nnode --version\n# or\nnode -v\n\`\`\`\n\nTo check npm version:\n\`\`\`bash\nnpm --version\n\`\`\``,
    topic: 'nodejs'
  },
  // Install Angular
  {
    patterns: [/install.*angular/, /angular.*install/, /setup.*angular/, /angular.*setup/],
    answer: `To install Angular CLI globally:\n\n\`\`\`bash\nnpm install -g @angular/cli\n\`\`\`\n\nTo create a new Angular project:\n\`\`\`bash\nng new my-app\ncd my-app\nng serve\n\`\`\`\n\nYour app runs at **http://localhost:4200**`,
    topic: 'angular'
  },
  // Create component
  {
    patterns: [/create.*component/, /generate.*component/, /ng g.*component/, /new.*component/],
    answer: `To create an Angular component:\n\n\`\`\`bash\nng generate component my-component\n# shorthand:\nng g c my-component\n\`\`\`\n\nThis creates:\n- \`my-component.component.ts\` — logic\n- \`my-component.component.html\` — template\n- \`my-component.component.css\` — styles\n- \`my-component.component.spec.ts\` — tests\n\nFor a standalone component (Angular 17+):\n\`\`\`bash\nng g c my-component --standalone\n\`\`\``,
    topic: 'angular-components'
  },
  // Create service
  {
    patterns: [/create.*service/, /generate.*service/, /ng g.*service/, /new.*service/],
    answer: `To create an Angular service:\n\n\`\`\`bash\nng generate service my-service\n# shorthand:\nng g s my-service\n\`\`\`\n\nThis creates a service with \`@Injectable({ providedIn: 'root' })\` making it available app-wide.\n\n\`\`\`typescript\n@Injectable({ providedIn: 'root' })\nexport class MyService {\n  private http = inject(HttpClient);\n\n  getData(): Observable<any> {\n    return this.http.get('/api/data');\n  }\n}\n\`\`\``,
    topic: 'angular-services'
  },
  // npm install
  {
    patterns: [/npm install/, /npm i\b/, /install.*package/, /add.*dependency/],
    answer: `**npm install commands:**\n\n\`\`\`bash\nnpm install package-name        # add to dependencies\nnpm install -D package-name     # add to devDependencies\nnpm install -g package-name     # install globally\nnpm install                     # install all from package.json\nnpm ci                          # clean install (CI/CD)\nnpm uninstall package-name      # remove package\n\`\`\``,
    topic: 'nodejs'
  },
  // Git commands
  {
    patterns: [/git.*commit/, /how.*commit/],
    answer: `**Git commit workflow:**\n\n\`\`\`bash\ngit add .                     # stage all changes\ngit add file.ts               # stage specific file\ngit status                    # verify staged files\ngit commit -m "your message"  # commit with message\ngit push origin main          # push to remote\n\`\`\`\n\nGood commit messages:\n- \`fix: resolve login redirect bug\`\n- \`feat: add user profile page\`\n- \`docs: update API documentation\``,
    topic: 'git'
  },
  // Run Angular
  {
    patterns: [/run.*angular/, /start.*angular/, /ng serve/, /angular.*start/, /angular.*run/],
    answer: `To run an Angular project:\n\n\`\`\`bash\ncd your-project\nnpm install       # install dependencies (first time)\nng serve          # start dev server\n\`\`\`\n\nApp runs at **http://localhost:4200** by default.\n\nUseful flags:\n\`\`\`bash\nng serve --port 4500          # custom port\nng serve --open               # auto-open browser\nng serve --configuration=production  # production mode\n\`\`\``,
    topic: 'angular'
  },
  // Email / OTP
  {
    patterns: [/send.*email/, /email.*node/, /nodemailer.*setup/, /how.*send.*mail/],
    answer: `To send emails from Node.js:\n\n\`\`\`bash\nnpm install nodemailer\n\`\`\`\n\n\`\`\`javascript\nconst nodemailer = require('nodemailer');\nconst transporter = nodemailer.createTransport({\n  service: 'gmail',\n  auth: { user: 'you@gmail.com', pass: 'your-app-password' },\n});\n\nawait transporter.sendMail({\n  from: '"App" <you@gmail.com>',\n  to: 'user@example.com',\n  subject: 'Hello',\n  html: '<h1>Hi there!</h1>',\n});\n\`\`\`\n\n**Important:** Use a Google App Password, not your login password. Enable 2FA first at myaccount.google.com.`,
    topic: 'nodemailer'
  },
  {
    patterns: [/otp.*implement/, /email.*verif/, /verif.*email/, /how.*otp/, /implement.*otp/],
    answer: `**OTP Email Verification:**\n\n1. On register: generate 6-digit code, save to DB with expiry, email to user\n2. User enters code\n3. Compare with DB, check expiry, mark verified\n\n\`\`\`javascript\n// Generate\nconst otp = Math.floor(100000 + Math.random() * 900000).toString();\nuser.otp = otp;\nuser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);\nawait user.save();\nawait sendEmail(email, otp);\n\n// Verify\nif (user.otp !== submittedOtp) return res.status(400).json({ error: 'Invalid OTP' });\nif (user.otpExpiresAt < new Date()) return res.status(400).json({ error: 'Expired' });\nuser.verified = true; user.otp = null; await user.save();\n\`\`\``,
    topic: 'otp-verification'
  },
  // Common bugs
  {
    patterns: [/cors.*error/, /cors.*block/, /access.control.allow/],
    answer: `**Fix CORS Error:**\n\n\`\`\`bash\nnpm install cors\n\`\`\`\n\n\`\`\`javascript\nconst cors = require('cors');\napp.use(cors());  // Allow all origins\n\n// Or restrict to your frontend:\napp.use(cors({ origin: 'http://localhost:4200', credentials: true }));\n\`\`\`\n\nCORS errors happen when your frontend (e.g. localhost:4200) makes requests to a different backend (e.g. localhost:4100). The backend must explicitly allow it.`,
    topic: 'common-bugs'
  },
  {
    patterns: [/eaddrinuse/, /port.*in.*use/, /address.*already/, /kill.*port/],
    answer: `**Fix EADDRINUSE (port already in use):**\n\n**Windows:**\n\`\`\`bash\nnetstat -ano | findstr :4100\ntaskkill /F /PID <pid_number>\n\`\`\`\n\n**Mac/Linux:**\n\`\`\`bash\nlsof -i :4100\nkill -9 <pid>\n\`\`\`\n\n**Or change the port:**\n\`\`\`javascript\napp.listen(4101);  // Use a different port\n\`\`\``,
    topic: 'common-bugs'
  },
  {
    patterns: [/cannot read.*propert/, /undefined.*error/, /null.*error/, /typeerror/],
    answer: `**Fix "Cannot read properties of undefined/null":**\n\nThis means you're accessing a property on something that doesn't exist.\n\n\`\`\`javascript\n// Bug:\nconst name = user.profile.name; // user or profile is undefined\n\n// Fix 1: Optional chaining\nconst name = user?.profile?.name ?? 'Unknown';\n\n// Fix 2: Check before accessing\nif (user && user.profile) {\n  const name = user.profile.name;\n}\n\n// Fix 3: Default value\nconst name = (user || {}).name || 'Unknown';\n\`\`\`\n\n**Common causes:**\n- API response hasn't arrived yet (async timing)\n- Array is empty and you access [0]\n- Object key is misspelled\n- Variable not initialized`,
    topic: 'common-bugs'
  },
  {
    patterns: [/mongodb.*connect.*fail/, /mongoose.*connect.*error/, /srv.*refused/, /mongo.*dns/],
    answer: `**Fix MongoDB Connection Error:**\n\n\`\`\`javascript\nconst dns = require('dns');\ndns.setServers(['8.8.8.8', '8.8.4.4']); // Fix DNS resolution\n\nmongoose.connect(uri, {\n  family: 4,                    // Force IPv4\n  serverSelectionTimeoutMS: 15000,\n});\n\`\`\`\n\n**Common fixes:**\n1. **DNS SRV error** — Add \`dns.setServers(['8.8.8.8'])\` before connecting\n2. **Network access** — Whitelist your IP in MongoDB Atlas (Network Access > Add IP)\n3. **Wrong password** — Check the connection string password is URL-encoded\n4. **Firewall** — Some networks block MongoDB ports. Try a different network.`,
    topic: 'common-bugs'
  },
];

// ===== STOP WORDS (ignored during matching) =====

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'between',
  'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
  'out', 'off', 'over', 'under', 'again', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'it', 'its', 'i', 'me',
  'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'this',
  'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'and', 'but',
  'or', 'if', 'while', 'because', 'until', 'although', 'since', 'unless',
  'get', 'got', 'give', 'given', 'make', 'made', 'take', 'tell', 'know',
  'known', 'want', 'need', 'use', 'used', 'try', 'let', 'please',
]);

// ===== SEARCH ENGINE (strict matching) =====

const MIN_SCORE_THRESHOLD = 30;

/**
 * Extract meaningful words from a query (strip stop words + noise).
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[?!.,;:'"(){}[\]]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Check if word A is a meaningful match for word B.
 * Must be an EXACT word match, not substring.
 */
function isWordMatch(queryWord: string, target: string): boolean {
  // Exact match
  if (queryWord === target) return true;
  // Target is multi-word keyword — check if query word is a full word in it
  const targetWords = target.split(/[\s\-_/]+/);
  return targetWords.includes(queryWord);
}

/**
 * Score how well a query matches a knowledge entry.
 * Uses strict word matching — no partial substring matches.
 */
function scoreEntry(query: string, entry: KnowledgeEntry): number {
  const q = query.toLowerCase().trim().replace(/[?!.]/g, '');
  const queryWords = extractKeywords(q);

  // If no meaningful words after stripping, score is 0
  if (queryWords.length === 0) return 0;

  let score = 0;

  // 1. Check if the full cleaned query matches a keyword exactly
  for (const kw of entry.keywords) {
    if (q === kw || q === kw.replace(/\s+/g, ' ')) return 1000;
  }

  // 2. Check full query against topic/title
  if (q === entry.topic) return 900;
  if (q === entry.title.toLowerCase()) return 900;

  // 3. Word-level matching against keywords (strict)
  for (const word of queryWords) {
    let wordMatched = false;
    for (const kw of entry.keywords) {
      if (isWordMatch(word, kw)) {
        score += 25;
        wordMatched = true;
        break;
      }
    }
    if (!wordMatched) {
      // Check topic
      if (isWordMatch(word, entry.topic) || entry.topic.split('-').includes(word)) {
        score += 20;
      }
      // Check title words
      else if (entry.title.toLowerCase().split(/\s+/).some(tw => tw === word)) {
        score += 15;
      }
    }
  }

  // 4. Bonus: if ALL query keywords matched something, boost score
  const matchedCount = queryWords.filter(word => {
    return entry.keywords.some(kw => isWordMatch(word, kw)) ||
           isWordMatch(word, entry.topic) ||
           entry.topic.split('-').includes(word) ||
           entry.title.toLowerCase().split(/\s+/).some(tw => tw === word);
  }).length;

  if (matchedCount === queryWords.length && queryWords.length > 0) {
    score += 30; // all words matched = strong signal
  }

  return score;
}

/**
 * Search the knowledge base. Returns only matches above threshold.
 */
export function searchKnowledge(query: string, limit: number = 3): KnowledgeEntry[] {
  const scored = ALL_ENTRIES
    .map(entry => ({ entry, score: scoreEntry(query, entry) }))
    .filter(r => r.score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(r => r.entry);
}

export function findBestMatch(query: string): KnowledgeEntry | null {
  const results = searchKnowledge(query, 1);
  return results[0] || null;
}

// ===== SMART ANSWER FORMATTING =====

/**
 * Extract the most relevant section from details based on the query.
 * Instead of dumping the entire article, find the right part.
 */
function extractRelevantSection(entry: KnowledgeEntry, query: string): string {
  const q = query.toLowerCase();
  const keywords = extractKeywords(q);

  // For broad questions ("what is X"), give summary + first part of details
  if (q.startsWith('what') || q.startsWith('explain') || q.startsWith('tell') || keywords.length <= 2) {
    const detailLines = entry.details.split('\n');
    // Take up to the first 2 sections (up to ~40 lines)
    let lines: string[] = [];
    let sectionCount = 0;
    for (const line of detailLines) {
      if (line.startsWith('##') && lines.length > 0) {
        sectionCount++;
        if (sectionCount >= 2) break;
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  // For specific questions, find the section that matches best
  const sections = entry.details.split(/(?=^##\s)/m);
  let bestSection = '';
  let bestScore = 0;

  for (const section of sections) {
    let sScore = 0;
    const sLower = section.toLowerCase();
    for (const kw of keywords) {
      if (sLower.includes(kw)) sScore += 10;
    }
    if (sScore > bestScore) {
      bestScore = sScore;
      bestSection = section;
    }
  }

  return bestSection || sections[0] || entry.details.slice(0, 800);
}

/**
 * Format a focused answer (not the entire article).
 */
function formatFocusedAnswer(entry: KnowledgeEntry, query: string): string {
  const q = query.toLowerCase();
  const isBroad = q.startsWith('what is') || q.startsWith('what are') ||
                  extractKeywords(q).length <= 2;

  let response = `**${entry.title}**\n\n`;

  if (isBroad) {
    // Broad question: summary + relevant section
    response += entry.summary + '\n\n';
    response += extractRelevantSection(entry, query);
  } else {
    // Specific question: just the relevant section
    const section = extractRelevantSection(entry, query);
    if (section) {
      response += section;
    } else {
      response += entry.summary;
    }
  }

  // Add one example if available
  if (entry.examples && entry.examples.length > 0) {
    response += '\n\n**Example:**\n' + entry.examples[0];
  }

  // Related topics (brief)
  if (entry.related && entry.related.length > 0) {
    const names = entry.related
      .slice(0, 3)
      .map(r => ALL_ENTRIES.find(e => e.topic === r)?.title || r)
      .filter(Boolean);
    response += `\n\n---\n*Related: ${names.join(', ')}*`;
  }

  return response;
}

// ===== MAIN ANSWER FUNCTION =====

/**
 * Answer any question. Handles:
 * - Direct Q&A patterns (exact answers)
 * - Knowledge base lookup (focused sections)
 * - Greetings
 * - Comparisons ("X vs Y")
 * - Honest "I don't know" for off-topic
 */
export function answerQuestion(query: string): string {
  const q = query.toLowerCase().trim();

  // 1. Greetings
  if (/^(hi|hello|hey|good morning|good evening|sup|yo)\b/.test(q)) {
    const topicList = KNOWLEDGE_BASE.map(c =>
      `- **${c.name}** — ${c.entries.map(e => e.title).slice(0, 3).join(', ')}`
    ).join('\n');
    return `Hello! I'm your offline AI assistant. No API key needed.\n\nI can answer questions about:\n${topicList}\n\nTry asking:\n- "What is JavaScript?"\n- "How to check Angular version"\n- "Explain async/await"\n- "TypeScript vs JavaScript"`;
  }

  // 2. Direct answers (exact pattern matches for specific how-to questions)
  for (const da of DIRECT_ANSWERS) {
    for (const pattern of da.patterns) {
      if (pattern.test(q)) {
        return da.answer;
      }
    }
  }

  // 3. Strip question wrapper to get the real topic
  let topic = q
    .replace(/^(what is|what's|what are|what was|explain|describe|tell me about|define|show me|teach me)\s+(a |an |the )?/i, '')
    .replace(/^(how to|how do i|how can i|how do you)\s+/i, '')
    .replace(/^(basics of|basic|fundamentals of|intro to|introduction to)\s+/i, '')
    .replace(/[?!.]+$/g, '')
    .trim();

  // 4. Comparison questions
  if (q.includes(' vs ') || q.includes(' versus ') || q.includes('difference between')) {
    const cleaned = q.replace(/what('s| is| are)? the difference between/g, '').replace(/compare/g, '');
    const parts = cleaned.split(/\s+vs\.?\s+|\s+versus\s+|\s+and\s+|\s+or\s+/);
    if (parts.length >= 2) {
      const a = searchKnowledge(parts[0].trim(), 1);
      const b = searchKnowledge(parts[1].trim(), 1);
      if (a.length > 0 && b.length > 0) {
        return `## ${a[0].title} vs ${b[0].title}\n\n` +
          `### ${a[0].title}\n${a[0].summary}\n\n` +
          `### ${b[0].title}\n${b[0].summary}\n\n` +
          `---\n*Ask about each individually for full details.*`;
      }
    }
  }

  // 5. Search knowledge base with the cleaned topic
  const matches = searchKnowledge(topic, 2);

  // Also try the full original query if topic search found nothing
  if (matches.length === 0) {
    const fullMatches = searchKnowledge(q, 2);
    if (fullMatches.length > 0) {
      return formatFocusedAnswer(fullMatches[0], query);
    }
  }

  if (matches.length > 0) {
    return formatFocusedAnswer(matches[0], query);
  }

  // 6. Honest fallback — don't make up answers
  return `I don't have information about **"${query}"** in my knowledge base.\n\n` +
    `I'm an offline programming assistant. I can help with:\n` +
    `- **JavaScript** — basics, ES6, arrays, async/await, closures\n` +
    `- **TypeScript** — types, interfaces, generics\n` +
    `- **Angular** — components, services, routing, RxJS, signals\n` +
    `- **React** — JSX, hooks, state management\n` +
    `- **Node.js & Express** — server, APIs, middleware\n` +
    `- **Databases** — MongoDB, SQL\n` +
    `- **HTML & CSS** — Flexbox, Grid, responsive design\n` +
    `- **Python** — basics, data structures, file I/O\n` +
    `- **Git** — commits, branches, workflows\n` +
    `- **Testing** — Jest, Playwright, Angular testing\n` +
    `- **Docker** — containers, Dockerfile, compose\n` +
    `- **Security** — JWT, XSS, CORS, OWASP\n\n` +
    `Try: *"What is JavaScript?"*, *"How to check Angular version"*, *"Explain REST API"*`;
}
