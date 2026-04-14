/**
 * Seed COMPLETE full-stack knowledge — Angular frontend + Node/Express backend + MongoDB.
 * Covers project creation, structure, every file, every pattern.
 *
 * Run: node seed-fullstack.js
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const { KnowledgeEntry, DirectAnswer } = require('./models/Knowledge');

// =====================================================================
// FULL-STACK PROJECT CREATION KNOWLEDGE
// =====================================================================

const FULLSTACK_ENTRIES = [
  // ===== PROJECT SETUP =====
  {
    topic: 'create-angular-project', category: 'Full-Stack Guide',
    keywords: ['create angular project', 'new angular project', 'angular project setup', 'ng new', 'start angular', 'angular from scratch', 'angular project'],
    title: 'Create Angular Project from Scratch',
    summary: 'Complete step-by-step guide to create a new Angular 17+ project with standalone components, routing, and production-ready structure.',
    details: `## Step 1: Install Angular CLI
\`\`\`bash
npm install -g @angular/cli
\`\`\`

## Step 2: Create Project
\`\`\`bash
ng new my-app --standalone --routing --style=css
cd my-app
\`\`\`

## Step 3: Project Structure Created
\`\`\`
my-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts      # Root component
│   │   ├── app.config.ts         # App configuration
│   │   ├── app.routes.ts         # Route definitions
│   │   ├── components/           # Feature components
│   │   ├── services/             # Shared services
│   │   ├── guards/               # Route guards
│   │   └── models/               # TypeScript interfaces
│   ├── assets/                   # Static files
│   ├── index.html                # Entry HTML
│   ├── main.ts                   # Bootstrap
│   └── styles.css                # Global styles
├── angular.json                  # CLI config
├── package.json
└── tsconfig.json
\`\`\`

## Step 4: Run Dev Server
\`\`\`bash
ng serve --open    # Opens http://localhost:4200
\`\`\`

## Step 5: Generate Components & Services
\`\`\`bash
ng g c components/header
ng g c components/login
ng g c components/dashboard
ng g c components/user-list
ng g s services/auth
ng g s services/api
ng g guard guards/auth
\`\`\``,
    examples: [
`\`\`\`bash
# Complete project setup in one go:
ng new my-app --standalone --routing --style=css
cd my-app
ng g c components/header
ng g c components/login
ng g c components/register
ng g c components/dashboard
ng g c components/home
ng g s services/auth
ng g s services/api
ng g s services/user
ng serve --open
\`\`\``
    ],
    related: ['angular-project-structure', 'angular-app-component', 'angular-routing-setup']
  },

  {
    topic: 'angular-project-structure', category: 'Full-Stack Guide',
    keywords: ['angular structure', 'project structure', 'folder structure', 'angular architecture', 'angular folders'],
    title: 'Angular Project Structure & Architecture',
    summary: 'Best practice folder structure for Angular apps with components, services, guards, models, and shared modules.',
    details: `## Recommended Structure
\`\`\`
src/app/
├── components/
│   ├── header/
│   │   ├── header.component.ts
│   │   ├── header.component.html
│   │   └── header.component.css
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── home/
│   ├── profile/
│   ├── user-list/
│   └── not-found/
├── services/
│   ├── auth.service.ts         # Login, register, token management
│   ├── api.service.ts          # HTTP calls wrapper
│   ├── user.service.ts         # User CRUD
│   └── notification.service.ts # Toast/alert messages
├── guards/
│   └── auth.guard.ts           # Route protection
├── interceptors/
│   └── auth.interceptor.ts     # Auto-attach JWT to requests
├── models/
│   ├── user.model.ts           # User interface
│   └── api-response.model.ts   # API response interface
├── app.component.ts
├── app.config.ts
└── app.routes.ts
\`\`\`

## Key Principles
- **One component per folder** with .ts, .html, .css
- **Services are singletons** (providedIn: 'root')
- **Models are interfaces** (no classes for DTOs)
- **Guards protect routes** using canActivate
- **Interceptors add JWT** to every HTTP request`,
    related: ['create-angular-project', 'angular-app-component']
  },

  {
    topic: 'angular-app-component', category: 'Full-Stack Guide',
    keywords: ['app component', 'root component', 'app.component.ts', 'angular root', 'app module'],
    title: 'Angular App Component & Config',
    summary: 'The root app.component.ts, app.config.ts, and main.ts files that bootstrap an Angular application.',
    details: `## main.ts
\`\`\`typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
\`\`\`

## app.config.ts
\`\`\`typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ]
};
\`\`\`

## app.component.ts
\`\`\`typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: \\\`
    <app-header></app-header>
    <main class="container">
      <router-outlet></router-outlet>
    </main>
  \\\`,
  styles: [\\\`
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
  \\\`]
})
export class AppComponent { }
\`\`\``,
    related: ['angular-routing-setup', 'angular-auth-interceptor']
  },

  {
    topic: 'angular-routing-setup', category: 'Full-Stack Guide',
    keywords: ['angular routes', 'routing setup', 'app.routes.ts', 'lazy loading', 'route config', 'angular navigation'],
    title: 'Angular Routing Setup',
    summary: 'Complete routing configuration with lazy loading, auth guards, and child routes.',
    details: `## app.routes.ts
\`\`\`typescript
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component')
      .then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/dashboard.component')
      .then(m => m.DashboardComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile.component')
      .then(m => m.ProfileComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () => import('./components/user-list/user-list.component')
      .then(m => m.UserListComponent)
  },
  { path: '**', redirectTo: '' }
];
\`\`\`

## Auth Guard
\`\`\`typescript
// guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};
\`\`\``,
    related: ['angular-app-component', 'angular-auth-service']
  },

  {
    topic: 'angular-auth-service', category: 'Full-Stack Guide',
    keywords: ['auth service', 'login service', 'authentication service', 'token service', 'angular login', 'angular auth'],
    title: 'Angular Auth Service (Complete)',
    summary: 'Full authentication service with login, register, token storage, user state, and logout.',
    details: `## services/auth.service.ts
\`\`\`typescript
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:4100/api/auth';

  // Reactive state
  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);
  isLoggedIn = computed(() => !!this.token());

  constructor(private http: HttpClient, private router: Router) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.token.set(token);
      this.currentUser.set(JSON.parse(user));
    }
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(\\\`\${this.apiUrl}/register\\\`, { name, email, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(\\\`\${this.apiUrl}/login\\\`, { email, password })
      .pipe(tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.token.set(res.token);
        this.currentUser.set(res.user);
      }));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.token();
  }
}
\`\`\``,
    related: ['angular-auth-interceptor', 'angular-login-component', 'angular-routing-setup']
  },

  {
    topic: 'angular-auth-interceptor', category: 'Full-Stack Guide',
    keywords: ['interceptor', 'auth interceptor', 'jwt interceptor', 'http interceptor', 'token header', 'authorization header'],
    title: 'Angular Auth Interceptor',
    summary: 'HTTP interceptor that automatically attaches JWT token to every outgoing API request.',
    details: `## interceptors/auth.interceptor.ts
\`\`\`typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: \\\`Bearer \${token}\\\` }
    });
    return next(cloned);
  }

  return next(req);
};
\`\`\`

## Register in app.config.ts
\`\`\`typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

providers: [
  provideHttpClient(withInterceptors([authInterceptor])),
]
\`\`\``,
    related: ['angular-auth-service', 'angular-app-component']
  },

  {
    topic: 'angular-login-component', category: 'Full-Stack Guide',
    keywords: ['login component', 'login page', 'login form', 'angular login', 'sign in', 'signin'],
    title: 'Angular Login Component (Complete)',
    summary: 'Full login component with form, validation, error handling, loading state, and redirect after success.',
    details: `## components/login/login.component.ts
\`\`\`typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: \\\`
    <div class="auth-container">
      <div class="auth-card">
        <h2>Sign In</h2>

        <div class="alert error" *ngIf="error">{{ error }}</div>

        <form (ngSubmit)="login()">
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email"
                   placeholder="Enter your email" required />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password"
                   placeholder="Enter password" required />
          </div>

          <button type="submit" [disabled]="loading || !email || !password">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <p class="link">Don't have an account? <a routerLink="/register">Register</a></p>
      </div>
    </div>
  \\\`,
  styles: [\\\`
    .auth-container { display: flex; justify-content: center; padding: 60px 20px; }
    .auth-card { width: 400px; padding: 32px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    h2 { margin: 0 0 24px; color: #333; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 6px; font-size: 14px; color: #555; }
    input { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    input:focus { outline: none; border-color: #6366f1; }
    button { width: 100%; padding: 12px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px; }
    button:hover:not(:disabled) { background: #4f46e5; }
    button:disabled { opacity: 0.5; }
    .alert { padding: 10px; border-radius: 8px; margin-bottom: 16px; }
    .alert.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .link { text-align: center; margin-top: 16px; font-size: 14px; }
    .link a { color: #6366f1; text-decoration: none; }
  \\\`]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn()) this.router.navigate(['/dashboard']);
  }

  login(): void {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err.error?.error || 'Login failed';
        this.loading = false;
      },
      complete: () => this.loading = false,
    });
  }
}
\`\`\``,
    related: ['angular-register-component', 'angular-auth-service']
  },

  {
    topic: 'angular-register-component', category: 'Full-Stack Guide',
    keywords: ['register component', 'registration', 'signup', 'sign up', 'create account', 'angular register'],
    title: 'Angular Register Component (Complete)',
    summary: 'Full registration component with name, email, password, confirm password, validation, and error handling.',
    details: `## components/register/register.component.ts
\`\`\`typescript
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: \\\`
    <div class="auth-container">
      <div class="auth-card">
        <h2>Create Account</h2>
        <div class="alert error" *ngIf="error">{{ error }}</div>
        <div class="alert success" *ngIf="success">{{ success }}</div>

        <form (ngSubmit)="register()">
          <div class="form-group">
            <label>Full Name</label>
            <input [(ngModel)]="name" name="name" placeholder="Your name" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" placeholder="Email" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="Min 6 characters" required />
          </div>
          <div class="form-group">
            <label>Confirm Password</label>
            <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required />
          </div>
          <button type="submit" [disabled]="loading">
            {{ loading ? 'Creating...' : 'Create Account' }}
          </button>
        </form>
        <p class="link">Already have an account? <a routerLink="/login">Sign In</a></p>
      </div>
    </div>
  \\\`
})
export class RegisterComponent {
  name = ''; email = ''; password = ''; confirmPassword = '';
  loading = false; error = ''; success = '';

  constructor(private auth: AuthService, private router: Router) {}

  register(): void {
    this.error = '';
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match'; return;
    }
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters'; return;
    }
    this.loading = true;
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: (res) => {
        this.success = res.message;
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => { this.error = err.error?.error || 'Registration failed'; this.loading = false; },
    });
  }
}
\`\`\``,
    related: ['angular-login-component', 'angular-auth-service']
  },

  {
    topic: 'angular-dashboard-component', category: 'Full-Stack Guide',
    keywords: ['dashboard', 'dashboard component', 'angular dashboard', 'home page', 'main page', 'after login'],
    title: 'Angular Dashboard Component',
    summary: 'Dashboard component showing user info, stats cards, and data fetched from the API after login.',
    details: `## components/dashboard/dashboard.component.ts
\`\`\`typescript
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \\\`
    <div class="dashboard">
      <h1>Welcome, {{ user()?.name }}</h1>
      <p class="subtitle">{{ user()?.email }}</p>

      <div class="stats-grid">
        <div class="stat-card">
          <h3>{{ stats().users }}</h3>
          <p>Users</p>
        </div>
        <div class="stat-card">
          <h3>{{ stats().projects }}</h3>
          <p>Projects</p>
        </div>
        <div class="stat-card">
          <h3>{{ stats().tasks }}</h3>
          <p>Tasks</p>
        </div>
      </div>
    </div>
  \\\`,
  styles: [\\\`
    .dashboard { padding: 20px; }
    h1 { font-size: 28px; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat-card { background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center; }
    .stat-card h3 { font-size: 36px; color: #6366f1; margin: 0; }
    .stat-card p { color: #666; margin: 8px 0 0; }
  \\\`]
})
export class DashboardComponent {
  private auth = inject(AuthService);
  user = this.auth.currentUser;
  stats = signal({ users: 0, projects: 0, tasks: 0 });

  constructor() {
    // Fetch stats from API
    inject(HttpClient).get<any>('/api/stats').subscribe({
      next: (data) => this.stats.set(data),
      error: () => this.stats.set({ users: 12, projects: 5, tasks: 34 }),
    });
  }
}
\`\`\``,
    related: ['angular-auth-service', 'angular-header-component']
  },

  {
    topic: 'angular-header-component', category: 'Full-Stack Guide',
    keywords: ['header', 'navbar', 'navigation', 'nav bar', 'header component', 'angular header', 'menu'],
    title: 'Angular Header/Navbar Component',
    summary: 'Navigation header with logo, links, user menu, and login/logout button that reacts to auth state.',
    details: `## components/header/header.component.ts
\`\`\`typescript
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: \\\`
    <nav class="navbar">
      <a routerLink="/" class="logo">MyApp</a>

      <div class="nav-links" *ngIf="auth.isLoggedIn()">
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/users" routerLinkActive="active">Users</a>
        <a routerLink="/profile" routerLinkActive="active">Profile</a>
      </div>

      <div class="nav-right">
        <ng-container *ngIf="auth.isLoggedIn(); else loginLinks">
          <span class="user-name">{{ auth.currentUser()?.name }}</span>
          <button class="btn-logout" (click)="auth.logout()">Logout</button>
        </ng-container>
        <ng-template #loginLinks>
          <a routerLink="/login" class="btn-login">Sign In</a>
          <a routerLink="/register" class="btn-register">Register</a>
        </ng-template>
      </div>
    </nav>
  \\\`,
  styles: [\\\`
    .navbar { display: flex; align-items: center; padding: 0 24px; height: 56px; background: #fff; border-bottom: 1px solid #e5e7eb; }
    .logo { font-size: 20px; font-weight: 700; color: #6366f1; text-decoration: none; margin-right: 32px; }
    .nav-links { display: flex; gap: 16px; }
    .nav-links a { color: #666; text-decoration: none; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
    .nav-links a.active, .nav-links a:hover { color: #6366f1; background: #eef2ff; }
    .nav-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .user-name { font-size: 14px; color: #333; }
    .btn-logout { background: none; border: 1px solid #dc2626; color: #dc2626; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn-login { color: #6366f1; text-decoration: none; font-size: 14px; }
    .btn-register { background: #6366f1; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; }
  \\\`]
})
export class HeaderComponent {
  auth = inject(AuthService);
}
\`\`\``,
    related: ['angular-app-component', 'angular-auth-service']
  },

  {
    topic: 'angular-crud-service', category: 'Full-Stack Guide',
    keywords: ['crud service', 'api service', 'http service', 'angular crud', 'data service', 'angular http'],
    title: 'Angular CRUD Service',
    summary: 'Generic HTTP service for CRUD operations (Create, Read, Update, Delete) against a REST API.',
    details: `## services/api.service.ts
\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:4100/api';

  // Generic CRUD
  getAll<T>(endpoint: string): Observable<T[]> {
    return this.http.get<T[]>(\\\`\${this.baseUrl}/\${endpoint}\\\`);
  }

  getById<T>(endpoint: string, id: string): Observable<T> {
    return this.http.get<T>(\\\`\${this.baseUrl}/\${endpoint}/\${id}\\\`);
  }

  create<T>(endpoint: string, data: Partial<T>): Observable<T> {
    return this.http.post<T>(\\\`\${this.baseUrl}/\${endpoint}\\\`, data);
  }

  update<T>(endpoint: string, id: string, data: Partial<T>): Observable<T> {
    return this.http.put<T>(\\\`\${this.baseUrl}/\${endpoint}/\${id}\\\`, data);
  }

  delete(endpoint: string, id: string): Observable<void> {
    return this.http.delete<void>(\\\`\${this.baseUrl}/\${endpoint}/\${id}\\\`);
  }
}
\`\`\`

## Usage in Component
\`\`\`typescript
export class UserListComponent {
  private api = inject(ApiService);
  users = signal<User[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.getAll<User>('users').subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  deleteUser(id: string) {
    this.api.delete('users', id).subscribe(() => {
      this.users.update(list => list.filter(u => u._id !== id));
    });
  }
}
\`\`\``,
    related: ['angular-auth-service', 'express-crud-routes']
  },

  {
    topic: 'angular-crud-component', category: 'Full-Stack Guide',
    keywords: ['crud component', 'data table', 'list component', 'user list', 'angular table', 'crud ui'],
    title: 'Angular CRUD List Component',
    summary: 'Full data table component with list, add, edit, delete, search, and loading states.',
    details: `## components/user-list/user-list.component.ts
\`\`\`typescript
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \\\`
    <div class="page">
      <div class="page-header">
        <h2>Users</h2>
        <button class="btn-primary" (click)="showForm = true">+ Add User</button>
      </div>

      <input class="search" [(ngModel)]="searchQuery" placeholder="Search users..." />

      <div class="form-card" *ngIf="showForm">
        <input [(ngModel)]="form.name" placeholder="Name" />
        <input [(ngModel)]="form.email" placeholder="Email" type="email" />
        <div class="form-actions">
          <button class="btn-primary" (click)="save()">{{ editing ? 'Update' : 'Create' }}</button>
          <button class="btn-secondary" (click)="cancelForm()">Cancel</button>
        </div>
      </div>

      <table *ngIf="!loading()">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let user of filteredUsers()">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td><span class="badge">{{ user.role }}</span></td>
            <td>
              <button class="btn-sm" (click)="edit(user)">Edit</button>
              <button class="btn-sm btn-danger" (click)="remove(user._id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="loading()">Loading...</p>
    </div>
  \\\`
})
export class UserListComponent {
  private api = inject(ApiService);
  users = signal<User[]>([]);
  loading = signal(true);
  searchQuery = '';
  showForm = false;
  editing = false;
  editId = '';
  form = { name: '', email: '' };

  filteredUsers = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.users().filter(u => u.name.toLowerCase().includes(q) || u.email.includes(q));
  });

  ngOnInit() {
    this.api.getAll<User>('users').subscribe({
      next: (d) => { this.users.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  save() {
    const obs = this.editing
      ? this.api.update<User>('users', this.editId, this.form)
      : this.api.create<User>('users', this.form);
    obs.subscribe(user => {
      if (this.editing) {
        this.users.update(list => list.map(u => u._id === this.editId ? user : u));
      } else {
        this.users.update(list => [...list, user]);
      }
      this.cancelForm();
    });
  }

  edit(user: User) {
    this.form = { name: user.name, email: user.email };
    this.editId = user._id; this.editing = true; this.showForm = true;
  }

  remove(id: string) {
    if (confirm('Delete this user?')) {
      this.api.delete('users', id).subscribe(() => {
        this.users.update(list => list.filter(u => u._id !== id));
      });
    }
  }

  cancelForm() { this.showForm = false; this.editing = false; this.form = { name: '', email: '' }; }
}
\`\`\``,
    related: ['angular-crud-service', 'express-crud-routes']
  },

  // ===== BACKEND =====
  {
    topic: 'create-express-backend', category: 'Full-Stack Guide',
    keywords: ['create backend', 'express backend', 'node backend', 'backend setup', 'server setup', 'api server', 'create server'],
    title: 'Create Express Backend from Scratch',
    summary: 'Complete Express.js backend setup with MongoDB, auth routes, CRUD routes, middleware, and error handling.',
    details: `## Step 1: Initialize
\`\`\`bash
mkdir backend && cd backend
npm init -y
npm install express mongoose cors bcryptjs jsonwebtoken dotenv
npm install -D nodemon
\`\`\`

## Step 2: Package.json Scripts
\`\`\`json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
\`\`\`

## Step 3: Project Structure
\`\`\`
backend/
├── server.js           # Entry point
├── config/
│   └── db.js           # MongoDB connection
├── models/
│   └── User.js         # User model
├── routes/
│   ├── auth.js         # Register, login
│   └── users.js        # CRUD users
├── middleware/
│   └── auth.js         # JWT verification
├── .env                # Secrets
└── package.json
\`\`\`

## Step 4: server.js
\`\`\`javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => console.log(\\\`Server running on port \${PORT}\\\`));
\`\`\``,
    related: ['express-db-config', 'express-user-model', 'express-auth-routes', 'express-crud-routes']
  },

  {
    topic: 'express-db-config', category: 'Full-Stack Guide',
    keywords: ['mongodb connection', 'mongoose connect', 'database config', 'db config', 'connect database'],
    title: 'Express MongoDB Connection Config',
    summary: 'MongoDB connection setup with mongoose, error handling, and DNS fix for Atlas.',
    details: `## config/db.js
\`\`\`javascript
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Fix DNS for Atlas

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myapp', {
      family: 4,
    });
    console.log('MongoDB connected:', conn.connection.host);
  } catch (err) {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
\`\`\`

## .env
\`\`\`
PORT=4100
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/mydb?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-change-this
\`\`\``,
    related: ['create-express-backend', 'express-user-model']
  },

  {
    topic: 'express-user-model', category: 'Full-Stack Guide',
    keywords: ['user model', 'mongoose model', 'user schema', 'database model', 'express model'],
    title: 'Express User Model (Mongoose)',
    summary: 'Complete User model with name, email, password hashing, role, timestamps, and validation.',
    details: `## models/User.js
\`\`\`javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, 'Invalid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false, // Don't include in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  avatar: { type: String, default: '' },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
\`\`\``,
    related: ['express-auth-routes', 'express-db-config']
  },

  {
    topic: 'express-auth-routes', category: 'Full-Stack Guide',
    keywords: ['auth routes', 'login route', 'register route', 'express auth', 'authentication routes', 'jwt routes'],
    title: 'Express Auth Routes (Register + Login)',
    summary: 'Complete authentication routes with registration, login, JWT token generation, and token verification middleware.',
    details: `## routes/auth.js
\`\`\`javascript
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
});

module.exports = router;
\`\`\`

## middleware/auth.js
\`\`\`javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
\`\`\``,
    related: ['express-user-model', 'express-crud-routes']
  },

  {
    topic: 'express-crud-routes', category: 'Full-Stack Guide',
    keywords: ['crud routes', 'express crud', 'rest routes', 'api routes', 'user routes', 'crud api'],
    title: 'Express CRUD Routes',
    summary: 'Complete REST CRUD routes: GET all, GET by ID, POST create, PUT update, DELETE.',
    details: `## routes/users.js
\`\`\`javascript
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET all users
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create user
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const user = await User.create({ name, email, password: password || 'default123', role });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already exists' });
    res.status(400).json({ error: err.message });
  }
});

// PUT update user
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE user
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
\`\`\``,
    related: ['express-auth-routes', 'express-user-model', 'angular-crud-service']
  },

  {
    topic: 'fullstack-project-complete', category: 'Full-Stack Guide',
    keywords: ['full stack', 'fullstack', 'complete project', 'angular express mongodb', 'mern', 'mean', 'end to end', 'frontend backend'],
    title: 'Complete Full-Stack Project (Angular + Express + MongoDB)',
    summary: 'Step-by-step guide to build a complete full-stack application with Angular frontend, Express API, MongoDB database, JWT auth, and CRUD operations.',
    details: `## Architecture
\`\`\`
[Angular Frontend :4200]  ←→  [Express API :4100]  ←→  [MongoDB Atlas]
     Components                   Routes                  Collections
     Services                     Middleware               Schemas
     Guards                       Models
     Interceptors
\`\`\`

## Build Steps
1. **Backend first:**
   \`\`\`bash
   mkdir my-project && cd my-project
   mkdir backend && cd backend
   npm init -y
   npm install express mongoose cors bcryptjs jsonwebtoken dotenv
   # Create: server.js, config/db.js, models/User.js, routes/auth.js, routes/users.js, middleware/auth.js
   node server.js
   \`\`\`

2. **Frontend:**
   \`\`\`bash
   cd .. && ng new frontend --standalone --routing --style=css
   cd frontend
   ng g c components/login
   ng g c components/register
   ng g c components/dashboard
   ng g c components/header
   ng g c components/user-list
   ng g s services/auth
   ng g s services/api
   # Create: guards/auth.guard.ts, interceptors/auth.interceptor.ts
   # Update: app.config.ts, app.routes.ts, app.component.ts
   ng serve
   \`\`\`

3. **Connect:**
   - Frontend calls \`http://localhost:4100/api/...\`
   - Auth interceptor adds JWT to all requests
   - Auth guard protects routes
   - Services handle HTTP calls

## Key Files Checklist
**Backend:**
- [ ] server.js — Express app, cors, routes
- [ ] config/db.js — MongoDB connection
- [ ] models/User.js — Schema + password hashing
- [ ] routes/auth.js — Register, login, /me
- [ ] routes/users.js — CRUD
- [ ] middleware/auth.js — JWT verify
- [ ] .env — MONGO_URI, JWT_SECRET

**Frontend:**
- [ ] app.config.ts — provideRouter, provideHttpClient
- [ ] app.routes.ts — All routes with guards
- [ ] app.component.ts — RouterOutlet + Header
- [ ] services/auth.service.ts — Login, register, token
- [ ] services/api.service.ts — Generic CRUD
- [ ] guards/auth.guard.ts — Route protection
- [ ] interceptors/auth.interceptor.ts — JWT header
- [ ] components/header — Navbar
- [ ] components/login — Login form
- [ ] components/register — Register form
- [ ] components/dashboard — After login
- [ ] components/user-list — CRUD table`,
    related: ['create-angular-project', 'create-express-backend']
  },

  // ===== GLOBAL STYLES =====
  {
    topic: 'angular-global-styles', category: 'Full-Stack Guide',
    keywords: ['global styles', 'styles.css', 'angular css', 'theme', 'dark theme', 'global css'],
    title: 'Angular Global Styles',
    summary: 'Production-ready global styles with CSS variables, reset, dark/light theme, and responsive utilities.',
    details: `## styles.css
\`\`\`css
/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Variables */
:root {
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --bg: #f9fafb;
  --card: #ffffff;
  --text: #111827;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --danger: #dc2626;
  --success: #16a34a;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Buttons */
.btn { padding: 10px 20px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-secondary { background: var(--border); color: var(--text); }

/* Cards */
.card { background: var(--card); border-radius: 12px; padding: 24px; box-shadow: var(--shadow); }

/* Forms */
.input { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; }
.input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

/* Grid */
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
}
\`\`\``,
    related: ['angular-app-component', 'css']
  },
];

