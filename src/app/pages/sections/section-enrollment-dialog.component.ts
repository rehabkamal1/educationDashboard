import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { LucideAngularModule } from 'lucide-angular';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Section, Student } from '../../core/models/educational.models';
import { SectionService } from '../../core/services/section.service';
import { StudentService } from '../../core/services/student.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-section-enrollment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatListModule,
    MatInputModule,
    LucideAngularModule
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      Manage Enrollment: <span class="highlight">{{ section.name }}</span>
    </h2>
    
    <mat-dialog-content class="dialog-content">
      <div *ngIf="isLoading" class="dialog-loading">
        <div class="premium-spinner"></div>
        <span>Loading details...</span>
      </div>

      <div *ngIf="!isLoading">
        <!-- Add Student section -->
        <div class="enroll-action-bar">
          <mat-form-field appearance="outline" class="student-select">
            <mat-label>Select Student to Enroll</mat-label>
            <mat-select [formControl]="studentControl">
              <mat-option *ngFor="let s of availableStudents" [value]="s.id">
                {{ s.name }} ({{ s.email }})
              </mat-option>
            </mat-select>
          </mat-form-field>
          <button 
            mat-flat-button 
            class="gradient-btn enroll-btn" 
            [disabled]="studentControl.invalid"
            (click)="enrollSelected()">
            <lucide-icon name="Plus" class="btn-icon"></lucide-icon>
            Enroll
          </button>
        </div>

        <div class="divider"></div>

        <!-- Enrolled Students list -->
        <div class="enrolled-section">
          <h3>Enrolled Students ({{ enrolledStudents.length }})</h3>
          
          <div class="student-list-container">
            <mat-list *ngIf="enrolledStudents.length > 0">
              <mat-list-item *ngFor="let s of enrolledStudents" class="student-list-item">
                <div class="student-info-row">
                  <div class="avatar-circle">{{ getInitials(s.name) }}</div>
                  <div class="student-details">
                    <div class="student-name">{{ s.name }}</div>
                    <div class="student-email">{{ s.email }}</div>
                  </div>
                  <button 
                    mat-icon-button 
                    class="action-btn delete" 
                    (click)="unenrollStudent(s.id)"
                    matTooltip="Unenroll Student">
                    <lucide-icon name="Trash2" class="action-svg"></lucide-icon>
                  </button>
                </div>
              </mat-list-item>
            </mat-list>
            
            <div *ngIf="enrolledStudents.length === 0" class="empty-state">
              <lucide-icon name="Users" class="empty-icon"></lucide-icon>
              <p>No students enrolled in this section yet.</p>
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      font-weight: 700;
      .highlight {
        color: var(--accent-color);
      }
    }
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 480px;
      max-height: 70vh;
    }
    .dialog-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .enroll-action-bar {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 8px;
    }
    .student-select {
      flex: 1;
      margin-bottom: 0 !important;
    }
    .enroll-btn {
      height: 48px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-icon {
      width: 18px;
      height: 18px;
    }
    .divider {
      height: 1px;
      background-color: var(--border-color);
      margin: 16px 0;
    }
    .enrolled-section {
      h3 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--text-primary);
      }
    }
    .student-list-container {
      max-height: 250px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background-color: var(--bg-primary);
    }
    .student-list-item {
      height: auto !important;
      padding: 8px 12px !important;
      border-bottom: 1px solid var(--border-color);
      &:last-child {
        border-bottom: none;
      }
    }
    .student-info-row {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 12px;
    }
    .avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--accent-gradient);
      color: white;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .student-details {
      flex: 1;
      min-width: 0;
    }
    .student-name {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 0.9rem;
    }
    .student-email {
      font-size: 0.75rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .empty-state {
      padding: 32px 16px;
      text-align: center;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      .empty-icon {
        width: 32px;
        height: 32px;
        opacity: 0.5;
      }
      p {
        font-size: 0.85rem;
        margin: 0;
      }
    }
    .premium-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-color);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class SectionEnrollmentDialogComponent implements OnInit {
  section!: Section;
  allStudents: Student[] = [];
  enrolledStudents: Student[] = [];
  availableStudents: Student[] = [];
  studentControl = new FormControl<number | string | null>(null, { nonNullable: false });
  isLoading = true;

  constructor(
    private dialogRef: MatDialogRef<SectionEnrollmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { section: Section },
    private sectionService: SectionService,
    private studentService: StudentService,
    private toast: ToastService
  ) {
    this.section = { ...data.section };
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.studentService.getAll().subscribe({
      next: (students) => {
        this.allStudents = students;
        this.filterStudents();
        this.isLoading = false;
      },
      error: () => {
        this.toast.error('Failed to load students.');
        this.isLoading = false;
      }
    });
  }

  filterStudents() {
    const enrolledIds = this.section.studentIds || [];
    const enrolledSet = new Set(enrolledIds.map(id => String(id)));
    this.enrolledStudents = this.allStudents.filter(s => enrolledSet.has(String(s.id)));
    this.availableStudents = this.allStudents.filter(s => !enrolledSet.has(String(s.id)));
    this.studentControl.reset(null);
  }

  enrollSelected() {
    if (this.studentControl.value === null) return;
    const studentId = this.studentControl.value as number | string;

    this.sectionService.enrollStudent(this.section.id, studentId).subscribe({
      next: (updatedSection) => {
        this.section = updatedSection;
        this.toast.success('Student enrolled successfully.');
        this.filterStudents();
      },
      error: () => this.toast.error('Failed to enroll student.')
    });
  }

  unenrollStudent(studentId: number | string) {
    if (confirm('Are you sure you want to unenroll this student from this section?')) {
      this.sectionService.unenrollStudent(this.section.id, studentId as any).subscribe({
        next: (updatedSection) => {
          this.section = updatedSection;
          this.toast.success('Student unenrolled successfully.');
          this.filterStudents();
        },
        error: () => this.toast.error('Failed to unenroll student.')
      });
    }
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  onClose() {
    this.dialogRef.close(this.section);
  }
}
