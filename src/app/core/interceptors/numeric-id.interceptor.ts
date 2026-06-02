import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

export const numericIdInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (event instanceof HttpResponse) {
        const body = event.body;
        if (body) {
          if (Array.isArray(body)) {
            event = event.clone({
              body: body.map(item => ensureNumericIds(item))
            });
          } else if (typeof body === 'object') {
            event = event.clone({
              body: ensureNumericIds(body)
            });
          }
        }
      }
      return event;
    })
  );
};

function ensureNumericIds(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj };

  const idFields = ['id', 'teacherId', 'classId', 'sectionId', 'studentId'];

  for (const field of idFields) {
    if (field in result && result[field] !== undefined && result[field] !== null) {
      const value = result[field];
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue > 0) {
        result[field] = numValue;
      }
    }
  }

  if (Array.isArray(result.studentIds)) {
    result.studentIds = result.studentIds.map((id: any) => {
      const numId = Number(id);
      return !isNaN(numId) && numId > 0 ? numId : id;
    });
  }

  return result;
}
