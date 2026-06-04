import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { Lecture, Section } from '../../core/models/educational.models';
import { LectureService } from '../../core/services/lecture.service';
import { SectionService } from '../../core/services/section.service';
import { ToastService } from '../../core/services/toast.service';
import { LectureDialogComponent } from './lecture-dialog.component';
import {
  applyColumnFilters,
  clearColumnFilters,
  destroyAdvancedDataTable,
  initAdvancedDataTable,
} from '../../core/utils/datatable-advanced.util';

@Component({
  selector: 'app-lectures',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    LucideAngularModule
  ],
  templateUrl: './lectures.component.html',
})
export class LecturesComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly tableSelector = '#lecturesTable';
  private readonly columnCount = 5;

  dataSource = new MatTableDataSource<Lecture>([]);
  sections: Section[] = [];
  isLoading = true;

  filters = {
    id: '',
    title: '',
    section: '',
    duration: '',
  };

  constructor(
    private lectureService: LectureService,
    private sectionService: SectionService,
    private toast: ToastService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    if (!this.isLoading) {
      this.initDataTable();
    }
  }

  ngOnDestroy(): void {
    destroyAdvancedDataTable(this.tableSelector);
  }

  applyTableFilters(): void {
    applyColumnFilters(this.tableSelector, [
      { columnIndex: 0, value: this.filters.id },
      { columnIndex: 1, value: this.filters.title },
      { columnIndex: 2, value: this.filters.section },
      { columnIndex: 3, value: this.filters.duration },
    ]);
  }

  resetTableFilters(): void {
    this.filters = { id: '', title: '', section: '', duration: '' };
    clearColumnFilters(this.tableSelector, this.columnCount);
  }

  private initDataTable(): void {
    initAdvancedDataTable({
      selector: this.tableSelector,
      exportToolbarSelector: '#lecturesExportToolbar',
      metaToolbarSelector: '#lecturesMetaToolbar',
      pageLength: 10,
      order: [[1, 'asc']],
      nonOrderableTargets: [4],
      exportFileName: 'lectures',
      exportTitle: 'Lectures',
      hasData: this.dataSource.data.length > 0,
    });
  }

  private refreshDataTable(): void {
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
  }

  loadData() {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;
    forkJoin({
      lectures: this.lectureService.getAll(),
      sections: this.sectionService.getAll()
    }).subscribe({
      next: (res) => {
        this.dataSource.data = res.lectures;
        this.sections = res.sections;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.refreshDataTable();
      },
      error: () => {
        this.toast.error('Failed to load lectures.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getSectionName(sectionId: number): string {
    const sid = String(sectionId);
    const sec = this.sections.find(s => String(s.id) === sid);
    return sec ? sec.name : '—';
  }

  trackByLectureId(_index: number, lecture: Lecture): number {
    return lecture.id;
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
