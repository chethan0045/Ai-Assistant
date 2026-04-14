import { Injectable } from '@angular/core';

interface Template {
  keywords: string[];
  category: string;
  generate: (name: string) => GeneratedCode;
}

export interface GeneratedCode {
  files: { filename: string; code: string }[];
}

@Injectable({ providedIn: 'root' })
export class CodeGeneratorService {

  private templates: Template[] = [
    // ======================== ANGULAR ========================
    {
      keywords: ['login', 'sign in', 'signin', 'authentication form'],
      category: 'Angular',
      generate: (name) => ({ files: [
        { filename: `${name}.component.ts`, code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${this.pascal(name)}Component {
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  onSubmit(): void {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }
    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }
    this.isLoading = true;
    // TODO: Connect to AuthService
    setTimeout(() => {
      console.log('Login attempt:', { email: this.email });
      this.isLoading = false;
    }, 1500);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private isValidEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/.test(email);
  }
}` },
        { filename: `${name}.component.html`, code: `<div class="login-container">
  <div class="login-card">
    <h2>Sign In</h2>
    <p class="subtitle">Welcome back! Please enter your credentials.</p>
    <form (ngSubmit)="onSubmit()" class="login-form">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" [(ngModel)]="email" name="email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-wrapper">
          <input [type]="showPassword ? 'text' : 'password'" id="password" [(ngModel)]="password" name="password" placeholder="Enter your password" />
          <button type="button" class="toggle-password" (click)="togglePassword()">
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      <div class="error-message" *ngIf="errorMessage">{{ errorMessage }}</div>
      <button type="submit" class="submit-btn" [disabled]="isLoading">
        {{ isLoading ? 'Signing in...' : 'Sign In' }}
      </button>
    </form>
  </div>
</div>` },
        { filename: `${name}.component.css`, code: `.login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
.login-card { width: 100%; max-width: 420px; padding: 40px; border-radius: 12px; background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
h2 { margin-bottom: 8px; font-size: 24px; color: #1a1a2e; }
.subtitle { color: #666; margin-bottom: 28px; font-size: 14px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #333; }
.form-group input { width: 100%; padding: 12px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.form-group input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
.password-wrapper { position: relative; }
.password-wrapper input { padding-right: 60px; }
.toggle-password { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #6366f1; cursor: pointer; }
.error-message { padding: 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 13px; margin-bottom: 16px; }
.submit-btn { width: 100%; padding: 14px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
.submit-btn:hover:not(:disabled) { background: #4f46e5; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }` }
      ]})
    },
    {
      keywords: ['register', 'sign up', 'signup', 'registration'],
      category: 'Angular',
      generate: (name) => ({ files: [
        { filename: `${name}.component.ts`, code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${this.pascal(name)}Component {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  errors: string[] = [];

  onSubmit(): void {
    this.errors = [];
    if (!this.fullName.trim()) this.errors.push('Full name is required.');
    if (!this.email.trim()) this.errors.push('Email is required.');
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/.test(this.email))
      this.errors.push('Please enter a valid email.');
    if (this.password.length < 8) this.errors.push('Password must be at least 8 characters.');
    if (this.password !== this.confirmPassword) this.errors.push('Passwords do not match.');

    if (this.errors.length > 0) return;

    this.isLoading = true;
    setTimeout(() => {
      console.log('Registration:', { fullName: this.fullName, email: this.email });
      this.isLoading = false;
    }, 1500);
  }
}` },
        { filename: `${name}.component.html`, code: `<div class="register-container">
  <div class="register-card">
    <h2>Create Account</h2>
    <form (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" [(ngModel)]="fullName" name="fullName" placeholder="John Doe" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" [(ngModel)]="password" name="password" placeholder="Min 8 characters" />
      </div>
      <div class="form-group">
        <label>Confirm Password</label>
        <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="Re-enter password" />
      </div>
      <div class="error-list" *ngIf="errors.length > 0">
        <p *ngFor="let err of errors">{{ err }}</p>
      </div>
      <button type="submit" class="submit-btn" [disabled]="isLoading">
        {{ isLoading ? 'Creating Account...' : 'Sign Up' }}
      </button>
    </form>
  </div>
</div>` },
        { filename: `${name}.component.css`, code: `.register-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
.register-card { width: 100%; max-width: 460px; padding: 40px; border-radius: 12px; background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
h2 { margin-bottom: 24px; font-size: 24px; color: #1a1a2e; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #333; }
.form-group input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.form-group input:focus { outline: none; border-color: #6366f1; }
.error-list { padding: 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 16px; }
.error-list p { color: #dc2626; font-size: 13px; margin-bottom: 4px; }
.submit-btn { width: 100%; padding: 14px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
.submit-btn:hover:not(:disabled) { background: #4f46e5; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }` }
      ]})
    },
    {
      keywords: ['table', 'data table', 'datatable', 'grid'],
      category: 'Angular',
      generate: (name) => ({ files: [
        { filename: `${name}.component.ts`, code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TableItem { id: number; name: string; email: string; role: string; status: 'active' | 'inactive'; }

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${this.pascal(name)}Component {
  searchTerm = '';
  items: TableItem[] = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'active' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'active' },
    { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Editor', status: 'inactive' },
  ];
  filteredItems = [...this.items];

  onSearch(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredItems = this.items.filter(i =>
      i.name.toLowerCase().includes(term) || i.email.toLowerCase().includes(term)
    );
  }

  deleteItem(id: number): void {
    this.items = this.items.filter(i => i.id !== id);
    this.onSearch();
  }

  trackById(index: number, item: TableItem): number { return item.id; }
}` },
        { filename: `${name}.component.html`, code: `<div class="table-container">
  <div class="table-header">
    <h2>Data Table</h2>
    <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearch()" placeholder="Search..." class="search-input" />
  </div>
  <table class="data-table">
    <thead>
      <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
    </thead>
    <tbody>
      <tr *ngFor="let item of filteredItems; trackBy: trackById">
        <td>{{ item.id }}</td><td>{{ item.name }}</td><td>{{ item.email }}</td><td>{{ item.role }}</td>
        <td><span class="badge" [ngClass]="item.status">{{ item.status }}</span></td>
        <td><button class="delete-btn" (click)="deleteItem(item.id)">Delete</button></td>
      </tr>
    </tbody>
  </table>
</div>` },
        { filename: `${name}.component.css`, code: `.table-container { padding: 24px; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.search-input { padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; width: 260px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { text-align: left; padding: 12px; background: #f8f9fa; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
.data-table td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.badge.active { background: #dcfce7; color: #16a34a; }
.badge.inactive { background: #fef2f2; color: #dc2626; }
.delete-btn { padding: 6px 14px; background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; cursor: pointer; }` }
      ]})
    },
    {
      keywords: ['todo', 'task list', 'checklist', 'to-do'],
      category: 'Angular',
      generate: (name) => ({ files: [
        { filename: `${name}.component.ts`, code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Todo { id: number; text: string; completed: boolean; }

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${this.pascal(name)}Component {
  newTodo = '';
  filter: 'all' | 'active' | 'completed' = 'all';
  todos: Todo[] = [];
  private nextId = 1;

  get filteredTodos(): Todo[] {
    switch (this.filter) {
      case 'active': return this.todos.filter(t => !t.completed);
      case 'completed': return this.todos.filter(t => t.completed);
      default: return this.todos;
    }
  }

  addTodo(): void {
    const text = this.newTodo.trim();
    if (!text) return;
    this.todos.push({ id: this.nextId++, text, completed: false });
    this.newTodo = '';
  }

  toggleTodo(todo: Todo): void { todo.completed = !todo.completed; }
  deleteTodo(id: number): void { this.todos = this.todos.filter(t => t.id !== id); }
  clearCompleted(): void { this.todos = this.todos.filter(t => !t.completed); }
}` },
        { filename: `${name}.component.html`, code: `<div class="todo-container">
  <h2>Todo List</h2>
  <div class="add-todo">
    <input type="text" [(ngModel)]="newTodo" (keyup.enter)="addTodo()" placeholder="What needs to be done?" />
    <button (click)="addTodo()">Add</button>
  </div>
  <div class="filters">
    <button [class.active]="filter==='all'" (click)="filter='all'">All</button>
    <button [class.active]="filter==='active'" (click)="filter='active'">Active</button>
    <button [class.active]="filter==='completed'" (click)="filter='completed'">Completed</button>
  </div>
  <ul class="todo-list">
    <li *ngFor="let todo of filteredTodos" [class.completed]="todo.completed">
      <input type="checkbox" [checked]="todo.completed" (change)="toggleTodo(todo)" />
      <span>{{ todo.text }}</span>
      <button class="delete-btn" (click)="deleteTodo(todo.id)">&times;</button>
    </li>
  </ul>
</div>` },
        { filename: `${name}.component.css`, code: `.todo-container { max-width: 520px; margin: 40px auto; padding: 32px; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
h2 { text-align: center; color: #1a1a2e; margin-bottom: 24px; }
.add-todo { display: flex; gap: 10px; margin-bottom: 20px; }
.add-todo input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.add-todo button { padding: 12px 24px; background: #6366f1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.filters { display: flex; gap: 6px; margin-bottom: 16px; }
.filters button { padding: 6px 14px; background: #f0f0f5; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
.filters button.active { background: #6366f1; color: white; }
.todo-list { list-style: none; padding: 0; }
.todo-list li { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.todo-list li.completed span { text-decoration: line-through; color: #bbb; }
.todo-list span { flex: 1; font-size: 14px; }
.delete-btn { background: none; border: none; color: #ccc; font-size: 20px; cursor: pointer; }` }
      ]})
    },
    {
      keywords: ['dashboard', 'admin', 'panel', 'stats'],
      category: 'Angular',
      generate: (name) => ({ files: [
        { filename: `${name}.component.ts`, code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatCard { title: string; value: string; change: string; isPositive: boolean; }

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${this.pascal(name)}Component {
  stats: StatCard[] = [
    { title: 'Total Users', value: '12,543', change: '+12%', isPositive: true },
    { title: 'Revenue', value: '$48,200', change: '+8.5%', isPositive: true },
    { title: 'Active Sessions', value: '1,824', change: '-3%', isPositive: false },
    { title: 'Conversion Rate', value: '3.24%', change: '+1.2%', isPositive: true },
  ];
  recentActivity = [
    { action: 'New user registered', time: '2 min ago' },
    { action: 'Payment received - $120', time: '15 min ago' },
    { action: 'Server alert resolved', time: '1 hour ago' },
  ];
}` },
        { filename: `${name}.component.html`, code: `<div class="dashboard">
  <h1>Dashboard</h1>
  <div class="stats-grid">
    <div class="stat-card" *ngFor="let stat of stats">
      <p class="stat-title">{{ stat.title }}</p>
      <p class="stat-value">{{ stat.value }}</p>
      <p class="stat-change" [class.positive]="stat.isPositive" [class.negative]="!stat.isPositive">{{ stat.change }}</p>
    </div>
  </div>
  <div class="activity-section">
    <h2>Recent Activity</h2>
    <div class="activity-item" *ngFor="let item of recentActivity">
      <span class="dot"></span>
      <span class="action">{{ item.action }}</span>
      <span class="time">{{ item.time }}</span>
    </div>
  </div>
</div>` },
        { filename: `${name}.component.css`, code: `.dashboard { padding: 32px; max-width: 1200px; margin: 0 auto; }
h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 28px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 36px; }
.stat-card { padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.stat-title { font-size: 13px; color: #888; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
.positive { color: #16a34a; } .negative { color: #dc2626; }
.activity-section { background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.activity-item { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #f0f0f0; }
.dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; }
.action { flex: 1; font-size: 14px; } .time { font-size: 12px; color: #999; }` }
      ]})
    },
    // ======================== NODE.JS + EXPRESS ========================
    {
      keywords: ['express server', 'node server', 'api server', 'rest api', 'backend server', 'express app'],
      category: 'Node.js / Express',
      generate: () => ({ files: [
        { filename: 'server.js', code: `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(\`\${req.method} \${req.path}\`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'API is running', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});` },
        { filename: 'package.json', code: `{
  "name": "express-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}` }
      ]})
    },
    {
      keywords: ['crud', 'crud api', 'rest crud', 'crud operations'],
      category: 'Node.js / Express',
      generate: () => ({ files: [
        { filename: 'server.js', code: `const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store (replace with database)
let items = [
  { id: 1, name: 'Item 1', description: 'First item', createdAt: new Date().toISOString() },
  { id: 2, name: 'Item 2', description: 'Second item', createdAt: new Date().toISOString() },
];
let nextId = 3;

// GET all items
app.get('/api/items', (req, res) => {
  res.json(items);
});

// GET single item
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// CREATE item
app.post('/api/items', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const newItem = {
    id: nextId++,
    name,
    description: description || '',
    createdAt: new Date().toISOString()
  };
  items.push(newItem);
  res.status(201).json(newItem);
});

// UPDATE item
app.put('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { name, description } = req.body;
  if (name) item.name = name;
  if (description !== undefined) item.description = description;
  res.json(item);
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  items.splice(index, 1);
  res.json({ message: 'Item deleted' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`CRUD API running on http://localhost:\${PORT}\`));` },
        { filename: 'package.json', code: `{
  "name": "crud-api",
  "version": "1.0.0",
  "scripts": { "start": "node server.js", "dev": "nodemon server.js" },
  "dependencies": { "cors": "^2.8.5", "express": "^4.18.2" },
  "devDependencies": { "nodemon": "^3.0.0" }
}` }
      ]})
    },
    // ======================== MONGODB ========================
    {
      keywords: ['mongodb', 'mongoose', 'mongo', 'database model', 'schema'],
      category: 'MongoDB / Mongoose',
      generate: () => ({ files: [
        { filename: 'db.js', code: `const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;` },
        { filename: 'models/User.js', code: `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^[\\w.-]+@[\\w.-]+\\.\\w{2,}$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);` },
        { filename: 'routes/userRoutes.js', code: `const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE user
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

// UPDATE user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;` },
        { filename: 'server.js', code: `const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'MongoDB CRUD API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on http://localhost:\${PORT}\`));` },
        { filename: 'package.json', code: `{
  "name": "mongodb-crud-api",
  "version": "1.0.0",
  "scripts": { "start": "node server.js", "dev": "nodemon server.js" },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "mongoose": "^8.0.0"
  },
  "devDependencies": { "nodemon": "^3.0.0" }
}` }
      ]})
    },
    // ======================== JWT AUTH ========================
    {
      keywords: ['jwt', 'token', 'auth', 'authentication', 'authorization'],
      category: 'Node.js / JWT Auth',
      generate: () => ({ files: [
        { filename: 'middleware/auth.js', code: `const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, invalid token' });
  }
};

module.exports = { generateToken, protect };` },
        { filename: 'routes/authRoutes.js', code: `const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user (protected route)
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;` },
        { filename: 'package.json', code: `{
  "name": "jwt-auth-api",
  "version": "1.0.0",
  "scripts": { "start": "node server.js", "dev": "nodemon server.js" },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^8.0.0"
  },
  "devDependencies": { "nodemon": "^3.0.0" }
}` }
      ]})
    },
    // ======================== TYPESCRIPT ========================
    {
      keywords: ['typescript class', 'interface', 'type', 'enum', 'generic'],
      category: 'TypeScript',
      generate: () => ({ files: [
        { filename: 'types.ts', code: `// ============ Interfaces ============
interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

// ============ Enums ============
enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer'
}

// ============ Type Aliases ============
type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
};

type PaginatedResponse<T> = ApiResponse<T> & {
  page: number;
  totalPages: number;
  totalItems: number;
};

// ============ Generic Class ============
class DataStore<T extends { id: number }> {
  private items: Map<number, T> = new Map();

  add(item: T): void {
    this.items.set(item.id, item);
  }

  get(id: number): T | undefined {
    return this.items.get(id);
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }

  update(id: number, partial: Partial<Omit<T, 'id'>>): T | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...partial };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: number): boolean {
    return this.items.delete(id);
  }

  find(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }
}

// ============ Usage Example ============
const userStore = new DataStore<User>();
userStore.add({
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  role: UserRole.Admin,
  createdAt: new Date()
});

const admin = userStore.find(u => u.role === UserRole.Admin);
console.log(admin);` }
      ]})
    },
    // ======================== JAVASCRIPT UTILITIES ========================
    {
      keywords: ['utility', 'helper', 'utils', 'javascript functions', 'js functions'],
      category: 'JavaScript',
      generate: () => ({ files: [
        { filename: 'utils.js', code: `// ============ Array Utilities ============

/** Remove duplicates from an array */
const unique = (arr) => [...new Set(arr)];

/** Group array items by a key */
const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const group = typeof key === 'function' ? key(item) : item[key];
    (acc[group] = acc[group] || []).push(item);
    return acc;
  }, {});

/** Chunk array into smaller arrays */
const chunk = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

/** Sort array of objects by property */
const sortBy = (arr, key, order = 'asc') => {
  return [...arr].sort((a, b) => {
    const valA = a[key], valB = b[key];
    const cmp = typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB;
    return order === 'asc' ? cmp : -cmp;
  });
};

// ============ String Utilities ============

/** Convert string to camelCase */
const camelCase = (str) =>
  str.replace(/[-_\\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^(.)/, (_, c) => c.toLowerCase());

/** Convert string to kebab-case */
const kebabCase = (str) =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\\s_]+/g, '-').toLowerCase();

/** Truncate string with ellipsis */
const truncate = (str, length = 100) =>
  str.length > length ? str.slice(0, length) + '...' : str;

/** Capitalize first letter of each word */
const titleCase = (str) =>
  str.replace(/\\b\\w/g, (c) => c.toUpperCase());

// ============ Object Utilities ============

/** Deep clone an object */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/** Pick specific keys from an object */
const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {});

/** Omit specific keys from an object */
const omit = (obj, keys) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

// ============ Async Utilities ============

/** Delay execution */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Retry a function with exponential backoff */
const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(delay * Math.pow(2, i));
    }
  }
};

/** Debounce a function */
const debounce = (fn, ms = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

// ============ Validation Utilities ============

const isEmail = (str) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/.test(str);
const isEmpty = (val) => val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
const isNumber = (val) => !isNaN(parseFloat(val)) && isFinite(val);

module.exports = {
  unique, groupBy, chunk, sortBy,
  camelCase, kebabCase, truncate, titleCase,
  deepClone, pick, omit,
  sleep, retry, debounce,
  isEmail, isEmpty, isNumber
};` }
      ]})
    },
    // ======================== NAVBAR ========================
    {
      keywords: ['navbar', 'navigation', 'nav bar', 'header', 'menu'],
      category: 'Angular',
      generate: (name) => ({ files: [
        { filename: `${name}.component.ts`, code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${this.pascal(name)}Component {
  isMenuOpen = false;
  navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Services', path: '/services' },
    { label: 'Contact', path: '/contact' }
  ];
  toggleMenu(): void { this.isMenuOpen = !this.isMenuOpen; }
}` },
        { filename: `${name}.component.html`, code: `<nav class="navbar">
  <div class="nav-container">
    <a class="nav-brand" routerLink="/">MyApp</a>
    <button class="menu-toggle" (click)="toggleMenu()">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>
    <ul class="nav-links" [class.open]="isMenuOpen">
      <li *ngFor="let link of navLinks">
        <a [routerLink]="link.path" routerLinkActive="active" (click)="isMenuOpen = false">{{ link.label }}</a>
      </li>
    </ul>
  </div>
</nav>` },
        { filename: `${name}.component.css`, code: `.navbar { background: #1a1a2e; padding: 0 24px; }
.nav-container { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px; }
.nav-brand { font-size: 20px; font-weight: 700; color: #818cf8; text-decoration: none; }
.nav-links { list-style: none; display: flex; gap: 8px; }
.nav-links a { padding: 8px 16px; color: #c0c0d8; text-decoration: none; border-radius: 6px; font-size: 14px; }
.nav-links a:hover, .nav-links a.active { color: #fff; background: rgba(129,140,248,0.15); }
.menu-toggle { display: none; background: none; border: none; cursor: pointer; }
.bar { display: block; width: 22px; height: 2px; background: #c0c0d8; margin: 5px 0; }
@media (max-width: 768px) {
  .menu-toggle { display: block; }
  .nav-links { display: none; position: absolute; top: 64px; left: 0; right: 0; background: #1a1a2e; flex-direction: column; padding: 16px; }
  .nav-links.open { display: flex; }
}` }
      ]})
    },
    // ======================== JSON / FETCH ========================
    {
      keywords: ['fetch', 'api call', 'http request', 'json fetch', 'axios'],
      category: 'JavaScript / Fetch',
      generate: () => ({ files: [
        { filename: 'apiService.js', code: `/**
 * Lightweight API service using Fetch API
 */
class ApiService {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  setAuthToken(token) {
    if (token) {
      this.defaultHeaders['Authorization'] = \`Bearer \${token}\`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  async request(endpoint, options = {}) {
    const url = \`\${this.baseURL}\${endpoint}\`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, message: data.error || data.message || 'Request failed', data };
      }

      return data;
    } catch (error) {
      if (error.status) throw error;
      throw { status: 0, message: 'Network error: ' + error.message };
    }
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? \`\${endpoint}?\${query}\` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// ============ Usage Example ============
const api = new ApiService('http://localhost:3000');

// Set auth token after login
// api.setAuthToken('your-jwt-token');

// GET request
// const users = await api.get('/api/users', { page: 1, limit: 10 });

// POST request
// const newUser = await api.post('/api/users', { name: 'Alice', email: 'alice@example.com' });

// PUT request
// const updated = await api.put('/api/users/1', { name: 'Alice Updated' });

// DELETE request
// await api.delete('/api/users/1');

module.exports = ApiService;` }
      ]})
    },
    // ======================== EXPRESS MIDDLEWARE ========================
    {
      keywords: ['middleware', 'express middleware', 'rate limit', 'logging middleware'],
      category: 'Node.js / Express',
      generate: () => ({ files: [
        { filename: 'middleware/logger.js', code: `/** Request logging middleware */
const logger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      \`[\${new Date().toISOString()}] \${req.method} \${req.originalUrl} \${res.statusCode} \${duration}ms\`
    );
  });

  next();
};

module.exports = logger;` },
        { filename: 'middleware/errorHandler.js', code: `/** Global error handling middleware */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(\`[ERROR] \${statusCode}: \${message}\`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;` },
        { filename: 'middleware/validate.js', code: `/** Request validation middleware factory */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(\`\${field} is required\`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type === 'email' && !/^[\\w.-]+@[\\w.-]+\\.\\w{2,}$/.test(value)) {
          errors.push(\`\${field} must be a valid email\`);
        }
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(\`\${field} must be at least \${rules.minLength} characters\`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(\`\${field} must be at most \${rules.maxLength} characters\`);
        }
        if (rules.type === 'number' && isNaN(Number(value))) {
          errors.push(\`\${field} must be a number\`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    next();
  };
};

// Usage:
// app.post('/api/users', validate({
//   name: { required: true, minLength: 2, maxLength: 50 },
//   email: { required: true, type: 'email' },
//   password: { required: true, minLength: 8 }
// }), createUser);

module.exports = validate;` },
        { filename: 'middleware/rateLimit.js', code: `/** Simple in-memory rate limiter */
const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,  // 15 minutes
    max = 100,                    // max requests per window
    message = 'Too many requests, please try again later'
  } = options;

  const requests = new Map();

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests) {
      if (now - data.startTime > windowMs) {
        requests.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const record = requests.get(key);

    if (!record || now - record.startTime > windowMs) {
      requests.set(key, { count: 1, startTime: now });
      return next();
    }

    record.count++;

    if (record.count > max) {
      return res.status(429).json({ success: false, error: message });
    }

    next();
  };
};

module.exports = rateLimit;` }
      ]})
    },
    // ======================== FORM / CONTACT (Angular) ========================
    {
      keywords: ['form', 'contact', 'feedback', 'input form'],
      category: 'Angular',
      generate: (name) => ({ files: [
        { filename: `${name}.component.ts`, code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${this.pascal(name)}Component {
  formData = { name: '', email: '', subject: '', message: '' };
  submitted = false;
  errors: string[] = [];

  onSubmit(): void {
    this.errors = [];
    if (!this.formData.name.trim()) this.errors.push('Name is required.');
    if (!this.formData.email.trim()) this.errors.push('Email is required.');
    if (!this.formData.message.trim()) this.errors.push('Message is required.');
    if (this.errors.length > 0) return;
    console.log('Form submitted:', this.formData);
    this.submitted = true;
  }

  resetForm(): void {
    this.formData = { name: '', email: '', subject: '', message: '' };
    this.submitted = false;
  }
}` },
        { filename: `${name}.component.html`, code: `<div class="form-container">
  <div class="form-card" *ngIf="!submitted">
    <h2>Contact Us</h2>
    <form (ngSubmit)="onSubmit()">
      <div class="form-group"><label>Name</label><input type="text" [(ngModel)]="formData.name" name="name" placeholder="Your name" /></div>
      <div class="form-group"><label>Email</label><input type="email" [(ngModel)]="formData.email" name="email" placeholder="you@example.com" /></div>
      <div class="form-group"><label>Subject</label><input type="text" [(ngModel)]="formData.subject" name="subject" placeholder="Subject" /></div>
      <div class="form-group"><label>Message</label><textarea [(ngModel)]="formData.message" name="message" rows="5" placeholder="Your message..."></textarea></div>
      <div class="error-list" *ngIf="errors.length > 0"><p *ngFor="let e of errors">{{ e }}</p></div>
      <button type="submit" class="submit-btn">Send Message</button>
    </form>
  </div>
  <div class="success-card" *ngIf="submitted">
    <h2>Thank You!</h2>
    <p>Your message has been sent.</p>
    <button (click)="resetForm()" class="submit-btn">Send Another</button>
  </div>
</div>` },
        { filename: `${name}.component.css`, code: `.form-container { display: flex; justify-content: center; padding: 40px 20px; }
.form-card, .success-card { width: 100%; max-width: 520px; padding: 36px; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
h2 { font-size: 22px; color: #1a1a2e; margin-bottom: 24px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; }
.form-group input, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; }
.error-list { padding: 10px; background: #fef2f2; border-radius: 8px; margin-bottom: 16px; }
.error-list p { color: #dc2626; font-size: 13px; }
.submit-btn { width: 100%; padding: 14px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
.success-card { text-align: center; }` }
      ]})
    },
    // ======================== MODAL ========================
    {
      keywords: ['modal', 'dialog', 'popup'],
      category: 'Angular',
      generate: (name) => ({ files: [
        { filename: `${name}.component.ts`, code: `import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${this.pascal(name)}Component {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  close(): void { this.closed.emit(); }
  confirm(): void { this.confirmed.emit(); this.close(); }
  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.close();
  }
}` },
        { filename: `${name}.component.html`, code: `<div class="modal-backdrop" *ngIf="isOpen" (click)="onBackdropClick($event)">
  <div class="modal-content">
    <div class="modal-header">
      <h3>{{ title }}</h3>
      <button class="close-btn" (click)="close()">&times;</button>
    </div>
    <div class="modal-body"><ng-content></ng-content></div>
    <div class="modal-footer">
      <button class="btn-cancel" (click)="close()">Cancel</button>
      <button class="btn-confirm" (click)="confirm()">Confirm</button>
    </div>
  </div>
</div>` },
        { filename: `${name}.component.css`, code: `.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: #fff; border-radius: 14px; width: 90%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #eee; }
.modal-header h3 { font-size: 18px; color: #1a1a2e; }
.close-btn { background: none; border: none; font-size: 24px; color: #888; cursor: pointer; }
.modal-body { padding: 24px; color: #555; font-size: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #eee; }
.btn-cancel { padding: 10px 20px; background: #f0f0f5; border: none; border-radius: 8px; cursor: pointer; }
.btn-confirm { padding: 10px 20px; background: #6366f1; color: #fff; border: none; border-radius: 8px; cursor: pointer; }` }
      ]})
    },
    // ======================== FILE UPLOAD (Express) ========================
    {
      keywords: ['upload', 'file upload', 'multer', 'image upload'],
      category: 'Node.js / Express',
      generate: () => ({ files: [
        { filename: 'uploadServer.js', code: `const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: JPEG, PNG, GIF, PDF'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Single file upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    message: 'File uploaded successfully',
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: \`/uploads/\${req.file.filename}\`
    }
  });
});

// Multiple files upload
app.post('/api/upload-multiple', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const files = req.files.map(f => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
    path: \`/uploads/\${f.filename}\`
  }));
  res.json({ message: \`\${files.length} files uploaded\`, files });
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Error handler for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

const PORT = 3000;
app.listen(PORT, () => console.log(\`Upload server on http://localhost:\${PORT}\`));` },
        { filename: 'package.json', code: `{
  "name": "file-upload-api",
  "version": "1.0.0",
  "scripts": { "start": "node uploadServer.js", "dev": "nodemon uploadServer.js" },
  "dependencies": { "cors": "^2.8.5", "express": "^4.18.2", "multer": "^1.4.5-lts.1" },
  "devDependencies": { "nodemon": "^3.0.0" }
}` }
      ]})
    },
    // ======================== SOCKET.IO / CHAT ========================
    {
      keywords: ['chat', 'socket', 'realtime', 'websocket', 'real-time'],
      category: 'Node.js / Socket.IO',
      generate: () => ({ files: [
        { filename: 'chatServer.js', code: `const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const users = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (username) => {
    users.set(socket.id, username);
    io.emit('userList', Array.from(users.values()));
    socket.broadcast.emit('message', {
      user: 'System',
      text: \`\${username} joined the chat\`,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('message', (text) => {
    const username = users.get(socket.id) || 'Anonymous';
    io.emit('message', {
      user: username,
      text,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('typing', () => {
    const username = users.get(socket.id);
    if (username) {
      socket.broadcast.emit('typing', username);
    }
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    if (username) {
      io.emit('userList', Array.from(users.values()));
      io.emit('message', {
        user: 'System',
        text: \`\${username} left the chat\`,
        timestamp: new Date().toISOString()
      });
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(\`Chat server on http://localhost:\${PORT}\`));` },
        { filename: 'package.json', code: `{
  "name": "chat-server",
  "version": "1.0.0",
  "scripts": { "start": "node chatServer.js", "dev": "nodemon chatServer.js" },
  "dependencies": { "cors": "^2.8.5", "express": "^4.18.2", "socket.io": "^4.7.0" },
  "devDependencies": { "nodemon": "^3.0.0" }
}` }
      ]})
    },
    // ======================== ENV CONFIG ========================
    {
      keywords: ['env', 'config', 'environment', 'dotenv', 'configuration'],
      category: 'Node.js',
      generate: () => ({ files: [
        { filename: 'config.js', code: `require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  }
};

// Validate required vars in production
if (config.isProduction) {
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(\`Missing required environment variables: \${missing.join(', ')}\`);
  }
}

module.exports = config;` },
        { filename: '.env.example', code: `# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/myapp

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:4200` }
      ]})
    }
  ];

  generate(prompt: string): GeneratedCode {
    const lower = prompt.toLowerCase();

    for (const template of this.templates) {
      if (template.keywords.some(kw => lower.includes(kw))) {
        const name = this.extractName(lower, template.keywords);
        return template.generate(name);
      }
    }

    // Default generic component
    const name = this.kebab(prompt.split(' ').slice(0, 3).join(' '));
    return this.genericComponent(name, prompt);
  }

  getCategories(): string[] {
    return [...new Set(this.templates.map(t => t.category))];
  }

  getKeywords(): string[] {
    return this.templates.flatMap(t => t.keywords);
  }

  private genericComponent(name: string, desc: string): GeneratedCode {
    const p = this.pascal(name);
    return { files: [
      { filename: `${name}.component.ts`, code: `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './${name}.component.html',
  styleUrl: './${name}.component.css'
})
export class ${p}Component {
  title = '${p}';
  // TODO: Implement logic for: ${desc}
}` },
      { filename: `${name}.component.html`, code: `<div class="${name}-container">
  <h2>{{ title }}</h2>
  <p>Component for: ${desc}</p>
</div>` },
      { filename: `${name}.component.css`, code: `.${name}-container { padding: 24px; max-width: 800px; margin: 0 auto; }
h2 { font-size: 22px; color: #1a1a2e; margin-bottom: 16px; }` }
    ]};
  }

  private extractName(prompt: string, keywords: string[]): string {
    for (const kw of keywords) {
      if (prompt.includes(kw)) return this.kebab(kw);
    }
    return 'my-component';
  }

  pascal(str: string): string {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  private kebab(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
