/**
 * Seed missing Angular concept knowledge into MongoDB.
 * Run: node seed-angular-concepts.js
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const { KnowledgeEntry, DirectAnswer } = require('./models/Knowledge');

const ENTRIES = [
  {
    topic: 'interpolation', category: 'Angular',
    keywords: ['interpolation', 'angular interpolation', 'string interpolation', 'double curly', 'curly braces', 'double braces', 'expression binding'],
    title: 'Angular Interpolation',
    summary: 'Interpolation is a one-way data binding technique in Angular that displays values from the component class in the template using double curly braces {{ }}.',
    details: `## Syntax
\`\`\`html
<h1>{{ title }}</h1>
<p>Hello, {{ userName }}!</p>
<span>Total: {{ price * quantity }}</span>
\`\`\`

## What can go inside {{ }}?
Any JavaScript expression that returns a value:
- **Property access:** \`{{ user.name }}\`
- **Method calls:** \`{{ getFullName() }}\`
- **Arithmetic:** \`{{ price * 1.1 }}\`
- **Ternary:** \`{{ isActive ? 'Yes' : 'No' }}\`
- **Pipes:** \`{{ date | date:'short' }}\`
- **Signals:** \`{{ count() }}\`

## What you CANNOT do
- Assignments: \`{{ x = 1 }}\` ❌
- \`new\` expressions: \`{{ new Date() }}\` ❌
- Increment/decrement: \`{{ x++ }}\` ❌
- Bitwise operators
- Global variables (window, document)

## Example Component
\`\`\`typescript
@Component({
  selector: 'app-user',
  template: \\\`
    <h2>{{ title }}</h2>
    <p>Welcome, {{ user.name }}!</p>
    <p>You have {{ messages.length }} messages.</p>
    <p>Logged in: {{ isLoggedIn ? 'Yes' : 'No' }}</p>
    <p>Joined: {{ joinDate | date:'mediumDate' }}</p>
  \\\`
})
export class UserComponent {
  title = 'User Profile';
  user = { name: 'Alice', email: 'alice@test.com' };
  messages = ['Hi', 'Hello', 'Hey'];
  isLoggedIn = true;
  joinDate = new Date();
}
\`\`\`

## Interpolation vs Property Binding
| Use | Example | When |
|-----|---------|------|
| Interpolation | \`<img src="{{ url }}" />\` | String values, text content |
| Property binding | \`<img [src]="url" />\` | Non-string values, more efficient |

For text content, both work. For attributes/properties, prefer property binding \`[prop]="value"\`.

## Null/Undefined Safety
\`\`\`html
<!-- Safe with optional chaining -->
<p>{{ user?.profile?.bio }}</p>

<!-- With fallback -->
<p>{{ user?.name ?? 'Anonymous' }}</p>
\`\`\``,
    examples: [
      '```html\n<!-- Basic interpolation -->\n<h1>{{ title }}</h1>\n\n<!-- Expression -->\n<p>{{ 2 + 2 }}</p>\n\n<!-- Method call -->\n<p>{{ getGreeting() }}</p>\n\n<!-- With pipe -->\n<p>{{ price | currency }}</p>\n\n<!-- Signal (Angular 17+) -->\n<p>Count: {{ counter() }}</p>\n```'
    ],
    related: ['angular-components', 'data-binding', 'angular-pipes', 'angular']
  },
  {
    topic: 'data-binding', category: 'Angular',
    keywords: ['data binding', 'binding', 'two way binding', 'one way binding', 'property binding', 'event binding', 'angular binding', 'banana in a box'],
    title: 'Angular Data Binding',
    summary: 'Data binding synchronizes data between the component class and the template. Angular supports 4 types: interpolation, property binding, event binding, and two-way binding.',
    details: `## The 4 Types

### 1. Interpolation {{ }}  — Component → Template (one-way)
Displays component values as text in the template.
\`\`\`html
<h1>{{ title }}</h1>
<p>{{ user.name }}</p>
\`\`\`

### 2. Property Binding [ ]  — Component → Template (one-way)
Binds DOM properties to component values.
\`\`\`html
<img [src]="imageUrl" [alt]="imageAlt" />
<button [disabled]="isLoading">Submit</button>
<div [class.active]="isActive"></div>
<div [style.color]="textColor"></div>
\`\`\`

### 3. Event Binding ( )  — Template → Component (one-way)
Handles DOM events in the component.
\`\`\`html
<button (click)="onClick()">Click me</button>
<input (input)="onInput($event)" />
<form (submit)="onSubmit()"></form>
<input (keydown.enter)="onEnter()" />
\`\`\`

### 4. Two-way Binding [( )]  — "banana in a box"
Combines property + event binding. Requires \`FormsModule\`.
\`\`\`html
<input [(ngModel)]="name" />
<!-- Equivalent to: -->
<input [ngModel]="name" (ngModelChange)="name = $event" />
\`\`\`

## Comparison Table
| Syntax | Direction | Use Case |
|--------|-----------|----------|
| \`{{ value }}\` | → | Display text |
| \`[property]="value"\` | → | Set DOM property |
| \`(event)="handler()"\` | ← | Handle events |
| \`[(ngModel)]="value"\` | ↔ | Form inputs |
| \`[attr.name]="value"\` | → | HTML attributes |
| \`[class.name]="expr"\` | → | Toggle CSS class |
| \`[style.prop]="expr"\` | → | Inline styles |

## Complete Example
\`\`\`typescript
@Component({
  template: \\\`
    <!-- Interpolation -->
    <h1>{{ title }}</h1>

    <!-- Property binding -->
    <img [src]="avatarUrl" [alt]="userName" />
    <button [disabled]="!isValid">Save</button>
    <div [class.highlight]="selected">...</div>

    <!-- Event binding -->
    <button (click)="save()">Save</button>
    <input (input)="onTextChange($event)" />

    <!-- Two-way binding -->
    <input [(ngModel)]="searchQuery" placeholder="Search..." />
    <p>You typed: {{ searchQuery }}</p>
  \\\`
})
export class MyComponent {
  title = 'My App';
  avatarUrl = '/avatar.png';
  userName = 'Alice';
  isValid = true;
  selected = false;
  searchQuery = '';

  save() { console.log('Saving...'); }
  onTextChange(e: Event) {
    console.log((e.target as HTMLInputElement).value);
  }
}
\`\`\``,
    examples: [
      '```html\n<!-- All 4 binding types in one example -->\n<div>\n  <h2>{{ title }}</h2>                     <!-- interpolation -->\n  <img [src]="logoUrl" />                   <!-- property -->\n  <button (click)="toggle()">Toggle</button> <!-- event -->\n  <input [(ngModel)]="name" />              <!-- two-way -->\n</div>\n```'
    ],
    related: ['interpolation', 'angular-components', 'angular-forms', 'angular']
  },
  {
    topic: 'angular-directives', category: 'Angular',
    keywords: ['directive', 'directives', 'ngif', 'ngfor', 'ngswitch', 'ngclass', 'ngstyle', 'structural directive', 'attribute directive', 'angular directive'],
    title: 'Angular Directives',
    summary: 'Directives are classes that add behavior to DOM elements. Two main types: structural (*ngIf, *ngFor) that change layout, and attribute (ngClass, ngStyle) that change appearance.',
    details: `## Structural Directives

### *ngIf — conditional rendering
\`\`\`html
<p *ngIf="isLoggedIn">Welcome back!</p>
<p *ngIf="!isLoggedIn">Please log in.</p>

<!-- With else -->
<div *ngIf="data; else loading">{{ data }}</div>
<ng-template #loading>Loading...</ng-template>
\`\`\`

### *ngFor — list rendering
\`\`\`html
<ul>
  <li *ngFor="let item of items; let i = index">
    {{ i + 1 }}. {{ item.name }}
  </li>
</ul>

<!-- With trackBy for performance -->
<li *ngFor="let item of items; trackBy: trackById">{{ item.name }}</li>
\`\`\`

### *ngSwitch — switch rendering
\`\`\`html
<div [ngSwitch]="role">
  <p *ngSwitchCase="'admin'">Admin dashboard</p>
  <p *ngSwitchCase="'user'">User dashboard</p>
  <p *ngSwitchDefault>Guest view</p>
</div>
\`\`\`

## New Control Flow (Angular 17+)
\`\`\`html
@if (isLoggedIn) {
  <p>Welcome back!</p>
} @else {
  <p>Please log in.</p>
}

@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <p>No items</p>
}

@switch (role) {
  @case ('admin') { <p>Admin</p> }
  @case ('user') { <p>User</p> }
  @default { <p>Guest</p> }
}
\`\`\`

## Attribute Directives

### [ngClass] — dynamic classes
\`\`\`html
<div [ngClass]="{ 'active': isActive, 'error': hasError }">...</div>
<div [class.highlight]="selected">...</div>
\`\`\`

### [ngStyle] — dynamic styles
\`\`\`html
<div [ngStyle]="{ 'color': textColor, 'font-size.px': fontSize }">...</div>
<div [style.color]="textColor">...</div>
\`\`\`

## Custom Directive
\`\`\`typescript
@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective {
  @Input() appHighlight = 'yellow';
  constructor(private el: ElementRef) {}
  @HostListener('mouseenter') onEnter() {
    this.el.nativeElement.style.backgroundColor = this.appHighlight;
  }
  @HostListener('mouseleave') onLeave() {
    this.el.nativeElement.style.backgroundColor = '';
  }
}
\`\`\``,
    related: ['interpolation', 'angular-components', 'data-binding', 'angular']
  },
  {
    topic: 'angular-pipes', category: 'Angular',
    keywords: ['pipe', 'pipes', 'angular pipe', 'date pipe', 'currency pipe', 'uppercase', 'async pipe', 'json pipe', 'pure pipe'],
    title: 'Angular Pipes',
    summary: 'Pipes transform displayed values in templates. Use | syntax. Built-in pipes: date, currency, uppercase, lowercase, number, percent, json, async, slice.',
    details: `## Built-in Pipes
\`\`\`html
{{ value | uppercase }}                  <!-- HELLO -->
{{ value | lowercase }}                  <!-- hello -->
{{ value | titlecase }}                  <!-- Hello World -->
{{ 1234.5 | number:'1.2-2' }}           <!-- 1,234.50 -->
{{ 1234.5 | currency:'USD' }}           <!-- $1,234.50 -->
{{ 0.25 | percent }}                     <!-- 25% -->
{{ birthday | date }}                    <!-- Jan 15, 2024 -->
{{ birthday | date:'shortDate' }}        <!-- 1/15/24 -->
{{ birthday | date:'fullDate' }}         <!-- Monday, January 15, 2024 -->
{{ birthday | date:'yyyy-MM-dd HH:mm' }} <!-- 2024-01-15 14:30 -->
{{ obj | json }}                         <!-- {"name":"Alice"} -->
{{ text | slice:0:10 }}                  <!-- First 10 chars -->
{{ observable$ | async }}                <!-- Auto subscribe/unsubscribe -->
\`\`\`

## Chaining Pipes
\`\`\`html
{{ name | lowercase | slice:0:5 }}
{{ birthday | date | uppercase }}
\`\`\`

## Async Pipe — auto subscription
\`\`\`typescript
users$ = this.http.get<User[]>('/api/users');
\`\`\`
\`\`\`html
<ul>
  <li *ngFor="let user of users$ | async">{{ user.name }}</li>
</ul>
<!-- Auto-subscribes, auto-unsubscribes on destroy -->
\`\`\`

## Custom Pipe
\`\`\`typescript
@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number = 20): string {
    return value.length > limit ? value.slice(0, limit) + '...' : value;
  }
}
\`\`\`
\`\`\`html
{{ longText | truncate:50 }}
\`\`\``,
    related: ['interpolation', 'angular-components', 'rxjs', 'angular']
  },
  {
    topic: 'angular-lifecycle', category: 'Angular',
    keywords: ['lifecycle', 'lifecycle hooks', 'ngoninit', 'ngondestroy', 'ngonchanges', 'ngafterviewinit', 'hooks', 'angular hooks'],
    title: 'Angular Lifecycle Hooks',
    summary: 'Lifecycle hooks let you tap into key moments of a component\'s life: creation, input changes, rendering, and destruction.',
    details: `## The Sequence
1. **constructor()** — Class instantiated (avoid logic here)
2. **ngOnChanges(changes)** — When @Input values change
3. **ngOnInit()** — After first ngOnChanges (main setup)
4. **ngDoCheck()** — On every change detection cycle
5. **ngAfterContentInit()** — After <ng-content> projected
6. **ngAfterContentChecked()** — After projected content checked
7. **ngAfterViewInit()** — After view + child views initialized
8. **ngAfterViewChecked()** — After view checked
9. **ngOnDestroy()** — Before component destroyed (cleanup!)

## Most Common Hooks
\`\`\`typescript
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Load data, setup subscriptions
    this.userService.getUsers().pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => this.users = users);
  }

  ngOnDestroy() {
    // Cleanup — prevent memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }
}
\`\`\`

## When to use what
| Hook | Use Case |
|------|----------|
| \`ngOnInit\` | Fetch data, initial setup |
| \`ngOnChanges\` | React to @Input changes |
| \`ngAfterViewInit\` | Access DOM via @ViewChild |
| \`ngOnDestroy\` | Unsubscribe, clear intervals |

## In Angular 17+ with Signals
Signals reduce the need for lifecycle hooks:
\`\`\`typescript
count = signal(0);
doubled = computed(() => this.count() * 2);
effect(() => console.log('count:', this.count())); // auto cleanup
\`\`\``,
    related: ['angular-components', 'angular-signals', 'rxjs', 'angular']
  },
  {
    topic: 'viewchild', category: 'Angular',
    keywords: ['viewchild', 'view child', 'template reference', 'elementref', 'template variable', 'access dom', 'reference variable'],
    title: 'Angular @ViewChild & Template References',
    summary: '@ViewChild gets a reference to a child component or DOM element. Template reference variables (#name) create local template identifiers.',
    details: `## Template Reference Variables
\`\`\`html
<input #nameInput type="text" />
<button (click)="focusInput(nameInput)">Focus</button>
<p>Typed: {{ nameInput.value }}</p>
\`\`\`

## @ViewChild
\`\`\`typescript
@Component({
  template: \\\`
    <input #emailInput type="email" />
    <app-child #childComp></app-child>
  \\\`
})
export class MyComponent implements AfterViewInit {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;
  @ViewChild('childComp') childComp!: ChildComponent;
  @ViewChild(ChildComponent) childByType!: ChildComponent;

  ngAfterViewInit() {
    this.emailInput.nativeElement.focus();
    this.childComp.doSomething();
  }
}
\`\`\`

## @ViewChildren (multiple)
\`\`\`typescript
@ViewChildren(CardComponent) cards!: QueryList<CardComponent>;

ngAfterViewInit() {
  this.cards.forEach(card => console.log(card.title));
  this.cards.changes.subscribe(() => console.log('cards updated'));
}
\`\`\`

## Signal-based (Angular 17.2+)
\`\`\`typescript
emailInput = viewChild<ElementRef>('emailInput');
childComp = viewChild(ChildComponent);
allCards = viewChildren(CardComponent);
\`\`\``,
    related: ['angular-components', 'angular-lifecycle', 'angular']
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  let inserted = 0, updated = 0;
  for (const entry of ENTRIES) {
    const result = await KnowledgeEntry.findOneAndUpdate(
      { topic: entry.topic },
      entry,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++;
    else updated++;
  }

  console.log(`Angular concepts: ${inserted} inserted, ${updated} updated\n`);
  const total = await KnowledgeEntry.countDocuments();
  console.log(`Total entries in DB: ${total}`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
