import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Teacher } from '../../core/models/educational.models';

@Component({
  selector: 'app-teacher-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.teacher ? 'Edit Teacher Profile' : 'Onboard New Teacher' }}</h2>
    <form [formGroup]="teacherForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="form-content">
        <mat-form-field appearance="outline">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g., Prof. Charles Xavier">
          <mat-error *ngIf="teacherForm.get('name')?.hasError('required')">Name is required</mat-error>
          <mat-error *ngIf="teacherForm.get('name')?.hasError('minlength')">Name must be at least 3 characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Specialization / Department</mat-label>
          <input matInput formControlName="specialization" placeholder="e.g., Theoretical Physics">
          <mat-error *ngIf="teacherForm.get('specialization')?.hasError('required')">Specialization is required</mat-error>
          <mat-error *ngIf="teacherForm.get('specialization')?.hasError('minlength')">Specialization must be at least 2 characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email Address</mat-label>
          <input matInput type="email" formControlName="email" placeholder="e.g., xavier@xavier.edu">
          <mat-error *ngIf="teacherForm.get('email')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="teacherForm.get('email')?.hasError('email')">Please enter a valid email address</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Phone Number</mat-label>
          <input matInput formControlName="phone" placeholder="e.g., +1 (555) 015-7766">
          <mat-error *ngIf="teacherForm.get('phone')?.hasError('required')">Phone is required</mat-error>
          <mat-error *ngIf="teacherForm.get('phone')?.hasError('pattern')">Format should match phone number guidelines</mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-button type="submit" class="gradient-btn" [disabled]="teacherForm.invalid">
          {{ data.teacher ? 'Save Changes' : 'Onboard' }}
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
export class TeacherDialogComponent implements OnInit {
  teacherForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TeacherDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { teacher?: Teacher }
  ) {}

  ngOnInit(): void {
    const phonePattern = '^\\+?[0-9\\s\\-\\(\\)]+$';
    this.teacherForm = this.fb.group({
      name: [
        this.data.teacher?.name || '', 
        [Validators.required, Validators.minLength(3)]
      ],
      specialization: [
        this.data.teacher?.specialization || '', 
        [Validators.required, Validators.minLength(2)]
      ],
      email: [
        this.data.teacher?.email || '', 
        [Validators.required, Validators.email]
      ],
      phone: [
        this.data.teacher?.phone || '', 
        [Validators.required, Validators.pattern(phonePattern)]
      ]
    });
  }

  onSubmit(): void {
    if (this.teacherForm.valid) {
      this.dialogRef.close(this.teacherForm.value);
    }
  }
}
