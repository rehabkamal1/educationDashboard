export interface ColumnFilterSpec {
  columnIndex: number;
  value: string;
  /** Use smart search (space-separated terms must all match). */
  smart?: boolean;
}

export interface AdvancedDataTableConfig {
  selector: string;
  exportToolbarSelector: string;
  metaToolbarSelector: string;
  pageLength?: number;
  order?: [number, 'asc' | 'desc'][];
  nonOrderableTargets?: number[];
  exportFileName: string;
  exportTitle: string;
  hasData: boolean;
  onDraw?: () => void;
}

interface DataTableColumnApi {
  search(value?: string, regex?: boolean, smart?: boolean): DataTableColumnApi;
  clear(): { search(): DataTableColumnApi };
}

interface DataTableApi {
  destroy(): void;
  column(index: number): DataTableColumnApi;
  search(value?: string): DataTableApi;
  draw(): void;
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
  columns: ':visible:not(.col-actions)',
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
      { extend: 'colvis', text: 'Show / Hide Columns', columns: ':not(.col-actions)' },
    ],
  },
];

const DATATABLE_LANGUAGE = {
  search: 'Quick search:',
  searchPlaceholder: 'Search visible rows...',
  lengthMenu: 'Show _MENU_ entries',
  info: 'Showing _START_ to _END_ of _TOTAL_ entries',
  infoEmpty: 'No entries to show',
  infoFiltered: '(filtered from _MAX_ total entries)',
  zeroRecords: 'No matching records found',
  paginate: {
    first: 'First',
    last: 'Last',
    next: 'Next',
    previous: 'Previous',
  },
};

function getTableApi(selector: string): DataTableApi | null {
  if (typeof $ === 'undefined' || !$.fn?.DataTable) {
    return null;
  }

  const el = $(selector);
  if (!el.length || !$.fn.DataTable.isDataTable(el)) {
    return null;
  }

  return el.DataTable();
}

function mountTableControls(config: AdvancedDataTableConfig, api: DataTableApi): void {
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

export function initAdvancedDataTable(config: AdvancedDataTableConfig): void {
  if (!config.hasData) {
    return;
  }

  if (typeof $ === 'undefined' || !$.fn?.DataTable) {
    return;
  }

  const el = $(config.selector);
  if (!el.length) {
    return;
  }

  try {
    if ($.fn.DataTable.isDataTable(el)) {
      el.DataTable().destroy();
    }

    el.DataTable({
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
      drawCallback: () => {
        config.onDraw?.();
      },
    });

    const api = el.DataTable();
    setTimeout(() => mountTableControls(config, api), 50);
  } catch (err) {
    console.error('DataTable init failed:', err);
  }
}

export function applyColumnFilters(selector: string, filters: ColumnFilterSpec[]): void {
  const table = getTableApi(selector);
  if (!table) {
    return;
  }

  filters.forEach(({ columnIndex, value, smart }) => {
    table.column(columnIndex).search(value.trim(), false, smart ?? false);
  });
  table.draw();
}

export function clearColumnFilters(selector: string, columnCount: number): void {
  const table = getTableApi(selector);
  if (!table) {
    return;
  }

  for (let i = 0; i < columnCount; i++) {
    table.column(i).search('');
  }
  table.search('');
  table.draw();
}
