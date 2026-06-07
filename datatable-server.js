const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function str(value) {
  return value == null ? '' : String(value);
}

function includesIgnoreCase(haystack, needle) {
  if (!needle) {
    return true;
  }
  return str(haystack).toLowerCase().includes(needle.toLowerCase());
}

function getSearchValue(q) {
  if (q.search && typeof q.search === 'object') {
    return q.search.value ?? '';
  }
  return q['search[value]'] ?? '';
}

function getOrder(req, columnMap, defaultField = 'id') {
  let colIndex = 0;
  let dir = 'asc';
  const order = req.query.order;

  // Express/json-server parses order[0][column] as nested { order: [{ column, dir }] }
  if (Array.isArray(order) && order.length > 0) {
    colIndex = parseInt(order[0].column ?? '0', 10);
    dir = order[0].dir === 'desc' ? 'desc' : 'asc';
  } else if (order && typeof order === 'object') {
    const first = order['0'] ?? order[0];
    if (first) {
      colIndex = parseInt(first.column ?? '0', 10);
      dir = first.dir === 'desc' ? 'desc' : 'asc';
    }
  } else if (req.query['order[0][column]'] !== undefined) {
    colIndex = parseInt(req.query['order[0][column]'], 10);
    dir = req.query['order[0][dir]'] === 'desc' ? 'desc' : 'asc';
  }

  const field = columnMap[colIndex] ?? defaultField;
  return { field, dir };
}

function paginate(items, req) {
  const draw = parseInt(req.query.draw ?? '1', 10);
  const start = parseInt(req.query.start ?? '0', 10);
  const length = parseInt(req.query.length ?? '10', 10);
  const recordsTotal = items.length;
  const page = length === -1 ? items : items.slice(start, start + length);
  return { draw, recordsTotal, recordsFiltered: recordsTotal, data: page };
}

function sortItems(items, field, dir, valueGetter) {
  const getValue = valueGetter ?? ((item) => item[field]);
  return [...items].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    const aNum = Number(av);
    const bNum = Number(bv);
    let cmp;
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && str(av) !== '' && str(bv) !== '') {
      cmp = aNum - bNum;
    } else {
      cmp = str(av).localeCompare(str(bv), undefined, { sensitivity: 'base' });
    }
    return dir === 'desc' ? -cmp : cmp;
  });
}

function globalSearch(items, searchValue, fields) {
  const term = searchValue?.trim();
  if (!term) {
    return items;
  }
  return items.filter((item) =>
    fields.some((field) => includesIgnoreCase(item[field], term))
  );
}

function studentIdMatches(sectionStudentIds, studentId) {
  const sid = str(studentId);
  return (sectionStudentIds || [])
    .filter((id) => id != null)
    .some((id) => str(id) === sid);
}

function enrichStudent(student, sections, classes, lectures) {
  const sid = str(student.id);
  const studentSections = sections.filter((s) => studentIdMatches(s.studentIds, sid));
  const classIds = new Set(studentSections.map((s) => str(s.classId)));
  const classNames = classes.filter((c) => classIds.has(str(c.id))).map((c) => c.name);
  const sectionIds = new Set(studentSections.map((s) => str(s.id)));
  const lecturesCount = lectures.filter((l) => sectionIds.has(str(l.sectionId))).length;

  return {
    ...student,
    classNames,
    classNamesText: classNames.length ? classNames.join(', ') : 'None enrolled',
    sectionsCount: studentSections.length,
    lecturesCount,
  };
}

