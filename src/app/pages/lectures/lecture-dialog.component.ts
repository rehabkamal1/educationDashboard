import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Lecture, Section } from '../../core/models/educational.models';

@Component({
  selector: 'app-lecture-dialog',
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
    <h2 mat-dialog-title>{{ data.lecture ? 'Edit Lecture' : 'Create New Lecture' }}</h2>
    <form [formGroup]="lectureForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="form-content">

        <mat-form-field appearance="outline">
          <mat-label>Lecture Title</mat-label>
          <input matInput formControlName="title" placeholder="e.g., Quantum Mechanics Intro">
          <mat-error *ngIf="lectureForm.get('title')?.hasError('required')">Title is required</mat-error>
          <mat-error *ngIf="lectureForm.get('title')?.hasError('minlength')">At least 3 characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Assign to Section</mat-label>
          <mat-select formControlName="sectionId">
            <mat-option *ngFor="let sec of data.sections" [value]="sec.id">
              {{ sec.name }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="lectureForm.get('sectionId')?.hasError('required')">Select a section</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Duration</mat-label>
          <input matInput formControlName="duration" placeholder="e.g., 90 mins">
          <mat-error *ngIf="lectureForm.get('duration')?.hasError('required')">Duration is required</mat-error>
        </mat-form-field>

      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-button type="submit" class="gradient-btn" [disabled]="lectureForm.invalid">
          {{ data.lecture ? 'Save' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-content { display: flex; flex-direction: column; gap: 12px; min-width: 360px; }
  `]
})
export class LectureDialogComponent implements OnInit {
  lectureForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<LectureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { lecture?: Lecture; sections: Section[] }
  ) {}

  ngOnInit(): void {
    this.lectureForm = this.fb.group({
      title: [
        this.data.lecture?.title || '',
        [Validators.required, Validators.minLength(3)]
      ],
      sectionId: [
        this.data.lecture?.sectionId ?? '',
        [Validators.required]
      ],
      duration: [
        this.data.lecture?.duration || '',
        [Validators.required]
      ]
    });
  }

  onSubmit(): void {
    if (this.lectureForm.valid) {
      this.dialogRef.close(this.lectureForm.value);
    }
  }
}
