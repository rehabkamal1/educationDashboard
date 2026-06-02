import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
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
import { connectTableControls } from '../../core/utils/table-data-source.util';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
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
export class StudentsComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Student>([]);
  displayedColumns = ['id', 'name', 'email', 'phone', 'status', 'actions'];
  expandedElement: Student | null = null;

  sections: Section[] = [];
  classes: Class[] = [];
  lectures: Lecture[] = [];
  isLoading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private studentService: StudentService,
    private sectionService: SectionService,
    private classService: ClassService,
    private lectureService: LectureService,
    private toast: ToastService,
    private dialog: MatDialog
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
    connectTableControls(this.dataSource, this.paginator, this.sort);
  }

  private connectTable(): void {
    connectTableControls(this.dataSource, this.paginator, this.sort);
  }

  loadData() {
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
        this.connectTable();
      },
      error: () => {
        this.toast.error('Failed to load students and course metadata.');
        this.isLoading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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

  getStudentClassesList(studentId: number): string {
    const studentSections = this.getStudentSections(studentId);
    const classIds = new Set(studentSections.map(s => s.classId));
    const matchingClasses = this.classes.filter(c => classIds.has(c.id));
    return matchingClasses.map(c => c.name).join(', ') || 'No Classes Enrolled';
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