function handleStudentsDt(req, res) {
  const db = readDb();
  const q = req.query;
  let rows = db.students.map((s) => enrichStudent(s, db.sections, db.classes, db.lectures));

  if (q.idFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase('#' + r.id, q.idFilter) || includesIgnoreCase(r.id, q.idFilter));
  }
  if (q.nameFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.name, q.nameFilter));
  }
  if (q.emailFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.email, q.emailFilter));
  }
  if (q.phoneFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.phone, q.phoneFilter));
  }
  if (q.statusFilter?.trim()) {
    rows = rows.filter((r) => r.status === q.statusFilter);
  }
  if (q.classesFilter?.trim()) {
    rows = rows.filter((r) => r.classNames.some((name) => includesIgnoreCase(name, q.classesFilter)));
  }
  if (q.sectionsFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.sectionsCount, q.sectionsFilter));
  }
  if (q.lecturesFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.lecturesCount, q.lecturesFilter));
  }

  rows = globalSearch(rows, getSearchValue(q), ['name', 'email', 'phone', 'status', 'classNamesText']);

  const { field, dir } = getOrder(req, {
    0: 'id',
    1: 'name',
    2: 'email',
    3: 'status',
    4: 'classNamesText',
    5: 'sectionsCount',
    6: 'lecturesCount',
  });

  const sortGetter = {
    id: (r) => r.id,
    name: (r) => r.name,
    email: (r) => r.email,
    status: (r) => r.status,
    classNamesText: (r) => r.classNamesText,
    sectionsCount: (r) => r.sectionsCount,
    lecturesCount: (r) => r.lecturesCount,
  }[field];

  rows = sortItems(rows, field, dir, sortGetter);

  const draw = parseInt(q.draw ?? '1', 10);
  const start = parseInt(q.start ?? '0', 10);
  const length = parseInt(q.length ?? '10', 10);
  const recordsTotal = db.students.length;
  const recordsFiltered = rows.length;
  const data = length === -1 ? rows : rows.slice(start, start + length);

  const activeCount = db.students.filter((s) => s.status === 'Active').length;
  const inactiveCount = db.students.filter((s) => s.status === 'Inactive').length;

  res.jsonp({
    draw,
    recordsTotal,
    recordsFiltered,
    data,
    stats: { total: recordsTotal, active: activeCount, inactive: inactiveCount },
  });
}

function handleTeachersDt(req, res) {
  const db = readDb();
  const q = req.query;
  let rows = [...db.teachers];

  if (q.idFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase('#' + r.id, q.idFilter) || includesIgnoreCase(r.id, q.idFilter));
  }
  if (q.nameFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.name, q.nameFilter));
  }
  if (q.specializationFilter?.trim()) {
    rows = rows.filter((r) => r.specialization === q.specializationFilter);
  }
  if (q.emailFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.email, q.emailFilter));
  }
  if (q.phoneFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.phone, q.phoneFilter));
  }

  rows = globalSearch(rows, getSearchValue(q), ['name', 'specialization', 'email', 'phone']);

  const { field, dir } = getOrder(req, {
    0: 'id',
    1: 'name',
    2: 'specialization',
    3: 'email',
    4: 'phone',
  });

  rows = sortItems(rows, field, dir);

  const draw = parseInt(q.draw ?? '1', 10);
  const start = parseInt(q.start ?? '0', 10);
  const length = parseInt(q.length ?? '10', 10);
  const recordsTotal = db.teachers.length;
  const recordsFiltered = rows.length;
  const specializations = [...new Set(db.teachers.map((t) => t.specialization).filter(Boolean))].sort();

  res.jsonp({
    draw,
    recordsTotal,
    recordsFiltered,
    data: length === -1 ? rows : rows.slice(start, start + length),
    stats: { total: recordsTotal, specializations },
  });
}

function handleClassesDt(req, res) {
  const db = readDb();
  const q = req.query;
  const teacherMap = new Map(db.teachers.map((t) => [str(t.id), t]));

  let rows = db.classes.map((cls) => {
    const teacher = teacherMap.get(str(cls.teacherId));
    return {
      ...cls,
      teacherName: teacher?.name ?? 'Unassigned',
      teacherInitial: teacher?.name ? teacher.name.charAt(0).toUpperCase() : '?',
    };
  });

  if (q.idFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase('#' + r.id, q.idFilter) || includesIgnoreCase(r.id, q.idFilter));
  }
  if (q.nameFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.name, q.nameFilter));
  }
  if (q.instructorFilter?.trim()) {
    rows = rows.filter((r) => r.teacherName === q.instructorFilter);
  }

  rows = globalSearch(rows, getSearchValue(q), ['name', 'teacherName']);

  const { field, dir } = getOrder(req, {
    0: 'id',
    1: 'name',
    2: 'teacherName',
  });

  rows = sortItems(rows, field, dir, (r) => {
    if (field === 'teacherName') return r.teacherName;
    return r[field];
  });

  const draw = parseInt(q.draw ?? '1', 10);
  const start = parseInt(q.start ?? '0', 10);
  const length = parseInt(q.length ?? '10', 10);

  res.jsonp({
    draw,
    recordsTotal: db.classes.length,
    recordsFiltered: rows.length,
    data: length === -1 ? rows : rows.slice(start, start + length),
    stats: { total: db.classes.length, teachers: db.teachers.length },
  });
}

