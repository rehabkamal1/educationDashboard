import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { Class, Section } from '../../core/models/educational.models';
import { SectionService } from '../../core/services/section.service';
import { ClassService } from '../../core/services/class.service';
import { ToastService } from '../../core/services/toast.service';
import { SectionDialogComponent } from './section-dialog.component';
import { SectionEnrollmentDialogComponent } from './section-enrollment-dialog.component';
import {
  destroyAdvancedDataTable,
  initServerSideDataTable,
  redrawServerSideTable,
} from '../../core/utils/datatable-advanced.util';
import { renderSectionRow } from '../../core/utils/datatable-cell-render.util';

const API_BASE = 'http://localhost:3000';

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    LucideAngularModule
  ],
  templateUrl: './sections.component.html',
})
export class SectionsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly tableSelector = '#sectionsTable';
  private tableWrapperEl: HTMLElement | null = null;
  private rowCache = new Map<string, Record<string, unknown>>();

  classes: Class[] = [];
  isLoading = true;
  tableReady = false;
  recordsTotal = 0;
  recordsFiltered = 0;
  totalEnrolled = 0;
  classesCount = 0;

  filters = {
    id: '',
    name: '',
    className: '',
    enrolled: '',
  };

  constructor(
    private sectionService: SectionService,
    private classService: ClassService,
    private toast: ToastService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMetadata();
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
    this.filters = { id: '', name: '', className: '', enrolled: '' };
    redrawServerSideTable(this.tableSelector, true);
  }

  private buildColumns(): object[] {
    return [
      { data: 'id', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderSectionRow(row)[0] },
      { data: 'name', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderSectionRow(row)[1] },
      { data: 'className', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderSectionRow(row)[2] },
      { data: 'enrolledCount', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderSectionRow(row)[3] },
      { data: null, orderable: false, render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderSectionRow(row)[4] },
    ];
  }

  private initDataTable(): void {
    initServerSideDataTable({
      selector: this.tableSelector,
      ajaxUrl: `${API_BASE}/datatable/sections`,
      exportToolbarSelector: '#sectionsExportToolbar',
      metaToolbarSelector: '#sectionsMetaToolbar',
      columns: this.buildColumns(),
      pageLength: 10,
      order: [[1, 'asc']],
      nonOrderableTargets: [4],
      exportFileName: 'sections',
      exportTitle: 'Sections',
      customVars: () => ({
        idFilter: this.filters.id,
        nameFilter: this.filters.name,
        classNameFilter: this.filters.className,
        enrolledFilter: this.filters.enrolled,
      }),
      onLoaded: (meta) => {
        this.recordsTotal = meta.recordsTotal;
        this.recordsFiltered = meta.recordsFiltered;
        this.totalEnrolled = meta.stats?.totalEnrolled ?? 0;
        this.classesCount = meta.stats?.classes ?? this.classes.length;
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
    const section = this.toSection(rowData);
    if (action === 'enroll') {
      this.openEnrollmentDialog(section);
    } else if (action === 'edit') {
      this.openEditDialog(section);
    } else if (action === 'delete') {
      this.deleteSection(section.id);
    }
  };

  private toSection(row: Record<string, unknown>): Section {
    return {
      id: row['id'] as Section['id'],
      name: String(row['name'] ?? ''),
      classId: row['classId'] as number,
      studentIds: (row['studentIds'] as number[]) ?? [],
    };
  }

  private refreshDataTable(): void {
    destroyAdvancedDataTable(this.tableSelector);
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
  }

  loadMetadata() {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;
    this.classService.getAll().subscribe({
      next: (classes) => {
        this.classes = classes;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.refreshDataTable();
      },
      error: () => {
        this.toast.error('Failed to load sections and classes.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  reloadTable(): void {
    redrawServerSideTable(this.tableSelector, false);
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(SectionDialogComponent, {
      width: '450px',
      data: { classes: this.classes }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.sectionService.create(result).subscribe({
          next: () => {
            this.toast.success('Section created.');
            this.reloadTable();
          },
          error: () => this.toast.error('Create failed.')
        });
      }
    });
  }

  openEditDialog(section: Section) {
    const dialogRef = this.dialog.open(SectionDialogComponent, {
      width: '450px',
      data: { section, classes: this.classes }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.sectionService.update(section.id, result).subscribe({
          next: () => {
            this.toast.success('Section updated.');
            this.reloadTable();
          },
          error: () => this.toast.error('Update failed.')
        });
      }
    });
  }

  openEnrollmentDialog(section: Section) {
    const dialogRef = this.dialog.open(SectionEnrollmentDialogComponent, {
      width: '520px',
      data: { section }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.reloadTable();
    });
  }

  deleteSection(id: number | string) {
    if (confirm('Are you sure you want to delete this section?')) {
      this.sectionService.delete(id as number).subscribe({
        next: () => {
          this.toast.success('Section deleted.');
          this.reloadTable();
        },
        error: () => this.toast.error('Delete failed.')
      });
    }
  }
}
