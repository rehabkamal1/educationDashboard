import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { Class, Section, Student } from '../../core/models/educational.models';
import { StudentDialogComponent } from '../students/student-dialog.component';
import { SectionService } from '../../core/services/section.service';
import { ClassService } from '../../core/services/class.service';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../core/services/toast.service';
import { SectionDialogComponent } from './section-dialog.component';
import { SectionEnrollmentDialogComponent } from './section-enrollment-dialog.component';
import {
  destroyAdvancedDataTable,
  initServerSideDataTable,
  redrawServerSideTable,
} from '../../core/utils/datatable-advanced.util';
import { escapeHtml, renderIdBadge, renderSectionRow, renderStudentActions } from '../../core/utils/datatable-cell-render.util';
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
  selector: 'app-sections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './sections.component.html',
})
export class SectionsComponent implements OnInit, OnDestroy {
  private readonly tableSelector = '#sectionsTable';
  private tableWrapperEl: HTMLElement | null = null;
  private rowCache = new Map<string, Record<string, unknown>>();

  classes: Class[] = [];
  students: Student[] = [];
  expandedId: string | null = null;
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
    private studentService: StudentService,
    private toast: ToastService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMetadata();
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
      buildExpandColumn(() => this.expandedId),
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
      nonOrderableTargets: [4, 5],
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

    if (entity === 'student') {
      const student = this.students.find((s) => String(s.id) === id);
      if (!student) {
        return;
      }
      if (action === 'edit') {
        this.openStudentEditDialog(student);
      } else if (action === 'delete') {
        this.deleteStudent(student.id);
      }
      return;
    }

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
      this.buildSectionDetailHtml(this.toSection(rowData))
    );
  }

  private buildSectionDetailHtml(section: Section): string {
    const enrolled = this.students.filter((s) =>
      (section.studentIds ?? []).map(String).includes(String(s.id))
    );
    const rows = enrolled.map((student) => [
      renderIdBadge(student.id),
      escapeHtml(student.name),
      escapeHtml(student.email),
      escapeHtml(student.status),
      renderStudentActions(student.id, true),
    ]);
    const content = buildDetailSection(
      'Enrolled Students (from students table)',
      buildSubTable(['Student ID', 'Student Name', 'Email', 'Status', 'Actions'], rows)
    );
    return buildDetailRowHtml(6, content);
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

  loadMetadata() {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;
    this.classService.getAll().subscribe({
      next: (classes) => {
        this.classes = classes;
        this.studentService.getAll().subscribe({
          next: (students) => {
            this.students = students;
            this.expandedId = null;
            this.isLoading = false;
            this.cdr.detectChanges();
            this.refreshDataTable();
          },
          error: () => {
            this.toast.error('Failed to load section students.');
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.toast.error('Failed to load sections and classes.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  reloadTable(): void {
    this.expandedId = null;
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

  private openStudentEditDialog(student: Student): void {
    const dialogRef = this.dialog.open(StudentDialogComponent, {
      width: '450px',
      data: { student },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.studentService.update(student.id, result).subscribe({
          next: () => {
            this.toast.success('Student updated successfully.');
            this.refreshExpandedMetadata();
          },
          error: () => this.toast.error('Could not update student details.'),
        });
      }
    });
  }

  private deleteStudent(id: number | string): void {
    if (confirm('Are you sure you want to delete this student registration?')) {
      this.studentService.delete(id as number).subscribe({
        next: () => {
          this.toast.success('Student deleted successfully.');
          this.refreshExpandedMetadata();
        },
        error: () => this.toast.error('Could not delete student.'),
      });
    }
  }

  private refreshExpandedMetadata(): void {
    const expandedId = this.expandedId;
    this.studentService.getAll().subscribe({
      next: (students) => {
        this.students = students;
        this.expandedId = expandedId;
        redrawServerSideTable(this.tableSelector, false);
      },
      error: () => this.toast.error('Failed to refresh enrolled students.'),
    });
  }
}