function handleSectionsDt(req, res) {
  const db = readDb();
  const q = req.query;
  const classMap = new Map(db.classes.map((c) => [str(c.id), c]));

  let rows = db.sections.map((section) => {
    const cls = classMap.get(str(section.classId));
    const enrolledCount = (section.studentIds || []).filter((id) => id != null).length;
    return {
      ...section,
      className: cls?.name ?? '—',
      enrolledCount,
    };
  });

  if (q.idFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase('#' + r.id, q.idFilter) || includesIgnoreCase(r.id, q.idFilter));
  }
  if (q.nameFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.name, q.nameFilter));
  }
  if (q.classNameFilter?.trim()) {
    rows = rows.filter((r) => r.className === q.classNameFilter);
  }
  if (q.enrolledFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.enrolledCount, q.enrolledFilter));
  }

  rows = globalSearch(rows, getSearchValue(q), ['name', 'className']);

  const { field, dir } = getOrder(req, {
    0: 'id',
    1: 'name',
    2: 'className',
    3: 'enrolledCount',
  });

  rows = sortItems(rows, field, dir, (r) => {
    if (field === 'className') return r.className;
    if (field === 'enrolledCount') return r.enrolledCount;
    return r[field];
  });

  const draw = parseInt(q.draw ?? '1', 10);
  const start = parseInt(q.start ?? '0', 10);
  const length = parseInt(q.length ?? '10', 10);
  const totalEnrolled = db.sections.reduce(
    (sum, s) => sum + (s.studentIds || []).filter((id) => id != null).length,
    0
  );

  res.jsonp({
    draw,
    recordsTotal: db.sections.length,
    recordsFiltered: rows.length,
    data: length === -1 ? rows : rows.slice(start, start + length),
    stats: { total: db.sections.length, totalEnrolled, classes: db.classes.length },
  });
}

function handleLecturesDt(req, res) {
  const db = readDb();
  const q = req.query;
  const sectionMap = new Map(db.sections.map((s) => [str(s.id), s]));

  let rows = db.lectures.map((lecture) => {
    const section = sectionMap.get(str(lecture.sectionId));
    return {
      ...lecture,
      sectionName: section?.name ?? '—',
    };
  });

  if (q.idFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase('#' + r.id, q.idFilter) || includesIgnoreCase(r.id, q.idFilter));
  }
  if (q.titleFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.title, q.titleFilter));
  }
  if (q.sectionFilter?.trim()) {
    rows = rows.filter((r) => r.sectionName === q.sectionFilter);
  }
  if (q.durationFilter?.trim()) {
    rows = rows.filter((r) => includesIgnoreCase(r.duration, q.durationFilter));
  }

  rows = globalSearch(rows, getSearchValue(q), ['title', 'sectionName', 'duration']);

  const { field, dir } = getOrder(req, {
    0: 'id',
    1: 'title',
    2: 'sectionName',
    3: 'duration',
  });

  rows = sortItems(rows, field, dir, (r) => {
    if (field === 'sectionName') return r.sectionName;
    return r[field];
  });

  const draw = parseInt(q.draw ?? '1', 10);
  const start = parseInt(q.start ?? '0', 10);
  const length = parseInt(q.length ?? '10', 10);

  res.jsonp({
    draw,
    recordsTotal: db.lectures.length,
    recordsFiltered: rows.length,
    data: length === -1 ? rows : rows.slice(start, start + length),
    stats: { total: db.lectures.length, sections: db.sections.length },
  });
}

const HANDLERS = {
  students: handleStudentsDt,
  teachers: handleTeachersDt,
  classes: handleClassesDt,
  sections: handleSectionsDt,
  lectures: handleLecturesDt,
};

function handleDataTableRequest(req, res) {
  const entity = req.path.replace(/^\/datatable\//, '').replace(/^\//, '');
  const handler = HANDLERS[entity];
  if (!handler) {
    res.status(404).jsonp({ error: 'Unknown datatable entity' });
    return;
  }
  handler(req, res);
}



module.exports = { handleDataTableRequest };
