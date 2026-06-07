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
import { escapeHtml, renderIdBadge, renderStudentRow } from '../../core/utils/datatable-cell-render.util';
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

  expandedId: string | null = null;
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
          renderStudentRow(row)[0],
      },
      {
        data: 'name',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row)[1],
      },
      {
        data: 'email',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row)[2],
      },
      {
        data: 'status',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row)[3],
      },
      {
        data: 'classNamesText',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row)[4],
      },
      {
        data: 'sectionsCount',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row)[5],
      },
      {
        data: 'lecturesCount',
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row)[6],
      },
      {
        data: null,
        orderable: false,
        render: (_data: unknown, _type: string, row: Record<string, unknown>) =>
          renderStudentRow(row)[7],
      },
      buildExpandColumn(() => this.expandedId),
    ];
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
      nonOrderableTargets: [7, 8],
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
        row.classList.add('data-row');
        row.setAttribute('data-row-id', String(data['id'] ?? ''));
      },
      onDraw: () => {
        this.renderExpandedDetail();
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
    if (handleExpandClick(event, this.expandedId, (id) => this.toggleExpand(id))) {
      return;
    }

    const actionBtn = (event.target as HTMLElement).closest('[data-dt-action]') as HTMLElement | null;
    if (!actionBtn) {
      return;
    }
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
      if (rowEl.getAttribute('data-row-id') === id) {
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

  private renderExpandedDetail(): void {
    syncExpandedHighlight(this.tableSelector, this.expandedId, 'data-row-id');
    if (!this.expandedId) {
      removeDetailRows(this.tableSelector);
      return;
    }
    const rowData = this.expandedRowCache.get(this.expandedId);
    if (!rowData) {
      return;
    }
    const student = this.toStudent(rowData);
    insertDetailRow(
      this.tableSelector,
      this.expandedId,
      'data-row-id',
      this.buildStudentDetailHtml(student)
    );
  }

  private buildStudentDetailHtml(student: Student): string {
    const sections = this.getStudentSections(student.id);
    const rows = sections.map((section) => {
      const cls = this.classes.find((c) => c.id === section.classId);
      const lectureCount = this.lectures.filter((l) => l.sectionId === section.id).length;
      return [
        renderIdBadge(section.id),
        escapeHtml(section.name),
        escapeHtml(cls?.name ?? '—'),
        String(lectureCount),
      ];
    });
    const content = buildDetailSection(
      'Enrolled Sections (from sections table)',
      buildSubTable(['Section ID', 'Section Name', 'Class', 'Lectures'], rows)
    );
    return buildDetailRowHtml(9, content);
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
        this.expandedId = null;
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
    this.expandedId = null;
    redrawServerSideTable(this.tableSelector, false);
  }

  private toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
    redrawServerSideTable(this.tableSelector, false);
  }
}
