import { Injectable } from '@angular/core';

export interface Improvement {
  category: string;
  issue: string;
  suggestion: string;
  before: string;
  after: string;
}

export interface ImproveResult {
  improvements: Improvement[];
  improvedCode: string;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class ImproverService {

  improve(code: string): ImproveResult {
    const improvements: Improvement[] = [];
    const checks = this.getAllChecks();

    for (const check of checks) {
      if (check.test(code)) {
        const result = check.getImprovement(code);
        if (result && !improvements.some(i => i.issue === result.issue)) {
          improvements.push(result);
        }
      }
    }

    const score = this.calculateScore(code, improvements);
    const improvedCode = this.applyFixes(code);

    return { improvements, improvedCode, score };
  }

  private getAllChecks() {
    return [
      // ========== JAVASCRIPT / TYPESCRIPT ==========
      {
        test: (c: string) => c.includes('var '),
        getImprovement: (): Improvement => ({
          category: 'Modern JS',
          issue: '"var" is function-scoped and can cause bugs. Use block-scoped alternatives.',
          suggestion: 'Replace "var" with "const" (if not reassigned) or "let" (if reassigned).',
          before: `var name = 'Alice';\nvar count = 0;\ncount++;`,
          after: `const name = 'Alice';\nlet count = 0;\ncount++;`
        })
      },
      {
        test: (c: string) => /==\s|!=\s/.test(c) && !c.includes('===') && !c.includes('!=='),
        getImprovement: (): Improvement => ({
          category: 'Type Safety',
          issue: 'Loose equality (==) can cause unexpected type coercion.',
          suggestion: 'Use strict equality (=== and !==) to avoid surprises.',
          before: `if (x == 0) { ... }\nif (y != null) { ... }`,
          after: `if (x === 0) { ... }\nif (y !== null) { ... }`
        })
      },
      {
        test: (c: string) => /: any/.test(c),
        getImprovement: (c: string): Improvement => {
          const count = (c.match(/: any/g) || []).length;
          return {
            category: 'Type Safety',
            issue: `Found ${count} usage(s) of "any" type — bypasses TypeScript checking.`,
            suggestion: 'Define proper interfaces or types.',
            before: `data: any;\nitems: any[] = [];`,
            after: `interface Item { id: number; name: string; }\ndata: Item | null = null;\nitems: Item[] = [];`
          };
        }
      },
      {
        test: (c: string) => c.includes('console.log') || c.includes('console.warn') || c.includes('console.error'),
        getImprovement: (c: string): Improvement => {
          const count = (c.match(/console\.(log|warn|error|debug|info)/g) || []).length;
          return {
            category: 'Production Readiness',
            issue: `Found ${count} console statement(s) — should be removed for production.`,
            suggestion: 'Remove console statements or use a logging service.',
            before: `console.log('data:', data);`,
            after: `// Use a Logger service:\n// this.logger.debug('data:', data);`
          };
        }
      },
      {
        test: (c: string) => c.includes('eval('),
        getImprovement: (): Improvement => ({
          category: 'Security',
          issue: 'eval() executes arbitrary code — major security risk.',
          suggestion: 'Use JSON.parse() for JSON, or Function constructor if absolutely needed.',
          before: `const result = eval(userInput);`,
          after: `// For JSON:\nconst result = JSON.parse(jsonString);\n// For math: use a safe expression parser library`
        })
      },
      {
        test: (c: string) => /function\s+\w+\s*\([^)]*\)\s*\{/.test(c) && !c.includes('=>'),
        getImprovement: (): Improvement | null => null // traditional functions are fine, skip
      },
      {
        test: (c: string) => /callback|cb\)/.test(c) && c.includes('function') && !c.includes('async'),
        getImprovement: (): Improvement => ({
          category: 'Modern JS',
          issue: 'Callback-based code can be hard to read and maintain.',
          suggestion: 'Convert to async/await or Promise-based code.',
          before: `function getData(callback) {\n  fetch(url, function(err, data) {\n    if (err) return callback(err);\n    callback(null, data);\n  });\n}`,
          after: `async function getData() {\n  try {\n    const response = await fetch(url);\n    return await response.json();\n  } catch (err) {\n    throw err;\n  }\n}`
        })
      },
      {
        test: (c: string) => c.includes('.then(') && c.includes('.then(') && (c.match(/\.then\(/g) || []).length > 2,
        getImprovement: (): Improvement => ({
          category: 'Modern JS',
          issue: 'Long Promise chains reduce readability.',
          suggestion: 'Refactor to async/await.',
          before: `fetch(url)\n  .then(res => res.json())\n  .then(data => process(data))\n  .then(result => save(result))\n  .catch(err => handle(err));`,
          after: `async function fetchAndProcess() {\n  try {\n    const res = await fetch(url);\n    const data = await res.json();\n    const result = await process(data);\n    await save(result);\n  } catch (err) {\n    handle(err);\n  }\n}`
        })
      },
      // ========== ANGULAR SPECIFIC ==========
      {
        test: (c: string) => c.includes('.subscribe(') && !c.includes('takeUntil') && !c.includes('takeUntilDestroyed') && !c.includes('| async'),
        getImprovement: (): Improvement => ({
          category: 'Memory Management',
          issue: 'Manual subscription without cleanup can cause memory leaks.',
          suggestion: 'Use async pipe in templates, or takeUntilDestroyed() for manual subscriptions.',
          before: `this.service.getData().subscribe(data => {\n  this.data = data;\n});`,
          after: `// Option 1: async pipe (best)\ndata$ = this.service.getData();\n// template: {{ data$ | async }}\n\n// Option 2: takeUntilDestroyed\nprivate destroyRef = inject(DestroyRef);\nngOnInit() {\n  this.service.getData()\n    .pipe(takeUntilDestroyed(this.destroyRef))\n    .subscribe(data => this.data = data);\n}`
        })
      },
      {
        test: (c: string) => c.includes('*ngFor') && !c.includes('trackBy'),
        getImprovement: (): Improvement => ({
          category: 'Performance',
          issue: '*ngFor without trackBy re-renders the entire list on changes.',
          suggestion: 'Add a trackBy function.',
          before: `<div *ngFor="let item of items">{{ item.name }}</div>`,
          after: `<div *ngFor="let item of items; trackBy: trackById">{{ item.name }}</div>\n\n// In component:\ntrackById(index: number, item: any): number { return item.id; }`
        })
      },
      {
        test: (c: string) => c.includes('@Component') && !c.includes('ChangeDetectionStrategy.OnPush'),
        getImprovement: (): Improvement => ({
          category: 'Performance',
          issue: 'Default change detection checks component on every cycle.',
          suggestion: 'Use OnPush change detection for better performance.',
          before: `@Component({\n  selector: 'app-my',\n  templateUrl: './my.component.html'\n})`,
          after: `@Component({\n  selector: 'app-my',\n  templateUrl: './my.component.html',\n  changeDetection: ChangeDetectionStrategy.OnPush\n})`
        })
      },
      {
        test: (c: string) => c.includes('document.getElementById') || c.includes('document.querySelector'),
        getImprovement: (): Improvement => ({
          category: 'Best Practices',
          issue: 'Direct DOM manipulation bypasses the framework and can cause issues.',
          suggestion: 'Use @ViewChild / Renderer2 in Angular, or refs in other frameworks.',
          before: `const el = document.getElementById('myDiv');\nel.style.color = 'red';`,
          after: `// Angular:\n@ViewChild('myDiv') myDiv!: ElementRef;\nngAfterViewInit() {\n  this.renderer.setStyle(this.myDiv.nativeElement, 'color', 'red');\n}`
        })
      },
      // ========== NODE.JS / EXPRESS ==========
      {
        test: (c: string) => c.includes('app.get') && c.includes('async') && !c.includes('try') && !c.includes('catch'),
        getImprovement: (): Improvement => ({
          category: 'Error Handling',
          issue: 'Async route handler without try/catch — unhandled rejections crash the server.',
          suggestion: 'Wrap async handlers in try/catch or use an asyncHandler wrapper.',
          before: `app.get('/users', async (req, res) => {\n  const users = await User.find();\n  res.json(users);\n});`,
          after: `// Option 1: try/catch\napp.get('/users', async (req, res) => {\n  try {\n    const users = await User.find();\n    res.json(users);\n  } catch (err) {\n    res.status(500).json({ error: err.message });\n  }\n});\n\n// Option 2: asyncHandler wrapper\nconst asyncHandler = fn => (req, res, next) =>\n  Promise.resolve(fn(req, res, next)).catch(next);`
        })
      },
      {
        test: (c: string) => c.includes('res.send') && !c.includes('return res') && /if\s*\(/.test(c),
        getImprovement: (): Improvement => ({
          category: 'Bug Prevention',
          issue: 'Sending response without "return" in conditional blocks can cause "headers already sent" error.',
          suggestion: 'Always return after sending a response in conditional blocks.',
          before: `if (!user) {\n  res.status(404).json({ error: 'Not found' });\n}\nres.json(user); // runs even if user is null!`,
          after: `if (!user) {\n  return res.status(404).json({ error: 'Not found' });\n}\nres.json(user);`
        })
      },
      {
        test: (c: string) => c.includes('req.body') && !c.includes('express.json') && !c.includes('bodyParser') && c.includes('app.post'),
        getImprovement: (): Improvement => ({
          category: 'Configuration',
          issue: 'Using req.body without body parser middleware — req.body will be undefined.',
          suggestion: 'Add express.json() middleware before your routes.',
          before: `const app = express();\napp.post('/api/data', (req, res) => {\n  console.log(req.body); // undefined!\n});`,
          after: `const app = express();\napp.use(express.json()); // Add this!\napp.post('/api/data', (req, res) => {\n  console.log(req.body); // works\n});`
        })
      },
      // ========== MONGODB / MONGOOSE ==========
      {
        test: (c: string) => c.includes('mongoose.connect') && !c.includes('try') && !c.includes('catch'),
        getImprovement: (): Improvement => ({
          category: 'Error Handling',
          issue: 'Database connection without error handling — app crashes silently if DB is down.',
          suggestion: 'Always handle connection errors and add retry logic.',
          before: `mongoose.connect('mongodb://localhost:27017/myapp');`,
          after: `const connectDB = async () => {\n  try {\n    await mongoose.connect('mongodb://localhost:27017/myapp');\n    console.log('MongoDB connected');\n  } catch (err) {\n    console.error('DB connection failed:', err.message);\n    process.exit(1);\n  }\n};\nconnectDB();`
        })
      },
      {
        test: (c: string) => c.includes('findById') && !c.includes('isValidObjectId') && !c.includes('isValid'),
        getImprovement: (): Improvement => ({
          category: 'Validation',
          issue: 'Using findById without validating the ID — CastError if ID format is wrong.',
          suggestion: 'Validate ObjectId before querying.',
          before: `const user = await User.findById(req.params.id);`,
          after: `if (!mongoose.isValidObjectId(req.params.id)) {\n  return res.status(400).json({ error: 'Invalid ID' });\n}\nconst user = await User.findById(req.params.id);`
        })
      },
      {
        test: (c: string) => c.includes('password') && c.includes('find') && !c.includes('select') && !c.includes('-password'),
        getImprovement: (): Improvement => ({
          category: 'Security',
          issue: 'Querying users without excluding password field — may leak hashed passwords.',
          suggestion: 'Use .select("-password") or set select: false in schema.',
          before: `const users = await User.find();`,
          after: `// Option 1: Exclude in query\nconst users = await User.find().select('-password');\n\n// Option 2: In schema definition\npassword: { type: String, select: false }`
        })
      },
      // ========== GENERAL ==========
      {
        test: (c: string) => c.includes('setTimeout') || c.includes('setInterval'),
        getImprovement: (): Improvement => ({
          category: 'Best Practices',
          issue: 'setTimeout/setInterval can cause memory leaks if not cleared.',
          suggestion: 'Always store the reference and clear in cleanup. In Angular, consider RxJS timer/interval.',
          before: `setTimeout(() => this.check(), 5000);\nsetInterval(() => this.poll(), 10000);`,
          after: `// Store and clear:\nconst timer = setTimeout(() => this.check(), 5000);\nclearTimeout(timer);\n\n// Angular: use RxJS\nimport { timer, interval } from 'rxjs';\ntimer(5000).subscribe(() => this.check());\ninterval(10000).pipe(takeUntilDestroyed()).subscribe(() => this.poll());`
        })
      },
      {
        test: (c: string) => /new Promise/.test(c) && c.includes('async'),
        getImprovement: (): Improvement => ({
          category: 'Code Quality',
          issue: 'Unnecessary Promise wrapper in async function.',
          suggestion: 'async functions already return Promises — just use await directly.',
          before: `async function getData() {\n  return new Promise((resolve) => {\n    const data = await fetchData();\n    resolve(data);\n  });\n}`,
          after: `async function getData() {\n  const data = await fetchData();\n  return data;\n}`
        })
      }
    ];
  }

  private applyFixes(code: string): string {
    let improved = code;

    // var -> const/let
    improved = improved.replace(/\bvar\s+(\w+)\s*=/g, 'const $1 =');

    // == to ===
    improved = improved.replace(/([^=!])={2}([^=])/g, '$1===$2');
    improved = improved.replace(/!={1}([^=])/g, '!==$1');

    // Add trackBy hint
    if (improved.includes('*ngFor') && !improved.includes('trackBy')) {
      improved = improved.replace(
        /(\*ngFor="let\s+(\w+)\s+of\s+\w+)(")/g,
        '$1; trackBy: trackById$3'
      );
    }

    return improved;
  }

  private calculateScore(code: string, improvements: Improvement[]): number {
    let score = 100;

    for (const imp of improvements) {
      switch (imp.category) {
        case 'Security': score -= 20; break;
        case 'Memory Management': score -= 15; break;
        case 'Error Handling': score -= 15; break;
        case 'Type Safety': score -= 10; break;
        case 'Performance': score -= 10; break;
        case 'Bug Prevention': score -= 10; break;
        default: score -= 5;
      }
    }

    // Bonus for good practices found
    if (code.includes('ChangeDetectionStrategy.OnPush')) score += 5;
    if (code.includes('trackBy')) score += 5;
    if (code.includes('async') && code.includes('try') && code.includes('catch')) score += 5;
    if (code.includes('interface ') || code.includes('type ')) score += 5;
    if (code.includes('===')) score += 3;
    if (code.includes('const ') && !code.includes('var ')) score += 3;

    return Math.max(0, Math.min(100, score));
  }
}
