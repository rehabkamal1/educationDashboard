import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { StudentService } from '../../core/services/student.service';
import { TeacherService } from '../../core/services/teacher.service';
import { ClassService } from '../../core/services/class.service';
import { SectionService } from '../../core/services/section.service';
import { LectureService } from '../../core/services/lecture.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    LucideAngularModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = {
    students: 0,
    teachers: 0,
    classes: 0,
    sections: 0,
    lectures: 0
  };

  studentDetails = {
    active: 0,
    inactive: 0,
    activePercentage: 0
  };

  enrollmentRate = 0; // percentage of students enrolled in at least one section
  latestStudents: any[] = [];
  isLoading = true;

  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private classService: ClassService,
    private sectionService: SectionService,
    private lectureService: LectureService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats() {
    this.isLoading = true;
    forkJoin({
      students: this.studentService.getAll(),
      teachers: this.teacherService.getAll(),
      classes: this.classService.getAll(),
      sections: this.sectionService.getAll(),
      lectures: this.lectureService.getAll()
    }).subscribe({
      next: (res) => {
        this.stats = {
          students: res.students.length,
          teachers: res.teachers.length,
          classes: res.classes.length,
          sections: res.sections.length,
          lectures: res.lectures.length
        };

        // Active vs Inactive Students
        const activeStudents = res.students.filter(s => s.status === 'Active').length;
        const inactiveStudents = this.stats.students - activeStudents;
        this.studentDetails = {
          active: activeStudents,
          inactive: inactiveStudents,
          activePercentage: this.stats.students > 0 ? Math.round((activeStudents / this.stats.students) * 100) : 0
        };

        // Calculate Enrollment Rate
        const enrolledIds = new Set<number>();
        res.sections.forEach(sec => {
          (sec.studentIds || []).forEach(id => enrolledIds.add(id));
        });
        const totalEnrolled = enrolledIds.size;
        this.enrollmentRate = this.stats.students > 0 ? Math.round((totalEnrolled / this.stats.students) * 100) : 0;

        // Get Latest 4 Students
        this.latestStudents = [...res.students]
          .sort((a, b) => new Date(b.creationDate ?? '').getTime() - new Date(a.creationDate ?? '').getTime())
          .slice(0, 4);

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
