import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideAngularModule } from 'lucide-angular';
import { sortBy, SortDirection } from '../../core/utils/list-sort.util';
import { forkJoin } from 'rxjs';
import { Section, Class } from '../../core/models/educational.models';
import { SectionService } from '../../core/services/section.service';
import { ClassService } from '../../core/services/class.service';
import { ToastService } from '../../core/services/toast.service';
import { SectionDialogComponent } from './section-dialog.component';
import { SectionEnrollmentDialogComponent } from './section-enrollment-dialog.component';

type SectionSortField = 'name' | 'class' | 'enrolled';

@Component({
  selector: 'app-sections',
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
  templateUrl: './sections.component.html',
  styleUrls: ['./sections.component.scss']
})
export class SectionsComponent implements OnInit {
  sections: Section[] = [];
  sortedSections: Section[] = [];
  classes: Class[] = [];
  isLoading = true;
  sortField: SectionSortField = 'name';
  sortDirection: SortDirection = 'asc';
  readonly sortOptions: { value: SectionSortField; label: string }[] = [
    { value: 'name', label: 'Section Name' },
    { value: 'class', label: 'Class' },
    { value: 'enrolled', label: 'Enrolled Students' }
  ];

  constructor(
    private sectionService: SectionService,
    private classService: ClassService,
    private toast: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSections();
  }

  loadSections() {
    this.isLoading = true;
    forkJoin({
      sections: this.sectionService.getAll(),
      classes: this.classService.getAll()
    }).subscribe({
      next: (res) => {
        this.sections = res.sections;
        this.classes = res.classes;
        this.refreshList();
        this.isLoading = false;
      },
      error: () => {
        this.toast.error('Failed to load sections and classes.');
        this.isLoading = false;
      }
    });
  }

  getClassName(classId: number): string {
    const cid = String(classId);
    const cls = this.classes.find(c => String(c.id) === cid);
    return cls ? cls.name : '—';
  }

  onSortFieldChange(field: SectionSortField) {
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
    this.sortedSections = sortBy(
      this.sections,
      (section) => {
        switch (this.sortField) {
          case 'class':
            return this.getClassName(section.classId);
          case 'enrolled':
            return (section.studentIds || []).length;
          default:
            return section.name;
        }
      },
      this.sortDirection
    );
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(SectionDialogComponent, {
      width: '450px',
      data: { classes: this.classes }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.sectionService.create(result).subscribe({
          next: () => {
            this.toast.success('Section created.');
            this.loadSections();
          },
          error: () => this.toast.error('Create failed.')
        });
      }
    });
  }

  openEditDialog(section: Section) {
    const dialogRef = this.dialog.open(SectionDialogComponent, {
      width: '450px',
      data: { section, classes: this.classes }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.sectionService.update(section.id, result).subscribe({
          next: () => {
            this.toast.success('Section updated.');
            this.loadSections();
          },
          error: () => this.toast.error('Update failed.')
        });
      }
    });
  }

  openEnrollmentDialog(section: Section) {
    const dialogRef = this.dialog.open(SectionEnrollmentDialogComponent, {
      width: '520px',
      data: { section }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadSections();
    });
  }

  deleteSection(id: number) {
    if (confirm('Are you sure you want to delete this section?')) {
      this.sectionService.delete(id).subscribe({
        next: () => {
          this.toast.success('Section deleted.');
          this.loadSections();
        },
        error: () => this.toast.error('Delete failed.')
      });
    }
  }
}
