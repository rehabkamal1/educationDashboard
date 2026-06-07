import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Class, Teacher } from '../../core/models/educational.models';
import { ClassService } from '../../core/services/class.service';
import { TeacherService } from '../../core/services/teacher.service';
import { ToastService } from '../../core/services/toast.service';
import { ClassDialogComponent } from './class-dialog.component';
import {
  destroyAdvancedDataTable,
  initServerSideDataTable,
  redrawServerSideTable,
} from '../../core/utils/datatable-advanced.util';
import { renderClassRow } from '../../core/utils/datatable-cell-render.util';

const API_BASE = 'http://localhost:3000';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
    LucideAngularModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './classes.component.html',
})
export class ClassesComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly tableSelector = '#classesTable';
  private tableWrapperEl: HTMLElement | null = null;
  private rowCache = new Map<string, Record<string, unknown>>();

  teachers: Teacher[] = [];
  isLoading = true;
  tableReady = false;
  recordsTotal = 0;
  recordsFiltered = 0;
  teachersCount = 0;

  filters = {
    id: '',
    name: '',
    instructor: '',
  };

  constructor(
    private classService: ClassService,
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
    this.detachTableListeners();
    destroyAdvancedDataTable(this.tableSelector);
  }

  applyTableFilters(): void {
    redrawServerSideTable(this.tableSelector, true);
  }

  resetTableFilters(): void {
    this.filters = { id: '', name: '', instructor: '' };
    redrawServerSideTable(this.tableSelector, true);
  }

  private buildColumns(): object[] {
    return [
      { data: 'id', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderClassRow(row)[0] },
      { data: 'name', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderClassRow(row)[1] },
      { data: 'teacherName', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderClassRow(row)[2] },
      { data: null, orderable: false, render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderClassRow(row)[3] },
    ];
  }

  private initDataTable(): void {
    initServerSideDataTable({
      selector: this.tableSelector,
      ajaxUrl: `${API_BASE}/datatable/classes`,
      exportToolbarSelector: '#classesExportToolbar',
      metaToolbarSelector: '#classesMetaToolbar',
      columns: this.buildColumns(),
      pageLength: 10,
      order: [[0, 'asc']],
      nonOrderableTargets: [3],
      exportFileName: 'classes',
      exportTitle: 'Classes',
      customVars: () => ({
        idFilter: this.filters.id,
        nameFilter: this.filters.name,
        instructorFilter: this.filters.instructor,
      }),
      onLoaded: (meta) => {
        this.recordsTotal = meta.recordsTotal;
        this.recordsFiltered = meta.recordsFiltered;
        this.teachersCount = meta.stats?.teachers ?? this.teachers.length;
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
    const rowData = this.rowCache.get(id);
    if (!rowData) {
      return;
    }
    const cls = this.toClass(rowData);
    if (action === 'edit') {
      this.openEditDialog(cls);
    } else if (action === 'delete') {
      this.deleteClass(cls.id);
    }
  };

  private toClass(row: Record<string, unknown>): Class {
    return {
      id: row['id'] as Class['id'],
      name: String(row['name'] ?? ''),
      teacherId: row['teacherId'] as number,
    };
  }

  private refreshDataTable(): void {
    destroyAdvancedDataTable(this.tableSelector);
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
  }

  loadTeachers() {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;
    this.teacherService.getAll().subscribe({
      next: (teachers) => {
        this.teachers = teachers;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.refreshDataTable();
      },
      error: () => {
        this.toast.error('Failed to load classes.');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  reloadTable(): void {
    redrawServerSideTable(this.tableSelector, false);
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(ClassDialogComponent, {
      width: '500px',
      data: { teachers: this.teachers }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.classService.create(result).subscribe({
          next: () => {
            this.toast.success('Class created successfully.');
            this.reloadTable();
          },
          error: () => this.toast.error('Failed to create class.')
        });
      }
    });
  }

  openEditDialog(cls: Class) {
    const dialogRef = this.dialog.open(ClassDialogComponent, {
      width: '500px',
      data: { class: cls, teachers: this.teachers }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.classService.update(cls.id, result).subscribe({
          next: () => {
            this.toast.success('Class updated successfully.');
            this.reloadTable();
          },
          error: () => this.toast.error('Failed to update class.')
        });
      }
    });
  }

  deleteClass(id: number | string) {
    if (confirm('Delete this class?')) {
      this.classService.delete(id as number).subscribe({
        next: () => {
          this.toast.success('Class deleted.');
          this.reloadTable();
        },
        error: () => this.toast.error('Failed to delete class.')
      });
    }
  }

  onSearchChange(event: Event): void {
    const searchValue = (event.target as HTMLInputElement).value;
    this.filters.name = searchValue;
    this.applyTableFilters();
  } 
}