// =====================================================================
// DIRECT ANSWERS FOR PROJECT CREATION
// =====================================================================

const FULLSTACK_DIRECT_ANSWERS = [
  {
    patterns: ['create.*angular.*project', 'new.*angular.*project', 'angular.*project.*create', 'start.*angular.*project', 'setup.*angular.*project'],
    answer: `**Create Angular Project:**

\`\`\`bash
# 1. Install CLI
npm install -g @angular/cli

# 2. Create project
ng new my-app --standalone --routing --style=css
cd my-app

# 3. Generate components
ng g c components/header
ng g c components/login
ng g c components/register
ng g c components/dashboard
ng g c components/user-list

# 4. Generate services
ng g s services/auth
ng g s services/api

# 5. Run
ng serve --open
\`\`\`

App opens at **http://localhost:4200**`,
    topic: 'create-angular-project', priority: 20
  },
  {
    patterns: ['create.*backend', 'create.*server', 'express.*setup', 'node.*backend.*create', 'backend.*from.*scratch', 'setup.*express'],
    answer: `**Create Express Backend:**

\`\`\`bash
mkdir backend && cd backend
npm init -y
npm install express mongoose cors bcryptjs jsonwebtoken dotenv
npm install -D nodemon
\`\`\`

Create **server.js**:
\`\`\`javascript
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

app.listen(4100, () => console.log('Server :4100'));
\`\`\`

Then create: \`models/User.js\`, \`routes/auth.js\`, \`routes/users.js\`, \`middleware/auth.js\``,
    topic: 'create-express-backend', priority: 20
  },
  {
    patterns: ['fullstack.*project', 'full.*stack.*project', 'angular.*express.*mongo', 'complete.*project', 'build.*project.*frontend.*backend', 'create.*project.*frontend.*backend'],
    answer: `**Full-Stack Project (Angular + Express + MongoDB):**

**Backend:**
\`\`\`bash
mkdir my-project && cd my-project
mkdir backend && cd backend
npm init -y
npm install express mongoose cors bcryptjs jsonwebtoken dotenv
# Create: server.js, config/db.js, models/User.js, routes/auth.js, routes/users.js, middleware/auth.js
node server.js
\`\`\`

**Frontend:**
\`\`\`bash
cd ..
ng new frontend --standalone --routing --style=css
cd frontend
ng g c components/header && ng g c components/login && ng g c components/register
ng g c components/dashboard && ng g c components/user-list
ng g s services/auth && ng g s services/api
ng serve
\`\`\`

**Architecture:** Angular(:4200) → Express API(:4100) → MongoDB Atlas

Ask me about any specific file: "auth service", "login component", "user model", "crud routes"`,
    topic: 'fullstack-project-complete', priority: 25
  },
  {
    patterns: ['angular.*interceptor', 'http.*interceptor', 'jwt.*interceptor', 'add.*token.*header', 'authorization.*header'],
    answer: `**Auth Interceptor (auto-attach JWT):**

\`\`\`typescript
// interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } });
  }
  return next(req);
};
\`\`\`

Register in **app.config.ts**:
\`\`\`typescript
provideHttpClient(withInterceptors([authInterceptor]))
\`\`\``,
    topic: 'angular-auth-interceptor', priority: 15
  },
  {
    patterns: ['angular.*guard', 'auth.*guard', 'route.*guard', 'protect.*route', 'canactivate'],
    answer: `**Auth Guard:**

\`\`\`typescript
// guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};
\`\`\`

Use in routes:
\`\`\`typescript
{ path: 'dashboard', canActivate: [authGuard], loadComponent: () => ... }
\`\`\``,
    topic: 'angular-routing-setup', priority: 15
  },
  {
    patterns: ['mongoose.*schema', 'create.*model', 'user.*model', 'mongodb.*model', 'schema.*define'],
    answer: `**Mongoose User Model:**

\`\`\`javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
\`\`\``,
    topic: 'express-user-model', priority: 15
  },
  {
    patterns: ['express.*middleware', 'auth.*middleware', 'verify.*token.*middleware', 'jwt.*middleware'],
    answer: `**JWT Auth Middleware:**

\`\`\`javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
\`\`\`

Use: \`router.get('/profile', auth, handler)\``,
    topic: 'express-auth-routes', priority: 15
  },
];

