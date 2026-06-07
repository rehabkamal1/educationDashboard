import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../../../core/services/theme.service';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatListModule,
    MatTooltipModule,
    MatProgressBarModule,
    LucideAngularModule
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  isMobile = false;
  isMobileOpen = false;
  isDark$ = this.themeService.isDark$;
  loading$ = this.loadingService.loading$;

  private destroy$ = new Subject<void>();

  menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/students', label: 'Students', icon: 'Users' },
    { path: '/teachers', label: 'Teachers', icon: 'GraduationCap' },
    { path: '/classes', label: 'Classes', icon: 'BookOpen' },
    { path: '/sections', label: 'Sections', icon: 'LayoutGrid' },
    { path: '/lectures', label: 'Lectures', icon: 'Play' }
  ];

  constructor(
    private themeService: ThemeService,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef,
    private breakpointObserver: BreakpointObserver
  ) { }

  ngOnInit(): void {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait, '(max-width: 768px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = result.matches;
        if (this.isMobile) {
          this.isMobileOpen = false;
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidenav() {
    if (this.isMobile) {
      this.isMobileOpen = !this.isMobileOpen;
    } else {
      this.isCollapsed = !this.isCollapsed;
    }
    this.cdr.markForCheck();
  }

  closeMobileDrawer() {
    if (this.isMobile) {
      this.isMobileOpen = false;
      this.cdr.markForCheck();
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
