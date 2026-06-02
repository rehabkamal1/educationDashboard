import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, take, map } from 'rxjs/operators';
import { Section } from '../models/educational.models';

@Injectable({
  providedIn: 'root'
})
export class SectionService {
  private apiUrl = 'http://localhost:3000/sections';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Section[]> {
    return this.http.get<Section[]>(this.apiUrl);
  }

  getById(id: number): Observable<Section> {
    return this.http.get<Section>(`${this.apiUrl}/${id}`);
  }

  create(section: Omit<Section, 'id' | 'studentIds'>): Observable<Section> {
    const newSection = {
      ...section,
      studentIds: []
    };
    return this.http.post<Section>(this.apiUrl, newSection);
  }

  update(id: number, section: Partial<Section>): Observable<Section> {
    return this.http.put<Section>(`${this.apiUrl}/${id}`, section);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  enrollStudent(sectionId: number, studentId: number | string): Observable<Section> {
    return this.getById(sectionId).pipe(
      take(1),
      switchMap(section => {
        const studentIds = section.studentIds || [];
        const already = studentIds.some(id => String(id) === String(studentId));
        if (!already) {
          studentIds.push(studentId as any);
        }
        return this.update(sectionId, { ...section, studentIds });
      })
    );
  }

  unenrollStudent(sectionId: number, studentId: number | string): Observable<Section> {
    return this.getById(sectionId).pipe(
      take(1),
      switchMap(section => {
        const studentIds = (section.studentIds || []).filter(id => String(id) !== String(studentId));
        return this.update(sectionId, { ...section, studentIds });
      })
    );
  }
}
