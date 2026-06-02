import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Class } from '../models/educational.models';

@Injectable({
  providedIn: 'root'
})
export class ClassService {
  private apiUrl = 'http://localhost:3000/classes';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Class[]> {
    return this.http.get<Class[]>(this.apiUrl);
  }

  getById(id: number): Observable<Class> {
    return this.http.get<Class>(`${this.apiUrl}/${id}`);
  }

  create(classData: Omit<Class, 'id'>): Observable<Class> {
    return this.http.post<Class>(this.apiUrl, classData);
  }

  update(id: number, classData: Partial<Class>): Observable<Class> {
    return this.http.put<Class>(`${this.apiUrl}/${id}`, classData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
