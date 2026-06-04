import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { MatTableDataSource } from '@angular/material/table';

import { Teacher } from '../../core/models/educational.models';
import { TeacherService } from '../../core/services/teacher.service';
import { ToastService } from '../../core/services/toast.service';
import { TeacherDialogComponent } from './teacher-dialog.component';
import {
  applyColumnFilters,
  clearColumnFilters,
  destroyAdvancedDataTable,
  initAdvancedDataTable,
} from '../../core/utils/datatable-advanced.util';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    LucideAngularModule,
  ],
  templateUrl: './teachers.component.html',
})
export class TeachersComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly tableSelector = '#teachersTable';
  private readonly columnCount = 6;

  dataSource = new MatTableDataSource<Teacher>([]);
  isLoading = true;

  filters = {
    id: '',
    name: '',
    specialization: '',
    email: '',
    phone: '',
  };

  constructor(
    private teacherService: TeacherService,
    private toast: ToastService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTeachers();
  }

  ngAfterViewInit(): void {
    if (!this.isLoading) {
      this.initDataTable();
    }
  }

  ngOnDestroy(): void {
    destroyAdvancedDataTable(this.tableSelector);
  }

  applyTableFilters(): void {
    applyColumnFilters(this.tableSelector, [
      { columnIndex: 0, value: this.filters.id },
      { columnIndex: 1, value: this.filters.name },
      { columnIndex: 2, value: this.filters.specialization },
      { columnIndex: 3, value: this.filters.email },
      { columnIndex: 4, value: this.filters.phone },
    ]);
  }

  resetTableFilters(): void {
    this.filters = { id: '', name: '', specialization: '', email: '', phone: '' };
    clearColumnFilters(this.tableSelector, this.columnCount);
  }

  get specializations(): string[] {
    const values = new Set(
      this.dataSource.data.map(t => t.specialization?.trim()).filter(Boolean) as string[]
    );
    return [...values].sort((a, b) => a.localeCompare(b));
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase() || '?';
  }

  trackByTeacherId(_index: number, teacher: Teacher): number {
    return teacher.id;
  }

  private initDataTable(): void {
    initAdvancedDataTable({
      selector: this.tableSelector,
      exportToolbarSelector: '#teachersExportToolbar',
      metaToolbarSelector: '#teachersMetaToolbar',
      pageLength: 10,
      order: [[1, 'asc']],
      nonOrderableTargets: [5],
      exportFileName: 'teachers',
      exportTitle: 'Teachers Directory',
      hasData: this.dataSource.data.length > 0,
    });
  }

  private refreshDataTable(): void {
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
  }

  loadTeachers(): void {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;

    this.teacherService.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.refreshDataTable();
      },
      error: () => {
        this.toast.error('Failed to retrieve teachers catalog.');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(TeacherDialogComponent, {
      width: '450px',
      data: {},
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.teacherService.create(result).subscribe({
          next: () => {
            this.toast.success('Teacher successfully onboarded.');
            this.loadTeachers();
          },
          error: () => this.toast.error('Onboarding failed.'),
        });
      }
    });
  }

  openEditDialog(teacher: Teacher): void {
    const dialogRef = this.dialog.open(TeacherDialogComponent, {
      width: '450px',
      data: { teacher },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.teacherService.update(teacher.id, result).subscribe({
          next: () => {
            this.toast.success('Teacher profile updated successfully.');
            this.loadTeachers();
          },
          error: () => this.toast.error('Failed to update teacher profile.'),
        });
      }
    });
  }

  deleteTeacher(id: number): void {
    if (confirm('Are you sure you want to delete this teacher?')) {
      this.teacherService.delete(id).subscribe({
        next: () => {
          this.toast.success('Teacher deleted successfully.');
          this.loadTeachers();
        },
        error: () => this.toast.error('Failed to delete teacher.'),
      });
    }
  }
}
