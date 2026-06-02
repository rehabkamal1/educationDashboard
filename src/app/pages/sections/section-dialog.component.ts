import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Section, Class } from '../../core/models/educational.models';

@Component({
  selector: 'app-section-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.section ? 'Edit Section' : 'Create New Section' }}</h2>
    <form [formGroup]="sectionForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="form-content">
        <mat-form-field appearance="outline">
          <mat-label>Section Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g., Section Alpha">
          <mat-error *ngIf="sectionForm.get('name')?.hasError('required')">Name is required</mat-error>
          <mat-error *ngIf="sectionForm.get('name')?.hasError('minlength')">At least 3 characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Assign to Class</mat-label>
          <mat-select formControlName="classId">
            <mat-option *ngFor="let cls of data.classes" [value]="cls.id">
              {{ cls.name }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="sectionForm.get('classId')?.hasError('required')">Select a class</mat-error>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-button type="submit" class="gradient-btn" [disabled]="sectionForm.invalid">
          {{ data.section ? 'Save' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-content { display: flex; flex-direction: column; gap: 12px; min-width: 340px; }
  `]
})
export class SectionDialogComponent implements OnInit {
  sectionForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { section?: Section, classes: Class[] }
  ) {}

  ngOnInit(): void {
    this.sectionForm = this.fb.group({
      name: [
        this.data.section?.name || '',
        [Validators.required, Validators.minLength(3)]
      ],
      classId: [
        this.data.section?.classId ?? '',
        [Validators.required]
      ]
    });
  }

  onSubmit(): void {
    if (this.sectionForm.valid) {
      this.dialogRef.close(this.sectionForm.value);
    }
  }
}
