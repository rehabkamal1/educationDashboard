import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Class, Teacher } from '../../core/models/educational.models';

@Component({
  selector: 'app-class-dialog',
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
    <h2 mat-dialog-title>{{ data.class ? 'Edit Class Details' : 'Establish New Class' }}</h2>
    <form [formGroup]="classForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="form-content">
        <mat-form-field appearance="outline">
          <mat-label>Class Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g., Organic Chemistry II">
          <mat-error *ngIf="classForm.get('name')?.hasError('required')">Class name is required</mat-error>
          <mat-error *ngIf="classForm.get('name')?.hasError('minlength')">Class name must be at least 3 characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Assign Faculty Lead</mat-label>
          <mat-select formControlName="teacherId">
            <mat-option *ngFor="let teacher of data.teachers" [value]="teacher.id">
              {{ teacher.name }} ({{ teacher.specialization }})
            </mat-option>
          </mat-select>
          <mat-error *ngIf="classForm.get('teacherId')?.hasError('required')">Please assign a lead teacher</mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-button type="submit" class="gradient-btn" [disabled]="classForm.invalid">
          {{ data.class ? 'Save Changes' : 'Establish' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 340px;
    }
  `]
})
export class ClassDialogComponent implements OnInit {
  classForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ClassDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { class?: Class, teachers: Teacher[] }
  ) {}

  ngOnInit(): void {
    this.classForm = this.fb.group({
      name: [
        this.data.class?.name || '', 
        [Validators.required, Validators.minLength(3)]
      ],
      teacherId: [
        this.data.class?.teacherId ?? '', 
        [Validators.required]
      ]
    });
  }

  onSubmit(): void {
    if (this.classForm.valid) {
      this.dialogRef.close(this.classForm.value);
    }
  }
}
