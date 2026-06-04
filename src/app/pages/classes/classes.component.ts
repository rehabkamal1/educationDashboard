import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Class, Teacher } from '../../core/models/educational.models';
import { ClassService } from '../../core/services/class.service';
import { TeacherService } from '../../core/services/teacher.service';
import { ToastService } from '../../core/services/toast.service';
import { ClassDialogComponent } from './class-dialog.component';
import { forkJoin } from 'rxjs';

declare const $: {
  (selector: string): {
    length: number;
    DataTable(options?: object): { destroy(): void };
  };
  fn: { DataTable: { isDataTable(el: unknown): boolean } };
};

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
    LucideAngularModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './classes.component.html',
  styleUrls: ['./classes.component.scss']
})
export class ClassesComponent implements OnInit, AfterViewInit, OnDestroy {
  dataSource = new MatTableDataSource<Class>([]);
  teachers: Teacher[] = [];
  isLoading = true;

  constructor(
    private classService: ClassService,
    private teacherService: TeacherService,
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
    this.destroyDataTable();
  }

  private initDataTable(): void {
    if (typeof $ === 'undefined' || !$.fn?.DataTable) {
      return;
    }

    const table = $('#classesTable');
    if (!table.length || this.dataSource.data.length === 0) {
      return;
    }

    try {
      if ($.fn.DataTable.isDataTable(table)) {
        table.DataTable().destroy();
      }

      table.DataTable({
        pageLength: 10,
        order: [[0, 'asc']],
        columnDefs: [{ orderable: false, targets: 3 }],
        language: {
          searchPlaceholder: 'Search classes...',
        },
      });
    } catch {
      // DataTables failed; table still shows Angular-rendered rows
    }
  }

  private destroyDataTable(): void {
    if (typeof $ === 'undefined' || !$.fn?.DataTable) {
      return;
    }

    const table = $('#classesTable');
    if (table.length && $.fn.DataTable.isDataTable(table)) {
      try {
        table.DataTable().destroy();
      } catch {
        // ignore teardown errors on detached tables
      }
    }
  }

  private refreshDataTable(): void {
    setTimeout(() => {
      this.initDataTable();
      this.cdr.detectChanges();
    });
  }

  loadData() {
    this.destroyDataTable();
    this.isLoading = true;

    forkJoin({
      teachers: this.teacherService.getAll(),
      classes: this.classService.getAll(),
    }).subscribe({
      next: ({ teachers, classes }) => {
        this.teachers = teachers;
        this.dataSource.data = classes;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.refreshDataTable();
      },
      error: () => {
        this.toast.error('Failed to load classes.');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(ClassDialogComponent, {
      width: '500px',
      data: { teachers: this.teachers }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.classService.create(result).subscribe({
          next: () => {
            this.toast.success('Class created successfully.');
            this.loadData();
          },
          error: () => this.toast.error('Failed to create class.')
        });
      }
    });
  }

  openEditDialog(cls: Class) {
    const dialogRef = this.dialog.open(ClassDialogComponent, {
      width: '500px',
      data: { class: cls, teachers: this.teachers }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.classService.update(cls.id, result).subscribe({
          next: () => {
            this.toast.success('Class updated successfully.');
            this.loadData();
          },
          error: () => this.toast.error('Failed to update class.')
        });
      }
    });
  }

  deleteClass(id: number) {
    if (confirm('Delete this class?')) {
      this.classService.delete(id).subscribe({
        next: () => {
          this.toast.success('Class deleted.');
          this.loadData();
        },
        error: () => this.toast.error('Failed to delete class.')
      });
    }
  }

  getTeacherName(teacherId: number): string {
    const tid = String(teacherId);
    const t = this.teachers.find(t => String(t.id) === tid);
    return t ? t.name : '—';
  }

  getTeacherInitial(teacherId: number): string {
    const name = this.getTeacherName(teacherId);
    return name === '—' ? '?' : name.charAt(0).toUpperCase();
  }

  trackByClassId(_index: number, cls: Class): number {
    return cls.id;
  }
}
