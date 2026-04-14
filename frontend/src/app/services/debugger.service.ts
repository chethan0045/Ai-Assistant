import { Injectable } from '@angular/core';

interface ErrorPattern {
  pattern: RegExp;
  title: string;
  explanation: string;
  fix: string;
  codeExample: string;
}

export interface DebugResult {
  errorTitle: string;
  explanation: string;
  fix: string;
  codeExample: string;
  codeAnalysis: string[];
}

@Injectable({ providedIn: 'root' })
export class DebuggerService {

  private errorPatterns: ErrorPattern[] = [
    // ======================== ANGULAR ERRORS ========================
    {
      pattern: /NG0100|ExpressionChangedAfterItHasBeenChecked/i,
      title: 'NG0100: ExpressionChangedAfterItHasBeenCheckedError',
      explanation: 'A binding value changed after change detection already checked it. Angular runs change detection twice in dev mode — if the value differs, this error fires.\n\nCommon causes:\n- Modifying parent data from child\'s ngOnInit/ngAfterViewInit\n- Calling methods in templates that return new values each time\n- Updating shared service state during lifecycle hooks',
      fix: '1. Defer the update with setTimeout() or Promise.resolve().then()\n2. Move the change to the constructor instead of ngAfterViewInit\n3. Call ChangeDetectorRef.detectChanges() after the change\n4. Redesign to avoid mutating parent state from child hooks',
      codeExample: `// PROBLEM:
ngAfterViewInit() {
  this.parentService.title = 'New Title'; // triggers NG0100
}

// FIX 1: setTimeout
ngAfterViewInit() {
  setTimeout(() => this.parentService.title = 'New Title');
}

// FIX 2: ChangeDetectorRef
constructor(private cdr: ChangeDetectorRef) {}
ngAfterViewInit() {
  this.parentService.title = 'New Title';
  this.cdr.detectChanges();
}`
    },
    {
      pattern: /NG0200|Circular dependency/i,
      title: 'NG0200: Circular Dependency in DI',
      explanation: 'Service A depends on Service B, which depends on Service A. Angular cannot resolve this loop.',
      fix: '1. Extract shared logic into a third service\n2. Use forwardRef() if unavoidable\n3. Use event-based communication (Subject) instead of direct injection',
      codeExample: `// FIX: Extract shared logic
@Injectable({ providedIn: 'root' })
export class SharedService { /* shared logic */ }

@Injectable({ providedIn: 'root' })
export class ServiceA {
  constructor(private shared: SharedService) {}
}

@Injectable({ providedIn: 'root' })
export class ServiceB {
  constructor(private shared: SharedService) {}
}`
    },
    {
      pattern: /is not a known element|NG0300|NG0304/i,
      title: 'Unknown Element / Component Not Found',
      explanation: 'Angular can\'t find the component for the selector used in your template. Either it\'s not imported, has a typo, or belongs to a different module.',
      fix: '1. For standalone: add it to the imports array\n2. For modules: declare it or import its module\n3. Check for typos in the selector',
      codeExample: `// FIX (standalone):
@Component({
  standalone: true,
  imports: [CommonModule, MyWidgetComponent],
  template: '<app-my-widget></app-my-widget>'
})
export class ParentComponent {}`
    },
    {
      pattern: /Can't bind to|NG8002|isn't a known property/i,
      title: 'Can\'t Bind to Property',
      explanation: 'The property binding is not recognized. Usually means a required module is missing.\n\n- [(ngModel)] needs FormsModule\n- [formControl] needs ReactiveFormsModule\n- [routerLink] needs RouterModule',
      fix: 'Import the required module in your standalone component or NgModule.',
      codeExample: `// Can't bind to 'ngModel' — FIX:
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: '<input [(ngModel)]="name" />'
})
export class MyComponent { name = ''; }`
    },
    {
      pattern: /No provider|NullInjectorError|NG0301/i,
      title: 'NullInjectorError: No Provider',
      explanation: 'Angular can\'t find a provider for the requested service. The service isn\'t registered in the DI tree.',
      fix: '1. Add @Injectable({ providedIn: \'root\' }) to the service\n2. Or add to the providers array of the component/module\n3. For HttpClient: add provideHttpClient() in app.config.ts',
      codeExample: `// FIX 1: providedIn root
@Injectable({ providedIn: 'root' })
export class MyService {}

// FIX 2: Component providers
@Component({ providers: [MyService] })
export class MyComponent {
  constructor(private myService: MyService) {}
}`
    },
    {
      pattern: /pipe.*not found|NG0302/i,
      title: 'Pipe Not Found',
      explanation: 'The pipe used in the template isn\'t recognized. Missing import or typo.',
      fix: '1. Import CommonModule for built-in pipes (date, uppercase, async)\n2. For custom pipes: add to the imports array\n3. Check the pipe name for typos',
      codeExample: `@Pipe({ name: 'myCustom', standalone: true })
export class MyCustomPipe implements PipeTransform {
  transform(value: string): string { return value.toUpperCase(); }
}

@Component({
  standalone: true,
  imports: [CommonModule, MyCustomPipe],
  template: '{{ value | myCustom }}'
})
export class MyComponent {}`
    },
    // ======================== JAVASCRIPT / TYPESCRIPT ERRORS ========================
    {
      pattern: /TypeError.*undefined|Cannot read propert|of undefined|of null/i,
      title: 'TypeError: Cannot Read Property of Undefined/Null',
      explanation: 'You\'re trying to access a property on a value that is undefined or null. This is the most common JavaScript error.\n\nCommon causes:\n- Accessing nested object properties without null checks\n- Using array methods on undefined\n- Async data not yet loaded\n- Typo in variable/property name',
      fix: '1. Use optional chaining (?.) to safely access nested properties\n2. Add null/undefined checks before accessing\n3. Provide default values with nullish coalescing (??)\n4. Check async data is loaded before using it',
      codeExample: `// PROBLEM:
const name = user.profile.name; // user or profile could be undefined

// FIX 1: Optional chaining + nullish coalescing
const name = user?.profile?.name ?? 'Unknown';

// FIX 2: Check before accessing
if (user && user.profile) {
  const name = user.profile.name;
}

// FIX 3: Default parameter
function getUser(user = {}) {
  const name = user.name || 'Anonymous';
}`
    },
    {
      pattern: /ReferenceError|is not defined/i,
      title: 'ReferenceError: Variable Not Defined',
      explanation: 'A variable or function is used before being declared. Common causes:\n- Typo in variable name\n- Variable is out of scope\n- Missing import statement\n- Using let/const before declaration (temporal dead zone)',
      fix: '1. Check spelling of variable name\n2. Ensure the variable is in scope\n3. Add the missing import\n4. Move declaration before usage',
      codeExample: `// PROBLEM:
console.log(myVar); // ReferenceError
const myVar = 'hello';

// FIX: Declare before use
const myVar = 'hello';
console.log(myVar);

// PROBLEM: Missing import
const result = lodash.map(arr, fn); // lodash not defined

// FIX:
const lodash = require('lodash');
// or: import _ from 'lodash';`
    },
    {
      pattern: /SyntaxError|Unexpected token|Unexpected end/i,
      title: 'SyntaxError: Unexpected Token',
      explanation: 'The JavaScript parser found something unexpected. Common causes:\n- Missing closing bracket, parenthesis, or quote\n- Comma after last item in JSON\n- Using ES6+ syntax in environment that doesn\'t support it\n- Invalid JSON format',
      fix: '1. Check for matching brackets: { }, [ ], ( )\n2. Check for missing/extra commas\n3. Validate JSON with a JSON validator\n4. Check for unclosed strings (quotes)',
      codeExample: `// PROBLEM: Missing closing bracket
const obj = {
  name: 'Alice',
  age: 25
// }  <-- missing!

// PROBLEM: Trailing comma in JSON
{
  "name": "Alice",
  "age": 25,  // <-- trailing comma not allowed in JSON!
}

// FIX: Valid JSON
{
  "name": "Alice",
  "age": 25
}`
    },
    {
      pattern: /TypeError.*is not a function/i,
      title: 'TypeError: X is Not a Function',
      explanation: 'You\'re trying to call something as a function, but it\'s not one. Common causes:\n- Typo in method name\n- Calling a property instead of a method\n- Module not exported correctly\n- Overwriting a function with a non-function value',
      fix: '1. Check the method name for typos\n2. Verify the value is actually a function (typeof x === "function")\n3. Check the module exports\n4. Check if the variable was reassigned',
      codeExample: `// PROBLEM: Typo
arr.forEeach(item => console.log(item)); // forEeach vs forEach

// FIX:
arr.forEach(item => console.log(item));

// PROBLEM: Wrong export
// module.exports = { myFunc }  but importing wrong:
const myFunc = require('./utils'); // myFunc is an object!
myFunc(); // Error!

// FIX:
const { myFunc } = require('./utils');
myFunc(); // Works!`
    },
    {
      pattern: /RangeError|Maximum call stack|stack overflow/i,
      title: 'RangeError: Maximum Call Stack Size Exceeded',
      explanation: 'Infinite recursion — a function keeps calling itself without ever stopping. The call stack runs out of space.',
      fix: '1. Add a proper base case to your recursive function\n2. Check for infinite loops in event handlers or watchers\n3. Use iteration instead of recursion for large datasets\n4. Check for circular references',
      codeExample: `// PROBLEM: No base case
function factorial(n) {
  return n * factorial(n - 1); // never stops!
}

// FIX: Add base case
function factorial(n) {
  if (n <= 1) return 1; // base case
  return n * factorial(n - 1);
}

// PROBLEM: Circular component updates
// setter triggers change -> triggers setter -> ...
// FIX: Add a guard condition`
    },
    // ======================== NODE.JS / EXPRESS ERRORS ========================
    {
      pattern: /ECONNREFUSED|ECONNRESET|ETIMEDOUT/i,
      title: 'Network Connection Error (ECONNREFUSED / ECONNRESET)',
      explanation: 'The server you\'re trying to connect to refused the connection or timed out.\n\n- ECONNREFUSED: Target server is not running\n- ECONNRESET: Connection was forcibly closed\n- ETIMEDOUT: Connection took too long',
      fix: '1. Check if the target server/database is running\n2. Verify the host and port are correct\n3. Check firewall rules\n4. For MongoDB: ensure mongod is running',
      codeExample: `// PROBLEM: MongoDB not running
// MongoServerError: connect ECONNREFUSED 127.0.0.1:27017

// FIX 1: Start MongoDB
// mongod --dbpath /data/db

// FIX 2: Add connection retry logic
const connectWithRetry = async () => {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      console.log(\`Retry \${i + 1}/\${maxRetries}...\`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  process.exit(1);
};`
    },
    {
      pattern: /CORS|Access-Control|cross.origin|blocked by CORS/i,
      title: 'CORS Error (Cross-Origin Request Blocked)',
      explanation: 'The browser blocks requests to a different origin (different domain/port) because the server doesn\'t include CORS headers.',
      fix: '1. Add CORS middleware to your backend\n2. Use Angular proxy for development\n3. Never just disable CORS — configure it properly',
      codeExample: `// FIX (Express):
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:4200' }));

// FIX (Angular proxy): Create proxy.conf.json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
// Then: ng serve --proxy-config proxy.conf.json`
    },
    {
      pattern: /EADDRINUSE|address already in use/i,
      title: 'EADDRINUSE: Port Already in Use',
      explanation: 'Another process is already using the port your server is trying to listen on.',
      fix: '1. Use a different port\n2. Kill the process using the port\n3. Check for zombie Node processes',
      codeExample: `// Find what's using the port:
// Windows: netstat -ano | findstr :3000
// Linux/Mac: lsof -i :3000

// Kill it:
// Windows: taskkill /PID <pid> /F
// Linux/Mac: kill -9 <pid>

// Or use a different port:
const PORT = process.env.PORT || 3001;
app.listen(PORT);`
    },
    {
      pattern: /MODULE_NOT_FOUND|Cannot find module/i,
      title: 'MODULE_NOT_FOUND: Cannot Find Module',
      explanation: 'Node.js can\'t find the module you\'re trying to require/import.\n\nCommon causes:\n- Package not installed (missing npm install)\n- Wrong file path\n- Typo in module name\n- Missing file extension',
      fix: '1. Run npm install to install dependencies\n2. Check the import path is correct\n3. Check for typos in the module name\n4. For local files: verify the path and extension',
      codeExample: `// PROBLEM:
const express = require('express'); // not installed

// FIX: Install the package
// npm install express

// PROBLEM: Wrong path
const utils = require('./util'); // file is utils.js

// FIX: Correct path
const utils = require('./utils');`
    },
    // ======================== MONGODB / MONGOOSE ERRORS ========================
    {
      pattern: /MongoServerError|E11000|duplicate key/i,
      title: 'MongoDB: Duplicate Key Error (E11000)',
      explanation: 'You\'re trying to insert a document with a value that already exists in a unique index (like email).',
      fix: '1. Check for existing document before inserting\n2. Use findOneAndUpdate with upsert option\n3. Handle the error gracefully in your code',
      codeExample: `// PROBLEM:
await User.create({ email: 'alice@example.com' }); // already exists!

// FIX 1: Check first
const existing = await User.findOne({ email });
if (existing) return res.status(400).json({ error: 'Email already exists' });
await User.create({ email, name, password });

// FIX 2: Handle in catch
try {
  await User.create(data);
} catch (err) {
  if (err.code === 11000) {
    return res.status(400).json({ error: 'Duplicate entry' });
  }
  throw err;
}`
    },
    {
      pattern: /ValidationError|validator|required.*path|Cast to.*failed/i,
      title: 'Mongoose: Validation Error',
      explanation: 'The data you\'re trying to save doesn\'t match the schema requirements. A required field is missing, a value has the wrong type, or a custom validator failed.',
      fix: '1. Check all required fields are provided\n2. Ensure data types match the schema\n3. Validate data before sending to the database\n4. Check custom validators in the schema',
      codeExample: `// Schema:
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2 },
  email: { type: String, required: true },
  age: { type: Number, min: 0 }
});

// PROBLEM: Missing required field
await User.create({ name: 'A' }); // name too short, email missing

// FIX: Validate before saving
const { name, email, age } = req.body;
if (!name || name.length < 2) return res.status(400).json({ error: 'Name min 2 chars' });
if (!email) return res.status(400).json({ error: 'Email required' });`
    },
    {
      pattern: /CastError|Cast to ObjectId failed/i,
      title: 'Mongoose: CastError (Invalid ObjectId)',
      explanation: 'An invalid value was passed where a MongoDB ObjectId was expected. Usually happens with URL params like /api/users/:id where :id is not a valid 24-character hex string.',
      fix: '1. Validate the ID before using it\n2. Use mongoose.isValidObjectId() to check\n3. Add error handling middleware',
      codeExample: `// PROBLEM:
// GET /api/users/abc  ->  CastError

// FIX: Validate before query
const mongoose = require('mongoose');

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});`
    },
    // ======================== PROMISE / ASYNC ERRORS ========================
    {
      pattern: /UnhandledPromiseRejection|unhandled promise|async.*await/i,
      title: 'Unhandled Promise Rejection',
      explanation: 'A Promise was rejected but there\'s no .catch() or try/catch to handle the error. In Node.js, unhandled rejections can crash the process.',
      fix: '1. Always use try/catch with async/await\n2. Always add .catch() to Promise chains\n3. Add a global handler for safety',
      codeExample: `// PROBLEM:
app.get('/users', async (req, res) => {
  const users = await User.find(); // if this throws, unhandled!
  res.json(users);
});

// FIX 1: try/catch
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FIX 2: Wrapper function
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));`
    },
    // ======================== JSON ERRORS ========================
    {
      pattern: /JSON\.parse|Unexpected token.*JSON|JSON.*position/i,
      title: 'JSON Parse Error',
      explanation: 'Invalid JSON format. The string you\'re trying to parse is not valid JSON.\n\nCommon causes:\n- Single quotes instead of double quotes\n- Trailing comma\n- Unquoted keys\n- Comments in JSON\n- Undefined/NaN values',
      fix: '1. Use double quotes for strings and keys\n2. Remove trailing commas\n3. Remove comments\n4. Validate with JSONLint\n5. Use try/catch around JSON.parse()',
      codeExample: `// INVALID JSON:
{
  name: "Alice",       // keys must be quoted
  'age': 25,           // must use double quotes
  "hobbies": ["a",],   // trailing comma
  // comment            // no comments in JSON
}

// VALID JSON:
{
  "name": "Alice",
  "age": 25,
  "hobbies": ["a"]
}

// Always wrap in try/catch:
try {
  const data = JSON.parse(jsonString);
} catch (err) {
  console.error('Invalid JSON:', err.message);
}`
    },
    // ======================== RxJS ERRORS ========================
    {
      pattern: /subscribe|Observable|BehaviorSubject|async.*pipe|rxjs/i,
      title: 'RxJS / Observable Error',
      explanation: 'Issues with Observable usage in Angular. Common problems:\n- Forgetting to subscribe (Observables are lazy)\n- Memory leaks from not unsubscribing\n- Wrong operator usage',
      fix: '1. Use async pipe in templates (auto-manages subscription)\n2. Use takeUntilDestroyed() for manual subscriptions\n3. Use catchError for error handling',
      codeExample: `// BEST: async pipe
@Component({
  template: '<div *ngFor="let item of items$ | async">{{ item.name }}</div>'
})
export class MyComponent {
  items$ = this.http.get<Item[]>('/api/items');
}

// Manual subscription with cleanup:
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.myService.getData()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(data => this.data = data);
}`
    },
    // ======================== TypeScript ERRORS ========================
    {
      pattern: /TS\d{4}|Type.*not assignable|Property.*does not exist on type/i,
      title: 'TypeScript Compilation Error',
      explanation: 'TypeScript found a type mismatch in your code. The value you\'re assigning doesn\'t match the expected type.',
      fix: '1. Check the expected type and match it\n2. Use proper type assertions if you\'re sure\n3. Add the missing property to the interface\n4. Use union types if multiple types are valid',
      codeExample: `// PROBLEM: Type 'string' is not assignable to type 'number'
let count: number = "5"; // Error!

// FIX:
let count: number = 5;
// or: let count: number = parseInt("5", 10);

// PROBLEM: Property 'x' does not exist on type 'Y'
interface User { name: string; }
const user: User = { name: 'Alice' };
console.log(user.email); // Error!

// FIX: Add to interface
interface User { name: string; email?: string; }`
    }
  ];

