export interface ColumnFilterSpec {
  columnIndex: number;
  value: string;
  smart?: boolean;
}

export interface DataTableStats {
  total?: number;
  active?: number;
  inactive?: number;
  specializations?: string[];
  teachers?: number;
  totalEnrolled?: number;
  classes?: number;
  sections?: number;
}

export interface ServerSideDataTableConfig {
  selector: string;
  ajaxUrl: string;
  exportToolbarSelector: string;
  metaToolbarSelector: string;
  columns: object[];
  pageLength?: number;
  order?: [number, 'asc' | 'desc'][];
  nonOrderableTargets?: number[];
  exportFileName: string;
  exportTitle: string;
  /** Attach custom HTTP variables on each ajax request (DataTables custom_vars pattern). */
  customVars?: () => Record<string, string>;
  onDraw?: () => void;
  onLoaded?: (meta: { recordsTotal: number; recordsFiltered: number; stats?: DataTableStats }) => void;
  /** Called with full server row objects before DataTables maps columns (keeps extra fields like creationDate). */
  onRowsReceived?: (rows: Record<string, unknown>[]) => void;
  rowCallback?: (row: HTMLElement, data: Record<string, unknown>) => void;
}

interface DataTableColumnApi {
  search(value?: string, regex?: boolean, smart?: boolean): DataTableColumnApi;
  clear(): { search(): DataTableColumnApi };
}

export interface DataTableApi {
  destroy(): void;
  column(index: number): DataTableColumnApi;
  search(value?: string): DataTableApi;
  draw(resetPaging?: boolean): void;
  row(node: HTMLElement): { data(): Record<string, unknown> };
}

interface DataTableButtonsInstance {
  container(): JQueryLike;
}

interface JQueryLike {
  length: number;
  empty(): JQueryLike;
  append(child: JQueryLike): JQueryLike;
  appendTo(target: string | JQueryLike): JQueryLike;
  find(selector: string): JQueryLike;
  closest(selector: string): JQueryLike;
  first(): JQueryLike;
}

declare const $: {
  (selector: string): JQueryLike & {
    DataTable(options?: object): DataTableApi;
  };
  fn: {
    DataTable: {
      isDataTable(el: unknown): boolean;
      Buttons?: new (dt: DataTableApi, config: object) => DataTableButtonsInstance;
    };
  };
};

const EXPORT_OPTIONS = {
  columns: ':visible:not(.col-actions):not(.col-expand)',
  format: {
    body: (_data: unknown, _row: number, _col: number, node: HTMLElement) => {
      const exportEl =
        node.querySelector<HTMLElement>('[data-export]') ??
        (node.hasAttribute('data-export') ? node : null);
      const attrValue = exportEl?.getAttribute('data-export')?.trim();
      if (attrValue) {
        return attrValue;
      }
      return exportEl?.textContent?.trim() ?? node.textContent?.trim() ?? '';
    },
  },
};

const EXPORT_BUTTONS = [
  {
    extend: 'collection',
    text: 'Export ▾',
    className: 'dt-export-collection',
    autoClose: true,
    buttons: [
      { extend: 'copy', text: 'Copy', exportOptions: EXPORT_OPTIONS },
      { extend: 'excel', text: 'Export Excel', exportOptions: EXPORT_OPTIONS },
      { extend: 'csv', text: 'Export CSV', exportOptions: EXPORT_OPTIONS },
      { extend: 'pdf', text: 'Export PDF', exportOptions: EXPORT_OPTIONS },
      { extend: 'print', text: 'Print Table', exportOptions: EXPORT_OPTIONS },
      { extend: 'colvis', text: 'Show / Hide Columns', columns: ':not(.col-actions):not(.col-expand)' },
    ],
  },
];

const DATATABLE_LANGUAGE = {
  processing: 'Loading...',
  search: 'Quick search:',
  searchPlaceholder: 'Search server data...',
  lengthMenu: 'Show _MENU_ entries',
  info: 'Showing _START_ to _END_ of _TOTAL_ entries',
  infoEmpty: 'No entries to show',
  infoFiltered: '(filtered from _MAX_ total entries)',
  zeroRecords: 'No matching records found',
  emptyTable: 'No data available',
  paginate: {
    first: 'First',
    last: 'Last',
    next: 'Next',
    previous: 'Previous',
  },
};

export function getTableApi(selector: string): DataTableApi | null {
  if (typeof $ === 'undefined' || !$.fn?.DataTable) {
    return null;
  }

  const el = $(selector);
  if (!el.length || !$.fn.DataTable.isDataTable(el)) {
    return null;
  }

  return el.DataTable();
}

