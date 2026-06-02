import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
import { connectTableControls } from '../../core/utils/table-data-source.util';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
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
export class ClassesComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Class>([]);
  displayedColumns = ['id', 'name', 'teacher', 'actions'];
  teachers: Teacher[] = [];
  isLoading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private classService: ClassService,
    private teacherService: TeacherService,
    private toast: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (cls, property) => {
      switch (property) {
        case 'id':
          return cls.id;
        case 'teacher':
          return this.getTeacherName(cls.teacherId);
        default:
          return cls.name;
      }
    };
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.connectTable();
  }

  private connectTable(): void {
    connectTableControls(this.dataSource, this.paginator, this.sort);
  }

  loadData() {
    this.isLoading = true;
    this.teacherService.getAll().subscribe(teachers => {
      this.teachers = teachers;
    });
    this.classService.getAll().subscribe(classes => {
      this.dataSource.data = classes;
      this.isLoading = false;
      this.connectTable();
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
}
