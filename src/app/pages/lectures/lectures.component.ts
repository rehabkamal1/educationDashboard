import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { Lecture, Section } from '../../core/models/educational.models';
import { LectureService } from '../../core/services/lecture.service';
import { SectionService } from '../../core/services/section.service';
import { ToastService } from '../../core/services/toast.service';
import { LectureDialogComponent } from './lecture-dialog.component';
import {
  destroyAdvancedDataTable,
  initServerSideDataTable,
  redrawServerSideTable,
} from '../../core/utils/datatable-advanced.util';
import { renderLectureRow } from '../../core/utils/datatable-cell-render.util';

const API_BASE = 'http://localhost:3000';

@Component({
  selector: 'app-lectures',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './lectures.component.html',
})
export class LecturesComponent implements OnInit, OnDestroy {
  private readonly tableSelector = '#lecturesTable';
  private tableWrapperEl: HTMLElement | null = null;
  private rowCache = new Map<string, Record<string, unknown>>();

  sections: Section[] = [];
  isLoading = true;
  tableReady = false;
  recordsTotal = 0;
  recordsFiltered = 0;
  sectionsCount = 0;

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
    this.loadMetadata();
  }

  ngOnDestroy(): void {
    this.detachTableListeners();
    destroyAdvancedDataTable(this.tableSelector);
  }

  applyTableFilters(): void {
    redrawServerSideTable(this.tableSelector, true);
  }

  resetTableFilters(): void {
    this.filters = { id: '', title: '', section: '', duration: '' };
    redrawServerSideTable(this.tableSelector, true);
  }

  private buildColumns(): object[] {
    return [
      { data: 'id', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderLectureRow(row)[0] },
      { data: 'title', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderLectureRow(row)[1] },
      { data: 'sectionName', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderLectureRow(row)[2] },
      { data: 'duration', render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderLectureRow(row)[3] },
      { data: null, orderable: false, render: (_d: unknown, _t: string, row: Record<string, unknown>) => renderLectureRow(row)[4] },
    ];
  }

  private initDataTable(): void {
    initServerSideDataTable({
      selector: this.tableSelector,
      ajaxUrl: `${API_BASE}/datatable/lectures`,
      exportToolbarSelector: '#lecturesExportToolbar',
      metaToolbarSelector: '#lecturesMetaToolbar',
      columns: this.buildColumns(),
      pageLength: 10,
      order: [[1, 'asc']],
      nonOrderableTargets: [4],
      exportFileName: 'lectures',
      exportTitle: 'Lectures',
      customVars: () => ({
        idFilter: this.filters.id,
        titleFilter: this.filters.title,
        sectionFilter: this.filters.section,
        durationFilter: this.filters.duration,
      }),
      onLoaded: (meta) => {
        this.recordsTotal = meta.recordsTotal;
        this.recordsFiltered = meta.recordsFiltered;
        this.sectionsCount = meta.stats?.sections ?? this.sections.length;
        this.tableReady = true;
        this.cdr.detectChanges();
      },
      rowCallback: (row, data) => {
        row.classList.add('data-row');
        this.rowCache.set(String(data['id'] ?? ''), data);
      },
    });
    this.attachTableListeners();
  }

  private attachTableListeners(): void {
    this.detachTableListeners();
    this.tableWrapperEl = document.querySelector(`${this.tableSelector}`)?.closest('.table-wrapper') ?? null;
    this.tableWrapperEl?.addEventListener('click', this.handleTableClick);
  }

  private detachTableListeners(): void {
    this.tableWrapperEl?.removeEventListener('click', this.handleTableClick);
    this.tableWrapperEl = null;
  }

  private handleTableClick = (event: Event): void => {
    const btn = (event.target as HTMLElement).closest('[data-dt-action]') as HTMLElement | null;
    if (!btn) {
      return;
    }
    event.stopPropagation();
    const action = btn.getAttribute('data-dt-action');
    const id = btn.getAttribute('data-dt-id') ?? '';
    const rowData = this.rowCache.get(id);
    if (!rowData) {
      return;
    }
    const lecture = this.toLecture(rowData);
    if (action === 'edit') {
      this.openEditDialog(lecture);
    } else if (action === 'delete') {
      this.deleteLecture(lecture.id);
    }
  };

  private toLecture(row: Record<string, unknown>): Lecture {
    return {
      id: row['id'] as Lecture['id'],
      title: String(row['title'] ?? ''),
      sectionId: row['sectionId'] as number,
      duration: String(row['duration'] ?? ''),
    };
  }

  private refreshDataTable(): void {
    destroyAdvancedDataTable(this.tableSelector);
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
  }

  loadMetadata() {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;
    this.sectionService.getAll().subscribe({
      next: (sections) => {
        this.sections = sections;
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

  reloadTable(): void {
    redrawServerSideTable(this.tableSelector, false);
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
            this.reloadTable();
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
            this.reloadTable();
          },
          error: () => this.toast.error('Update failed.')
        });
      }
    });
  }

  deleteLecture(id: number | string) {
    if (confirm('Are you sure you want to delete this lecture?')) {
      this.lectureService.delete(id as number).subscribe({
        next: () => {
          this.toast.success('Lecture deleted successfully.');
          this.reloadTable();
        },
        error: () => this.toast.error('Failed to delete lecture.')
      });
    }
  }
}
