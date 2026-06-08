import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { Class, Lecture, Section } from '../../core/models/educational.models';
import { LectureService } from '../../core/services/lecture.service';
import { SectionService } from '../../core/services/section.service';
import { ClassService } from '../../core/services/class.service';
import { ToastService } from '../../core/services/toast.service';
import { LectureDialogComponent } from './lecture-dialog.component';
import {
  destroyAdvancedDataTable,
  initServerSideDataTable,
  redrawServerSideTable,
} from '../../core/utils/datatable-advanced.util';
import { escapeHtml, renderIdBadge, renderLectureActions, renderLectureRow } from '../../core/utils/datatable-cell-render.util';
import {
  buildDetailRowHtml,
  buildDetailSection,
  buildExpandColumn,
  buildSubTable,
  handleExpandClick,
  insertDetailRow,
  removeDetailRows,
  syncExpandedHighlight,
} from '../../core/utils/datatable-row-expand.util';

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
  classes: Class[] = [];
  allLectures: Lecture[] = [];
  expandedId: string | null = null;
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
    private classService: ClassService,
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
      buildExpandColumn(() => this.expandedId),
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
      nonOrderableTargets: [4, 5],
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
        row.setAttribute('data-row-id', String(data['id'] ?? ''));
        this.rowCache.set(String(data['id'] ?? ''), data);
      },
      onDraw: () => this.renderExpandedDetail(),
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
    if (handleExpandClick(event, this.expandedId, (id) => this.toggleExpand(id))) {
      return;
    }

    const btn = (event.target as HTMLElement).closest('[data-dt-action]') as HTMLElement | null;
    if (!btn) {
      return;
    }
    event.stopPropagation();
    const action = btn.getAttribute('data-dt-action');
    const id = btn.getAttribute('data-dt-id') ?? '';
    const entity = btn.getAttribute('data-dt-entity');

    if (entity === 'lecture') {
      const lecture = this.allLectures.find((l) => String(l.id) === id);
      if (!lecture) {
        return;
      }
      if (action === 'edit') {
        this.openSubTableLectureEditDialog(lecture);
      } else if (action === 'delete') {
        this.deleteSubTableLecture(lecture.id);
      }
      return;
    }

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

  private renderExpandedDetail(): void {
    syncExpandedHighlight(this.tableSelector, this.expandedId, 'data-row-id');
    if (!this.expandedId) {
      removeDetailRows(this.tableSelector);
      return;
    }
    const rowData = this.rowCache.get(this.expandedId);
    if (!rowData) {
      return;
    }
    insertDetailRow(
      this.tableSelector,
      this.expandedId,
      'data-row-id',
      this.buildLectureDetailHtml(this.toLecture(rowData))
    );
  }

  private buildLectureDetailHtml(lecture: Lecture): string {
    const section = this.sections.find((s) => s.id === lecture.sectionId);
    const cls = section ? this.classes.find((c) => c.id === section.classId) : undefined;
    const sectionLectures = this.allLectures.filter((l) => l.sectionId === lecture.sectionId);

    const infoRows = [[
      escapeHtml(section?.name ?? '—'),
      escapeHtml(cls?.name ?? '—'),
      String((section?.studentIds ?? []).length),
    ]];

    const lectureRows = sectionLectures.map((item) => [
      renderIdBadge(item.id),
      escapeHtml(item.title),
      escapeHtml(item.duration),
      renderLectureActions(item.id, true),
    ]);

    const content =
      buildDetailSection(
        'Section Details (from sections table)',
        buildSubTable(['Section', 'Class', 'Enrolled Students'], infoRows)
      ) +
      buildDetailSection(
        'Lectures in Same Section',
        buildSubTable(['Lecture ID', 'Title', 'Duration', 'Actions'], lectureRows)
      );

    return buildDetailRowHtml(6, content);
  }

  private toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
    redrawServerSideTable(this.tableSelector, false);
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
    forkJoin({
      sections: this.sectionService.getAll(),
      classes: this.classService.getAll(),
      lectures: this.lectureService.getAll(),
    }).subscribe({
      next: (res) => {
        this.sections = res.sections;
        this.classes = res.classes;
        this.allLectures = res.lectures;
        this.expandedId = null;
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
    this.expandedId = null;
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

  private openSubTableLectureEditDialog(lecture: Lecture): void {
    const dialogRef = this.dialog.open(LectureDialogComponent, {
      width: '460px',
      data: { lecture, sections: this.sections },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.lectureService.update(lecture.id, result).subscribe({
          next: () => {
            this.toast.success('Lecture updated.');
            this.refreshExpandedMetadata();
          },
          error: () => this.toast.error('Update failed.'),
        });
      }
    });
  }

  private deleteSubTableLecture(id: number | string): void {
    if (confirm('Are you sure you want to delete this lecture?')) {
      this.lectureService.delete(id as number).subscribe({
        next: () => {
          this.toast.success('Lecture deleted successfully.');
          this.refreshExpandedMetadata();
        },
        error: () => this.toast.error('Failed to delete lecture.'),
      });
    }
  }

  private refreshExpandedMetadata(): void {
    const expandedId = this.expandedId;
    this.lectureService.getAll().subscribe({
      next: (lectures) => {
        this.allLectures = lectures;
        this.expandedId = expandedId;
        redrawServerSideTable(this.tableSelector, false);
      },
      error: () => this.toast.error('Failed to refresh section lectures.'),
    });
  }
}
