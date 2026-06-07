# ملخص DataTables Server-Side — Educational Dashboard

## 1. إيه اللي اتعمل؟

اتحوّلت **كل جداول المشروع** (Students, Teachers, Classes, Sections, Lectures) من:

| قبل | بعد |
|-----|-----|
| تحميل **كل** البيانات مرة واحدة من API | كل صفحة بتجيب **صفحة واحدة** بس من السيرفر |
| Pagination / Sort / Search على المتصفح (client-side) | Pagination / Sort / Search على السيرفر (server-side) |
| الفلاتر المتقدمة بتفلتر في المتصفح | الفلاتر بتتبعت كـ **HTTP parameters** للسيرفر |

النمط المستخدم زي مثال DataTables الرسمي:
https://datatables.net/examples/server_side/custom_vars.html

---

## 2. إزاي بيشتغل؟ (Flow بسيط)

```
[المستخدم يغيّر فلتر أو يضغط Apply]
        ↓
[DataTables يعمل ajax request]
        ↓
[customVars() تضيف: idFilter, nameFilter, statusFilter...]
        ↓
[السيرفر: /datatable/students]
   → يفلتر → يرتب → يقسّم صفحات → يرجّع JSON
        ↓
[DataTables يعرض الصفوف + يحدّث "Showing X to Y of Z"]
```

### Response من السيرفر (شكل DataTables القياسي)

```json
{
  "draw": 1,
  "recordsTotal": 9,
  "recordsFiltered": 3,
  "data": [ ... ],
  "stats": { "total": 9, "active": 8, "inactive": 1 }
}
```

- `recordsTotal` = إجمالي السجلات في DB (بدون فلتر)
- `recordsFiltered` = عدد السجلات بعد الفلتر
- `data` = الصفوف اللي هتتعرض في الصفحة الحالية
- `stats` = إحصائيات إضافية للـ pills فوق الجدول

---

## 3. الملفات المهمة

### Backend (Node / json-server)

| الملف | الدور |
|-------|-------|
| `datatable-server.js` | منطق الفلترة + الترتيب + Pagination لكل entity |
| `middleware.js` | يوجّه `/datatable/*` للـ handler قبل json-server |
| `db.json` | قاعدة البيانات (mock API) |

**Endpoints:**
- `GET /datatable/students`
- `GET /datatable/teachers`
- `GET /datatable/classes`
- `GET /datatable/sections`
- `GET /datatable/lectures`

### Frontend (Angular)

| الملف | الدور |
|-------|-------|
| `src/app/core/utils/datatable-advanced.util.ts` | تهيئة DataTables: `serverSide`, `ajax`, `customVars`, export |
| `src/app/core/utils/datatable-cell-render.util.ts` | تحويل JSON لـ HTML في كل خلية (badges, chips, أزرار) |
| `src/app/pages/*/**.component.ts` | كل صفحة: فلاتر + `initServerSideDataTable` + event listeners |
| `src/app/pages/*/**.component.html` | `<table>` فاضية + panel الفلاتر (بدون `*ngFor` على الصفوف) |

---

## 4. الحاجات (Technologies) اللي اتستخدمت

### Frontend
- **Angular 17** — Standalone Components, lazy loading
- **DataTables.net 2.x** — `serverSide: true`, `processing: true`
- **jQuery 4** — DataTables بيحتاج jQuery
- **DataTables Buttons** — Export (Excel, CSV, PDF, Print, Copy)
- **RxJS** — `forkJoin` لتحميل metadata (classes, sections...) للـ dialogs
- **Angular Material** — Dialogs, buttons, tooltips
- **Lucide Angular** — أيقونات الواجهة (فوق الجدول، مش داخل صفوف Ajax)

### Backend
- **json-server** — Mock REST API
- **Custom middleware** — معالجة server-side processing
- **Node.js (fs)** — قراءة `db.json`

---

## 5. Functions / Concepts ممكن يطلب منك تشرحها أو تعملها

### A) على الـ Frontend

#### `initServerSideDataTable(config)`
تهيّئ الجدول بـ:
```typescript
processing: true,
serverSide: true,
ajax: {
  url: 'http://localhost:3000/datatable/students',
  data: (d) => Object.assign(d, customVars())
}
```

#### `customVars()`
**أهم function** — بتضيف parameters زيادة على كل request:
```typescript
customVars: () => ({
  idFilter: this.filters.id,
  nameFilter: this.filters.name,
  statusFilter: this.filters.status,
})
```

#### `applyTableFilters()` / `resetTableFilters()`
- Apply → `redrawServerSideTable('#studentsTable', true)` → `table.draw()`
- Reset → تصفير الـ filters + `draw()` تاني

#### `buildColumns()`
تعريف أعمدة DataTables + `render` function لكل عمود:
```typescript
{ data: 'name', render: (_d, _t, row) => renderStudentRow(row, expandedId)[1] }
```

#### `rowCallback(row, data)`
بعد ما الصف يترسم — نضيف classes و `data-student-id` للـ click events

#### `onLoaded(meta)`
بعد كل ajax response — نحدّث `recordsTotal`, `activeCount`, إلخ

