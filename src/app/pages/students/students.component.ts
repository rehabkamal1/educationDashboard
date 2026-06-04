import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { LucideAngularModule } from 'lucide-angular';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { forkJoin } from 'rxjs';

import { Student, Section, Class, Lecture } from '../../core/models/educational.models';
import { StudentService } from '../../core/services/student.service';
import { SectionService } from '../../core/services/section.service';
import { ClassService } from '../../core/services/class.service';
import { LectureService } from '../../core/services/lecture.service';
import { ToastService } from '../../core/services/toast.service';
import { StudentDialogComponent } from './student-dialog.component';

declare const $: {
  (selector: string): {
    length: number;
    DataTable(options?: object): { destroy(): void };
  };
  fn: { DataTable: { isDataTable(el: unknown): boolean } };
};

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatCardModule,
    LucideAngularModule
  ],
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0', display: 'none' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class StudentsComponent implements OnInit, AfterViewInit, OnDestroy {
  dataSource = new MatTableDataSource<Student>([]);
  expandedElement: Student | null = null;

  sections: Section[] = [];
  classes: Class[] = [];
  lectures: Lecture[] = [];
  isLoading = true;

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
    this.dataSource.filterPredicate = (student, filter) => {
      const q = filter.trim().toLowerCase();
      return (
        String(student.id).includes(q) ||
        student.name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        student.phone.toLowerCase().includes(q) ||
        student.status.toLowerCase().includes(q)
      );
    };

    this.dataSource.sortingDataAccessor = (student, property) => {
      switch (property) {
        case 'id':
          return student.id;
        case 'status':
          return student.status;
        default:
          return (student as unknown as Record<string, string>)[property] ?? '';
      }
    };

    this.loadData();
  }

  ngAfterViewInit(): void {
    if (!this.isLoading) {
      this.initDataTable();
    }
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
  }

  private initDataTable(): void {
    if (typeof $ === 'undefined' || !$.fn?.DataTable) {
      return;
    }

    const table = $('#studentsTable');
    if (!table.length || this.dataSource.data.length === 0) {
      return;
    }

    try {
      if ($.fn.DataTable.isDataTable(table)) {
        table.DataTable().destroy();
      }

      table.DataTable({
        pageLength: 10,
        order: [[0, 'asc']],
        columnDefs: [{ orderable: false, targets: 7 }],
        language: {
          searchPlaceholder: 'Search students...',
        },
      });
    } catch {
      // DataTables failed; table still shows Angular-rendered rows
    }
  }

  private destroyDataTable(): void {
    if (typeof $ === 'undefined' || !$.fn?.DataTable) {
      return;
    }

    const table = $('#studentsTable');
    if (table.length && $.fn.DataTable.isDataTable(table)) {
      try {
        table.DataTable().destroy();
      } catch {
        // ignore teardown errors on detached tables
      }
    }
  }

  private refreshDataTable(): void {
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
  }

  loadData() {
    this.destroyDataTable();
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

  trackByStudentId(_index: number, student: Student): number {
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
    this.expandedElement = this.expandedElement === element ? null : element;
  }
}