  debug(error: string, code: string): DebugResult {
    const combined = `${error} ${code}`;
    const matched = this.errorPatterns.find(p => p.pattern.test(combined));
    const codeAnalysis = this.analyzeCode(code);

    if (matched) {
      return {
        errorTitle: matched.title,
        explanation: matched.explanation,
        fix: matched.fix,
        codeExample: matched.codeExample,
        codeAnalysis
      };
    }

    return {
      errorTitle: 'Error Analysis',
      explanation: this.genericExplanation(error),
      fix: this.genericFix(error, code),
      codeExample: '',
      codeAnalysis
    };
  }

  private analyzeCode(code: string): string[] {
    if (!code.trim()) return [];
    const issues: string[] = [];

    if (code.includes('.subscribe(') && !code.includes('unsubscribe') && !code.includes('takeUntil') && !code.includes('async'))
      issues.push('Possible memory leak: subscription without cleanup.');
    if (code.includes('any'))
      issues.push('Avoid "any" type — use proper TypeScript types.');
    if (code.includes('document.getElementById') || code.includes('document.querySelector'))
      issues.push('Direct DOM manipulation detected — use framework methods instead.');
    if (code.includes('console.log'))
      issues.push('console.log found — remove before production.');
    if (code.includes('*ngFor') && !code.includes('trackBy'))
      issues.push('*ngFor without trackBy — add trackBy for performance.');
    if (code.includes('var '))
      issues.push('"var" detected — use "const" or "let" instead (block scoping).');
    if (code.includes('== ') && !code.includes('==='))
      issues.push('Loose equality (==) — use strict equality (===) to avoid type coercion.');
    if (code.includes('eval('))
      issues.push('eval() is dangerous — avoid it. Use safer alternatives.');
    if (code.includes('res.send') && !code.includes('return') && code.includes('if'))
      issues.push('Possible issue: sending response without return — may send headers twice.');
    if (/callback.*callback|cb.*cb/i.test(code) && code.includes('function'))
      issues.push('Nested callbacks detected — consider using async/await or Promises.');
    if (code.includes('new Promise') && code.includes('async'))
      issues.push('Unnecessary Promise wrapper inside async function — just use await.');

    return issues;
  }

  private genericExplanation(error: string): string {
    if (error.includes('TypeError')) return 'A TypeError means a value is not the expected type. Check for null/undefined access.';
    if (error.includes('ReferenceError')) return 'A variable or function is used before declaration. Check imports and spelling.';
    if (error.includes('SyntaxError')) return 'Invalid syntax — check for missing brackets, quotes, or commas.';
    return `Error: "${error.substring(0, 150)}"\n\nCheck:\n1. Are imports correct?\n2. Are types correct?\n3. Is the syntax valid?\n4. Are all dependencies installed?`;
  }

  private genericFix(error: string, code: string): string {
    const fixes = ['Based on the error, try:'];
    if (error.includes('null') || error.includes('undefined'))
      fixes.push('- Add null checks or use optional chaining (?.)');
    if (error.includes('import') || error.includes('module') || error.includes('require'))
      fixes.push('- Run npm install and verify import paths');
    if (code.includes('@Component'))
      fixes.push('- Check all imports in the component');
    if (code.includes('require(') || code.includes('express'))
      fixes.push('- Check that all packages are installed (npm install)');
    fixes.push('- Check the full stack trace for the exact file and line number');
    return fixes.join('\n');
  }
}
