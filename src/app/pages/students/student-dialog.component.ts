import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Student } from '../../core/models/educational.models';

@Component({
  selector: 'app-student-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.student ? 'Edit Student Details' : 'Register New Student' }}</h2>
    <form [formGroup]="studentForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="form-content">
        <mat-form-field appearance="outline">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g., Sarah Connor">
          <mat-error *ngIf="studentForm.get('name')?.hasError('required')">Name is required</mat-error>
          <mat-error *ngIf="studentForm.get('name')?.hasError('minlength')">Name must be at least 3 characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email Address</mat-label>
          <input matInput type="email" formControlName="email" placeholder="e.g., sarah.connor@edu.com">
          <mat-error *ngIf="studentForm.get('email')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="studentForm.get('email')?.hasError('email')">Please enter a valid email address</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Phone Number</mat-label>
          <input matInput formControlName="phone" placeholder="e.g., +1 (555) 019-2834">
          <mat-error *ngIf="studentForm.get('phone')?.hasError('required')">Phone is required</mat-error>
          <mat-error *ngIf="studentForm.get('phone')?.hasError('pattern')">Format should match: +1 (XXX) XXX-XXXX or numbers</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Enrollment Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="Active">Active</mat-option>
            <mat-option value="Inactive">Inactive</mat-option>
          </mat-select>
          <mat-error *ngIf="studentForm.get('status')?.hasError('required')">Status is required</mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-button type="submit" class="gradient-btn" [disabled]="studentForm.invalid">
          {{ data.student ? 'Save Changes' : 'Register' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 320px;
    }
  `]
})
export class StudentDialogComponent implements OnInit {
  studentForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<StudentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { student?: Student }
  ) {}

  ngOnInit(): void {
    const phonePattern = '^\\+?[0-9\\s\\-\\(\\)]+$';
    this.studentForm = this.fb.group({
      name: [
        this.data.student?.name || '', 
        [Validators.required, Validators.minLength(3)]
      ],
      email: [
        this.data.student?.email || '', 
        [Validators.required, Validators.email]
      ],
      phone: [
        this.data.student?.phone || '', 
        [Validators.required, Validators.pattern(phonePattern)]
      ],
      status: [
        this.data.student?.status || 'Active', 
        [Validators.required]
      ]
    });
  }

  onSubmit(): void {
    if (this.studentForm.valid) {
      this.dialogRef.close(this.studentForm.value);
    }
  }
}
