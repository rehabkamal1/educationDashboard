export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase() || '?';
}

function actionBtn(action: string, id: string | number, label: string, cssClass: string): string {
  return `<button type="button" class="action-btn ${cssClass}" data-dt-action="${action}" data-dt-id="${escapeHtml(String(id))}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${escapeHtml(label.charAt(0))}</button>`;
}

export function renderIdBadge(id: string | number): string {
  return `<span class="id-badge" data-export="#${escapeHtml(String(id))}">#${escapeHtml(String(id))}</span>`;
}

export function renderStudentRow(row: Record<string, unknown>, expandedId: string | null): string[] {
  const id = String(row['id'] ?? '');
  const name = String(row['name'] ?? '');
  const email = String(row['email'] ?? '');
  const phone = String(row['phone'] ?? '');
  const status = String(row['status'] ?? '');
  const classNames = (row['classNames'] as string[]) ?? [];
  const classNamesText = String(row['classNamesText'] ?? 'None enrolled');
  const sectionsCount = Number(row['sectionsCount'] ?? 0);
  const lecturesCount = Number(row['lecturesCount'] ?? 0);
  const isExpanded = expandedId === id;

  const classesHtml = classNames.length
    ? `<div class="chip-list" data-export="${escapeHtml(classNamesText)}">${classNames.map((n) => `<span class="class-chip">${escapeHtml(n)}</span>`).join('')}</div>`
    : `<span class="text-muted" data-export="None enrolled">None enrolled</span>`;

  return [
    renderIdBadge(id),
    `<div class="student-cell"><span class="row-avatar">${escapeHtml(getInitials(name))}</span><span class="font-semibold text-primary" data-export="${escapeHtml(name)}">${escapeHtml(name)}</span><span class="row-expand-icon${isExpanded ? ' is-open' : ''}">▾</span></div>`,
    `<div class="contact-stack" data-export="${escapeHtml(email)} | ${escapeHtml(phone)}"><span class="contact-line">✉ ${escapeHtml(email)}</span><span class="contact-line">☎ ${escapeHtml(phone)}</span></div>`,
    `<span class="status-badge ${escapeHtml(status.toLowerCase())}" data-export="${escapeHtml(status)}">${escapeHtml(status)}</span>`,
    classesHtml,
    `<span class="metric-pill" data-export="${sectionsCount}">▦ ${sectionsCount}</span>`,
    `<span class="metric-pill lectures" data-export="${lecturesCount}">▶ ${lecturesCount}</span>`,
    `<div class="action-buttons">${actionBtn('edit', id, 'Edit', 'edit')}${actionBtn('delete', id, 'Delete', 'delete')}</div>`,
  ];
}

export function renderTeacherRow(row: Record<string, unknown>): string[] {
  const id = String(row['id'] ?? '');
  const name = String(row['name'] ?? '');
  const specialization = String(row['specialization'] ?? '');
  const email = String(row['email'] ?? '');
  const phone = String(row['phone'] ?? '');

  return [
    renderIdBadge(id),
    `<div class="teacher-cell"><span class="row-avatar teacher">${escapeHtml(getInitials(name))}</span><span class="font-semibold text-primary" data-export="${escapeHtml(name)}">${escapeHtml(name)}</span></div>`,
    `<span class="specialization-chip" data-export="${escapeHtml(specialization)}">${escapeHtml(specialization)}</span>`,
    `<span class="contact-line"><span data-export="${escapeHtml(email)}">✉ ${escapeHtml(email)}</span></span>`,
    `<span class="contact-line"><span data-export="${escapeHtml(phone)}">☎ ${escapeHtml(phone)}</span></span>`,
    `<div class="action-buttons">${actionBtn('edit', id, 'Edit', 'edit')}${actionBtn('delete', id, 'Delete', 'delete')}</div>`,
  ];
}

export function renderClassRow(row: Record<string, unknown>): string[] {
  const id = String(row['id'] ?? '');
  const name = String(row['name'] ?? '');
  const teacherName = String(row['teacherName'] ?? 'Unassigned');
  const teacherInitial = String(row['teacherInitial'] ?? '?');
  const instructorHtml =
    teacherName !== 'Unassigned'
      ? `<div class="instructor-chip" data-export="${escapeHtml(teacherName)}"><span class="instructor-avatar">${escapeHtml(teacherInitial)}</span><span>${escapeHtml(teacherName)}</span></div>`
      : `<span class="text-muted" data-export="Unassigned">Unassigned</span>`;

  return [
    renderIdBadge(id),
    `<div class="class-cell"><span class="row-avatar class">${escapeHtml(name.charAt(0) || '?')}</span><span class="font-semibold text-primary" data-export="${escapeHtml(name)}">${escapeHtml(name)}</span></div>`,
    instructorHtml,
    `<div class="action-buttons">${actionBtn('edit', id, 'Edit', 'edit')}${actionBtn('delete', id, 'Delete', 'delete')}</div>`,
  ];
}

export function renderSectionRow(row: Record<string, unknown>): string[] {
  const id = String(row['id'] ?? '');
  const name = String(row['name'] ?? '');
  const className = String(row['className'] ?? '—');
  const enrolledCount = Number(row['enrolledCount'] ?? 0);

  return [
    renderIdBadge(id),
    `<div class="section-cell"><span class="row-avatar section">${escapeHtml(name.charAt(0) || '?')}</span><span class="font-semibold text-primary" data-export="${escapeHtml(name)}">${escapeHtml(name)}</span></div>`,
    `<span class="class-chip" data-export="${escapeHtml(className)}">📘 ${escapeHtml(className)}</span>`,
    `<span class="metric-pill" data-export="${enrolledCount}">👥 ${enrolledCount}</span>`,
    `<div class="action-buttons">${actionBtn('enroll', id, 'Enroll', 'enroll')}${actionBtn('edit', id, 'Edit', 'edit')}${actionBtn('delete', id, 'Delete', 'delete')}</div>`,
  ];
}

export function renderLectureRow(row: Record<string, unknown>): string[] {
  const id = String(row['id'] ?? '');
  const title = String(row['title'] ?? '');
  const sectionName = String(row['sectionName'] ?? '—');
  const duration = String(row['duration'] ?? '');

  return [
    renderIdBadge(id),
    `<div class="lecture-cell"><span class="row-avatar lecture">${escapeHtml(title.charAt(0) || '?')}</span><span class="font-semibold text-primary" data-export="${escapeHtml(title)}">${escapeHtml(title)}</span></div>`,
    `<span class="section-chip" data-export="${escapeHtml(sectionName)}">▦ ${escapeHtml(sectionName)}</span>`,
    `<span class="duration-pill" data-export="${escapeHtml(duration)}">⏱ ${escapeHtml(duration)}</span>`,
    `<div class="action-buttons">${actionBtn('edit', id, 'Edit', 'edit')}${actionBtn('delete', id, 'Delete', 'delete')}</div>`,
  ];
}
