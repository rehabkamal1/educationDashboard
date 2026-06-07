import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';

import { Student, Section, Class, Lecture } from '../../core/models/educational.models';
import { StudentService } from '../../core/services/student.service';
import { SectionService } from '../../core/services/section.service';
import { ClassService } from '../../core/services/class.service';
import { LectureService } from '../../core/services/lecture.service';
import { ToastService } from '../../core/services/toast.service';
import { StudentDialogComponent } from './student-dialog.component';
import {
  destroyAdvancedDataTable,
  getTableApi,
  initServerSideDataTable,
  redrawServerSideTable,
} from '../../core/utils/datatable-advanced.util';
import { escapeHtml, getInitials, renderStudentRow } from '../../core/utils/datatable-cell-render.util';

const API_BASE = 'http://localhost:3000';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit, OnDestroy {
  private readonly tableSelector = '#studentsTable';
  private tableWrapperEl: HTMLElement | null = null;

  expandedElement: Student | null = null;
  expandedRowCache = new Map<string, Record<string, unknown>>();

  sections: Section[] = [];
  classes: Class[] = [];
  lectures: Lecture[] = [];
  isLoading = true;
  tableReady = false;
  recordsTotal = 0;
  recordsFiltered = 0;
  activeCount = 0;
  inactiveCount = 0;

  filters = {
    id: '',
    name: '',
    email: '',
    phone: '',
    status: '',
    classes: '',
    sections: '',
    lectures: '',
  };

  constructor(
    private studentService: StudentService,
    private sectionService: SectionService,
    private classService: ClassService,
    private lectureService: LectureService,
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
    this.filters = {
      id: '',
      name: '',
      email: '',
      phone: '',
      status: '',
      classes: '',
      sections: '',
      lectures: '',
    };
    redrawServerSideTable(this.tableSelector, true);
  }

  private buildColumns(): object[] {
    return [
      {
        data: 'id',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row, this.getExpandedId())[0],
      },
      {
        data: 'name',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row, this.getExpandedId())[1],
      },
      {
        data: 'email',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row, this.getExpandedId())[2],
      },
      {
        data: 'status',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row, this.getExpandedId())[3],
      },
      {
        data: 'classNamesText',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row, this.getExpandedId())[4],
      },
      {
        data: 'sectionsCount',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row, this.getExpandedId())[5],
      },
      {
        data: 'lecturesCount',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row, this.getExpandedId())[6],
      },
      {
        data: null,
        orderable: false,
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row, this.getExpandedId())[7],
      },
    ];
  }

  private getExpandedId(): string | null {
    return this.expandedElement ? String(this.expandedElement.id) : null;
  }

  private initDataTable(): void {
    initServerSideDataTable({
      selector: this.tableSelector,
      ajaxUrl: `${API_BASE}/datatable/students`,
      exportToolbarSelector: '#studentsExportToolbar',
      metaToolbarSelector: '#studentsMetaToolbar',
      columns: this.buildColumns(),
      pageLength: 10,
      order: [[0, 'asc']],
      nonOrderableTargets: [7],
      exportFileName: 'students',
      exportTitle: 'Students',
      customVars: () => ({
        idFilter: this.filters.id,
        nameFilter: this.filters.name,
        emailFilter: this.filters.email,
        phoneFilter: this.filters.phone,
        statusFilter: this.filters.status,
        classesFilter: this.filters.classes,
        sectionsFilter: this.filters.sections,
        lecturesFilter: this.filters.lectures,
      }),
      onLoaded: (meta) => {
        this.recordsTotal = meta.recordsTotal;
        this.recordsFiltered = meta.recordsFiltered;
        if (meta.stats) {
          this.activeCount = meta.stats.active ?? 0;
          this.inactiveCount = meta.stats.inactive ?? 0;
        }
        this.tableReady = true;
        this.cdr.detectChanges();
      },
      onRowsReceived: (rows) => {
        rows.forEach((row) => {
          this.expandedRowCache.set(String(row['id'] ?? ''), row);
        });
      },
      rowCallback: (row, data) => {
        row.classList.add('data-row', 'clickable-row');
        row.setAttribute('data-student-id', String(data['id'] ?? ''));
      },
      onDraw: () => {
        this.renderInlineDetailRow();
        this.syncExpandedRowHighlight();
      },
    });
    this.attachTableListeners();
  }

  private refreshDataTable(): void {
    destroyAdvancedDataTable(this.tableSelector);
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
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
    const target = event.target as HTMLElement;

    if (target.closest('.detail-panel-close')) {
      this.closeDetailPanel(event);
      return;
    }

    const actionBtn = target.closest('[data-dt-action]') as HTMLElement | null;
    if (actionBtn) {
      event.stopPropagation();
      const action = actionBtn.getAttribute('data-dt-action');
      const id = actionBtn.getAttribute('data-dt-id') ?? '';
      const rowData = this.expandedRowCache.get(id) ?? this.getRowDataFromTable(id);
      if (!rowData) {
        return;
      }
      const student = this.toStudent(rowData);
      if (action === 'edit') {
        this.openEditDialog(student, event);
      } else if (action === 'delete') {
        this.deleteStudent(student.id, event);
      }
      return;
    }

    if (target.closest('.action-buttons')) {
      return;
    }

    const row = target.closest(`${this.tableSelector} tbody tr.data-row`);
    if (!row) {
      return;
    }

    event.preventDefault();

    const studentId = row.getAttribute('data-student-id') ?? '';
    const rowData = this.expandedRowCache.get(studentId) ?? this.getRowDataFromTable(studentId);
    if (rowData) {
      this.toggleRow(this.toStudent(rowData));
    }
  };

  private getRowDataFromTable(id: string): Record<string, unknown> | null {
    const cached = this.expandedRowCache.get(id);
    if (cached) {
      return cached;
    }

    const api = getTableApi(this.tableSelector);
    if (!api) {
      return null;
    }

    let found: Record<string, unknown> | null = null;
    document.querySelectorAll(`${this.tableSelector} tbody tr.data-row`).forEach((rowEl) => {
      if (rowEl.getAttribute('data-student-id') === id) {
        found = api.row(rowEl as HTMLElement).data();
      }
    });
    return found;
  }

  private toStudent(row: Record<string, unknown>): Student {
    return {
      id: row['id'] as Student['id'],
      name: String(row['name'] ?? ''),
      email: String(row['email'] ?? ''),
      phone: String(row['phone'] ?? ''),
      status: row['status'] as Student['status'],
      creationDate: row['creationDate'] as string | undefined,
    };
  }

  private syncExpandedRowHighlight(): void {
    document.querySelectorAll(`${this.tableSelector} tbody tr.data-row`).forEach(row => {
      row.classList.remove('is-expanded');
    });

    if (!this.expandedElement) {
      return;
    }

    const activeRow = document.querySelector(
      `${this.tableSelector} tbody tr.data-row[data-student-id="${this.expandedElement.id}"]`
    );
    activeRow?.classList.add('is-expanded');
  }

  private removeAllDetailRows(): void {
    document.querySelectorAll(`${this.tableSelector} tbody tr.student-detail-row`).forEach(row => row.remove());
  }

  private renderInlineDetailRow(): void {
    this.removeAllDetailRows();

    if (!this.expandedElement) {
      return;
    }

    const freshRow = this.expandedRowCache.get(String(this.expandedElement.id));
    if (freshRow) {
      this.expandedElement = this.toStudent(freshRow);
    }

    const activeRow = document.querySelector(
      `${this.tableSelector} tbody tr.data-row[data-student-id="${this.expandedElement.id}"]`
    ) as HTMLElement | null;

    if (!activeRow || activeRow.style.display === 'none') {
      return;
    }

    const detailRow = document.createElement('tr');
    detailRow.className = 'student-detail-row';
    detailRow.innerHTML = this.buildDetailRowHtml(this.expandedElement);
    activeRow.insertAdjacentElement('afterend', detailRow);
  }

  private buildDetailRowHtml(student: Student): string {
    const classNames = this.getStudentClassNames(student.id);
    const sectionsCount = this.getStudentSections(student.id).length;
    const lecturesCount = this.getStudentLecturesCount(student.id);
    const creationDate = this.formatCreationDate(student.creationDate);
    const classesHtml = classNames.length
      ? `<div class="chip-list">${classNames.map(name => `<span class="class-chip">${escapeHtml(name)}</span>`).join('')}</div>`
      : '<span class="text-muted">None enrolled</span>';

    return `
      <td colspan="8">
        <div class="student-detail-panel inline">
          <div class="detail-panel-header">
            <div class="detail-panel-title">
              <span class="row-avatar">${escapeHtml(getInitials(student.name))}</span>
              <div>
                <h3>${escapeHtml(student.name)}</h3>
                <p>Enrollment profile &amp; course activity</p>
              </div>
            </div>
            <button type="button" class="detail-panel-close" aria-label="Close details">&times;</button>
          </div>
          <div class="detail-panel-grid">
            <div class="detail-stat">
              <span class="detail-stat-label">Classes</span>
              <div class="detail-stat-value">${classesHtml}</div>
            </div>
            <div class="detail-stat">
              <span class="detail-stat-label">Number of Sections</span>
              <span class="detail-stat-number">${sectionsCount}</span>
            </div>
            <div class="detail-stat">
              <span class="detail-stat-label">Number of Lectures</span>
              <span class="detail-stat-number">${lecturesCount}</span>
            </div>
            <div class="detail-stat">
              <span class="detail-stat-label">Creation Date</span>
              <span class="detail-stat-number date">${escapeHtml(creationDate)}</span>
            </div>
          </div>
        </div>
      </td>
    `;
  }

  loadMetadata() {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;
    forkJoin({
      sections: this.sectionService.getAll(),
      classes: this.classService.getAll(),
      lectures: this.lectureService.getAll()
    }).subscribe({
      next: (res) => {
        this.sections = res.sections;
        this.classes = res.classes;
        this.lectures = res.lectures;
        this.expandedElement = null;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.refreshDataTable();
      },
      error: () => {
        this.toast.error('Failed to load students and course metadata.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStudentSections(studentId: number | string): Section[] {
    const sid = String(studentId);
    return this.sections.filter(s => (s.studentIds || []).map(id => String(id)).includes(sid));
  }

  getStudentClassNames(studentId: number | string): string[] {
    const studentSections = this.getStudentSections(studentId);
    const classIds = new Set(studentSections.map(s => s.classId));
    return this.classes.filter(c => classIds.has(c.id)).map(c => c.name);
  }

  getStudentLecturesCount(studentId: number | string): number {
    const studentSections = this.getStudentSections(studentId);
    const sectionIds = new Set(studentSections.map(s => s.id));
    return this.lectures.filter(l => sectionIds.has(l.sectionId)).length;
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(StudentDialogComponent, {
      width: '450px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.studentService.create(result).subscribe({
          next: () => {
            this.toast.success('Student registered successfully.');
            this.reloadTable();
          },
          error: () => this.toast.error('Could not create student.')
        });
      }
    });
  }

  openEditDialog(student: Student, event: Event) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(StudentDialogComponent, {
      width: '450px',
      data: { student }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.studentService.update(student.id, result).subscribe({
          next: () => {
            this.toast.success('Student updated successfully.');
            this.reloadTable();
          },
          error: () => this.toast.error('Could not update student details.')
        });
      }
    });
  }

  deleteStudent(id: number | string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this student registration?')) {
      this.studentService.delete(id as number).subscribe({
        next: () => {
          this.toast.success('Student deleted successfully.');
          this.reloadTable();
        },
        error: () => this.toast.error('Could not delete student.')
      });
    }
  }

  private reloadTable(): void {
    this.expandedElement = null;
    redrawServerSideTable(this.tableSelector, false);
  }

  toggleRow(element: Student) {
    const wasExpanded = this.expandedElement?.id === element.id;
    this.expandedElement = wasExpanded ? null : element;
    redrawServerSideTable(this.tableSelector, false);
  }

  closeDetailPanel(event: Event) {
    event.stopPropagation();
    this.expandedElement = null;
    redrawServerSideTable(this.tableSelector, false);
  }

  formatCreationDate(date?: string): string {
    if (!date) {
      return '—';
    }

    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
