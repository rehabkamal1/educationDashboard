import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Lecture } from '../models/educational.models';

@Injectable({
  providedIn: 'root'
})
export class LectureService {
  private apiUrl = 'http://localhost:3000/lectures';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Lecture[]> {
    return this.http.get<Lecture[]>(this.apiUrl);
  }

  getById(id: number): Observable<Lecture> {
    return this.http.get<Lecture>(`${this.apiUrl}/${id}`);
  }

  create(lecture: Omit<Lecture, 'id'>): Observable<Lecture> {
    return this.http.post<Lecture>(this.apiUrl, lecture);
  }

  update(id: number, lecture: Partial<Lecture>): Observable<Lecture> {
    return this.http.put<Lecture>(`${this.apiUrl}/${id}`, lecture);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