// =====================================================================
// SEED
// =====================================================================

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  // Insert entries (upsert to avoid duplicates)
  let inserted = 0, updated = 0;
  for (const entry of FULLSTACK_ENTRIES) {
    const result = await KnowledgeEntry.findOneAndUpdate(
      { topic: entry.topic },
      entry,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++;
    else updated++;
  }
  console.log(`Knowledge entries: ${inserted} inserted, ${updated} updated`);

  // Insert direct answers (upsert by first pattern)
  let daInserted = 0, daUpdated = 0;
  for (const da of FULLSTACK_DIRECT_ANSWERS) {
    const result = await DirectAnswer.findOneAndUpdate(
      { patterns: da.patterns[0] },
      da,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) daInserted++;
    else daUpdated++;
  }
  console.log(`Direct answers: ${daInserted} inserted, ${daUpdated} updated`);

  // Summary
  const totalEntries = await KnowledgeEntry.countDocuments();
  const totalAnswers = await DirectAnswer.countDocuments();
  const cats = await KnowledgeEntry.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  console.log(`\n=== Database Summary ===`);
  console.log(`Total knowledge entries: ${totalEntries}`);
  console.log(`Total direct answers: ${totalAnswers}`);
  console.log(`Categories:`);
  for (const c of cats) console.log(`  ${c._id}: ${c.count}`);
  console.log(`========================\n`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
