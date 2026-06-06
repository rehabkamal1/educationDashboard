import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
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
  applyColumnFilters,
  clearColumnFilters,
  destroyAdvancedDataTable,
  initAdvancedDataTable,
} from '../../core/utils/datatable-advanced.util';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatCardModule,
    LucideAngularModule
  ],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly tableSelector = '#studentsTable';
  private readonly columnCount = 8;
  private tableWrapperEl: HTMLElement | null = null;

  dataSource = new MatTableDataSource<Student>([]);
  expandedElement: Student | null = null;

  sections: Section[] = [];
  classes: Class[] = [];
  lectures: Lecture[] = [];
  isLoading = true;

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
    this.loadData();
  }

  ngAfterViewInit(): void {
    if (!this.isLoading) {
      this.initDataTable();
    }
  }

  ngOnDestroy(): void {
    this.detachRowClickListener();
    destroyAdvancedDataTable(this.tableSelector);
  }

  applyTableFilters(): void {
    const contactTerms = [this.filters.email, this.filters.phone].filter(Boolean).join(' ');
    applyColumnFilters(this.tableSelector, [
      { columnIndex: 0, value: this.filters.id },
      { columnIndex: 1, value: this.filters.name },
      { columnIndex: 2, value: contactTerms, smart: contactTerms.includes(' ') },
      { columnIndex: 3, value: this.filters.status },
      { columnIndex: 4, value: this.filters.classes },
      { columnIndex: 5, value: this.filters.sections },
      { columnIndex: 6, value: this.filters.lectures },
    ]);
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
    clearColumnFilters(this.tableSelector, this.columnCount);
  }

  private initDataTable(): void {
    initAdvancedDataTable({
      selector: this.tableSelector,
      exportToolbarSelector: '#studentsExportToolbar',
      metaToolbarSelector: '#studentsMetaToolbar',
      pageLength: 10,
      order: [[0, 'asc']],
      nonOrderableTargets: [7],
      exportFileName: 'students',
      exportTitle: 'Students',
      hasData: this.dataSource.data.length > 0,
      onDraw: () => {
        this.renderInlineDetailRow();
        this.syncExpandedRowHighlight();
      },
    });
  }

  private refreshDataTable(): void {
    setTimeout(() => {
      this.initDataTable();
      this.attachRowClickListener();
      this.syncExpandedRowHighlight();
      this.cdr.detectChanges();
    });
  }

  private attachRowClickListener(): void {
    this.detachRowClickListener();
    this.tableWrapperEl = document.querySelector(`${this.tableSelector}`)?.closest('.table-wrapper') ?? null;
    this.tableWrapperEl?.addEventListener('click', this.handleTableClick);
  }

  private detachRowClickListener(): void {
    this.tableWrapperEl?.removeEventListener('click', this.handleTableClick);
    this.tableWrapperEl = null;
  }

  private handleTableClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target.closest('.detail-panel-close')) {
      this.closeDetailPanel(event);
      return;
    }

    if (target.closest('.action-buttons')) {
      return;
    }

    const row = target.closest(`${this.tableSelector} tbody tr.data-row`);
    if (!row) {
      return;
    }

    let studentId = row.getAttribute('data-student-id');
    if (!studentId) {
      studentId = row.querySelector('.id-badge')?.textContent?.replace('#', '').trim() ?? '';
    }
    if (!studentId) {
      return;
    }

    const student = this.dataSource.data.find(item => String(item.id) === studentId);
    if (student) {
      this.toggleRow(student);
    }
  };

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
      ? `<div class="chip-list">${classNames.map(name => `<span class="class-chip">${this.escapeHtml(name)}</span>`).join('')}</div>`
      : '<span class="text-muted">None enrolled</span>';

    return `
      <td colspan="8">
        <div class="student-detail-panel inline">
          <div class="detail-panel-header">
            <div class="detail-panel-title">
              <span class="row-avatar">${this.escapeHtml(this.getInitials(student.name))}</span>
              <div>
                <h3>${this.escapeHtml(student.name)}</h3>
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
              <span class="detail-stat-number date">${this.escapeHtml(creationDate)}</span>
            </div>
          </div>
        </div>
      </td>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  loadData() {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;
    forkJoin({
      students: this.studentService.getAll(),
      sections: this.sectionService.getAll(),
      classes: this.classService.getAll(),
      lectures: this.lectureService.getAll()
    }).subscribe({
      next: (res) => {
        this.sections = res.sections;
        this.classes = res.classes;
        this.lectures = res.lectures;
        
        this.dataSource.data = res.students;
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

  getStudentSections(studentId: number): Section[] {
    const sid = String(studentId);
    return this.sections.filter(s => (s.studentIds || []).map(id => String(id)).includes(sid));
  }

  getStudentClassesCount(studentId: number): number {
    const studentSections = this.getStudentSections(studentId);
    const classIds = new Set(studentSections.map(s => s.classId));
    return classIds.size;
  }

  getStudentClassNames(studentId: number): string[] {
    const studentSections = this.getStudentSections(studentId);
    const classIds = new Set(studentSections.map(s => s.classId));
    return this.classes.filter(c => classIds.has(c.id)).map(c => c.name);
  }

  getStudentClassNamesText(studentId: number): string {
    const names = this.getStudentClassNames(studentId);
    return names.length ? names.join(', ') : 'None enrolled';
  }

  getStudentContactExport(student: Student): string {
    return `${student.email} | ${student.phone}`;
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase() || '?';
  }

  getActiveCount(): number {
    return this.dataSource.data.filter(s => s.status === 'Active').length;
  }

  getInactiveCount(): number {
    return this.dataSource.data.filter(s => s.status === 'Inactive').length;
  }

  trackByStudentId(_index: number, student: Student): string | number {
    return student.id;
  }

  getStudentLecturesCount(studentId: number): number {
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
            this.loadData();
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
            this.loadData();
          },
          error: () => this.toast.error('Could not update student details.')
        });
      }
    });
  }

  deleteStudent(id: number, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this student registration?')) {
      this.studentService.delete(id).subscribe({
        next: () => {
          this.toast.success('Student deleted successfully.');
          this.loadData();
        },
        error: () => this.toast.error('Could not delete student.')
      });
    }
  }

  toggleRow(element: Student) {
    this.expandedElement = this.expandedElement?.id === element.id ? null : element;
    this.renderInlineDetailRow();
    this.syncExpandedRowHighlight();
    this.cdr.detectChanges();
  }

  closeDetailPanel(event: Event) {
    event.stopPropagation();
    this.expandedElement = null;
    this.removeAllDetailRows();
    this.syncExpandedRowHighlight();
    this.cdr.detectChanges();
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
