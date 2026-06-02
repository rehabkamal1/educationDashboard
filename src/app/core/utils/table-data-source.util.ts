import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

/** Connect paginator/sort after *ngIf renders the table. */
export function connectTableControls<T>(
  dataSource: MatTableDataSource<T>,
  paginator?: MatPaginator,
  sort?: MatSort
): void {
  setTimeout(() => {
    if (paginator) {
      dataSource.paginator = paginator;
    }
    if (sort) {
      dataSource.sort = sort;
    }
  });
}