#### Event delegation (click على Edit/Delete)
لأن الصفوف مش Angular template — بنستخدم:
```html
<button data-dt-action="edit" data-dt-id="3">
```
و listener على `.table-wrapper`

---

### B) على الـ Backend (`datatable-server.js`)

#### `handleStudentsDt(req, res)` (ونفس الفكرة لباقي الـ entities)
1. اقرأ DB
2. **Enrich** — زود حقول محسوبة (مثلاً: `classNames`, `sectionsCount`)
3. **Filter** — على `customVars` + global search
4. **Sort** — حسب `order[0][column]` و `order[0][dir]`
5. **Paginate** — `slice(start, start + length)`
6. **Respond** — JSON بالشكل القياسي

#### Functions مساعدة ممكن يطلب منك تعملها:

| Function | الغرض |
|----------|-------|
| `includesIgnoreCase(haystack, needle)` | بحث case-insensitive |
| `getOrder(req, columnMap)` | تحويل رقم العمود لاسم field |
| `sortItems(items, field, dir)` | ترتيب asc/desc |
| `globalSearch(items, term, fields)` | بحث DataTables العام (Quick search) |
| `enrichStudent(student, sections, classes, lectures)` | حساب classes/sections/lectures لكل طالب |
| `studentIdMatches(sectionStudentIds, studentId)` | مطابقة IDs (string vs number) |

---

## 6. أسئلة / Tasks محتملة في Interview أو Task

### سهل
- [ ] "زوّد فلتر جديد Status على Teachers"
  → HTML input + `customVars` + handler في `datatable-server.js`

- [ ] "غيّر page size الافتراضي لـ 20"
  → `pageLength: 20` في `initServerSideDataTable`

- [ ] "لما المستخدم يضغط Enter في الفلتر، طبّق الفلتر"
  → `(keyup.enter)="applyTableFilters()"` (موجود)

### متوسط
- [ ] "اعمل debounce على الفلتر — يطبّق تلقائي بعد 500ms"
  → `Subject` + `debounceTime(500)` → `redrawServerSideTable()`

- [ ] "اعمل endpoint `/datatable/students/stats` منفصل"
  → service جديد + استدعاء في `ngOnInit`

- [ ] "Quick search يرسل للسيرفر مش client"
  → السيرفر already بيقرأ `search[value]` — تأكد إن DataTables serverSide بيبعتها (default)

- [ ] "اعمل export يصدّر كل النتائج المفلترة مش الصفحة الحالية بس"
  → endpoint يرجع كل `recordsFiltered` أو استخدام DataTables Buttons server-side export

### صعب
- [ ] "Expandable row في server-side (Students)"
  → `expandedElement` + `renderStudentRow` + `renderInlineDetailRow` في `onDraw`

- [ ] "اعمل caching للصفحات (pipelining)"
  → DataTables pipelining example

- [ ] "استبدل json-server بـ Express حقيقي"
  → انقل `datatable-server.js` لـ Express routes

- [ ] "اعمل POST بدل GET للـ ajax (بيانات كتير)"
  → `ajax: { type: 'POST', ... }` + `bodyParser` في middleware

---

## 7. Parameters اللي DataTables بيبعتها (لازم تعرفها)

| Parameter | معناه |
|-----------|-------|
| `draw` | رقم الطلب (للتزامن) |
| `start` | index أول صف |
| `length` | عدد الصفوف في الصفحة |
| `search[value]` | Quick search |
| `order[0][column]` | رقم العمود للترتيب |
| `order[0][dir]` | `asc` أو `desc` |
| `columns[i][data]` | اسم الحقل |

**+ Custom vars (إضافتنا):**
`idFilter`, `nameFilter`, `emailFilter`, `statusFilter`, `classesFilter`, ...

---

## 8. تشغيل المشروع

```bash
# Terminal 1 — لازم middleware
npm run api

# Terminal 2
npm start
```

> لو شغّلت json-server بدون middleware، `/datatable/*` مش هتشتغل.

---

## 9. الفرق بين Client-Side و Server-Side (للمقابلة)

| | Client-Side | Server-Side |
|---|-------------|-------------|
| البيانات | كلها في DOM | صفحة واحدة بس |
| الأداء | بطيء مع آلاف الصفوف | سريع — DB يفلتر |
| الفلاتر | JavaScript على array | SQL / server logic |
| Angular | `*ngFor` + MatTableDataSource | `<tbody></tbody>` فاضي + DataTables ajax |
| Custom filters | `column().search()` | `ajax.data` function |

---

## 10. نقاط تتكلم بيها لو اتسألت "إيه اللي عملتيه؟"

1. حوّلت الجداول لـ **server-side processing** حسب protocol DataTables الرسمي.
2. الفلاتر المتقدمة بتتبعت كـ **custom HTTP variables** (`customVars`) — نفس pattern `custom_vars.html`.
3. عملت **middleware + datatable-server.js** يفلتر ويرتب ويقسّم من `db.json`.
4. فصلت **render logic** في `datatable-cell-render.util.ts` عشان HTML الصفوف يطلع consistent.
5. استخدمت **event delegation** للأزرار لأن الصفوف dynamic مش Angular template.
6. Students فيها **expandable row** + enriched data (classes, sections, lectures counts) من السيرفر.

---

*آخر تحديث: يونيو 2026*
