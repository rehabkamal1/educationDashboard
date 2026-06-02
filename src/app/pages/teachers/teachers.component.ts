import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideAngularModule } from 'lucide-angular';
import { Teacher } from '../../core/models/educational.models';
import { sortBy, SortDirection } from '../../core/utils/list-sort.util';
import { TeacherService } from '../../core/services/teacher.service';
import { ToastService } from '../../core/services/toast.service';
import { TeacherDialogComponent } from './teacher-dialog.component';

type TeacherSortField = 'name' | 'specialization' | 'email';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    LucideAngularModule
  ],
  templateUrl: './teachers.component.html',
  styleUrls: ['./teachers.component.scss']
})
export class TeachersComponent implements OnInit {
  teachers: Teacher[] = [];
  filteredTeachers: Teacher[] = [];
  isLoading = true;
  searchQuery = '';
  sortField: TeacherSortField = 'name';
  sortDirection: SortDirection = 'asc';
  readonly sortOptions: { value: TeacherSortField; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'specialization', label: 'Specialization' },
    { value: 'email', label: 'Email' }
  ];

  constructor(
    private teacherService: TeacherService,
    private toast: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers() {
    this.isLoading = true;
    this.teacherService.getAll().subscribe({
      next: (data) => {
        this.teachers = data;
        this.refreshList();
        this.isLoading = false;
      },
      error: () => {
        this.toast.error('Failed to retrieve teachers catalog.');
        this.isLoading = false;
      }
    });
  }

  applyFilter(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.refreshList();
  }

  onSortFieldChange(field: TeacherSortField) {
    this.sortField = field;
    this.refreshList();
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.refreshList();
  }

  get sortDirectionLabel(): string {
    return this.sortDirection === 'asc' ? 'A → Z' : 'Z → A';
  }

  private refreshList(): void {
    let list = this.teachers;

    if (this.searchQuery) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(this.searchQuery) ||
          t.specialization.toLowerCase().includes(this.searchQuery) ||
          t.email.toLowerCase().includes(this.searchQuery)
      );
    }

    this.filteredTeachers = sortBy(list, (t) => t[this.sortField], this.sortDirection);
  }

  // CRUD Operations
  openAddDialog() {
    const dialogRef = this.dialog.open(TeacherDialogComponent, {
      width: '450px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.teacherService.create(result).subscribe({
          next: () => {
            this.toast.success('Teacher successfully onboarded.');
            this.loadTeachers();
          },
          error: () => this.toast.error('Onboarding failed.')
        });
      }
    });
  }

  openEditDialog(teacher: Teacher) {
    const dialogRef = this.dialog.open(TeacherDialogComponent, {
      width: '450px',
      data: { teacher }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.teacherService.update(teacher.id, result).subscribe({
          next: () => {
            this.toast.success('Teacher profile updated successfully.');
            this.loadTeachers();
          },
          error: () => this.toast.error('Failed to update teacher profile.')
        });
      }
    });
  }

  deleteTeacher(id: number) {
    if (confirm('Are you sure you want to offboard this teacher? All assigned classes will remain but teacher reference will clear.')) {
      this.teacherService.delete(id).subscribe({
        next: () => {
          this.toast.success('Teacher offboarded successfully.');
          this.loadTeachers();
        },
        error: () => this.toast.error('Failed to delete teacher.')
      });
    }
  }
}
