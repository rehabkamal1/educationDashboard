import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { Section, Class } from '../../core/models/educational.models';
import { SectionService } from '../../core/services/section.service';
import { ClassService } from '../../core/services/class.service';
import { ToastService } from '../../core/services/toast.service';
import { SectionDialogComponent } from './section-dialog.component';
import { SectionEnrollmentDialogComponent } from './section-enrollment-dialog.component';
import {
  applyColumnFilters,
  clearColumnFilters,
  destroyAdvancedDataTable,
  initAdvancedDataTable,
} from '../../core/utils/datatable-advanced.util';

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    LucideAngularModule
  ],
  templateUrl: './sections.component.html',
  styleUrls: ['./sections.component.scss']
})
export class SectionsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly tableSelector = '#sectionsTable';
  private readonly columnCount = 5;

  dataSource = new MatTableDataSource<Section>([]);
  classes: Class[] = [];
  isLoading = true;

  filters = {
    id: '',
    name: '',
    className: '',
    enrolled: '',
  };

  constructor(
    private sectionService: SectionService,
    private classService: ClassService,
    private toast: ToastService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSections();
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
      { columnIndex: 1, value: this.filters.name },
      { columnIndex: 2, value: this.filters.className },
      { columnIndex: 3, value: this.filters.enrolled },
    ]);
  }

  resetTableFilters(): void {
    this.filters = { id: '', name: '', className: '', enrolled: '' };
    clearColumnFilters(this.tableSelector, this.columnCount);
  }

  private initDataTable(): void {
    initAdvancedDataTable({
      selector: this.tableSelector,
      exportToolbarSelector: '#sectionsExportToolbar',
      metaToolbarSelector: '#sectionsMetaToolbar',
      pageLength: 10,
      order: [[1, 'asc']],
      nonOrderableTargets: [4],
      exportFileName: 'sections',
      exportTitle: 'Sections',
      hasData: this.dataSource.data.length > 0,
    });
  }

  private refreshDataTable(): void {
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
  }

  loadSections() {
    destroyAdvancedDataTable(this.tableSelector);
    this.isLoading = true;
    forkJoin({
      sections: this.sectionService.getAll(),
      classes: this.classService.getAll()
    }).subscribe({
      next: (res) => {
        this.dataSource.data = res.sections;
        this.classes = res.classes;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.refreshDataTable();
      },
      error: () => {
        this.toast.error('Failed to load sections and classes.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getClassName(classId: number): string {
    const cid = String(classId);
    const cls = this.classes.find(c => String(c.id) === cid);
    return cls ? cls.name : '—';
  }

  getEnrolledCount(section: Section): number {
    return (section.studentIds || []).length;
  }

  getTotalEnrolled(): number {
    return this.dataSource.data.reduce(
      (sum, s) => sum + (s.studentIds || []).length,
      0
    );
  }

  trackBySectionId(_index: number, section: Section): number {
    return section.id;
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
