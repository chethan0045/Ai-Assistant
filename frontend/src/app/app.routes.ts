import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';

const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/']);
};

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home.component').then(m => m.HomeComponent) },
  { path: 'scanner', canActivate: [authGuard], loadComponent: () => import('./scanner-ide.component').then(m => m.ScannerIdeComponent) },
  { path: 'scanner/issues/:severity', canActivate: [authGuard], loadComponent: () => import('./issue-list.component').then(m => m.IssueListComponent) },
  { path: 'defects', canActivate: [authGuard], loadComponent: () => import('./defects-dashboard.component').then(m => m.DefectsDashboardComponent) },
];
