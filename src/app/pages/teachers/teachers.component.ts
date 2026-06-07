import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';

import { Teacher } from '../../core/models/educational.models';
import { TeacherService } from '../../core/services/teacher.service';
import { ToastService } from '../../core/services/toast.service';
import { TeacherDialogComponent } from './teacher-dialog.component';
import {
  destroyAdvancedDataTable,
  getTableApi,
  initServerSideDataTable,
  redrawServerSideTable,
} from '../../core/utils/datatable-advanced.util';
import { renderTeacherRow } from '../../core/utils/datatable-cell-render.util';

const API_BASE = 'http://localhost:3000';

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
  private tableWrapperEl: HTMLElement | null = null;
  private rowCache = new Map<string, Record<string, unknown>>();

  isLoading = true;
  tableReady = false;
  recordsTotal = 0;
  recordsFiltered = 0;
  specializations: string[] = [];

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
    this.isLoading = false;
  }

  ngAfterViewInit(): void {
    this.initDataTable();
  }

  ngOnDestroy(): void {
    this.detachTableListeners();
    destroyAdvancedDataTable(this.tableSelector);
  }

  applyTableFilters(): void {
    redrawServerSideTable(this.tableSelector, true);
  }

  resetTableFilters(): void {
    this.filters = { id: '', name: '', specialization: '', email: '', phone: '' };
    redrawServerSideTable(this.tableSelector, true);
  }

  private buildColumns(): object[] {
    return [
      { data: 'id', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderTeacherRow(row)[0] },
      { data: 'name', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderTeacherRow(row)[1] },
      { data: 'specialization', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderTeacherRow(row)[2] },
      { data: 'email', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderTeacherRow(row)[3] },
      { data: 'phone', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderTeacherRow(row)[4] },
      { data: null, orderable: false, render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderTeacherRow(row)[5] },
    ];
  }

  private initDataTable(): void {
    initServerSideDataTable({
      selector: this.tableSelector,
      ajaxUrl: `${API_BASE}/datatable/teachers`,
      exportToolbarSelector: '#teachersExportToolbar',
      metaToolbarSelector: '#teachersMetaToolbar',
      columns: this.buildColumns(),
      pageLength: 10,
      order: [[1, 'asc']],
      nonOrderableTargets: [5],
      exportFileName: 'teachers',
      exportTitle: 'Teachers Directory',
      customVars: () => ({
        idFilter: this.filters.id,
        nameFilter: this.filters.name,
        specializationFilter: this.filters.specialization,
        emailFilter: this.filters.email,
        phoneFilter: this.filters.phone,
      }),
      onLoaded: (meta) => {
        this.recordsTotal = meta.recordsTotal;
        this.recordsFiltered = meta.recordsFiltered;
        this.specializations = meta.stats?.specializations ?? [];
        this.tableReady = true;
        this.cdr.detectChanges();
      },
      rowCallback: (row, data) => {
        row.classList.add('data-row');
        this.rowCache.set(String(data['id'] ?? ''), data);
      },
    });
    this.attachTableListeners();
  }

  private attachTableListeners(): void {
    this.detachTableListeners();
    this.tableWrapperEl = document.querySelector(`${this.tableSelector}`)?.closest('.table-wrapper') ?? null;
    this.tableWrapperEl?.addEventListener('click', this.handleTableClick);
  }

  private detachTableListeners(): void {
    this.tableWrapperEl?.removeEventListener('click', this.handleTableClick);
    this.tableWrapperEl = null;
  }

  private handleTableClick = (event: Event): void => {
    const btn = (event.target as HTMLElement).closest('[data-dt-action]') as HTMLElement | null;
    if (!btn) {
      return;
    }
    event.stopPropagation();
    const action = btn.getAttribute('data-dt-action');
    const id = btn.getAttribute('data-dt-id') ?? '';
    const rowData = this.rowCache.get(id) ?? this.getRowDataFromTable(id);
    if (!rowData) {
      return;
    }
    const teacher = this.toTeacher(rowData);
    if (action === 'edit') {
      this.openEditDialog(teacher);
    } else if (action === 'delete') {
      this.deleteTeacher(teacher.id);
    }
  };

  private getRowDataFromTable(id: string): Record<string, unknown> | null {
    const api = getTableApi(this.tableSelector);
    if (!api) {
      return null;
    }
    let found: Record<string, unknown> | null = null;
    document.querySelectorAll(`${this.tableSelector} tbody tr`).forEach((rowEl) => {
      if (this.rowCache.has(id)) {
        found = this.rowCache.get(id) ?? null;
      }
    });
    return found;
  }

  private toTeacher(row: Record<string, unknown>): Teacher {
    return {
      id: row['id'] as Teacher['id'],
      name: String(row['name'] ?? ''),
      email: String(row['email'] ?? ''),
      phone: String(row['phone'] ?? ''),
      specialization: String(row['specialization'] ?? ''),
    };
  }

  loadTeachers(): void {
    redrawServerSideTable(this.tableSelector, false);
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

  deleteTeacher(id: number | string): void {
    if (confirm('Are you sure you want to delete this teacher?')) {
      this.teacherService.delete(id as number).subscribe({
        next: () => {
          this.toast.success('Teacher deleted successfully.');
          this.loadTeachers();
        },
        error: () => this.toast.error('Failed to delete teacher.'),
      });
    }
  }
}
