import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';

import { Class, Section, Teacher } from '../../core/models/educational.models';
import { ClassService } from '../../core/services/class.service';
import { TeacherService } from '../../core/services/teacher.service';
import { SectionService } from '../../core/services/section.service';
import { ToastService } from '../../core/services/toast.service';
import { ClassDialogComponent } from './class-dialog.component';
import { SectionDialogComponent } from '../sections/section-dialog.component';
import { SectionEnrollmentDialogComponent } from '../sections/section-enrollment-dialog.component';
import {
  destroyAdvancedDataTable,
  initServerSideDataTable,
  redrawServerSideTable,
} from '../../core/utils/datatable-advanced.util';
import { escapeHtml, renderClassRow, renderIdBadge, renderSectionActions } from '../../core/utils/datatable-cell-render.util';
import {
  buildDetailRowHtml,
  buildDetailSection,
  buildExpandColumn,
  buildSubTable,
  handleExpandClick,
  insertDetailRow,
  removeDetailRows,
  syncExpandedHighlight,
} from '../../core/utils/datatable-row-expand.util';

const API_BASE = 'http://localhost:3000';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './classes.component.html',
})
export class ClassesComponent implements OnInit, OnDestroy {
  private readonly tableSelector = '#classesTable';
  private tableWrapperEl: HTMLElement | null = null;
  private rowCache = new Map<string, Record<string, unknown>>();

  teachers: Teacher[] = [];
  sections: Section[] = [];
  allClasses: Class[] = [];
  expandedId: string | null = null;
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
    private sectionService: SectionService,
    private toast: ToastService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTeachers();
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
      buildExpandColumn(() => this.expandedId),
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
      nonOrderableTargets: [3, 4],
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
        row.setAttribute('data-row-id', String(data['id'] ?? ''));
        this.rowCache.set(String(data['id'] ?? ''), data);
      },
      onDraw: () => this.renderExpandedDetail(),
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
    if (handleExpandClick(event, this.expandedId, (id) => this.toggleExpand(id))) {
      return;
    }

    const btn = (event.target as HTMLElement).closest('[data-dt-action]') as HTMLElement | null;
    if (!btn) {
      return;
    }
    event.stopPropagation();
    const action = btn.getAttribute('data-dt-action');
    const id = btn.getAttribute('data-dt-id') ?? '';
    const entity = btn.getAttribute('data-dt-entity');

    if (entity === 'section') {
      const section = this.sections.find((s) => String(s.id) === id);
      if (!section) {
        return;
      }
      if (action === 'enroll') {
        this.openSectionEnrollmentDialog(section);
      } else if (action === 'edit') {
        this.openSectionEditDialog(section);
      } else if (action === 'delete') {
        this.deleteSection(section.id);
      }
      return;
    }

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

  private renderExpandedDetail(): void {
    syncExpandedHighlight(this.tableSelector, this.expandedId, 'data-row-id');
    if (!this.expandedId) {
      removeDetailRows(this.tableSelector);
      return;
    }
    const rowData = this.rowCache.get(this.expandedId);
    if (!rowData) {
      return;
    }
    insertDetailRow(
      this.tableSelector,
      this.expandedId,
      'data-row-id',
      this.buildClassDetailHtml(this.toClass(rowData))
    );
  }

  private buildClassDetailHtml(cls: Class): string {
    const classSections = this.sections.filter((s) => s.classId === cls.id);
    const rows = classSections.map((section) => [
      renderIdBadge(section.id),
      escapeHtml(section.name),
      String((section.studentIds ?? []).length),
      renderSectionActions(section.id, true),
    ]);
    const content = buildDetailSection(
      'Class Sections (from sections table)',
      buildSubTable(['Section ID', 'Section Name', 'Enrolled Students', 'Actions'], rows)
    );
    return buildDetailRowHtml(5, content);
  }

  private toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
    redrawServerSideTable(this.tableSelector, false);
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
        this.classService.getAll().subscribe({
          next: (classes) => {
            this.allClasses = classes;
            this.sectionService.getAll().subscribe({
              next: (sections) => {
                this.sections = sections;
                this.expandedId = null;
                this.isLoading = false;
                this.cdr.detectChanges();
                this.refreshDataTable();
              },
              error: () => {
                this.toast.error('Failed to load class sections.');
                this.isLoading = false;
                this.cdr.detectChanges();
              },
            });
          },
          error: () => {
            this.toast.error('Failed to load classes.');
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.toast.error('Failed to load classes.');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  reloadTable(): void {
    this.expandedId = null;
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

  private openSectionEditDialog(section: Section): void {
    const dialogRef = this.dialog.open(SectionDialogComponent, {
      width: '450px',
      data: { section, classes: this.allClasses },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.sectionService.update(section.id, result).subscribe({
          next: () => {
            this.toast.success('Section updated.');
            this.refreshExpandedMetadata();
          },
          error: () => this.toast.error('Update failed.'),
        });
      }
    });
  }

  private openSectionEnrollmentDialog(section: Section): void {
    const dialogRef = this.dialog.open(SectionEnrollmentDialogComponent, {
      width: '520px',
      data: { section },
    });
    dialogRef.afterClosed().subscribe(() => this.refreshExpandedMetadata());
  }

  private deleteSection(id: number | string): void {
    if (confirm('Are you sure you want to delete this section?')) {
      this.sectionService.delete(id as number).subscribe({
        next: () => {
          this.toast.success('Section deleted.');
          this.refreshExpandedMetadata();
        },
        error: () => this.toast.error('Delete failed.'),
      });
    }
  }

  private refreshExpandedMetadata(): void {
    const expandedId = this.expandedId;
    this.classService.getAll().subscribe({
      next: (classes) => {
        this.allClasses = classes;
        this.sectionService.getAll().subscribe({
          next: (sections) => {
            this.sections = sections;
            this.expandedId = expandedId;
            redrawServerSideTable(this.tableSelector, false);
          },
          error: () => this.toast.error('Failed to refresh class sections.'),
        });
      },
      error: () => this.toast.error('Failed to refresh class sections.'),
    });
  }
}
