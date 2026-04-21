import { Injectable } from '@angular/core';

/**
 * Project Templates Service
 *
 * Provides full file scaffolding for common project types.
 * Each template is a flat list of { path, content } where path is
 * relative to the project root.
 */

export interface TemplateFile {
  path: string;
  content: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  files: TemplateFile[];
}

@Injectable({ providedIn: 'root' })
export class ProjectTemplatesService {

  /**
   * Get template by ID.
   */
  getTemplate(id: string): ProjectTemplate | null {
    const templates: Record<string, () => ProjectTemplate> = {
      'angular-fullstack': () => this.angularFullStack(),
      'angular-only': () => this.angularOnly(),
      'express-only': () => this.expressOnly(),
      'angular': () => this.angularOnly(),
      'express': () => this.expressOnly(),
      'fullstack': () => this.angularFullStack(),
      'add-otp': () => this.addOtpTemplate(),
      'otp': () => this.addOtpTemplate(),
      'add-login': () => this.addLoginTemplate(),
      'add-auth': () => this.addLoginTemplate(),
      'angular-todo': () => this.angularTodoApp(),
      'todo': () => this.angularTodoApp(),
      'angular-counter': () => this.angularCounterApp(),
      'counter': () => this.angularCounterApp(),
      'angular-calculator': () => this.angularCalculatorApp(),
      'calculator': () => this.angularCalculatorApp(),
      'angular-notes': () => this.angularNotesApp(),
      'notes': () => this.angularNotesApp(),
      'angular-number-guess': () => this.angularNumberGuessApp(),
      'number-guess': () => this.angularNumberGuessApp(),
      'angular-tictactoe': () => this.angularTicTacToeApp(),
      'tictactoe': () => this.angularTicTacToeApp(),
      'angular-stopwatch': () => this.angularStopwatchApp(),
      'stopwatch': () => this.angularStopwatchApp(),
      'angular-dice': () => this.angularDiceApp(),
      'dice': () => this.angularDiceApp(),
      'angular-quiz': () => this.angularQuizApp(),
      'quiz': () => this.angularQuizApp(),
      'angular-chess': () => this.angularChessApp(),
      'chess': () => this.angularChessApp(),
      'angular-snake': () => this.angularSnakeApp(),
      'snake': () => this.angularSnakeApp(),
      'angular-chatbot': () => this.angularChatbotApp(),
      'chatbot': () => this.angularChatbotApp(),
      'chat': () => this.angularChatbotApp(),
    };
    const gen = templates[id.toLowerCase()];
    if (gen) return gen();
    // Dynamic fallback — generate from user's idea
    if (id.startsWith('custom:')) {
      return this.dynamicAngularApp(id.slice('custom:'.length));
    }
    return null;
  }

  /**
   * Detect template from natural language.
   */
  detectTemplate(input: string): string | null {
    const q = input.toLowerCase();

    // Add login/auth to existing project
    const isAdd = q.includes('add') || q.includes('include') || q.includes('wire') || q.includes('integrate');
    if (isAdd && /\b(login|auth|authentication|sign\s*in|register|signup)\b/i.test(q) && /\b(page|screen|component|to\s+this|to\s+my|to\s+project)\b/i.test(q)) {
      return 'add-login';
    }

    // OTP addition (modifies existing project)
    const wantsOtp = q.includes('otp') || q.includes('verify email') || q.includes('email verification') || q.includes('verification code');
    const isAddEdit = q.includes('add') || q.includes('fix') || q.includes('update') || q.includes('enable') || q.includes('include') || q.includes('make') || q.includes('wire');
    if (wantsOtp && (isAddEdit || q.includes('missing') || q.includes('not working'))) {
      return 'add-otp';
    }

    // Purpose-specific Angular apps — check BEFORE generic angular-only
    if (/\btodo\b|\bto\s*do\b|\btodos\b|\btask.*(app|list|manager)|\bcheck.?list/i.test(q)) return 'angular-todo';
    if (/\bcounter\s*(app)?\b|\bincrement.*decrement|\bcount.*app\b/i.test(q)) return 'angular-counter';
    if (/\bcalculat(or|ion)\b/i.test(q)) return 'angular-calculator';
    if (/\bnotes?\s*(app)?\b|\bnote.*taking|\bsticky.*notes/i.test(q)) return 'angular-notes';
    if (/\bnumber.*guess|\bguess.*number|\bguessing.*game\b/i.test(q)) return 'angular-number-guess';
    if (/\btic.?tac.?toe\b|\bnoughts.*crosses\b|\bxox\b/i.test(q)) return 'angular-tictactoe';
    if (/\bstopwatch\b|\btimer.*app|\b(stop\s*watch)\b/i.test(q)) return 'angular-stopwatch';
    if (/\bdice.*roll|\broll.*dice\b|\bdice\s*(app|game)?\b/i.test(q)) return 'angular-dice';
    if (/\bquiz\b|\btrivia\b|\bmcq\b/i.test(q)) return 'angular-quiz';
    if (/\bchess\b|\bchessboard\b/i.test(q)) return 'angular-chess';
    if (/\bsnake\s*(game|app)?\b/i.test(q)) return 'angular-snake';
    if (/\bchat\s?bot\b|\bchatbot\b|\bchat\s*app\b|\b(ai\s+)?assistant\s*(app)?\b|\bchat\s*ui\b/i.test(q)) return 'angular-chatbot';

    // Fullstack
    if ((q.includes('angular') && (q.includes('express') || q.includes('backend') || q.includes('node') || q.includes('mongo') || q.includes('fullstack') || q.includes('full stack') || q.includes('full-stack')))) {
      return 'angular-fullstack';
    }
    if (q.includes('fullstack') || q.includes('full stack') || q.includes('full-stack')) return 'angular-fullstack';

    // Dynamic custom — if user says "angular X app/game/tool" with a noun, generate a custom starter
    if (q.includes('angular') || q.includes('create') || q.includes('build') || q.includes('generate')) {
      const idea = this.extractAppIdea(input);
      if (idea) return `custom:${idea}`;
    }

    if (q.includes('angular')) return 'angular-only';
    if (q.includes('express') || q.includes('node') && q.includes('backend')) return 'express-only';
    return null;
  }

