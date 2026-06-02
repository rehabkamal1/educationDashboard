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
import { Lecture, Section } from '../../core/models/educational.models';
import { LectureService } from '../../core/services/lecture.service';
import { SectionService } from '../../core/services/section.service';
import { ToastService } from '../../core/services/toast.service';
import { LectureDialogComponent } from './lecture-dialog.component';

type LectureSortField = 'title' | 'section' | 'duration';

@Component({
  selector: 'app-lectures',
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
  templateUrl: './lectures.component.html',
  styleUrls: ['./lectures.component.scss']
})
export class LecturesComponent implements OnInit {
  lectures: Lecture[] = [];
  sortedLectures: Lecture[] = [];
  sections: Section[] = [];
  isLoading = true;
  sortField: LectureSortField = 'title';
  sortDirection: SortDirection = 'asc';
  readonly sortOptions: { value: LectureSortField; label: string }[] = [
    { value: 'title', label: 'Title' },
    { value: 'section', label: 'Section' },
    { value: 'duration', label: 'Duration' }
  ];

  constructor(
    private lectureService: LectureService,
    private sectionService: SectionService,
    private toast: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    forkJoin({
      lectures: this.lectureService.getAll(),
      sections: this.sectionService.getAll()
    }).subscribe({
      next: (res) => {
        this.lectures = res.lectures;
        this.sections = res.sections;
        this.refreshList();
        this.isLoading = false;
      },
      error: () => {
        this.toast.error('Failed to load lectures.');
        this.isLoading = false;
      }
    });
  }

  getSectionName(sectionId: number): string {
    const sid = String(sectionId);
    const sec = this.sections.find(s => String(s.id) === sid);
    return sec ? sec.name : '—';
  }

  onSortFieldChange(field: LectureSortField) {
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
    this.sortedLectures = sortBy(
      this.lectures,
      (lecture) => {
        switch (this.sortField) {
          case 'section':
            return this.getSectionName(lecture.sectionId);
          case 'duration':
            return lecture.duration;
          default:
            return lecture.title;
        }
      },
      this.sortDirection
    );
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(LectureDialogComponent, {
      width: '460px',
      data: { sections: this.sections }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.lectureService.create(result).subscribe({
          next: () => {
            this.toast.success('Lecture created.');
            this.loadData();
          },
          error: () => this.toast.error('Create failed.')
        });
      }
    });
  }

  openEditDialog(lecture: Lecture) {
    const dialogRef = this.dialog.open(LectureDialogComponent, {
      width: '460px',
      data: { lecture, sections: this.sections }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.lectureService.update(lecture.id, result).subscribe({
          next: () => {
            this.toast.success('Lecture updated.');
            this.loadData();
          },
          error: () => this.toast.error('Update failed.')
        });
      }
    });
  }

  deleteLecture(id: number) {
    if (confirm('Are you sure you want to delete this lecture?')) {
      this.lectureService.delete(id).subscribe({
        next: () => {
          this.toast.success('Lecture deleted successfully.');
          this.loadData();
        },
        error: () => this.toast.error('Failed to delete lecture.')
      });
    }
  }
}
