import { escapeHtml } from './datatable-cell-render.util';

export function renderExpandBtn(id: string | number, expandedId: string | null): string {
  const sid = String(id);
  const isOpen = expandedId === sid;
  return `<button type="button" class="row-expand-btn${isOpen ? ' is-open' : ''}" data-dt-expand="${escapeHtml(sid)}" aria-label="${isOpen ? 'Collapse details' : 'Expand details'}">${isOpen ? '−' : '+'}</button>`;
}

export function buildExpandColumn(getExpandedId: () => string | null): object {
  return {
    data: null,
    orderable: false,
    className: 'col-expand',
    render: (_d: unknown, _t: string, row: Record<string, unknown>) =>
      renderExpandBtn(String(row['id'] ?? ''), getExpandedId()),
  };
}

function compareSubTableValues(a: string, b: string): number {
  const aNum = Number(a.replace(/[^0-9.-]/g, ''));
  const bNum = Number(b.replace(/[^0-9.-]/g, ''));
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && a !== '' && b !== '') {
    return aNum - bNum;
  }
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

function sortSubTable(table: HTMLTableElement, colIndex: number, th: HTMLElement): void {
  const tbody = table.tBodies[0];
  if (!tbody) {
    return;
  }

  const currentCol = table.dataset['sortCol'];
  const currentDir = table.dataset['sortDir'] ?? 'asc';
  const dir: 'asc' | 'desc' = currentCol === String(colIndex) && currentDir === 'asc' ? 'desc' : 'asc';

  table.dataset['sortCol'] = String(colIndex);
  table.dataset['sortDir'] = dir;

  table.querySelectorAll('thead th.sortable-th').forEach((header) => {
    header.classList.remove('sort-asc', 'sort-desc');
  });
  th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');

  const rows = Array.from(tbody.rows);
  rows.sort((rowA, rowB) => {
    const a = rowA.cells[colIndex]?.textContent?.trim() ?? '';
    const b = rowB.cells[colIndex]?.textContent?.trim() ?? '';
    const cmp = compareSubTableValues(a, b);
    return dir === 'asc' ? cmp : -cmp;
  });
  rows.forEach((row) => tbody.appendChild(row));
}

export function initSortableSubTables(root: ParentNode): void {
  root.querySelectorAll<HTMLTableElement>('table.detail-subtable.sortable-subtable').forEach((table) => {
    table.querySelectorAll<HTMLElement>('thead th.sortable-th').forEach((th) => {
      const colIndex = Number(th.dataset['col'] ?? '0');
      const onSort = () => sortSubTable(table, colIndex, th);
      th.addEventListener('click', onSort);
      th.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSort();
        }
      });
    });
  });
}

export function buildSubTable(headers: string[], rows: string[][]): string {
  if (!rows.length) {
    return '<p class="detail-empty">No related records found.</p>';
  }
  const head = headers
    .map((h, i) => {
      if (h === 'Actions') {
        return `<th class="col-actions">${escapeHtml(h)}</th>`;
      }
      return `<th class="sortable-th" data-col="${i}" role="button" tabindex="0" aria-sort="none">${escapeHtml(h)}<span class="sort-indicator" aria-hidden="true"></span></th>`;
    })
    .join('');
  const body = rows.map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<div class="detail-subtable-wrap"><table class="detail-subtable sortable-subtable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** Navy section bar + nested table — matches the reference expandable-row layout. */
export function buildDetailSection(label: string, tableHtml: string): string {
  return `
    <div class="detail-section">
      <div class="detail-section-bar">${escapeHtml(label)}</div>
      <div class="detail-section-body">${tableHtml}</div>
    </div>
  `;
}

export function buildDetailRowHtml(colspan: number, content: string): string {
  return `
    <td colspan="${colspan}">
      <div class="row-detail-panel inline">
        ${content}
      </div>
    </td>
  `;
}

export function syncExpandedHighlight(
  tableSelector: string,
  expandedId: string | null,
  rowIdAttr: string
): void {
  document.querySelectorAll(`${tableSelector} tbody tr.data-row`).forEach((row) => {
    row.classList.remove('is-expanded');
  });
  if (expandedId) {
    document
      .querySelector(`${tableSelector} tbody tr.data-row[${rowIdAttr}="${expandedId}"]`)
      ?.classList.add('is-expanded');
  }
}

export function removeDetailRows(tableSelector: string, detailRowClass = 'row-detail-row'): void {
  document.querySelectorAll(`${tableSelector} tbody tr.${detailRowClass}`).forEach((row) => row.remove());
}

export function insertDetailRow(
  tableSelector: string,
  expandedId: string,
  rowIdAttr: string,
  html: string,
  detailRowClass = 'row-detail-row'
): void {
  removeDetailRows(tableSelector, detailRowClass);
  const activeRow = document.querySelector(
    `${tableSelector} tbody tr.data-row[${rowIdAttr}="${expandedId}"]`
  ) as HTMLElement | null;
  if (!activeRow || activeRow.style.display === 'none') {
    return;
  }
  const detailRow = document.createElement('tr');
  detailRow.className = detailRowClass;
  detailRow.innerHTML = html;
  activeRow.insertAdjacentElement('afterend', detailRow);
  initSortableSubTables(detailRow);
}

export function handleExpandClick(
  event: Event,
  expandedId: string | null,
  onToggle: (id: string) => void
): boolean {
  const expandBtn = (event.target as HTMLElement).closest('[data-dt-expand]') as HTMLElement | null;
  if (!expandBtn) {
    return false;
  }
  event.stopPropagation();
  const id = expandBtn.getAttribute('data-dt-expand') ?? '';
  if (!id) {
    return true;
  }
  onToggle(id);
  return true;
}