  /**
   * Extract the "idea" from a prompt like "create angular number guessing game" → "number guessing game"
   */
  private extractAppIdea(input: string): string | null {
    let q = input.toLowerCase()
      .replace(/^(create|build|make|generate|scaffold|new|write|give\s*me|i\s*need|please)\s+/gi, '')
      .replace(/\b(a|an|the)\s+/g, '')
      .replace(/\bangular\b/g, '')
      .replace(/\bproject\b|\bapplication\b/g, 'app')
      .replace(/\bwith\b.*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    // If only "app" or "game" is left, not enough
    if (q.length < 3 || /^(app|game|tool|system|site|ui)$/.test(q)) return null;
    return q;
  }

  /**
   * Angular + Express + MongoDB full-stack project
   */
  private angularFullStack(): ProjectTemplate {
    return {
      id: 'angular-fullstack',
      name: 'Angular + Express + MongoDB Full-Stack',
      description: 'Complete full-stack app with auth, JWT, CRUD, guards, and interceptors',
      files: [
        ...this.angularFiles('frontend'),
        ...this.expressFiles('backend'),
        {
          path: 'README.md',
          content: `# My Full-Stack Project

Angular frontend + Express backend + MongoDB database.

## Setup

### Backend
\`\`\`bash
cd backend
npm install
# Create .env with MONGO_URI and JWT_SECRET
npm run dev
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
ng serve
\`\`\`

## Architecture

- **Frontend:** Angular 17 standalone components, signals, RxJS, guards, interceptors
- **Backend:** Express + Mongoose + JWT auth + bcrypt
- **Database:** MongoDB (Atlas or local)

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/auth/register | No | Register |
| POST | /api/auth/login | No | Login |
| GET | /api/auth/me | Yes | Current user |
| GET | /api/users | Yes | List users |
| GET | /api/users/:id | Yes | Get user |
| POST | /api/users | Yes | Create user |
| PUT | /api/users/:id | Yes | Update user |
| DELETE | /api/users/:id | Yes | Delete user |
`
        },
        {
          path: '.gitignore',
          content: `node_modules/
dist/
.angular/
*.log
.env
.DS_Store
coverage/
`
        },
      ],
    };
  }

  /**
   * Add OTP verification — modifies/adds files in an existing project
   * to wire email OTP verification on registration.
   */
  private addLoginTemplate(): ProjectTemplate {
    return {
      id: 'add-login',
      name: 'Login + Register Page (patch)',
      description: 'Adds login, register, auth service, guard, and interceptor to an existing Angular project',
      files: [
        {
          path: 'src/app/services/auth.service.ts',
          content: `import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface User { _id?: string; name: string; email: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:4100/api/auth';

  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);
  isLoggedIn = computed(() => !!this.token());

  constructor() {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t && u) { this.token.set(t); this.currentUser.set(JSON.parse(u)); }
  }

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post(this.apiUrl + '/register', { name, email, password });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/login', { email, password }).pipe(tap(res => {
      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.token.set(res.token);
        this.currentUser.set(res.user);
      }
    }));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null { return this.token(); }
}`
        },
        {
          path: 'src/app/guards/auth.guard.ts',
          content: `import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};`
        },
        {
          path: 'src/app/interceptors/auth.interceptor.ts',
          content: `import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: 'Bearer ' + token } });
  }
  return next(req);
};`
        },
        {
          path: 'src/app/components/login/login.component.ts',
          content: `import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: \`
    <div class="page">
      <div class="card">
        <h2>Sign In</h2>
        <div *ngIf="error" class="alert error">{{ error }}</div>
        <form (ngSubmit)="login()">
          <label>Email</label>
          <input type="email" [(ngModel)]="email" name="email" required />
          <label>Password</label>
          <input type="password" [(ngModel)]="password" name="password" required />
          <button type="submit" [disabled]="loading">{{ loading ? 'Signing in...' : 'Sign In' }}</button>
        </form>
        <p class="link">No account? <a routerLink="/register">Register</a></p>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);padding:20px; }
    .card { background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;width:400px;max-width:95vw; }
    h2 { color:#fff;margin:0 0 24px;font-size:22px; }
    label { display:block;color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px; }
    input { width:100%;padding:12px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:#fff;font-size:14px;outline:none;box-sizing:border-box; }
    input:focus { border-color:#818cf8; }
    button { width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-top:16px; }
    button:disabled { opacity:0.5; }
    .alert.error { padding:10px;background:rgba(239,68,68,0.12);color:#f87171;border-radius:8px;margin-bottom:12px; }
    .link { text-align:center;margin-top:16px;font-size:13px;color:rgba(255,255,255,.4); }
    .link a { color:#818cf8;text-decoration:none; }
  \`]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = ''; password = ''; loading = false; error = '';

  login() {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => { this.error = err.error?.error || 'Login failed'; this.loading = false; },
      complete: () => this.loading = false,
    });
  }
}`
        },
        {
          path: 'src/app/components/register/register.component.ts',
          content: `import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: \`
    <div class="page">
      <div class="card">
        <h2>Create Account</h2>
        <div *ngIf="error" class="alert error">{{ error }}</div>
        <div *ngIf="success" class="alert success">{{ success }}</div>
        <form (ngSubmit)="register()">
          <label>Name</label>
          <input [(ngModel)]="name" name="name" required />
          <label>Email</label>
          <input type="email" [(ngModel)]="email" name="email" required />
          <label>Password (min 6)</label>
          <input type="password" [(ngModel)]="password" name="password" required />
          <button type="submit" [disabled]="loading">{{ loading ? 'Creating...' : 'Create Account' }}</button>
        </form>
        <p class="link">Have an account? <a routerLink="/login">Sign In</a></p>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);padding:20px; }
    .card { background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;width:400px;max-width:95vw; }
    h2 { color:#fff;margin:0 0 24px; }
    label { display:block;color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px; }
    input { width:100%;padding:12px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:#fff;font-size:14px;outline:none;box-sizing:border-box; }
    input:focus { border-color:#818cf8; }
    button { width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-top:16px; }
    button:disabled { opacity:0.5; }
    .alert { padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px; }
    .alert.error { background:rgba(239,68,68,0.12);color:#f87171; }
    .alert.success { background:rgba(16,185,129,0.12);color:#34d399; }
    .link { text-align:center;margin-top:16px;font-size:13px;color:rgba(255,255,255,.4); }
    .link a { color:#818cf8;text-decoration:none; }
  \`]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  name = ''; email = ''; password = ''; loading = false; error = ''; success = '';

  register() {
    this.error = '';
    if (this.password.length < 6) { this.error = 'Password min 6 chars'; return; }
    this.loading = true;
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => { this.success = 'Created! Redirecting...'; setTimeout(() => this.router.navigate(['/login']), 1500); },
      error: (err) => { this.error = err.error?.error || 'Failed'; this.loading = false; },
    });
  }
}`
        },
      ],
    };
  }

  private addOtpTemplate(): ProjectTemplate {
    return {
      id: 'add-otp',
      name: 'OTP Email Verification (patch)',
      description: 'Adds OTP email verification to an existing Angular + Express project',
      files: [
        // ===== BACKEND =====
        {
          path: 'backend/models/User.js',
          content: `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  verified: { type: Boolean, default: false },
  otp: { type: String, default: null, select: false },
  otpExpiresAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(c) { return bcrypt.compare(c, this.password); };

module.exports = mongoose.model('User', userSchema);`
        },
        {
          path: 'backend/utils/mailer.js',
          content: `const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER || 'chethanrohit0045@gmail.com',
    pass: process.env.MAIL_PASS || 'apbpwslaxslxagbv',
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(to, otp, name) {
  return transporter.sendMail({
    from: '"AI App" <' + (process.env.MAIL_USER || 'chethanrohit0045@gmail.com') + '>',
    to,
    subject: 'Your Verification Code',
    html: \`
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;border-radius:16px;color:#e2e8f0;">
        <h1 style="color:#818cf8;margin:0 0 8px;">Verify Email</h1>
        <p>Hello <strong>\${name}</strong>,</p>
        <p>Your verification code is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#fff;">\${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
      </div>
    \`,
  });
}

module.exports = { generateOTP, sendOTPEmail };`
        },
        {
          path: 'backend/routes/auth.js',
          content: `const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateOTP, sendOTPEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-app-secret-2024';

// ===== REGISTER (sends OTP) =====
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.verified) return res.status(400).json({ error: 'Email already registered' });

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let user;
    if (existing && !existing.verified) {
      existing.name = name;
      existing.password = password;
      existing.otp = otp;
      existing.otpExpiresAt = otpExpiresAt;
      user = await existing.save();
    } else {
      user = await User.create({ name, email: email.toLowerCase(), password, otp, otpExpiresAt });
    }

    await sendOTPEmail(user.email, otp, name);

    res.json({
      message: 'OTP sent to your email',
      email: user.email,
      requiresVerification: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== VERIFY OTP =====
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.verified) return res.status(400).json({ error: 'Already verified' });
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP expired. Please register again.' });
    }

    user.verified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Email verified', token, user: { name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== RESEND OTP =====
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.verified) return res.status(400).json({ error: 'Already verified' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(user.email, otp, user.name);
    res.json({ message: 'OTP resent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.verified) return res.status(403).json({ error: 'Email not verified', requiresVerification: true, email: user.email });
    if (!await user.comparePassword(password)) return res.status(400).json({ error: 'Wrong password' });

    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login OK', token, user: { name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;`
        },
        // ===== FRONTEND =====
        {
          path: 'frontend/src/app/services/auth.service.ts',
          content: `import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface User { _id?: string; name: string; email: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:4100/api/auth';

  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);

  constructor() {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t && u) { this.token.set(t); this.currentUser.set(JSON.parse(u)); }
  }

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(\`\${this.apiUrl}/register\`, { name, email, password });
  }

  verifyOTP(email: string, otp: string): Observable<any> {
    return this.http.post<any>(\`\${this.apiUrl}/verify-otp\`, { email, otp }).pipe(tap(res => {
      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.token.set(res.token);
        this.currentUser.set(res.user);
      }
    }));
  }

  resendOTP(email: string): Observable<any> {
    return this.http.post<any>(\`\${this.apiUrl}/resend-otp\`, { email });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(\`\${this.apiUrl}/login\`, { email, password }).pipe(tap(res => {
      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.token.set(res.token);
        this.currentUser.set(res.user);
      }
    }));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean { return !!this.token(); }
  getToken(): string | null { return this.token(); }
}`
        },
        {
          path: 'frontend/src/app/components/register/register.component.ts',
          content: `import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: \`
    <div class="page">
      <div class="card">
        <!-- REGISTER FORM -->
        <ng-container *ngIf="step === 'register'">
          <h2>Create Account</h2>
          <p class="sub">Register to get started</p>
          <div class="alert error" *ngIf="error">{{ error }}</div>

          <form (ngSubmit)="register()">
            <label>Full Name</label>
            <input [(ngModel)]="name" name="name" required />
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" required />
            <label>Password (min 6 chars)</label>
            <input type="password" [(ngModel)]="password" name="password" required />
            <button type="submit" [disabled]="loading">{{ loading ? 'Sending OTP...' : 'Create Account' }}</button>
          </form>
          <p class="link">Already have an account? <a routerLink="/login">Sign In</a></p>
        </ng-container>

        <!-- OTP VERIFICATION -->
        <ng-container *ngIf="step === 'otp'">
          <h2>Verify Email</h2>
          <p class="sub">Enter the 6-digit code sent to <strong>{{ email }}</strong></p>
          <div class="alert error" *ngIf="error">{{ error }}</div>
          <div class="alert success" *ngIf="success">{{ success }}</div>

          <div class="otp-row">
            <input *ngFor="let i of [0,1,2,3,4,5]" class="otp-box" type="text" inputmode="numeric" maxlength="1"
              [attr.data-idx]="i" (input)="onOtpInput($event, i)" (keydown)="onOtpKeydown($event, i)" (paste)="onOtpPaste($event)" />
          </div>

          <button (click)="verifyOTP()" [disabled]="loading || otpComplete.length < 6" class="verify-btn">
            {{ loading ? 'Verifying...' : 'Verify Email' }}
          </button>

          <div class="resend">
            <span>Didn't receive?</span>
            <button type="button" (click)="resendOTP()" [disabled]="resendCooldown > 0" class="resend-btn">
              {{ resendCooldown > 0 ? 'Wait ' + resendCooldown + 's' : 'Resend OTP' }}
            </button>
          </div>
          <p class="link"><a (click)="step = 'register'">Back to Register</a></p>
        </ng-container>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);padding:20px; }
    .card { background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;width:420px;max-width:95vw; }
    h2 { color:#fff;margin:0 0 4px;font-size:22px; }
    .sub { color:rgba(255,255,255,0.5);margin:0 0 24px;font-size:13px; }
    .sub strong { color:#818cf8; }
    label { display:block;color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;margin-top:12px; }
    input { width:100%;padding:12px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:#fff;font-size:14px;outline:none;box-sizing:border-box; }
    input:focus { border-color:#818cf8; }
    button { width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:10px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-top:16px; }
    button:disabled { opacity:0.5;cursor:not-allowed; }
    .verify-btn { background:linear-gradient(135deg,#10b981,#06b6d4); }
    .otp-row { display:flex;gap:10px;justify-content:center;margin:28px 0; }
    .otp-box { width:48px;height:56px;text-align:center;font-size:22px;font-weight:700;padding:0;background:rgba(255,255,255,0.06);border:2px solid rgba(255,255,255,0.12);border-radius:12px;color:#fff; }
    .otp-box:focus { border-color:#818cf8; }
    .resend { display:flex;justify-content:center;gap:8px;align-items:center;margin-top:12px;font-size:13px;color:rgba(255,255,255,.4); }
    .resend-btn { background:none;border:none;color:#818cf8;font-weight:600;cursor:pointer;padding:0;width:auto;margin:0; }
    .resend-btn:disabled { color:rgba(255,255,255,.3);cursor:not-allowed; }
    .link { text-align:center;margin-top:16px;font-size:13px;color:rgba(255,255,255,.4); }
    .link a { color:#818cf8;cursor:pointer;text-decoration:none; }
    .alert { padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:12px; }
    .alert.error { background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.2); }
    .alert.success { background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.2); }
  \`]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  step: 'register' | 'otp' = 'register';
  name = ''; email = ''; password = '';
  loading = false; error = ''; success = '';
  otpDigits = ['', '', '', '', '', ''];
  otpComplete = '';
  resendCooldown = 0;
  private timer: any = null;

  register() {
    this.error = '';
    if (!this.name || !this.email || !this.password) { this.error = 'All fields required'; return; }
    if (this.password.length < 6) { this.error = 'Password min 6 chars'; return; }
    this.loading = true;
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => {
        this.success = 'OTP sent!';
        this.step = 'otp';
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpComplete = '';
        this.startCooldown();
      },
      error: (err) => { this.error = err.error?.error || 'Failed'; this.loading = false; },
      complete: () => this.loading = false,
    });
  }

  verifyOTP() {
    this.error = '';
    if (this.otpComplete.length < 6) { this.error = 'Enter all 6 digits'; return; }
    this.loading = true;
    this.auth.verifyOTP(this.email, this.otpComplete).subscribe({
      next: () => {
        this.success = 'Verified!';
        setTimeout(() => this.router.navigate(['/dashboard']), 800);
      },
      error: (err) => { this.error = err.error?.error || 'Verification failed'; this.loading = false; },
      complete: () => this.loading = false,
    });
  }

  resendOTP() {
    if (this.resendCooldown > 0) return;
    this.error = '';
    this.auth.resendOTP(this.email).subscribe({
      next: () => { this.success = 'OTP resent'; this.startCooldown(); },
      error: (err) => this.error = err.error?.error || 'Failed to resend',
    });
  }

  onOtpInput(e: Event, i: number) {
    const input = e.target as HTMLInputElement;
    const digit = input.value.replace(/\\D/g, '').slice(-1);
    this.otpDigits[i] = digit;
    input.value = digit;
    this.otpComplete = this.otpDigits.join('');
    if (digit && i < 5) {
      const next = input.parentElement?.querySelector(\`[data-idx="\${i+1}"]\`) as HTMLInputElement;
      next?.focus();
    }
  }

  onOtpKeydown(e: KeyboardEvent, i: number) {
    const input = e.target as HTMLInputElement;
    if (e.key === 'Backspace') {
      if (input.value) {
        this.otpDigits[i] = ''; input.value = ''; this.otpComplete = this.otpDigits.join(''); e.preventDefault();
      } else if (i > 0) {
        const prev = input.parentElement?.querySelector(\`[data-idx="\${i-1}"]\`) as HTMLInputElement;
        if (prev) { this.otpDigits[i-1] = ''; prev.value = ''; prev.focus(); this.otpComplete = this.otpDigits.join(''); }
        e.preventDefault();
      }
    }
  }

  onOtpPaste(e: ClipboardEvent) {
    e.preventDefault();
    const paste = e.clipboardData?.getData('text')?.replace(/\\D/g, '') || '';
    const inputs = (e.target as HTMLElement).parentElement?.querySelectorAll('.otp-box');
    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = paste[i] || '';
      if (inputs?.[i]) (inputs[i] as HTMLInputElement).value = this.otpDigits[i];
    }
    this.otpComplete = this.otpDigits.join('');
  }

  private startCooldown() {
    this.resendCooldown = 60;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.timer);
    }, 1000);
  }
}`
        },
        {
          path: 'backend/.env.example',
          content: `PORT=4100
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=change-this-secret-key
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-gmail-app-password
`
        },
      ],
    };
  }

  // ===== PURPOSE-SPECIFIC ANGULAR APPS =====

  private angularTodoApp(): ProjectTemplate {
    return {
      id: 'angular-todo',
      name: 'Angular Todo App',
      description: 'Todo app with add/edit/delete/toggle/filter, localStorage persistence, and full CSS styling',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component } from '@angular/core';
import { TodoComponent } from './components/todo/todo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TodoComponent],
  template: \`<app-todo></app-todo>\`
})
export class AppComponent { }`
        },
        {
          path: 'src/app/components/todo/todo.component.ts',
          content: `import { Component, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
}

type Filter = 'all' | 'active' | 'done';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo.component.html',
  styleUrl: './todo.component.css'
})
export class TodoComponent {
  todos = signal<Todo[]>(this.loadTodos());
  newTodo = '';
  filter = signal<Filter>('all');
  editingId = signal<number | null>(null);
  editText = '';

  total = computed(() => this.todos().length);
  completed = computed(() => this.todos().filter(t => t.done).length);
  remaining = computed(() => this.total() - this.completed());

  filtered = computed(() => {
    const f = this.filter();
    const list = this.todos();
    if (f === 'active') return list.filter(t => !t.done);
    if (f === 'done') return list.filter(t => t.done);
    return list;
  });

  constructor() {
    effect(() => {
      localStorage.setItem('todos', JSON.stringify(this.todos()));
    });
  }

  add() {
    const text = this.newTodo.trim();
    if (!text) return;
    this.todos.update(list => [
      ...list,
      { id: Date.now(), text, done: false, createdAt: Date.now() }
    ]);
    this.newTodo = '';
  }

  toggle(id: number) {
    this.todos.update(list =>
      list.map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
  }

  remove(id: number) {
    this.todos.update(list => list.filter(t => t.id !== id));
  }

  startEdit(todo: Todo) {
    this.editingId.set(todo.id);
    this.editText = todo.text;
  }

  saveEdit(id: number) {
    const text = this.editText.trim();
    if (!text) { this.cancelEdit(); return; }
    this.todos.update(list =>
      list.map(t => t.id === id ? { ...t, text } : t)
    );
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editText = '';
  }

  clearCompleted() {
    this.todos.update(list => list.filter(t => !t.done));
  }

  clearAll() {
    if (confirm('Delete all todos?')) this.todos.set([]);
  }

  setFilter(f: Filter) { this.filter.set(f); }

  private loadTodos(): Todo[] {
    try {
      const raw = localStorage.getItem('todos');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}`
        },
        {
          path: 'src/app/components/todo/todo.component.html',
          content: `<div class="todo-app">
  <header class="app-header">
    <h1>My Todos</h1>
    <p class="subtitle">{{ remaining() }} of {{ total() }} remaining</p>
  </header>

  <div class="input-row">
    <input
      class="todo-input"
      [(ngModel)]="newTodo"
      (keydown.enter)="add()"
      placeholder="What needs to be done?"
      autofocus
    />
    <button class="btn-add" (click)="add()" [disabled]="!newTodo.trim()">Add</button>
  </div>

  <div class="filters" *ngIf="total() > 0">
    <button [class.active]="filter() === 'all'" (click)="setFilter('all')">
      All ({{ total() }})
    </button>
    <button [class.active]="filter() === 'active'" (click)="setFilter('active')">
      Active ({{ remaining() }})
    </button>
    <button [class.active]="filter() === 'done'" (click)="setFilter('done')">
      Done ({{ completed() }})
    </button>
  </div>

  <ul class="todo-list">
    <li *ngFor="let todo of filtered()" class="todo-item" [class.done]="todo.done">
      <input
        type="checkbox"
        class="checkbox"
        [checked]="todo.done"
        (change)="toggle(todo.id)"
      />

      <ng-container *ngIf="editingId() !== todo.id; else editMode">
        <span class="todo-text" (dblclick)="startEdit(todo)">{{ todo.text }}</span>
        <div class="actions">
          <button class="btn-icon" (click)="startEdit(todo)" title="Edit">✎</button>
          <button class="btn-icon btn-delete" (click)="remove(todo.id)" title="Delete">✕</button>
        </div>
      </ng-container>

      <ng-template #editMode>
        <input
          class="edit-input"
          [(ngModel)]="editText"
          (keydown.enter)="saveEdit(todo.id)"
          (keydown.escape)="cancelEdit()"
          (blur)="saveEdit(todo.id)"
          autofocus
        />
      </ng-template>
    </li>
  </ul>

  <div class="empty" *ngIf="filtered().length === 0 && total() === 0">
    No todos yet. Add your first one above!
  </div>
  <div class="empty" *ngIf="filtered().length === 0 && total() > 0">
    No {{ filter() }} todos.
  </div>

  <footer class="app-footer" *ngIf="total() > 0">
    <button class="btn-link" (click)="clearCompleted()" [disabled]="completed() === 0">
      Clear completed ({{ completed() }})
    </button>
    <button class="btn-link danger" (click)="clearAll()">Clear all</button>
  </footer>
</div>`
        },
        {
          path: 'src/app/components/todo/todo.component.css',
          content: `:host { display: block; min-height: 100vh; }

.todo-app {
  max-width: 560px;
  margin: 0 auto;
  padding: 48px 24px;
  font-family: -apple-system, 'Inter', sans-serif;
}

.app-header {
  text-align: center;
  margin-bottom: 32px;
}

.app-header h1 {
  font-size: 48px;
  font-weight: 200;
  color: #fff;
  margin: 0 0 4px;
  letter-spacing: -1px;
}

.subtitle {
  color: rgba(255,255,255,0.4);
  font-size: 14px;
  margin: 0;
}

.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.todo-input {
  flex: 1;
  padding: 14px 18px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.todo-input:focus {
  border-color: #818cf8;
  background: rgba(255,255,255,0.08);
}

.todo-input::placeholder { color: rgba(255,255,255,0.3); }

.btn-add {
  padding: 14px 24px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
}

.btn-add:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}

.btn-add:disabled { opacity: 0.4; cursor: not-allowed; }

.filters {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  margin-bottom: 16px;
}

.filters button {
  flex: 1;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 7px;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.filters button:hover { color: rgba(255,255,255,0.85); }

.filters button.active {
  background: rgba(129, 140, 248, 0.2);
  color: #a5b4fc;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  margin-bottom: 8px;
  transition: all 0.2s;
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.todo-item:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
}

.todo-item.done .todo-text {
  text-decoration: line-through;
  color: rgba(255,255,255,0.3);
}

.checkbox {
  width: 20px;
  height: 20px;
  accent-color: #818cf8;
  cursor: pointer;
  flex-shrink: 0;
}

.todo-text {
  flex: 1;
  color: #e5e7eb;
  font-size: 15px;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}

.edit-input {
  flex: 1;
  padding: 4px 8px;
  background: rgba(129, 140, 248, 0.1);
  border: 1px solid #818cf8;
  border-radius: 6px;
  color: #fff;
  font-size: 15px;
  outline: none;
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.todo-item:hover .actions { opacity: 1; }

.btn-icon {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255,255,255,0.3);
  font-size: 14px;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.btn-link {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.15s;
}

.btn-link:hover:not(:disabled) {
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.8);
}

.btn-link:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-link.danger:hover { color: #fca5a5; background: rgba(239, 68, 68, 0.08); }`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
  min-height: 100vh;
  color: #e5e7eb;
  -webkit-font-smoothing: antialiased;
}`
        },
      ],
    };
  }

  private angularCounterApp(): ProjectTemplate {
    return {
      id: 'angular-counter',
      name: 'Angular Counter App',
      description: 'Simple counter with increment/decrement/reset, step size, and colorful styling',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <div class="page">
      <div class="card">
        <h1>Counter</h1>
        <div class="count" [class.positive]="count() > 0" [class.negative]="count() < 0">{{ count() }}</div>
        <div class="label">{{ isEven() ? 'Even' : 'Odd' }}</div>

        <div class="buttons">
          <button class="btn minus" (click)="decrement()">−</button>
          <button class="btn reset" (click)="reset()">Reset</button>
          <button class="btn plus" (click)="increment()">+</button>
        </div>

        <div class="step-row">
          <label>Step size:</label>
          <input type="number" [(ngModel)]="step" min="1" max="100" />
        </div>

        <div class="history">
          <h3>History</h3>
          <div class="history-list">
            <span *ngFor="let h of history().slice(-10)" class="chip">{{ h }}</span>
          </div>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 48px; max-width: 420px; width: 100%; text-align: center; }
    h1 { color: #fff; font-size: 24px; font-weight: 300; margin: 0 0 24px; letter-spacing: 2px; text-transform: uppercase; }
    .count { font-size: 96px; font-weight: 200; color: #fff; line-height: 1; transition: color 0.3s; font-variant-numeric: tabular-nums; }
    .count.positive { color: #34d399; }
    .count.negative { color: #f87171; }
    .label { color: rgba(255,255,255,0.4); font-size: 14px; margin-top: 4px; margin-bottom: 32px; text-transform: uppercase; letter-spacing: 1px; }
    .buttons { display: flex; gap: 12px; justify-content: center; margin-bottom: 32px; }
    .btn { width: 72px; height: 72px; border: none; border-radius: 50%; font-size: 28px; font-weight: 600; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s; color: #fff; }
    .btn:hover { transform: translateY(-2px); }
    .btn:active { transform: translateY(0); }
    .btn.minus { background: linear-gradient(135deg, #f87171, #ef4444); }
    .btn.minus:hover { box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4); }
    .btn.plus { background: linear-gradient(135deg, #34d399, #10b981); }
    .btn.plus:hover { box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4); }
    .btn.reset { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); font-size: 13px; font-weight: 500; }
    .btn.reset:hover { background: rgba(255,255,255,0.12); }
    .step-row { display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 24px; }
    .step-row label { color: rgba(255,255,255,0.5); font-size: 13px; }
    .step-row input { width: 64px; padding: 6px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 14px; text-align: center; outline: none; }
    .step-row input:focus { border-color: #818cf8; }
    .history { text-align: left; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); }
    .history h3 { color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; text-align: center; }
    .history-list { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; min-height: 28px; }
    .chip { padding: 4px 12px; background: rgba(129, 140, 248, 0.12); border: 1px solid rgba(129, 140, 248, 0.2); border-radius: 999px; color: #a5b4fc; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
  \`]
})
export class AppComponent {
  count = signal(0);
  step = 1;
  history = signal<number[]>([0]);
  isEven = computed(() => this.count() % 2 === 0);

  increment() {
    const newCount = this.count() + Number(this.step);
    this.count.set(newCount);
    this.history.update(h => [...h, newCount]);
  }
  decrement() {
    const newCount = this.count() - Number(this.step);
    this.count.set(newCount);
    this.history.update(h => [...h, newCount]);
  }
  reset() {
    this.count.set(0);
    this.history.set([0]);
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: linear-gradient(135deg, #1e1b4b, #312e81); min-height: 100vh; color: #e5e7eb; }`
        },
      ],
    };
  }

  private angularCalculatorApp(): ProjectTemplate {
    return {
      id: 'angular-calculator',
      name: 'Angular Calculator',
      description: 'Working calculator with keyboard support and history',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

type Op = '+' | '-' | '*' | '/' | null;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="page">
      <div class="calc">
        <div class="display">
          <div class="prev">{{ previous() }} {{ op() || '' }}</div>
          <div class="current">{{ current() || '0' }}</div>
        </div>
        <div class="pad">
          <button class="btn span2 clear" (click)="clear()">AC</button>
          <button class="btn sign" (click)="toggleSign()">±</button>
          <button class="btn op" (click)="setOp('/')" [class.active]="op() === '/'">÷</button>

          <button class="btn" (click)="digit('7')">7</button>
          <button class="btn" (click)="digit('8')">8</button>
          <button class="btn" (click)="digit('9')">9</button>
          <button class="btn op" (click)="setOp('*')" [class.active]="op() === '*'">×</button>

          <button class="btn" (click)="digit('4')">4</button>
          <button class="btn" (click)="digit('5')">5</button>
          <button class="btn" (click)="digit('6')">6</button>
          <button class="btn op" (click)="setOp('-')" [class.active]="op() === '-'">−</button>

          <button class="btn" (click)="digit('1')">1</button>
          <button class="btn" (click)="digit('2')">2</button>
          <button class="btn" (click)="digit('3')">3</button>
          <button class="btn op" (click)="setOp('+')" [class.active]="op() === '+'">+</button>

          <button class="btn span2" (click)="digit('0')">0</button>
          <button class="btn" (click)="dot()">.</button>
          <button class="btn equals" (click)="equals()">=</button>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .calc { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 20px; width: 340px; max-width: 100%; }
    .display { text-align: right; padding: 24px 16px; margin-bottom: 16px; min-height: 96px; }
    .prev { color: rgba(255,255,255,0.4); font-size: 16px; min-height: 20px; font-family: 'SF Mono', monospace; }
    .current { color: #fff; font-size: 56px; font-weight: 200; line-height: 1.1; font-family: 'SF Mono', monospace; word-break: break-all; }
    .pad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .btn { aspect-ratio: 1; border: none; border-radius: 50%; font-size: 22px; font-weight: 500; cursor: pointer; color: #fff; background: rgba(255,255,255,0.08); transition: all 0.1s; }
    .btn:hover { background: rgba(255,255,255,0.15); }
    .btn:active { transform: scale(0.95); }
    .btn.span2 { aspect-ratio: 2 / 1; border-radius: 999px; grid-column: span 2; }
    .btn.clear, .btn.sign { background: rgba(255,255,255,0.2); color: #000; }
    .btn.op { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 26px; }
    .btn.op.active { background: #fff; color: #f97316; }
    .btn.equals { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 28px; }
  \`]
})
export class AppComponent {
  current = signal('');
  previous = signal('');
  op = signal<Op>(null);
  justEvaluated = signal(false);

  digit(d: string) {
    if (this.justEvaluated()) { this.current.set(''); this.justEvaluated.set(false); }
    if (this.current().length >= 12) return;
    this.current.update(c => (c === '0' ? d : c + d));
  }
  dot() {
    if (this.current().includes('.')) return;
    this.current.update(c => (c === '' ? '0.' : c + '.'));
  }
  toggleSign() {
    this.current.update(c => c.startsWith('-') ? c.slice(1) : (c ? '-' + c : c));
  }
  setOp(o: Op) {
    if (this.current() === '' && this.previous() === '') return;
    if (this.previous() && this.current() && this.op()) {
      this.equals();
    }
    this.previous.set(this.current() || this.previous());
    this.current.set('');
    this.op.set(o);
  }
  equals() {
    const a = parseFloat(this.previous());
    const b = parseFloat(this.current());
    if (isNaN(a) || isNaN(b) || !this.op()) return;
    let result = 0;
    switch (this.op()) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = b === 0 ? NaN : a / b; break;
    }
    const str = isNaN(result) ? 'Error' : String(Number(result.toFixed(8)));
    this.current.set(str);
    this.previous.set('');
    this.op.set(null);
    this.justEvaluated.set(true);
  }
  clear() {
    this.current.set('');
    this.previous.set('');
    this.op.set(null);
    this.justEvaluated.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const k = e.key;
    if (/[0-9]/.test(k)) this.digit(k);
    else if (k === '.') this.dot();
    else if (k === '+' || k === '-' || k === '*' || k === '/') this.setOp(k as Op);
    else if (k === 'Enter' || k === '=') this.equals();
    else if (k === 'Escape' || k === 'c' || k === 'C') this.clear();
    else if (k === 'Backspace') this.current.update(c => c.slice(0, -1));
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: #000; min-height: 100vh; color: #fff; }`
        },
      ],
    };
  }

  private angularNotesApp(): ProjectTemplate {
    return {
      id: 'angular-notes',
      name: 'Angular Notes App',
      description: 'Notes app with multiple notes, auto-save, and colorful sticky-note UI',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Note {
  id: number;
  title: string;
  body: string;
  color: string;
  updatedAt: number;
}

const COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#e0e7ff', '#fed7aa'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <div class="app">
      <aside class="sidebar">
        <div class="sidebar-head">
          <h1>Notes</h1>
          <button class="new-btn" (click)="newNote()">+ New</button>
        </div>
        <input class="search" [(ngModel)]="search" placeholder="Search..." />
        <ul class="note-list">
          <li *ngFor="let n of filtered()" (click)="select(n.id)" [class.active]="activeId() === n.id" [style.background]="n.color + '20'" [style.border-left-color]="n.color">
            <div class="note-title">{{ n.title || 'Untitled' }}</div>
            <div class="note-preview">{{ n.body || 'No content' }}</div>
            <div class="note-date">{{ formatDate(n.updatedAt) }}</div>
          </li>
        </ul>
        <div class="empty-list" *ngIf="notes().length === 0">No notes yet. Click "+ New" to create one.</div>
      </aside>

      <main class="editor" *ngIf="active() as n" [style.background]="n.color + '30'">
        <div class="editor-head">
          <input class="title-input" [(ngModel)]="n.title" (ngModelChange)="touch()" placeholder="Title..." />
          <div class="colors">
            <span *ngFor="let c of colors" class="dot" [style.background]="c" [class.selected]="n.color === c" (click)="setColor(c)"></span>
          </div>
          <button class="delete-btn" (click)="remove(n.id)">Delete</button>
        </div>
        <textarea class="body-input" [(ngModel)]="n.body" (ngModelChange)="touch()" placeholder="Start writing..."></textarea>
      </main>

      <main class="empty-editor" *ngIf="!active()">
        <div>
          <h2>Select a note</h2>
          <p>Or create a new one from the sidebar.</p>
        </div>
      </main>
    </div>
  \`,
  styles: [\`
    .app { display: flex; height: 100vh; }
    .sidebar { width: 320px; background: #1f2937; border-right: 1px solid #374151; display: flex; flex-direction: column; }
    .sidebar-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #374151; }
    .sidebar-head h1 { color: #fff; font-size: 20px; margin: 0; }
    .new-btn { padding: 6px 14px; background: #6366f1; border: none; border-radius: 8px; color: #fff; font-size: 13px; cursor: pointer; }
    .new-btn:hover { background: #4f46e5; }
    .search { margin: 12px 16px; padding: 10px 14px; background: rgba(255,255,255,0.05); border: 1px solid #374151; border-radius: 8px; color: #e5e7eb; font-size: 13px; outline: none; }
    .search:focus { border-color: #6366f1; }
    .note-list { flex: 1; list-style: none; padding: 0 8px 16px; margin: 0; overflow-y: auto; }
    .note-list li { padding: 12px 14px; margin-bottom: 4px; border-radius: 8px; cursor: pointer; border-left: 3px solid transparent; transition: background 0.15s; }
    .note-list li:hover { background: rgba(255,255,255,0.05); }
    .note-list li.active { background: rgba(99,102,241,0.15); }
    .note-title { color: #fff; font-weight: 600; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .note-preview { color: rgba(255,255,255,0.4); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .note-date { color: rgba(255,255,255,0.3); font-size: 11px; margin-top: 4px; }
    .empty-list { padding: 40px 20px; text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; }
    .editor { flex: 1; display: flex; flex-direction: column; transition: background 0.3s; }
    .editor-head { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid rgba(0,0,0,0.1); }
    .title-input { flex: 1; background: transparent; border: none; font-size: 22px; font-weight: 600; color: #1f2937; outline: none; }
    .title-input::placeholder { color: rgba(0,0,0,0.25); }
    .colors { display: flex; gap: 6px; }
    .dot { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s, transform 0.15s; }
    .dot:hover { transform: scale(1.15); }
    .dot.selected { border-color: #1f2937; }
    .delete-btn { padding: 6px 14px; background: rgba(239,68,68,0.12); color: #dc2626; border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; font-size: 13px; cursor: pointer; }
    .delete-btn:hover { background: rgba(239,68,68,0.2); }
    .body-input { flex: 1; padding: 20px 24px; background: transparent; border: none; font-size: 15px; line-height: 1.7; color: #1f2937; outline: none; resize: none; font-family: inherit; }
    .body-input::placeholder { color: rgba(0,0,0,0.3); }
    .empty-editor { flex: 1; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); background: #111827; }
    .empty-editor h2 { color: rgba(255,255,255,0.6); margin: 0 0 8px; font-weight: 400; }
    .empty-editor p { font-size: 14px; margin: 0; }
  \`]
})
export class AppComponent {
  notes = signal<Note[]>(this.load());
  activeId = signal<number | null>(null);
  search = '';
  colors = COLORS;

  active = computed(() => this.notes().find(n => n.id === this.activeId()) || null);
  filtered = computed(() => {
    const q = this.search.toLowerCase();
    if (!q) return this.notes();
    return this.notes().filter(n =>
      n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
  });

  constructor() {
    effect(() => localStorage.setItem('notes', JSON.stringify(this.notes())));
    if (this.notes().length > 0) this.activeId.set(this.notes()[0].id);
  }

  newNote() {
    const n: Note = {
      id: Date.now(), title: '', body: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      updatedAt: Date.now()
    };
    this.notes.update(list => [n, ...list]);
    this.activeId.set(n.id);
  }
  select(id: number) { this.activeId.set(id); }
  remove(id: number) {
    this.notes.update(list => list.filter(n => n.id !== id));
    this.activeId.set(this.notes()[0]?.id ?? null);
  }
  setColor(c: string) {
    const id = this.activeId();
    if (id === null) return;
    this.notes.update(list => list.map(n => n.id === id ? { ...n, color: c, updatedAt: Date.now() } : n));
  }
  touch() {
    const id = this.activeId();
    if (id === null) return;
    this.notes.update(list => list.map(n => n.id === id ? { ...n, updatedAt: Date.now() } : n));
  }
  formatDate(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString();
  }
  private load(): Note[] {
    try { return JSON.parse(localStorage.getItem('notes') || '[]'); } catch { return []; }
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body { font-family: -apple-system, 'Inter', sans-serif; background: #111827; color: #e5e7eb; }`
        },
      ],
    };
  }

  private angularNumberGuessApp(): ProjectTemplate {
    return {
      id: 'angular-number-guess',
      name: 'Angular Number Guessing Game',
      description: 'Guess a secret number 1-100 with hints (higher/lower), attempts counter, and restart',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <div class="page">
      <div class="card">
        <h1>🎯 Guess the Number</h1>
        <p class="sub">I'm thinking of a number between <b>{{ min }}</b> and <b>{{ max }}</b></p>

        <div class="stats">
          <div class="stat"><span class="stat-num">{{ attempts() }}</span><span class="stat-label">Attempts</span></div>
          <div class="stat"><span class="stat-num">{{ bestScore() || '—' }}</span><span class="stat-label">Best</span></div>
        </div>

        <div *ngIf="!won()" class="input-area">
          <input
            type="number"
            [ngModel]="guess()"
            (ngModelChange)="guess.set($event)"
            name="guess"
            [min]="min" [max]="max"
            placeholder="Enter your guess"
            (keydown.enter)="submit()"
            [disabled]="won()"
          />
          <button (click)="submit()" [disabled]="!canSubmit()">Guess</button>
        </div>

        <div class="feedback" [class.hot]="hint() === 'hot'" [class.cold]="hint() === 'cold'" [class.warm]="hint() === 'warm'" [class.won]="won()" *ngIf="message()">
          {{ message() }}
        </div>

        <button class="restart" (click)="restart()" *ngIf="won() || attempts() > 0">
          {{ won() ? 'Play Again' : 'Give Up / Restart' }}
        </button>

        <div class="history" *ngIf="guessHistory().length > 0">
          <h3>Your guesses</h3>
          <div class="chips">
            <span *ngFor="let g of guessHistory()" class="chip"
              [class.low]="g < secret()"
              [class.high]="g > secret()"
              [class.correct]="g === secret()">{{ g }}</span>
          </div>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .card { background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;max-width:460px;width:100%;text-align:center; }
    h1 { color:#fff;font-size:32px;margin:0 0 8px; }
    .sub { color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 24px; }
    .sub b { color:#818cf8; }
    .stats { display:flex;gap:12px;margin-bottom:24px; }
    .stat { flex:1;padding:16px;background:rgba(255,255,255,0.05);border-radius:12px;display:flex;flex-direction:column;align-items:center; }
    .stat-num { font-size:28px;font-weight:700;color:#fff; }
    .stat-label { font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-top:4px; }
    .input-area { display:flex;gap:8px;margin-bottom:16px; }
    input { flex:1;padding:14px 18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;color:#fff;font-size:16px;outline:none;text-align:center; }
    input:focus { border-color:#818cf8; }
    input::-webkit-inner-spin-button { opacity:0.3; }
    button { padding:14px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:transform 0.15s,box-shadow 0.2s; }
    button:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 8px 20px rgba(99,102,241,0.3); }
    button:disabled { opacity:0.4;cursor:not-allowed; }
    .feedback { padding:16px;border-radius:12px;font-size:16px;font-weight:600;margin-bottom:16px; }
    .feedback.hot { background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.2); }
    .feedback.warm { background:rgba(245,158,11,0.15);color:#fcd34d;border:1px solid rgba(245,158,11,0.2); }
    .feedback.cold { background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.2); }
    .feedback.won { background:rgba(16,185,129,0.15);color:#6ee7b7;border:1px solid rgba(16,185,129,0.2);font-size:18px;padding:20px; }
    .restart { width:100%;margin-top:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.8); }
    .restart:hover { background:rgba(255,255,255,0.1);box-shadow:none; }
    .history { margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08); }
    .history h3 { color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px; }
    .chips { display:flex;flex-wrap:wrap;gap:6px;justify-content:center; }
    .chip { padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;font-family:'JetBrains Mono',monospace; }
    .chip.low { background:rgba(59,130,246,0.15);color:#93c5fd;border:1px solid rgba(59,130,246,0.2); }
    .chip.high { background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.2); }
    .chip.correct { background:rgba(16,185,129,0.2);color:#6ee7b7;border:1px solid rgba(16,185,129,0.3); }
  \`]
})
export class AppComponent {
  min = 1;
  max = 100;
  secret = signal(this.randomSecret());
  guess = signal<number | null>(null);  // signal so computed() tracks it
  attempts = signal(0);
  guessHistory = signal<number[]>([]);
  won = signal(false);
  hint = signal<'hot' | 'warm' | 'cold' | ''>('');
  message = signal('');
  bestScore = signal<number | null>(Number(localStorage.getItem('guessBest')) || null);

  canSubmit = computed(() => {
    const g = this.guess();
    return g !== null && g >= this.min && g <= this.max;
  });

  submit() {
    const g = Number(this.guess());
    if (isNaN(g) || g < this.min || g > this.max) return;
    const secret = this.secret();
    this.attempts.update(n => n + 1);
    this.guessHistory.update(arr => [...arr, g]);

    if (g === secret) {
      this.won.set(true);
      this.message.set(\`🎉 You got it! The number was \${secret}. Solved in \${this.attempts()} attempts.\`);
      this.hint.set('');
      const prev = this.bestScore();
      if (prev === null || this.attempts() < prev) {
        this.bestScore.set(this.attempts());
        localStorage.setItem('guessBest', String(this.attempts()));
      }
      return;
    }

    const diff = Math.abs(g - secret);
    this.hint.set(diff <= 5 ? 'hot' : diff <= 15 ? 'warm' : 'cold');
    const dir = g < secret ? 'higher' : 'lower';
    const heat = diff <= 5 ? '🔥 Very close!' : diff <= 15 ? '⚠️ Getting warm' : '❄️ Way off';
    this.message.set(\`\${heat} Try \${dir} than \${g}.\`);
    this.guess.set(null);
  }

  restart() {
    this.secret.set(this.randomSecret());
    this.attempts.set(0);
    this.guessHistory.set([]);
    this.won.set(false);
    this.hint.set('');
    this.message.set('');
    this.guess.set(null);
  }

  private randomSecret(): number {
    return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: linear-gradient(135deg, #0f172a, #1e1b4b, #4c1d95); min-height: 100vh; color: #e5e7eb; }`
        },
      ],
    };
  }

  private angularTicTacToeApp(): ProjectTemplate {
    return {
      id: 'angular-tictactoe',
      name: 'Angular Tic-Tac-Toe',
      description: 'Classic X/O game with win detection, draw detection, score tracking',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type Cell = 'X' | 'O' | null;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="page">
      <div class="game">
        <h1>Tic-Tac-Toe</h1>
        <div class="score">
          <div class="score-box x"><span>X</span><b>{{ scoreX() }}</b></div>
          <div class="score-box draw"><span>Draw</span><b>{{ draws() }}</b></div>
          <div class="score-box o"><span>O</span><b>{{ scoreO() }}</b></div>
        </div>

        <div class="status" [class.win]="winner()" [class.draw]="isDraw()">
          <ng-container *ngIf="winner() as w">🏆 {{ w }} wins!</ng-container>
          <ng-container *ngIf="isDraw() && !winner()">🤝 It's a draw!</ng-container>
          <ng-container *ngIf="!winner() && !isDraw()">Turn: <b>{{ turn() }}</b></ng-container>
        </div>

        <div class="board">
          <button
            *ngFor="let cell of board(); let i = index"
            class="cell"
            [class.x]="cell === 'X'"
            [class.o]="cell === 'O'"
            [class.win-cell]="winLine().includes(i)"
            [disabled]="!!cell || !!winner()"
            (click)="play(i)"
          >{{ cell }}</button>
        </div>

        <button class="restart" (click)="restart()">New Game</button>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .game { background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;max-width:420px;width:100%;text-align:center; }
    h1 { color:#fff;font-size:28px;margin:0 0 24px;font-weight:700; }
    .score { display:flex;gap:8px;margin-bottom:20px; }
    .score-box { flex:1;padding:12px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;flex-direction:column;gap:2px; }
    .score-box span { font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px; }
    .score-box b { font-size:22px;color:#fff; }
    .score-box.x b { color:#60a5fa; }
    .score-box.o b { color:#f87171; }
    .status { padding:14px;border-radius:10px;background:rgba(255,255,255,0.04);font-size:15px;color:#fff;margin-bottom:16px; }
    .status b { color:#818cf8; }
    .status.win { background:rgba(16,185,129,0.15);color:#6ee7b7;font-weight:700; }
    .status.draw { background:rgba(245,158,11,0.15);color:#fcd34d;font-weight:700; }
    .board { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px; }
    .cell { aspect-ratio:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;font-size:48px;font-weight:800;color:#fff;cursor:pointer;transition:all 0.15s; }
    .cell:hover:not(:disabled) { background:rgba(129,140,248,0.1);border-color:#818cf8; }
    .cell:disabled { cursor:not-allowed; }
    .cell.x { color:#60a5fa; }
    .cell.o { color:#f87171; }
    .cell.win-cell { background:rgba(16,185,129,0.2);border-color:#34d399;animation:pulse 0.5s ease-in-out; }
    @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }
    .restart { width:100%;padding:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:600;cursor:pointer; }
    .restart:hover { transform:translateY(-1px);box-shadow:0 8px 20px rgba(99,102,241,0.3); }
  \`]
})
export class AppComponent {
  board = signal<Cell[]>(Array(9).fill(null));
  turn = signal<'X' | 'O'>('X');
  scoreX = signal(0);
  scoreO = signal(0);
  draws = signal(0);

  WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  winLine = computed(() => {
    const b = this.board();
    for (const line of this.WIN_LINES) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return line;
    }
    return [];
  });

  winner = computed(() => {
    const line = this.winLine();
    return line.length ? this.board()[line[0]] : null;
  });

  isDraw = computed(() => !this.winner() && this.board().every(c => c !== null));

  play(i: number) {
    if (this.board()[i] || this.winner()) return;
    const t = this.turn();
    this.board.update(b => b.map((c, idx) => idx === i ? t : c));
    const w = this.winner();
    if (w === 'X') this.scoreX.update(n => n + 1);
    else if (w === 'O') this.scoreO.update(n => n + 1);
    else if (this.isDraw()) this.draws.update(n => n + 1);
    else this.turn.set(t === 'X' ? 'O' : 'X');
  }

  restart() {
    this.board.set(Array(9).fill(null));
    this.turn.set('X');
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: linear-gradient(135deg, #0f172a, #1e3a8a, #4c1d95); min-height: 100vh; color: #e5e7eb; }`
        },
      ],
    };
  }

  private angularStopwatchApp(): ProjectTemplate {
    return {
      id: 'angular-stopwatch',
      name: 'Angular Stopwatch',
      description: 'Stopwatch with start/stop/lap/reset and lap times list',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="page">
      <div class="watch">
        <h1>Stopwatch</h1>
        <div class="display">{{ formatted() }}</div>

        <div class="buttons">
          <button class="lap" (click)="lap()" [disabled]="!running()">Lap</button>
          <button class="primary" [class.stop]="running()" (click)="toggle()">{{ running() ? 'Stop' : 'Start' }}</button>
          <button class="reset" (click)="reset()">Reset</button>
        </div>

        <div class="laps" *ngIf="laps().length > 0">
          <h3>Laps</h3>
          <div class="lap-list">
            <div class="lap-row" *ngFor="let l of laps(); let i = index">
              <span class="lap-num">Lap {{ laps().length - i }}</span>
              <span class="lap-split">+{{ format(l.split) }}</span>
              <span class="lap-total">{{ format(l.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .watch { background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;max-width:420px;width:100%; }
    h1 { color:#fff;font-size:20px;margin:0 0 24px;font-weight:300;letter-spacing:3px;text-transform:uppercase;text-align:center; }
    .display { text-align:center;font-size:72px;font-weight:200;color:#fff;font-variant-numeric:tabular-nums;font-family:'SF Mono','JetBrains Mono',monospace;margin-bottom:32px;letter-spacing:-2px; }
    .buttons { display:flex;gap:8px;margin-bottom:24px; }
    button { flex:1;padding:16px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s; }
    .primary { background:linear-gradient(135deg,#10b981,#059669);color:#fff; }
    .primary.stop { background:linear-gradient(135deg,#ef4444,#dc2626); }
    .primary:hover { transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,0,0,0.2); }
    .lap, .reset { background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.1); }
    .lap:hover:not(:disabled), .reset:hover { background:rgba(255,255,255,0.1); }
    .lap:disabled { opacity:0.3;cursor:not-allowed; }
    .laps { padding-top:20px;border-top:1px solid rgba(255,255,255,0.08); }
    .laps h3 { color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;text-align:center; }
    .lap-list { max-height:240px;overflow-y:auto; }
    .lap-row { display:grid;grid-template-columns:80px 1fr 1fr;gap:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:4px;font-variant-numeric:tabular-nums; }
    .lap-num { color:rgba(255,255,255,0.5);font-size:13px; }
    .lap-split { color:#818cf8;font-family:'SF Mono',monospace;font-size:13px;text-align:right; }
    .lap-total { color:#fff;font-family:'SF Mono',monospace;font-size:13px;text-align:right; }
  \`]
})
export class AppComponent implements OnDestroy {
  running = signal(false);
  elapsed = signal(0);
  laps = signal<{ total: number; split: number }[]>([]);
  formatted = signal('00:00.00');
  private interval: any = null;
  private startTime = 0;
  private accumulated = 0;

  toggle() {
    if (this.running()) this.stop();
    else this.start();
  }

  start() {
    this.running.set(true);
    this.startTime = performance.now();
    this.interval = setInterval(() => {
      const now = performance.now();
      const ms = this.accumulated + (now - this.startTime);
      this.elapsed.set(ms);
      this.formatted.set(this.format(ms));
    }, 10);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.accumulated = this.elapsed();
    this.running.set(false);
  }

  lap() {
    const total = this.elapsed();
    const prev = this.laps()[0]?.total || 0;
    const split = total - prev;
    this.laps.update(arr => [{ total, split }, ...arr]);
  }

  reset() {
    this.stop();
    this.elapsed.set(0);
    this.accumulated = 0;
    this.formatted.set('00:00.00');
    this.laps.set([]);
  }

  format(ms: number): string {
    const total = Math.floor(ms);
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const centis = Math.floor((total % 1000) / 10);
    return \`\${String(minutes).padStart(2,'0')}:\${String(seconds).padStart(2,'0')}.\${String(centis).padStart(2,'0')}\`;
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: #0a0a0a; min-height: 100vh; color: #e5e7eb; }`
        },
      ],
    };
  }

  private angularDiceApp(): ProjectTemplate {
    return {
      id: 'angular-dice',
      name: 'Angular Dice Roller',
      description: 'Roll 1-6 dice, track history, animated roll',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <div class="page">
      <div class="card">
        <h1>🎲 Dice Roller</h1>
        <div class="dice-count">
          <label>Dice:</label>
          <button *ngFor="let n of [1,2,3,4,5,6]" (click)="count.set(n)" [class.active]="count() === n">{{ n }}</button>
        </div>

        <div class="dice-grid">
          <div *ngFor="let v of values()" class="die" [class.rolling]="rolling()">
            <span>{{ v }}</span>
          </div>
        </div>

        <div class="total" *ngIf="values().length > 1">
          Total: <b>{{ sum() }}</b>
        </div>

        <button class="roll-btn" (click)="roll()" [disabled]="rolling()">
          {{ rolling() ? 'Rolling...' : '🎲 Roll' }}
        </button>

        <div class="history" *ngIf="history().length > 0">
          <h3>Last 10 rolls</h3>
          <div class="chips">
            <span *ngFor="let h of history().slice(0, 10)" class="chip">{{ h }}</span>
          </div>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .card { background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;max-width:520px;width:100%;text-align:center; }
    h1 { color:#fff;font-size:32px;margin:0 0 24px; }
    .dice-count { display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:24px;flex-wrap:wrap; }
    .dice-count label { color:rgba(255,255,255,0.5);font-size:13px;margin-right:8px; }
    .dice-count button { width:36px;height:36px;padding:0;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#fff;border-radius:8px;cursor:pointer;font-weight:600; }
    .dice-count button.active { background:#818cf8;border-color:#818cf8; }
    .dice-grid { display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;min-height:80px; }
    .die { width:72px;height:72px;background:linear-gradient(135deg,#fff,#e5e7eb);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:#111;box-shadow:0 4px 12px rgba(0,0,0,0.2); }
    .die.rolling { animation:spin 0.4s ease-in-out; }
    @keyframes spin { 0%,100% { transform:rotate(0) scale(1); } 50% { transform:rotate(180deg) scale(0.8); } }
    .total { color:#fff;font-size:18px;margin-bottom:20px; }
    .total b { color:#34d399;font-size:28px;font-family:'JetBrains Mono',monospace; }
    .roll-btn { padding:16px 40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:14px;color:#fff;font-size:18px;font-weight:600;cursor:pointer;transition:all 0.2s; }
    .roll-btn:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 10px 30px rgba(99,102,241,0.4); }
    .roll-btn:disabled { opacity:0.6;cursor:not-allowed; }
    .history { margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08); }
    .history h3 { color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px; }
    .chips { display:flex;flex-wrap:wrap;gap:6px;justify-content:center; }
    .chip { padding:4px 12px;background:rgba(129,140,248,0.12);color:#a5b4fc;border-radius:999px;font-size:12px;font-family:'JetBrains Mono',monospace; }
  \`]
})
export class AppComponent {
  count = signal(2);
  values = signal<number[]>([1, 1]);
  rolling = signal(false);
  history = signal<string[]>([]);

  sum(): number { return this.values().reduce((a, b) => a + b, 0); }

  roll() {
    this.rolling.set(true);
    const n = this.count();
    // Quick shuffle animation
    let ticks = 0;
    const anim = setInterval(() => {
      this.values.set(Array.from({ length: n }, () => Math.ceil(Math.random() * 6)));
      if (++ticks > 8) {
        clearInterval(anim);
        const final = Array.from({ length: n }, () => Math.ceil(Math.random() * 6));
        this.values.set(final);
        this.rolling.set(false);
        const label = final.join('+') + (final.length > 1 ? ' = ' + final.reduce((a,b)=>a+b,0) : '');
        this.history.update(h => [label, ...h].slice(0, 10));
      }
    }, 60);
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: linear-gradient(135deg, #0f172a, #701a75); min-height: 100vh; color: #e5e7eb; }`
        },
      ],
    };
  }

  private angularQuizApp(): ProjectTemplate {
    return {
      id: 'angular-quiz',
      name: 'Angular Quiz App',
      description: 'Multi-question quiz with scoring, correct/wrong feedback, and restart',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Question {
  q: string;
  options: string[];
  answer: number; // index
}

const QUESTIONS: Question[] = [
  { q: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyper Transfer Markup Language'], answer: 0 },
  { q: 'Which is NOT a JavaScript framework?', options: ['Angular', 'React', 'Laravel', 'Vue'], answer: 2 },
  { q: 'What is the default port of Angular dev server?', options: ['3000', '4200', '8080', '5000'], answer: 1 },
  { q: 'Which hook runs once before Angular destroys a component?', options: ['ngOnInit', 'ngOnDestroy', 'ngAfterViewInit', 'ngOnChanges'], answer: 1 },
  { q: 'What is a Promise in JavaScript?', options: ['A variable', 'A function parameter', 'An async value placeholder', 'A CSS property'], answer: 2 },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="page">
      <div class="card">
        <ng-container *ngIf="!finished(); else resultView">
          <div class="progress">
            <div class="progress-bar" [style.width.%]="(current() / questions.length) * 100"></div>
          </div>
          <div class="meta">
            <span>Question {{ current() + 1 }} / {{ questions.length }}</span>
            <span>Score: {{ score() }}</span>
          </div>

          <h2>{{ currentQ().q }}</h2>

          <div class="options">
            <button
              *ngFor="let opt of currentQ().options; let i = index"
              class="option"
              [class.selected]="selected() === i"
              [class.correct]="answered() && i === currentQ().answer"
              [class.wrong]="answered() && selected() === i && i !== currentQ().answer"
              [disabled]="answered()"
              (click)="select(i)"
            >
              <span class="letter">{{ ['A', 'B', 'C', 'D'][i] }}</span>
              {{ opt }}
            </button>
          </div>

          <button class="next" (click)="next()" [disabled]="!answered()">
            {{ current() === questions.length - 1 ? 'Finish' : 'Next' }}
          </button>
        </ng-container>

        <ng-template #resultView>
          <div class="result">
            <div class="result-emoji">{{ scoreEmoji() }}</div>
            <h2>{{ scoreText() }}</h2>
            <p class="result-score">You scored <b>{{ score() }} / {{ questions.length }}</b></p>
            <div class="percent">{{ percent() }}%</div>
            <button class="restart" (click)="restart()">Play Again</button>
          </div>
        </ng-template>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .card { background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;max-width:560px;width:100%; }
    .progress { height:4px;background:rgba(255,255,255,0.05);border-radius:2px;margin-bottom:16px;overflow:hidden; }
    .progress-bar { height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);transition:width 0.3s; }
    .meta { display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:20px; }
    h2 { color:#fff;font-size:22px;line-height:1.4;margin:0 0 24px; }
    .options { display:flex;flex-direction:column;gap:10px;margin-bottom:20px; }
    .option { display:flex;align-items:center;gap:14px;padding:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#fff;font-size:15px;text-align:left;cursor:pointer;transition:all 0.15s; }
    .option:hover:not(:disabled) { background:rgba(129,140,248,0.1);border-color:#818cf8; }
    .option.selected { background:rgba(129,140,248,0.15);border-color:#818cf8; }
    .option.correct { background:rgba(16,185,129,0.15);border-color:#34d399;color:#6ee7b7; }
    .option.wrong { background:rgba(239,68,68,0.15);border-color:#f87171;color:#fca5a5; }
    .option:disabled { cursor:default; }
    .letter { width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0; }
    .option.correct .letter { background:#34d399;color:#064e3b; }
    .option.wrong .letter { background:#f87171;color:#7f1d1d; }
    .next { width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;cursor:pointer; }
    .next:disabled { opacity:0.4;cursor:not-allowed; }
    .next:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 8px 20px rgba(99,102,241,0.3); }
    .result { text-align:center;padding:20px 0; }
    .result-emoji { font-size:72px;margin-bottom:16px; }
    .result h2 { color:#fff;font-size:28px;margin-bottom:12px; }
    .result-score { color:rgba(255,255,255,0.6);margin-bottom:20px; }
    .result-score b { color:#fff; }
    .percent { font-size:56px;font-weight:800;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:24px; }
    .restart { padding:14px 40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:600;cursor:pointer; }
    .restart:hover { transform:translateY(-2px);box-shadow:0 10px 30px rgba(99,102,241,0.4); }
  \`]
})
export class AppComponent {
  questions = QUESTIONS;
  current = signal(0);
  selected = signal<number | null>(null);
  answered = signal(false);
  score = signal(0);
  finished = signal(false);

  currentQ = computed(() => this.questions[this.current()]);
  percent = computed(() => Math.round((this.score() / this.questions.length) * 100));
  scoreEmoji = computed(() => {
    const p = this.percent();
    return p === 100 ? '🏆' : p >= 80 ? '🎉' : p >= 60 ? '👍' : p >= 40 ? '🤔' : '📚';
  });
  scoreText = computed(() => {
    const p = this.percent();
    return p === 100 ? 'Perfect score!' : p >= 80 ? 'Great job!' : p >= 60 ? 'Good effort!' : p >= 40 ? 'Keep practicing' : 'Try again';
  });

  select(i: number) {
    if (this.answered()) return;
    this.selected.set(i);
    this.answered.set(true);
    if (i === this.currentQ().answer) this.score.update(s => s + 1);
  }

  next() {
    if (this.current() >= this.questions.length - 1) {
      this.finished.set(true);
      return;
    }
    this.current.update(c => c + 1);
    this.selected.set(null);
    this.answered.set(false);
  }

  restart() {
    this.current.set(0);
    this.selected.set(null);
    this.answered.set(false);
    this.score.set(0);
    this.finished.set(false);
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: linear-gradient(135deg, #0f172a, #1e1b4b, #581c87); min-height: 100vh; color: #e5e7eb; }`
        },
      ],
    };
  }

  /**
   * Dynamic generator for any custom app idea.
   * Produces a minimal Angular starter with the idea as the app component.
   */
  private angularChessApp(): ProjectTemplate {
    return {
      id: 'angular-chess',
      name: 'Angular Chess Game',
      description: 'Working chess with 8x8 board, all 32 pieces, click-to-move, turn tracking, capture highlights',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type Piece = { type: string; color: 'w' | 'b'; symbol: string } | null;

const PIECE_SYMBOLS: Record<string, { w: string; b: string }> = {
  king:   { w: '\\u2654', b: '\\u265A' },
  queen:  { w: '\\u2655', b: '\\u265B' },
  rook:   { w: '\\u2656', b: '\\u265C' },
  bishop: { w: '\\u2657', b: '\\u265D' },
  knight: { w: '\\u2658', b: '\\u265E' },
  pawn:   { w: '\\u2659', b: '\\u265F' },
};

function initialBoard(): Piece[][] {
  const backRow: string[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  const board: Piece[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  // Black
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRow[c], color: 'b', symbol: PIECE_SYMBOLS[backRow[c]].b };
    board[1][c] = { type: 'pawn', color: 'b', symbol: PIECE_SYMBOLS['pawn'].b };
  }
  // White
  for (let c = 0; c < 8; c++) {
    board[6][c] = { type: 'pawn', color: 'w', symbol: PIECE_SYMBOLS['pawn'].w };
    board[7][c] = { type: backRow[c], color: 'w', symbol: PIECE_SYMBOLS[backRow[c]].w };
  }
  return board;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="page">
      <div class="game">
        <h1>♟ Chess</h1>
        <div class="status">
          <span [class.active]="turn() === 'w'">♔ White</span>
          <span class="vs">vs</span>
          <span [class.active]="turn() === 'b'">♚ Black</span>
        </div>
        <div *ngIf="message()" class="message" [class.check]="message().includes('check')">{{ message() }}</div>

        <div class="board">
          <div
            *ngFor="let row of board(); let r = index"
            class="row"
          >
            <div
              *ngFor="let cell of row; let c = index"
              class="cell"
              [class.light]="(r + c) % 2 === 0"
              [class.dark]="(r + c) % 2 === 1"
              [class.selected]="isSelected(r, c)"
              [class.target]="isValidMove(r, c)"
              [class.captured]="isValidMove(r, c) && cell"
              (click)="onCellClick(r, c)"
            >
              <span class="piece" *ngIf="cell" [class.white]="cell.color === 'w'" [class.black]="cell.color === 'b'">
                {{ cell.symbol }}
              </span>
              <span class="coord-r" *ngIf="c === 0">{{ 8 - r }}</span>
              <span class="coord-c" *ngIf="r === 7">{{ 'abcdefgh'[c] }}</span>
            </div>
          </div>
        </div>

        <div class="captures">
          <div class="cap-row">
            <span class="label">White captured:</span>
            <span class="cap-pieces">{{ capturedByWhite().join(' ') || '—' }}</span>
          </div>
          <div class="cap-row">
            <span class="label">Black captured:</span>
            <span class="cap-pieces">{{ capturedByBlack().join(' ') || '—' }}</span>
          </div>
        </div>

        <div class="actions">
          <button (click)="undo()" [disabled]="history().length === 0">Undo</button>
          <button (click)="reset()">New Game</button>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .game { background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;max-width:640px;width:100%; }
    h1 { color:#fff;text-align:center;margin:0 0 12px;font-size:28px; }
    .status { display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:12px;font-size:16px;color:rgba(255,255,255,0.5); }
    .status .active { color:#fff;font-weight:700;background:rgba(129,140,248,0.2);padding:4px 12px;border-radius:8px; }
    .vs { font-size:12px;color:rgba(255,255,255,0.3); }
    .message { text-align:center;padding:10px;background:rgba(129,140,248,0.1);color:#a5b4fc;border-radius:8px;margin-bottom:12px;font-size:14px; }
    .message.check { background:rgba(239,68,68,0.15);color:#fca5a5; }
    .board { border:3px solid #1f2937;border-radius:8px;overflow:hidden;user-select:none;margin-bottom:16px; }
    .row { display:flex; }
    .cell { flex:1;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:44px;cursor:pointer;position:relative;transition:background 0.1s; }
    .cell.light { background:#f0d9b5; }
    .cell.dark { background:#b58863; }
    .cell.selected { background:#646d40 !important;box-shadow:inset 0 0 0 3px #fdd835; }
    .cell.target::after { content:'';position:absolute;width:24%;height:24%;background:rgba(0,0,0,0.35);border-radius:50%; }
    .cell.target.captured::after { width:100%;height:100%;background:transparent;border:4px solid rgba(220,53,69,0.6);border-radius:0;box-sizing:border-box; }
    .piece { z-index:1;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3)); }
    .piece.white { color:#fff;text-shadow:0 0 2px #000; }
    .piece.black { color:#000; }
    .coord-r, .coord-c { position:absolute;font-size:10px;font-weight:700;color:rgba(0,0,0,0.5); }
    .coord-r { top:2px;left:4px; }
    .coord-c { bottom:2px;right:4px; }
    .captures { padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;margin-bottom:12px; }
    .cap-row { display:flex;gap:8px;margin-bottom:4px;font-size:13px; }
    .cap-row:last-child { margin:0; }
    .label { color:rgba(255,255,255,0.5); }
    .cap-pieces { color:#fff;font-size:18px;letter-spacing:2px; }
    .actions { display:flex;gap:8px; }
    .actions button { flex:1;padding:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s; }
    .actions button:hover:not(:disabled) { background:rgba(129,140,248,0.2);border-color:#818cf8; }
    .actions button:disabled { opacity:0.4;cursor:not-allowed; }
    @media (max-width:700px) { .cell { font-size:28px; } .game { padding:16px; } }
  \`]
})
export class AppComponent {
  board = signal<Piece[][]>(initialBoard());
  turn = signal<'w' | 'b'>('w');
  selected = signal<{ r: number; c: number } | null>(null);
  validMoves = signal<{ r: number; c: number }[]>([]);
  capturedByWhite = signal<string[]>([]);
  capturedByBlack = signal<string[]>([]);
  history = signal<Piece[][][]>([]);
  message = signal<string>('');

  isSelected(r: number, c: number): boolean {
    const s = this.selected();
    return s?.r === r && s?.c === c;
  }

  isValidMove(r: number, c: number): boolean {
    return this.validMoves().some(m => m.r === r && m.c === c);
  }

  onCellClick(r: number, c: number) {
    const b = this.board();
    const piece = b[r][c];
    const sel = this.selected();

    // If clicking a target move cell
    if (sel && this.isValidMove(r, c)) {
      this.move(sel.r, sel.c, r, c);
      return;
    }

    // Select own piece
    if (piece && piece.color === this.turn()) {
      this.selected.set({ r, c });
      this.validMoves.set(this.getLegalMoves(r, c));
      this.message.set('');
      return;
    }

    // Clicked elsewhere — deselect
    this.selected.set(null);
    this.validMoves.set([]);
  }

  move(fr: number, fc: number, tr: number, tc: number) {
    const newBoard = this.board().map(row => [...row]);
    const piece = newBoard[fr][fc];
    if (!piece) return;

    // Save history for undo
    this.history.update(h => [...h, this.board().map(row => [...row])]);

    // Capture
    const captured = newBoard[tr][tc];
    if (captured) {
      if (captured.color === 'b') this.capturedByWhite.update(a => [...a, captured.symbol]);
      else this.capturedByBlack.update(a => [...a, captured.symbol]);
    }

    // Pawn promotion (auto-queen for simplicity)
    if (piece.type === 'pawn' && (tr === 0 || tr === 7)) {
      piece.type = 'queen';
      piece.symbol = PIECE_SYMBOLS['queen'][piece.color];
      this.message.set(\`Pawn promoted to queen!\`);
    }

    newBoard[tr][tc] = piece;
    newBoard[fr][fc] = null;
    this.board.set(newBoard);
    this.selected.set(null);
    this.validMoves.set([]);
    this.turn.update(t => t === 'w' ? 'b' : 'w');
  }

  getLegalMoves(r: number, c: number): { r: number; c: number }[] {
    const b = this.board();
    const piece = b[r][c];
    if (!piece) return [];
    const moves: { r: number; c: number }[] = [];
    const dir = piece.color === 'w' ? -1 : 1;
    const inside = (x: number) => x >= 0 && x < 8;
    const canTake = (x: number, y: number) => inside(x) && inside(y) && (!b[x][y] || b[x][y]!.color !== piece.color);

    if (piece.type === 'pawn') {
      // Forward
      if (inside(r + dir) && !b[r + dir][c]) {
        moves.push({ r: r + dir, c });
        // Double from start
        const startRow = piece.color === 'w' ? 6 : 1;
        if (r === startRow && !b[r + 2 * dir][c]) moves.push({ r: r + 2 * dir, c });
      }
      // Capture diagonals
      for (const dc of [-1, 1]) {
        const nr = r + dir, nc = c + dc;
        if (inside(nr) && inside(nc) && b[nr][nc] && b[nr][nc]!.color !== piece.color) {
          moves.push({ r: nr, c: nc });
        }
      }
    } else if (piece.type === 'knight') {
      const deltas = [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]];
      for (const [dr, dc] of deltas) {
        const nr = r + dr, nc = c + dc;
        if (canTake(nr, nc)) moves.push({ r: nr, c: nc });
      }
    } else if (piece.type === 'king') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (canTake(r + dr, c + dc)) moves.push({ r: r + dr, c: c + dc });
        }
      }
    } else {
      // Sliding pieces: rook, bishop, queen
      const dirs: number[][] = [];
      if (piece.type === 'rook' || piece.type === 'queen') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      if (piece.type === 'bishop' || piece.type === 'queen') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (inside(nr) && inside(nc)) {
          if (!b[nr][nc]) { moves.push({ r: nr, c: nc }); }
          else {
            if (b[nr][nc]!.color !== piece.color) moves.push({ r: nr, c: nc });
            break;
          }
          nr += dr; nc += dc;
        }
      }
    }
    return moves;
  }

  undo() {
    const h = this.history();
    if (h.length === 0) return;
    const last = h[h.length - 1];
    this.board.set(last);
    this.history.update(arr => arr.slice(0, -1));
    this.turn.update(t => t === 'w' ? 'b' : 'w');
    this.selected.set(null);
    this.validMoves.set([]);
    this.message.set('');
  }

  reset() {
    this.board.set(initialBoard());
    this.turn.set('w');
    this.selected.set(null);
    this.validMoves.set([]);
    this.capturedByWhite.set([]);
    this.capturedByBlack.set([]);
    this.history.set([]);
    this.message.set('');
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460); min-height: 100vh; color: #e5e7eb; }`
        },
      ],
    };
  }

  private angularSnakeApp(): ProjectTemplate {
    return {
      id: 'angular-snake',
      name: 'Angular Snake Game',
      description: 'Classic snake game with arrow key controls, food, score, and game over',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

type Point = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';

const GRID = 20;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="page">
      <div class="game">
        <div class="head">
          <h1>🐍 Snake</h1>
          <div class="scores">
            <span>Score: <b>{{ score() }}</b></span>
            <span>Best: <b>{{ best() }}</b></span>
          </div>
        </div>

        <div class="board" [style.grid-template-columns]="cols">
          <div
            *ngFor="let cell of cells(); let i = index"
            class="cell"
            [class.snake]="isSnake(i)"
            [class.head-cell]="isHead(i)"
            [class.food]="isFood(i)"
          ></div>
        </div>

        <div class="controls">
          <button *ngIf="!running() && !gameOver()" (click)="start()">Start</button>
          <button *ngIf="running()" (click)="pause()">Pause</button>
          <button *ngIf="gameOver()" (click)="start()">Play Again</button>
          <span class="hint">Use Arrow Keys or WASD</span>
        </div>

        <div *ngIf="gameOver()" class="game-over">Game Over!</div>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .game { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:24px;max-width:560px;width:100%; }
    .head { display:flex;justify-content:space-between;align-items:center;margin-bottom:16px; }
    h1 { color:#fff;font-size:24px;margin:0; }
    .scores { display:flex;gap:16px;font-size:14px;color:rgba(255,255,255,0.6); }
    .scores b { color:#34d399;font-family:'JetBrains Mono',monospace;font-size:16px; }
    .board { display:grid;gap:1px;background:#111;padding:4px;border-radius:8px;aspect-ratio:1;margin-bottom:12px; }
    .cell { background:#1f2937;border-radius:2px;transition:background 0.05s; }
    .cell.snake { background:#10b981; }
    .cell.head-cell { background:#34d399; }
    .cell.food { background:#ef4444;border-radius:50%; }
    .controls { display:flex;gap:12px;align-items:center;justify-content:center; }
    .controls button { padding:10px 24px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer; }
    .controls button:hover { transform:translateY(-1px); }
    .hint { color:rgba(255,255,255,0.4);font-size:12px; }
    .game-over { text-align:center;padding:12px;background:rgba(239,68,68,0.15);color:#fca5a5;border-radius:8px;margin-top:12px;font-weight:700; }
  \`]
})
export class AppComponent implements OnDestroy {
  grid = GRID;
  cols = \`repeat(\${GRID}, 1fr)\`;
  snake = signal<Point[]>([{ x: 10, y: 10 }]);
  food = signal<Point>({ x: 5, y: 5 });
  dir = signal<Dir>('right');
  score = signal(0);
  best = signal(Number(localStorage.getItem('snakeBest')) || 0);
  running = signal(false);
  gameOver = signal(false);
  cells = signal<number[]>(Array.from({ length: GRID * GRID }, (_, i) => i));
  private interval: any = null;
  private pendingDir: Dir | null = null;

  isSnake(i: number): boolean {
    const x = i % this.grid, y = Math.floor(i / this.grid);
    return this.snake().some(p => p.x === x && p.y === y);
  }
  isHead(i: number): boolean {
    const x = i % this.grid, y = Math.floor(i / this.grid);
    const head = this.snake()[0];
    return head.x === x && head.y === y;
  }
  isFood(i: number): boolean {
    const x = i % this.grid, y = Math.floor(i / this.grid);
    const f = this.food();
    return f.x === x && f.y === y;
  }

  start() {
    this.snake.set([{ x: 10, y: 10 }]);
    this.dir.set('right');
    this.score.set(0);
    this.placeFood();
    this.gameOver.set(false);
    this.running.set(true);
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), 120);
  }

  pause() {
    this.running.set(false);
    if (this.interval) clearInterval(this.interval);
  }

  tick() {
    if (this.pendingDir) {
      const opposites: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
      if (opposites[this.pendingDir] !== this.dir()) this.dir.set(this.pendingDir);
      this.pendingDir = null;
    }

    const head = { ...this.snake()[0] };
    const d = this.dir();
    if (d === 'up') head.y--;
    if (d === 'down') head.y++;
    if (d === 'left') head.x--;
    if (d === 'right') head.x++;

    // Wall collision
    if (head.x < 0 || head.x >= this.grid || head.y < 0 || head.y >= this.grid) {
      this.end(); return;
    }
    // Self collision
    if (this.snake().some(p => p.x === head.x && p.y === head.y)) {
      this.end(); return;
    }

    const newSnake = [head, ...this.snake()];
    const f = this.food();
    if (head.x === f.x && head.y === f.y) {
      this.score.update(s => s + 1);
      this.placeFood();
    } else {
      newSnake.pop();
    }
    this.snake.set(newSnake);
  }

  end() {
    this.running.set(false);
    this.gameOver.set(true);
    if (this.interval) clearInterval(this.interval);
    if (this.score() > this.best()) {
      this.best.set(this.score());
      localStorage.setItem('snakeBest', String(this.score()));
    }
  }

  placeFood() {
    let f: Point;
    do {
      f = { x: Math.floor(Math.random() * this.grid), y: Math.floor(Math.random() * this.grid) };
    } while (this.snake().some(p => p.x === f.x && p.y === f.y));
    this.food.set(f);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const map: Record<string, Dir> = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
    };
    if (map[e.key]) {
      this.pendingDir = map[e.key];
      e.preventDefault();
    }
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: #0f172a; min-height: 100vh; color: #e5e7eb; }`
        },
      ],
    };
  }

  private dynamicAngularApp(idea: string): ProjectTemplate {
    const cleanIdea = idea.trim();
    const title = cleanIdea.replace(/\b\w/g, ch => ch.toUpperCase());
    const slug = cleanIdea.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    return {
      id: `custom:${idea}`,
      name: `Angular ${title} App`,
      description: `Minimal Angular starter for: ${cleanIdea}. Implement your logic in app.component.ts`,
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * ${title} App
 *
 * TODO: Implement the ${cleanIdea} here.
 * This is a starter scaffold — customize the state, template, and logic below.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <div class="page">
      <div class="card">
        <h1>${title}</h1>
        <p class="subtitle">Your ${cleanIdea} starts here</p>

        <div class="placeholder">
          <p>👋 Welcome! This is a custom Angular app scaffold for <b>${cleanIdea}</b>.</p>
          <p>Edit <code>src/app/app.component.ts</code> to build your app.</p>
        </div>

        <div class="demo">
          <div class="counter">
            <button (click)="decrement()">−</button>
            <span>{{ count() }}</span>
            <button (click)="increment()">+</button>
          </div>
          <p class="hint">Example state (replace with your logic)</p>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px; }
    .card { background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:48px;max-width:520px;width:100%;text-align:center; }
    h1 { color:#fff;font-size:36px;margin:0 0 8px; }
    .subtitle { color:rgba(255,255,255,0.5);font-size:15px;margin:0 0 32px; }
    .placeholder { background:rgba(129,140,248,0.08);border:1px dashed rgba(129,140,248,0.25);border-radius:12px;padding:24px;margin-bottom:24px;text-align:left; }
    .placeholder p { color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6;margin:0 0 8px; }
    .placeholder p:last-child { margin:0;color:rgba(255,255,255,0.5); }
    .placeholder code { background:rgba(0,0,0,0.3);color:#a5b4fc;padding:2px 8px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:13px; }
    .demo { padding-top:24px;border-top:1px solid rgba(255,255,255,0.08); }
    .counter { display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:8px; }
    .counter button { width:48px;height:48px;border-radius:50%;border:none;background:rgba(255,255,255,0.08);color:#fff;font-size:24px;cursor:pointer;transition:all 0.15s; }
    .counter button:hover { background:rgba(129,140,248,0.2); }
    .counter span { font-size:32px;font-weight:700;color:#fff;min-width:60px;font-variant-numeric:tabular-nums; }
    .hint { color:rgba(255,255,255,0.3);font-size:12px;font-style:italic;margin:0; }
  \`]
})
export class AppComponent {
  count = signal(0);

  increment() { this.count.update(n => n + 1); }
  decrement() { this.count.update(n => n - 1); }
}`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: linear-gradient(135deg, #0f172a, #1e1b4b, #312e81); min-height: 100vh; color: #e5e7eb; }`
        },
        {
          path: 'README.md',
          content: `# Angular ${title} App

A starter scaffold for: **${cleanIdea}**

## Getting Started

\`\`\`bash
npm install
ng serve
\`\`\`

App runs at http://localhost:4200

## Structure

\`\`\`
src/
├── app/
│   └── app.component.ts    ← Implement your ${cleanIdea} logic here
├── main.ts
├── index.html
└── styles.css
\`\`\`

## TODO

- Implement the core logic for ${cleanIdea}
- Add state management (signals are pre-configured)
- Style the UI in the component's \`styles\` array

Built with Angular 17+ standalone components.
`
        },
      ],
    };
  }

  /**
   * Shared shell files for single-purpose Angular apps:
   * package.json, index.html, main.ts, angular.json, tsconfig.*
   */
  private angularShellFiles(prefix: string): TemplateFile[] {
    const p = (path: string) => prefix ? `${prefix}/${path}` : path;
    return [
      {
        path: p('package.json'),
        content: `{
  "name": "angular-app",
  "version": "0.1.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build"
  },
  "dependencies": {
    "@angular/animations": "^17.3.0",
    "@angular/common": "^17.3.0",
    "@angular/compiler": "^17.3.0",
    "@angular/core": "^17.3.0",
    "@angular/forms": "^17.3.0",
    "@angular/platform-browser": "^17.3.0",
    "@angular/router": "^17.3.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.3.0",
    "@angular/cli": "^17.3.0",
    "@angular/compiler-cli": "^17.3.0",
    "typescript": "~5.4.0"
  }
}`
      },
      {
        path: p('src/index.html'),
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My App</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>`
      },
      {
        path: p('src/main.ts'),
        content: `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent)
  .catch(err => console.error(err));`
      },
      {
        path: p('angular.json'),
        content: `{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "frontend": {
      "projectType": "application",
      "schematics": { "@schematics/angular:component": { "style": "css", "standalone": true } },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/frontend",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "assets": [],
            "styles": ["src/styles.css"]
          },
          "configurations": {
            "production": { "outputHashing": "all" },
            "development": { "optimization": false, "extractLicenses": false, "sourceMap": true }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": { "buildTarget": "frontend:build:production" },
            "development": { "buildTarget": "frontend:build:development" }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  }
}`
      },
      {
        path: p('tsconfig.json'),
        content: `{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "strict": true,
    "noImplicitOverride": true,
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "lib": ["ES2022", "dom"]
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictTemplates": true
  }
}`
      },
      {
        path: p('tsconfig.app.json'),
        content: `{
  "extends": "./tsconfig.json",
  "compilerOptions": { "outDir": "./out-tsc/app", "types": [] },
  "files": ["src/main.ts"],
  "include": ["src/**/*.d.ts"]
}`
      },
    ];
  }

  /**
   * Angular Chatbot App — fully working chat UI with keyword-based local bot.
   * Real features: message list, signals-based state, typing indicator, Enter-to-send,
   * quick replies, localStorage persistence, clear-chat. No backend required.
   */
  private angularChatbotApp(): ProjectTemplate {
    return {
      id: 'angular-chatbot',
      name: 'Angular Chatbot App',
      description: 'Working chat UI with user/bot bubbles, typing indicator, keyword-based local replies, quick-reply chips, and localStorage persistence',
      files: [
        ...this.angularShellFiles(''),
        {
          path: 'src/app/app.component.ts',
          content: `import { Component, signal, computed, effect, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  timestamp: number;
}

// Keyword-based rule engine. Each rule returns a bot reply when its pattern hits.
// Add your own rules here — or swap the whole replyEngine for a real API call.
interface BotRule {
  pattern: RegExp;
  reply: string | ((match: RegExpMatchArray) => string);
}

const BOT_RULES: BotRule[] = [
  { pattern: /^(hi|hello|hey|yo|good\s+(morning|evening|afternoon))\\b/i,
    reply: 'Hi there! I\\'m a local chatbot. Ask me about the weather, the time, or my name.' },
  { pattern: /\\b(how are you|how\\'s it going|sup)\\b/i,
    reply: 'Running at 60 frames per second and never sleeping. How about you?' },
  { pattern: /\\bwhat\\s+(is\\s+)?your\\s+name\\b/i,
    reply: 'I\\'m ChatBot — your local Angular-powered assistant.' },
  { pattern: /\\b(who\\s+made|who\\s+built|who\\s+created)\\s+you\\b/i,
    reply: 'I was scaffolded by an Angular project generator and customized to reply to keywords.' },
  { pattern: /\\bwhat\\s+time\\b/i,
    reply: () => 'Right now it\\'s ' + new Date().toLocaleTimeString() + '.' },
  { pattern: /\\bwhat\\s+(day|date)\\b/i,
    reply: () => 'Today is ' + new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '.' },
  { pattern: /\\bweather\\b/i,
    reply: 'I don\\'t have a weather API hooked up, but if you open the developer console I promise the fan inside your laptop is warm.' },
  { pattern: /\\b(tell.*joke|make.*laugh)\\b/i,
    reply: 'Why did the developer go broke? Because he used up all his cache.' },
  { pattern: /\\b(thank|thanks|ty)\\b/i,
    reply: 'You\\'re welcome!' },
  { pattern: /\\b(bye|goodbye|see ya|cya|exit|quit)\\b/i,
    reply: 'Take care. Refresh the page when you want to chat again.' },
  { pattern: /\\bhelp\\b/i,
    reply: 'Try: "hi", "what time is it?", "tell me a joke", "who made you?", or click a suggestion below.' },
];

const DEFAULT_REPLIES = [
  'Interesting — tell me more.',
  'I only speak keyword, so try asking about the time, my name, or say "help".',
  'Not sure I follow. Try rephrasing, or click one of the suggestions below.',
];

const QUICK_REPLIES = [
  'Hello',
  'What time is it?',
  'Tell me a joke',
  'Who made you?',
  'Help',
];

const STORAGE_KEY = 'chatbot_history_v1';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <div class="page">
      <div class="chat-shell">
        <header class="chat-hdr">
          <div class="avatar">🤖</div>
          <div class="hdr-text">
            <h1>ChatBot</h1>
            <span class="status">
              <span class="dot"></span>
              online
            </span>
          </div>
          <button class="clear-btn" (click)="clearChat()" title="Clear conversation">Clear</button>
        </header>

        <div class="chat-body" #scrollArea>
          <div *ngFor="let m of messages(); trackBy: trackMsg"
               class="msg"
               [class.user]="m.role === 'user'"
               [class.bot]="m.role === 'bot'">
            <div class="bubble">
              <div class="text">{{ m.text }}</div>
              <div class="time">{{ formatTime(m.timestamp) }}</div>
            </div>
          </div>

          <div class="msg bot" *ngIf="typing()">
            <div class="bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div class="quick-replies" *ngIf="messages().length <= 1">
          <button *ngFor="let q of quickReplies" (click)="sendQuick(q)">{{ q }}</button>
        </div>

        <form class="chat-input" (ngSubmit)="send()" #formRef="ngForm">
          <input
            type="text"
            [(ngModel)]="draft"
            name="draft"
            placeholder="Type a message..."
            autocomplete="off"
            [disabled]="typing()"
            (keydown.enter)="send(); $event.preventDefault()" />
          <button type="submit" [disabled]="!draft.trim() || typing()">Send</button>
        </form>
      </div>
    </div>
  \`,
  styles: [\`
    .page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .chat-shell { width: 100%; max-width: 520px; height: 80vh; min-height: 600px; background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; }
    .chat-hdr { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #818cf8, #a78bfa); display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .hdr-text { flex: 1; }
    .hdr-text h1 { font-size: 16px; margin: 0; color: #fff; font-weight: 600; }
    .status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.5); }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399; animation: pulse 2s infinite; }
    @keyframes pulse { 50% { opacity: 0.5; } }
    .clear-btn { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.6); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.15s; }
    .clear-btn:hover { background: rgba(239,68,68,0.15); border-color: #ef4444; color: #fca5a5; }

    .chat-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
    .chat-body::-webkit-scrollbar { width: 6px; }
    .chat-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }

    .msg { display: flex; animation: slide-in 0.2s ease-out; }
    @keyframes slide-in { from { opacity: 0; transform: translateY(8px); } }
    .msg.user { justify-content: flex-end; }
    .msg.bot { justify-content: flex-start; }
    .bubble { max-width: 75%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.5; position: relative; }
    .msg.user .bubble { background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; border-bottom-right-radius: 4px; }
    .msg.bot .bubble { background: rgba(255,255,255,0.08); color: #e5e7eb; border-bottom-left-radius: 4px; }
    .text { white-space: pre-wrap; word-break: break-word; }
    .time { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 3px; }
    .msg.user .time { color: rgba(255,255,255,0.7); text-align: right; }

    .bubble.typing { display: inline-flex; gap: 4px; padding: 14px 16px; }
    .bubble.typing span { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.4); animation: bounce 1.2s infinite; }
    .bubble.typing span:nth-child(2) { animation-delay: 0.2s; }
    .bubble.typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }

    .quick-replies { padding: 12px 20px 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .quick-replies button { background: rgba(129,140,248,0.1); color: #a5b4fc; border: 1px solid rgba(129,140,248,0.25); padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .quick-replies button:hover { background: rgba(129,140,248,0.2); border-color: #818cf8; }

    .chat-input { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.08); }
    .chat-input input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; color: #fff; font-size: 14px; outline: none; transition: border-color 0.15s; }
    .chat-input input:focus { border-color: #818cf8; }
    .chat-input input:disabled { opacity: 0.5; }
    .chat-input button { background: linear-gradient(135deg, #6366f1, #818cf8); border: none; color: #fff; padding: 0 18px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s; }
    .chat-input button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99,102,241,0.4); }
    .chat-input button:disabled { opacity: 0.4; cursor: not-allowed; }
  \`]
})
export class AppComponent implements AfterViewInit {
  readonly messages = signal<ChatMessage[]>([]);
  readonly typing = signal(false);
  readonly quickReplies = QUICK_REPLIES;

  draft = '';
  private nextId = 1;
  private scrollArea = viewChild<ElementRef<HTMLDivElement>>('scrollArea');

  constructor() {
    // Load persisted conversation on startup.
    this.restoreHistory();

    // If nothing was restored, greet the user.
    if (this.messages().length === 0) {
      this.addBot('Hi! I\\'m a local chatbot. Ask me anything — or tap a suggestion below.');
    }

    // Auto-persist whenever the message list changes.
    effect(() => {
      const msgs = this.messages();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch {}
    });
  }

  ngAfterViewInit() { this.scrollToBottom(); }

  trackMsg = (_: number, m: ChatMessage) => m.id;
  formatTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  send() {
    const text = this.draft.trim();
    if (!text || this.typing()) return;
    this.draft = '';
    this.addUser(text);
    this.respondTo(text);
  }

  sendQuick(text: string) {
    if (this.typing()) return;
    this.addUser(text);
    this.respondTo(text);
  }

  clearChat() {
    this.messages.set([]);
    this.addBot('Conversation cleared. What would you like to talk about?');
  }

  // === internals ===

  private addUser(text: string) {
    this.messages.update(list => [...list, { id: this.nextId++, role: 'user', text, timestamp: Date.now() }]);
    queueMicrotask(() => this.scrollToBottom());
  }

  private addBot(text: string) {
    this.messages.update(list => [...list, { id: this.nextId++, role: 'bot', text, timestamp: Date.now() }]);
    queueMicrotask(() => this.scrollToBottom());
  }

  // Compute a reply by matching the first rule whose pattern hits.
  // Swap this function for a fetch() to a real API when you're ready.
  private respondTo(userText: string) {
    const delay = 500 + Math.random() * 700; // simulate "thinking"
    this.typing.set(true);
    setTimeout(() => {
      this.typing.set(false);
      const reply = this.replyFor(userText);
      this.addBot(reply);
    }, delay);
  }

  private replyFor(userText: string): string {
    for (const rule of BOT_RULES) {
      const m = userText.match(rule.pattern);
      if (m) return typeof rule.reply === 'function' ? rule.reply(m) : rule.reply;
    }
    return DEFAULT_REPLIES[Math.floor(Math.random() * DEFAULT_REPLIES.length)];
  }

  private scrollToBottom() {
    const el = this.scrollArea()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private restoreHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length) {
        this.messages.set(parsed);
        this.nextId = Math.max(...parsed.map(m => m.id)) + 1;
      }
    } catch {}
  }
}
`
        },
        {
          path: 'src/styles.css',
          content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, 'Inter', sans-serif; background: linear-gradient(135deg, #0f172a, #1e1b4b, #312e81); min-height: 100vh; color: #e5e7eb; }`
        },
        {
          path: 'README.md',
          content: `# Angular Chatbot App

A working chat UI with signals, keyword-based local bot, typing indicator, and localStorage persistence.

## Run

\\\`\\\`\\\`bash
npm install
npm run dev    # or: ng serve
\\\`\\\`\\\`

Open [http://localhost:4200](http://localhost:4200).

## What's included

- **Message list** with user/bot bubbles, timestamps, smooth slide-in animation
- **Typing indicator** — 500-1200 ms random delay simulates "thinking"
- **Keyword rule engine** in \\\`BOT_RULES\\\` (src/app/app.component.ts). Each rule is \\\`{ pattern: RegExp, reply: string | (m) => string }\\\`. Add your own.
- **Quick reply chips** shown on a fresh conversation
- **localStorage persistence** — conversations survive page refresh. Clear via the Clear button.
- **Enter-to-send**, disabled state while bot is "typing", auto-scroll to newest message

## Wire up a real backend

The \\\`respondTo()\\\` method is the hook. Replace the \\\`replyFor()\\\` call with a \\\`fetch()\\\` to your API (OpenAI, Claude, your own Express RAG endpoint, etc.):

\\\`\\\`\\\`typescript
private async respondTo(userText: string) {
  this.typing.set(true);
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userText }) });
    const { reply } = await res.json();
    this.addBot(reply);
  } catch {
    this.addBot('Sorry, I had trouble reaching the server.');
  } finally {
    this.typing.set(false);
  }
}
\\\`\\\`\\\`

## State model

Everything uses signals — no RxJS needed for a chat this size:
- \\\`messages: signal<ChatMessage[]>\\\` — the conversation
- \\\`typing: signal<boolean>\\\` — shows the three-dot indicator and disables input
- An \\\`effect()\\\` auto-persists every message change to localStorage
`
        },
      ],
    };
  }

  private angularOnly(): ProjectTemplate {
    return {
      id: 'angular-only',
      name: 'Angular Frontend',
      description: 'Standalone Angular 17+ project',
      files: this.angularFiles(''),
    };
  }

  private expressOnly(): ProjectTemplate {
    return {
      id: 'express-only',
      name: 'Express Backend',
      description: 'Node.js + Express + MongoDB API',
      files: this.expressFiles(''),
    };
  }

  // ===== ANGULAR FILES =====

  private angularFiles(prefix: string): TemplateFile[] {
    const p = (path: string) => prefix ? `${prefix}/${path}` : path;
    return [
      {
        path: p('package.json'),
        content: `{
  "name": "frontend",
  "version": "0.1.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "dependencies": {
    "@angular/animations": "^17.3.0",
    "@angular/common": "^17.3.0",
    "@angular/compiler": "^17.3.0",
    "@angular/core": "^17.3.0",
    "@angular/forms": "^17.3.0",
    "@angular/platform-browser": "^17.3.0",
    "@angular/router": "^17.3.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.3.0",
    "@angular/cli": "^17.3.0",
    "@angular/compiler-cli": "^17.3.0",
    "typescript": "~5.4.0"
  }
}`
      },
      {
        path: p('src/index.html'),
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My App</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <app-root></app-root>
</body>
</html>`
      },
      {
        path: p('src/main.ts'),
        content: `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));`
      },
      {
        path: p('src/styles.css'),
        content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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

.btn { padding: 10px 20px; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-danger { background: var(--danger); color: #fff; }

.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }`
      },
      {
        path: p('src/app/app.component.ts'),
        content: `import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: \`
    <app-header></app-header>
    <main class="container" style="padding: 24px 20px;">
      <router-outlet></router-outlet>
    </main>
  \`
})
export class AppComponent { }`
      },
      {
        path: p('src/app/app.config.ts'),
        content: `import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ]
};`
      },
      {
        path: p('src/app/app.routes.ts'),
        content: `import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'users', canActivate: [authGuard], loadComponent: () => import('./components/user-list/user-list.component').then(m => m.UserListComponent) },
  { path: '**', redirectTo: '' },
];`
      },
      {
        path: p('src/app/services/auth.service.ts'),
        content: `import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:4100/api/auth';

  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);
  isLoggedIn = computed(() => !!this.token());

  constructor() {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t && u) { this.token.set(t); this.currentUser.set(JSON.parse(u)); }
  }

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post(\`\${this.apiUrl}/register\`, { name, email, password });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(\`\${this.apiUrl}/login\`, { email, password })
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

  getToken(): string | null { return this.token(); }
}`
      },
      {
        path: p('src/app/services/api.service.ts'),
        content: `import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:4100/api';

  getAll<T>(endpoint: string): Observable<T[]> {
    return this.http.get<T[]>(\`\${this.baseUrl}/\${endpoint}\`);
  }
  getById<T>(endpoint: string, id: string): Observable<T> {
    return this.http.get<T>(\`\${this.baseUrl}/\${endpoint}/\${id}\`);
  }
  create<T>(endpoint: string, data: Partial<T>): Observable<T> {
    return this.http.post<T>(\`\${this.baseUrl}/\${endpoint}\`, data);
  }
  update<T>(endpoint: string, id: string, data: Partial<T>): Observable<T> {
    return this.http.put<T>(\`\${this.baseUrl}/\${endpoint}/\${id}\`, data);
  }
  delete(endpoint: string, id: string): Observable<void> {
    return this.http.delete<void>(\`\${this.baseUrl}/\${endpoint}/\${id}\`);
  }
}`
      },
      {
        path: p('src/app/guards/auth.guard.ts'),
        content: `import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};`
      },
      {
        path: p('src/app/interceptors/auth.interceptor.ts'),
        content: `import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } });
  }
  return next(req);
};`
      },
      {
        path: p('src/app/components/header/header.component.ts'),
        content: `import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: \`
    <nav class="navbar">
      <a routerLink="/" class="logo">MyApp</a>
      <div class="links" *ngIf="auth.isLoggedIn()">
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/users" routerLinkActive="active">Users</a>
      </div>
      <div class="right">
        <ng-container *ngIf="auth.isLoggedIn(); else guest">
          <span class="name">{{ auth.currentUser()?.name }}</span>
          <button class="btn btn-danger" (click)="auth.logout()">Logout</button>
        </ng-container>
        <ng-template #guest>
          <a routerLink="/login" class="link">Sign In</a>
          <a routerLink="/register" class="btn btn-primary">Register</a>
        </ng-template>
      </div>
    </nav>
  \`,
  styles: [\`
    .navbar { display: flex; align-items: center; padding: 0 24px; height: 56px; background: #fff; border-bottom: 1px solid #e5e7eb; }
    .logo { font-size: 20px; font-weight: 700; color: #6366f1; text-decoration: none; margin-right: 32px; }
    .links { display: flex; gap: 16px; }
    .links a { color: #666; text-decoration: none; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
    .links a.active, .links a:hover { color: #6366f1; background: #eef2ff; }
    .right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .name { font-size: 14px; color: #333; }
    .link { color: #6366f1; text-decoration: none; font-size: 14px; }
  \`]
})
export class HeaderComponent {
  auth = inject(AuthService);
}`
      },
      {
        path: p('src/app/components/home/home.component.ts'),
        content: `import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: \`
    <div style="text-align: center; padding: 80px 20px;">
      <h1 style="font-size: 48px; margin-bottom: 16px;">Welcome to MyApp</h1>
      <p style="color: #666; font-size: 18px; margin-bottom: 32px;">A full-stack starter with Angular + Express + MongoDB</p>
      <a routerLink="/register" class="btn btn-primary" style="padding: 14px 32px; text-decoration: none; font-size: 16px;">Get Started</a>
    </div>
  \`
})
export class HomeComponent { }`
      },
      {
        path: p('src/app/components/login/login.component.ts'),
        content: `import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: \`
    <div style="max-width: 400px; margin: 40px auto;">
      <div class="card" style="padding: 32px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <h2 style="margin: 0 0 24px;">Sign In</h2>
        <div *ngIf="error" style="padding: 10px; background: #fef2f2; color: #dc2626; border-radius: 8px; margin-bottom: 16px;">{{ error }}</div>
        <form (ngSubmit)="login()">
          <div style="margin-bottom: 16px;">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" />
          </div>
          <div style="margin-bottom: 20px;">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" />
          </div>
          <button type="submit" class="btn btn-primary" [disabled]="loading" style="width: 100%;">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
        <p style="text-align: center; margin-top: 16px; font-size: 14px;">Don't have an account? <a routerLink="/register">Register</a></p>
      </div>
    </div>
  \`
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = ''; password = ''; loading = false; error = '';

  login() {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => { this.error = err.error?.error || 'Login failed'; this.loading = false; },
      complete: () => this.loading = false,
    });
  }
}`
      },
      {
        path: p('src/app/components/register/register.component.ts'),
        content: `import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: \`
    <div style="max-width: 400px; margin: 40px auto;">
      <div class="card" style="padding: 32px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <h2 style="margin: 0 0 24px;">Create Account</h2>
        <div *ngIf="error" style="padding: 10px; background: #fef2f2; color: #dc2626; border-radius: 8px; margin-bottom: 16px;">{{ error }}</div>
        <div *ngIf="success" style="padding: 10px; background: #ecfdf5; color: #16a34a; border-radius: 8px; margin-bottom: 16px;">{{ success }}</div>
        <form (ngSubmit)="register()">
          <div style="margin-bottom: 12px;"><label>Name</label>
            <input [(ngModel)]="name" name="name" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" /></div>
          <div style="margin-bottom: 12px;"><label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" /></div>
          <div style="margin-bottom: 20px;"><label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" /></div>
          <button type="submit" class="btn btn-primary" [disabled]="loading" style="width: 100%;">{{ loading ? 'Creating...' : 'Create Account' }}</button>
        </form>
        <p style="text-align: center; margin-top: 16px; font-size: 14px;">Already have an account? <a routerLink="/login">Sign In</a></p>
      </div>
    </div>
  \`
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  name = ''; email = ''; password = ''; loading = false; error = ''; success = '';

  register() {
    this.error = '';
    if (this.password.length < 6) { this.error = 'Password min 6 chars'; return; }
    this.loading = true;
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => { this.success = 'Account created! Redirecting...'; setTimeout(() => this.router.navigate(['/login']), 1500); },
      error: (err) => { this.error = err.error?.error || 'Registration failed'; this.loading = false; },
    });
  }
}`
      },
      {
        path: p('src/app/components/dashboard/dashboard.component.ts'),
        content: `import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div>
      <h1 style="margin: 0;">Welcome, {{ auth.currentUser()?.name }}</h1>
      <p style="color: #666; margin: 4px 0 24px;">{{ auth.currentUser()?.email }}</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div class="card" style="background: #fff; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h3 style="font-size: 36px; color: #6366f1; margin: 0;">12</h3>
          <p style="color: #666; margin: 8px 0 0;">Users</p>
        </div>
        <div class="card" style="background: #fff; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h3 style="font-size: 36px; color: #10b981; margin: 0;">5</h3>
          <p style="color: #666; margin: 8px 0 0;">Projects</p>
        </div>
        <div class="card" style="background: #fff; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h3 style="font-size: 36px; color: #f59e0b; margin: 0;">34</h3>
          <p style="color: #666; margin: 8px 0 0;">Tasks</p>
        </div>
      </div>
    </div>
  \`
})
export class DashboardComponent {
  auth = inject(AuthService);
}`
      },
      {
        path: p('src/app/components/user-list/user-list.component.ts'),
        content: `import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface User { _id: string; name: string; email: string; role: string; }

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: \`
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0;">Users</h2>
      </div>
      <p *ngIf="loading()">Loading...</p>
      <table *ngIf="!loading()" style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <thead style="background: #f9fafb;">
          <tr><th style="padding: 12px; text-align: left;">Name</th><th style="padding: 12px; text-align: left;">Email</th><th style="padding: 12px; text-align: left;">Role</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users()" style="border-top: 1px solid #e5e7eb;">
            <td style="padding: 12px;">{{ u.name }}</td>
            <td style="padding: 12px;">{{ u.email }}</td>
            <td style="padding: 12px;"><span style="background: #eef2ff; color: #6366f1; padding: 2px 8px; border-radius: 4px; font-size: 12px;">{{ u.role }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  \`
})
export class UserListComponent {
  private api = inject(ApiService);
  users = signal<User[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.getAll<User>('users').subscribe({
      next: (d) => { this.users.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}`
      },
      {
        path: p('angular.json'),
        content: `{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "frontend": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "css",
          "standalone": true
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/frontend",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "assets": [],
            "styles": ["src/styles.css"],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "frontend:build:production"
            },
            "development": {
              "buildTarget": "frontend:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": {
          "builder": "@angular-devkit/build-angular:extract-i18n",
          "options": {
            "buildTarget": "frontend:build"
          }
        },
        "test": {
          "builder": "@angular-devkit/build-angular:karma",
          "options": {
            "polyfills": ["zone.js", "zone.js/testing"],
            "tsConfig": "tsconfig.spec.json",
            "assets": [],
            "styles": ["src/styles.css"],
            "scripts": []
          }
        }
      }
    }
  }
}`
      },
      {
        path: p('tsconfig.app.json'),
        content: `{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": [
    "src/main.ts"
  ],
  "include": [
    "src/**/*.d.ts"
  ]
}`
      },
      {
        path: p('tsconfig.spec.json'),
        content: `{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jasmine"]
  },
  "include": [
    "src/**/*.spec.ts",
    "src/**/*.d.ts"
  ]
}`
      },
      {
        path: p('tsconfig.json'),
        content: `{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "useDefineForClassFields": false,
    "lib": ["ES2022", "dom"]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}`
      },
    ];
  }

  // ===== EXPRESS FILES =====

  private expressFiles(prefix: string): TemplateFile[] {
    const p = (path: string) => prefix ? `${prefix}/${path}` : path;
    return [
      {
        path: p('package.json'),
        content: `{
  "name": "backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`
      },
      {
        path: p('server.js'),
        content: `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`
      },
      {
        path: p('config/db.js'),
        content: `const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/myapp',
      { family: 4 }
    );
    console.log('MongoDB connected:', conn.connection.host);
  } catch (err) {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;`
      },
      {
        path: p('models/User.js'),
        content: `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);`
      },
      {
        path: p('middleware/auth.js'),
        content: `const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};`
      },
      {
        path: p('routes/auth.js'),
        content: `const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'Registered',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      message: 'Logged in',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
});

module.exports = router;`
      },
      {
        path: p('routes/users.js'),
        content: `const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already exists' });
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;`
      },
      {
        path: p('.env.example'),
        content: `PORT=4100
MONGO_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key-change-this
`
      },
    ];
  }
}