function mountTableControls(config: ServerSideDataTableConfig, api: DataTableApi): void {
  const ButtonsCtor = $.fn.DataTable.Buttons;
  const exportSlot = $(config.exportToolbarSelector);
  const metaSlot = $(config.metaToolbarSelector);
  const tableEl = $(config.selector);
  const wrapper = tableEl.closest('.dataTables_wrapper');

  if (exportSlot.length) {
    exportSlot.empty();
    if (ButtonsCtor) {
      const buttons = new ButtonsCtor(api, {
        buttons: EXPORT_BUTTONS,
      });
      exportSlot.append(buttons.container());
    } else {
      const slot = document.querySelector(config.exportToolbarSelector);
      if (slot) {
        slot.innerHTML =
          '<span class="dt-empty-export">Export unavailable — restart the dev server (npm start)</span>';
      }
    }
  }

  if (metaSlot.length && wrapper.length) {
    metaSlot.empty();
    wrapper.find('.dataTables_length').appendTo(metaSlot);
    wrapper.find('.dataTables_filter').appendTo(metaSlot);
  }
}

export function destroyAdvancedDataTable(selector: string): void {
  if (typeof $ === 'undefined' || !$.fn?.DataTable) {
    return;
  }

  const el = $(selector);
  if (el.length && $.fn.DataTable.isDataTable(el)) {
    try {
      el.DataTable().destroy();
    } catch {
      // ignore teardown errors on detached tables
    }
  }
}

export function initServerSideDataTable(config: ServerSideDataTableConfig): DataTableApi | null {
  if (typeof $ === 'undefined' || !$.fn?.DataTable) {
    return null;
  }

  const el = $(config.selector);
  if (!el.length) {
    return null;
  }

  try {
    if ($.fn.DataTable.isDataTable(el)) {
      el.DataTable().destroy();
    }

    el.DataTable({
      processing: true,
      serverSide: true,
      ajax: {
        url: config.ajaxUrl,
        data: (d: Record<string, unknown>) => {
          if (config.customVars) {
            Object.assign(d, config.customVars());
          }
        },
        dataSrc: (json: {
          data: Record<string, unknown>[];
          recordsTotal: number;
          recordsFiltered: number;
          stats?: DataTableStats;
        }) => {
          config.onRowsReceived?.(json.data);
          config.onLoaded?.({
            recordsTotal: json.recordsTotal,
            recordsFiltered: json.recordsFiltered,
            stats: json.stats,
          });
          return json.data;
        },
      },
      columns: config.columns,
      pageLength: config.pageLength ?? 10,
      lengthMenu: [
        [10, 20, 50, 100, -1],
        [10, 20, 50, 100, 'All'],
      ],
      order: config.order ?? [[0, 'asc']],
      columnDefs: config.nonOrderableTargets?.length
        ? [{ orderable: false, targets: config.nonOrderableTargets }]
        : undefined,
      layout: {
        topStart: 'pageLength',
        topEnd: 'search',
        bottomStart: 'info',
        bottomEnd: 'paging',
      },
      language: DATATABLE_LANGUAGE,
      title: config.exportTitle,
      filename: config.exportFileName,
      rowCallback: config.rowCallback
        ? (row: HTMLElement, data: Record<string, unknown>) => {
            config.rowCallback?.(row, data);
          }
        : undefined,
      drawCallback: () => {
        config.onDraw?.();
      },
    });

    const api = el.DataTable();
    setTimeout(() => mountTableControls(config, api), 50);
    return api;
  } catch (err) {
    console.error('Server-side DataTable init failed:', err);
    return null;
  }
}

/** Redraw table — sends current customVars to the server (custom_vars pattern). */
export function redrawServerSideTable(selector: string, resetPaging = true): void {
  getTableApi(selector)?.draw(resetPaging);
}

/** @deprecated Use redrawServerSideTable with server-side tables. */
export function applyColumnFilters(_selector: string, _filters: ColumnFilterSpec[]): void {
  redrawServerSideTable(_selector, true);
}

/** @deprecated Use redrawServerSideTable after clearing filter model. */
export function clearColumnFilters(selector: string, _columnCount: number): void {
  redrawServerSideTable(selector, true);
}

/** Backward-compatible alias — routes to server-side init. */
export function initAdvancedDataTable(config: ServerSideDataTableConfig): DataTableApi | null {
  return initServerSideDataTable(config);
}
