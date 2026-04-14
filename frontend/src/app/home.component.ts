import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <!-- Logo -->
        <div class="logo-section">
          <div class="logo-icon">AI</div>
          <p class="logo-sub">Intelligent Code Assistant</p>
        </div>

        <!-- LOGIN FORM -->
        <div *ngIf="mode === 'login'">
          <h2>Welcome Back</h2>
          <p class="form-sub">Sign in to continue</p>

          <div class="alert error" *ngIf="error">{{ error }}</div>
          <div class="alert success" *ngIf="success">{{ success }}</div>

          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" placeholder="Enter your email" (keydown.enter)="login()" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <div class="password-field">
              <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" placeholder="Enter password" (keydown.enter)="login()" />
              <button class="eye-btn" (click)="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
            </div>
          </div>

          <button class="submit-btn" (click)="login()" [disabled]="loading">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>

          <p class="toggle-text">Don't have an account? <span (click)="switchMode('register')">Register</span></p>
        </div>

        <!-- REGISTER FORM -->
        <div *ngIf="mode === 'register'">
          <h2>Create Account</h2>
          <p class="form-sub">Register to get started</p>

          <div class="alert error" *ngIf="error">{{ error }}</div>
          <div class="alert success" *ngIf="success">{{ success }}</div>

          <div class="form-group">
            <label>Full Name</label>
            <input type="text" [(ngModel)]="name" placeholder="Enter your name" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" placeholder="Enter your email" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <div class="password-field">
              <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" placeholder="Min 6 characters" />
              <button class="eye-btn" (click)="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
            </div>
          </div>
          <div class="form-group">
            <label>Confirm Password</label>
            <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="confirmPassword" placeholder="Confirm password" (keydown.enter)="register()" />
          </div>

          <button class="submit-btn" (click)="register()" [disabled]="loading">
            {{ loading ? 'Creating account...' : 'Create Account' }}
          </button>

          <p class="toggle-text">Already have an account? <span (click)="switchMode('login')">Sign In</span></p>
        </div>

        <!-- OTP VERIFICATION -->
        <div *ngIf="mode === 'otp'">
          <h2>Verify Email</h2>
          <p class="form-sub">Enter the 6-digit code sent to <strong>{{ email }}</strong></p>

          <div class="alert error" *ngIf="error">{{ error }}</div>
          <div class="alert success" *ngIf="success">{{ success }}</div>

          <div class="otp-container">
            <input class="otp-input" type="text" inputmode="numeric" maxlength="1" [attr.data-idx]="0" (input)="onOtpInput($event, 0)" (keydown)="onOtpKeydown($event, 0)" (paste)="onOtpPaste($event)" />
            <input class="otp-input" type="text" inputmode="numeric" maxlength="1" [attr.data-idx]="1" (input)="onOtpInput($event, 1)" (keydown)="onOtpKeydown($event, 1)" (paste)="onOtpPaste($event)" />
            <input class="otp-input" type="text" inputmode="numeric" maxlength="1" [attr.data-idx]="2" (input)="onOtpInput($event, 2)" (keydown)="onOtpKeydown($event, 2)" (paste)="onOtpPaste($event)" />
            <input class="otp-input" type="text" inputmode="numeric" maxlength="1" [attr.data-idx]="3" (input)="onOtpInput($event, 3)" (keydown)="onOtpKeydown($event, 3)" (paste)="onOtpPaste($event)" />
            <input class="otp-input" type="text" inputmode="numeric" maxlength="1" [attr.data-idx]="4" (input)="onOtpInput($event, 4)" (keydown)="onOtpKeydown($event, 4)" (paste)="onOtpPaste($event)" />
            <input class="otp-input" type="text" inputmode="numeric" maxlength="1" [attr.data-idx]="5" (input)="onOtpInput($event, 5)" (keydown)="onOtpKeydown($event, 5)" (paste)="onOtpPaste($event)" />
          </div>

          <button class="submit-btn verify-btn" (click)="verifyOTP()" [disabled]="loading || otpComplete.length < 6">
            {{ loading ? 'Verifying...' : 'Verify Email' }}
          </button>

          <div class="resend-row">
            <span class="resend-text">Didn't receive the code?</span>
            <button class="resend-btn" (click)="resendOTP()" [disabled]="resendCooldown > 0">
              {{ resendCooldown > 0 ? 'Resend in ' + resendCooldown + 's' : 'Resend OTP' }}
            </button>
          </div>

          <p class="toggle-text"><span (click)="switchMode('register')">Back to Register</span></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0c29 0%, #1a1440 40%, #302b63 70%, #24243e 100%);
      padding: 20px;
    }
    .auth-card {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 40px;
      width: 420px;
      max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .logo-section { text-align: center; margin-bottom: 32px; }
    .logo-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 64px; height: 64px; border-radius: 16px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      font-size: 24px; font-weight: 800; color: #fff;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 8px 24px rgba(99,102,241,0.4);
      margin-bottom: 12px;
    }
    .logo-sub { color: rgba(255,255,255,0.4); font-size: 13px; margin: 0; }

    h2 { color: #fff; font-size: 22px; font-weight: 700; margin: 0 0 4px; }
    .form-sub { color: rgba(255,255,255,0.45); font-size: 13px; margin: 0 0 24px; }
    .form-sub strong { color: #818cf8; }

    .form-group { margin-bottom: 16px; }
    label { display: block; color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 500; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    input {
      width: 100%; padding: 12px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      color: #fff; font-size: 14px; font-family: 'Inter', sans-serif;
      outline: none; box-sizing: border-box;
      transition: border-color 0.2s;
    }
    input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,0.15); }
    input::placeholder { color: rgba(255,255,255,0.2); }

    .password-field { position: relative; }
    .password-field input { padding-right: 64px; }
    .eye-btn {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: #818cf8; font-size: 12px;
      cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500;
    }

    .submit-btn {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none; border-radius: 10px; color: #fff;
      font-size: 15px; font-weight: 600; cursor: pointer;
      margin-top: 8px; transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .verify-btn { background: linear-gradient(135deg, #10b981, #06b6d4); }
    .verify-btn:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(16,185,129,0.4); }

    .toggle-text { text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; margin-top: 20px; }
    .toggle-text span { color: #818cf8; cursor: pointer; font-weight: 500; }
    .toggle-text span:hover { text-decoration: underline; }

    .alert { padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; }
    .alert.error { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
    .alert.success { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }

    /* OTP */
    .otp-container { display: flex; gap: 10px; justify-content: center; margin: 28px 0; }
    .otp-input {
      width: 48px; height: 56px; text-align: center;
      font-size: 22px; font-weight: 700; letter-spacing: 0;
      border-radius: 12px;
      background: rgba(255,255,255,0.06);
      border: 2px solid rgba(255,255,255,0.12);
      color: #fff;
      caret-color: #818cf8;
      padding: 0;
    }
    .otp-input:focus { border-color: #818cf8; background: rgba(129,140,248,0.08); }

    .resend-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; }
    .resend-text { font-size: 13px; color: rgba(255,255,255,0.4); }
    .resend-btn {
      background: none; border: none; color: #818cf8; font-size: 13px;
      font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
    }
    .resend-btn:disabled { color: rgba(255,255,255,0.3); cursor: not-allowed; }

    @media (max-width: 480px) {
      .auth-card { padding: 28px 20px; }
      .otp-input { width: 40px; height: 48px; font-size: 18px; }
    }
  `]
})
export class HomeComponent {
  mode: 'login' | 'register' | 'otp' = 'login';
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  error = '';
  success = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
  otpComplete = '';
  resendCooldown = 0;
  private cooldownTimer: any = null;

  constructor(private router: Router, private auth: AuthService) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/scanner']);
    }
  }

  switchMode(mode: 'login' | 'register' | 'otp'): void {
    this.mode = mode;
    this.error = '';
    this.success = '';
  }

  async login(): Promise<void> {
    this.error = '';
    this.success = '';
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Email and password are required';
      return;
    }
    this.loading = true;
    try {
      const res = await this.auth.login(this.email, this.password);
      if (res.error) {
        this.error = res.error;
        if ((res as any).requiresVerification) {
          this.mode = 'otp';
          this.startResendCooldown();
        }
      } else {
        this.success = res.message || 'Login successful!';
        setTimeout(() => this.router.navigate(['/scanner']), 500);
      }
    } catch (err: any) {
      this.error = 'Server not reachable. Start the backend first.';
    } finally {
      this.loading = false;
    }
  }

  async register(): Promise<void> {
    this.error = '';
    this.success = '';
    if (!this.name.trim() || !this.email.trim() || !this.password.trim()) {
      this.error = 'All fields are required';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }
    this.loading = true;
    try {
      const res = await this.auth.register(this.name, this.email, this.password);
      if (res.error) {
        this.error = res.error;
      } else {
        this.success = 'OTP sent to your email!';
        this.mode = 'otp';
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpComplete = '';
        this.startResendCooldown();
      }
    } catch (err: any) {
      this.error = 'Server not reachable. Start the backend first.';
    } finally {
      this.loading = false;
    }
  }

  async verifyOTP(): Promise<void> {
    this.error = '';
    this.success = '';
    const otp = this.otpComplete;
    if (otp.length < 6) {
      this.error = 'Please enter the full 6-digit code';
      return;
    }
    this.loading = true;
    try {
      const res = await this.auth.verifyOTP(this.email, otp);
      if (res.error) {
        this.error = res.error;
      } else {
        this.success = 'Email verified! Redirecting...';
        setTimeout(() => this.router.navigate(['/scanner']), 800);
      }
    } catch (err: any) {
      this.error = 'Verification failed. Try again.';
    } finally {
      this.loading = false;
    }
  }

  async resendOTP(): Promise<void> {
    if (this.resendCooldown > 0) return;
    this.error = '';
    try {
      const res = await this.auth.resendOTP(this.email);
      if (res.error) { this.error = res.error; }
      else { this.success = 'OTP resent!'; this.startResendCooldown(); }
    } catch { this.error = 'Failed to resend OTP'; }
  }

  getOtpValue(): string {
    return this.otpDigits.join('');
  }

  private updateOtpComplete(): void {
    this.otpComplete = this.otpDigits.join('');
  }

  private getOtpContainer(el: HTMLElement): HTMLElement | null {
    return el.closest('.otp-container');
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    // Only keep the last typed digit (handles double-fire)
    const raw = input.value.replace(/\D/g, '');
    const digit = raw.slice(-1);
    this.otpDigits[index] = digit;
    input.value = digit;
    this.updateOtpComplete();

    // Auto-advance to next box
    if (digit && index < 5) {
      const container = this.getOtpContainer(input);
      const next = container?.querySelector(`[data-idx="${index + 1}"]`) as HTMLInputElement;
      if (next) { next.focus(); next.select(); }
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace') {
      if (input.value) {
        // Clear current box
        this.otpDigits[index] = '';
        input.value = '';
        this.updateOtpComplete();
        event.preventDefault();
      } else if (index > 0) {
        // Move to previous box and clear it
        const container = this.getOtpContainer(input);
        const prev = container?.querySelector(`[data-idx="${index - 1}"]`) as HTMLInputElement;
        if (prev) {
          this.otpDigits[index - 1] = '';
          prev.value = '';
          prev.focus();
          this.updateOtpComplete();
        }
        event.preventDefault();
      }
    }
    // Arrow keys navigation
    if (event.key === 'ArrowLeft' && index > 0) {
      const container = this.getOtpContainer(input);
      (container?.querySelector(`[data-idx="${index - 1}"]`) as HTMLInputElement)?.focus();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      const container = this.getOtpContainer(input);
      (container?.querySelector(`[data-idx="${index + 1}"]`) as HTMLInputElement)?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text')?.replace(/\D/g, '') || '';
    const container = this.getOtpContainer(event.target as HTMLElement);
    if (!container) return;
    const inputs = container.querySelectorAll('.otp-input');
    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = paste[i] || '';
      if (inputs[i]) (inputs[i] as HTMLInputElement).value = this.otpDigits[i];
    }
    this.updateOtpComplete();
    // Focus last filled or the 6th box
    const focusIdx = Math.min(paste.length, 5);
    (inputs[focusIdx] as HTMLInputElement)?.focus();
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60;
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.cooldownTimer);
    }, 1000);
  }
}
