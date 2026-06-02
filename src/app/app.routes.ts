import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'students',
        loadComponent: () => import('./pages/students/students.component').then(m => m.StudentsComponent)
      },
      {
        path: 'teachers',
        loadComponent: () => import('./pages/teachers/teachers.component').then(m => m.TeachersComponent)
      },
      {
        path: 'classes',
        loadComponent: () => import('./pages/classes/classes.component').then(m => m.ClassesComponent)
      },
      {
        path: 'sections',
        loadComponent: () => import('./pages/sections/sections.component').then(m => m.SectionsComponent)
      },
      {
        path: 'lectures',
        loadComponent: () => import('./pages/lectures/lectures.component').then(m => m.LecturesComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
