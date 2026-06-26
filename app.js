const pageConfig = window.PAGE_CONFIG ?? {};
const backendUrl = pageConfig.backendUrl || window.KKN_BACKEND_URL || '';

const startDate = new Date(pageConfig.startDate ?? '2026-06-20T00:00:00');
const endDate = new Date(pageConfig.endDate ?? '2026-08-08T00:00:00');
const weekThemes = [
  'Persiapan',
  'Koordinasi',
  'Pelaksanaan',
  'Monitoring',
  'Evaluasi',
  'Finalisasi',
  'Penutupan',
];
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const hourSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

const navList = document.getElementById('page-nav');
const calendarList = document.getElementById('calendar-list');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const pageSummary = document.getElementById('page-summary');
const entryForm = document.getElementById('entry-form');
const formStatus = document.getElementById('form-status');
const primaryHoursEl = document.getElementById('primary-hours');
const supportHoursEl = document.getElementById('support-hours');
const memberEntryList = document.getElementById('entry-list');
const sharedHourLabels = Array.from({ length: 24 }, (_, hour) => {
  const start = String(hour).padStart(2, '0');
  const end = String(hour).padStart(2, '0');
  return `${start}:00-${end}:59`;
});
const storageKey = `kkn-proker-${pageConfig.personId ?? 'shared'}`;
const sharedStorageKey = 'kkn-proker-shared';
let editingEntryId = null;

function createEntryId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEntry(entry) {
  let date = entry.date ?? '';
  if (date.includes('T')) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      date = `${year}-${month}-${dateNum}`;
    }
  }

  let startTime = entry.startTime ?? '';
  if (startTime.includes('T')) {
    const d = new Date(startTime);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      startTime = `${hours}:${minutes}`;
    }
  }

  let endTime = entry.endTime ?? '';
  if (endTime.includes('T')) {
    const d = new Date(endTime);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      endTime = `${hours}:${minutes}`;
    }
  }

  if (startTime && startTime.length > 5 && startTime.includes(':')) {
    startTime = startTime.substring(0, 5);
  }
  if (endTime && endTime.length > 5 && endTime.includes(':')) {
    endTime = endTime.substring(0, 5);
  }

  return {
    id: entry.id ?? createEntryId(),
    personId: entry.personId ?? pageConfig.personId ?? pageConfig.memberName ?? 'unknown',
    memberName: entry.memberName ?? pageConfig.memberName ?? pageConfig.title ?? 'Anggota',
    date,
    startTime,
    endTime,
    category: entry.category ?? 'pokok',
    activity: entry.activity ?? '',
    notes: entry.notes ?? '',
    hours: Number(entry.hours ?? 0),
    completed: entry.completed === true || entry.completed === 'true' || entry.completed === 'TRUE',
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
}

function normalizeEntries(entries) {
  return Array.isArray(entries) ? entries.map(normalizeEntry) : [];
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildWeeks() {
  const weeks = [];
  let cursor = new Date(startDate);
  let weekIndex = 0;

  while (cursor <= endDate) {
    const weekStart = new Date(cursor);
    const weekEnd = addDays(weekStart, 6) > endDate ? new Date(endDate) : addDays(weekStart, 6);
    const days = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const currentDate = addDays(weekStart, offset);
      if (currentDate > endDate) {
        break;
      }

      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dateNum = String(currentDate.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${dateNum}`;

      days.push({
        name: dayNames[currentDate.getDay()],
        date: formatDate(currentDate),
        isoDate,
      });
    }

    weeks.push({
      label: `Minggu ${weekIndex + 1}`,
      range: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
      theme: weekThemes[weekIndex % weekThemes.length],
      days,
    });

    cursor = addDays(weekStart, 7);
    weekIndex += 1;
  }

  return weeks;
}

function renderNavigation() {
  if (!navList) {
    return;
  }

  const links = pageConfig.navLinks ?? [];
  navList.innerHTML = links
    .map((link) => `<a href="${link.href}">${link.label}</a>`)
    .join('');
}

function resolveBackendUrl() {
  return backendUrl.trim();
}

function getLocalEntries() {
  try {
    const raw = localStorage.getItem(storageKey);
    return normalizeEntries(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function setLocalEntries(entries) {
  localStorage.setItem(storageKey, JSON.stringify(normalizeEntries(entries)));
}

function getSharedEntries() {
  try {
    const raw = localStorage.getItem(sharedStorageKey);
    return normalizeEntries(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function setSharedEntries(entries) {
  localStorage.setItem(sharedStorageKey, JSON.stringify(normalizeEntries(entries)));
}

async function fetchSharedEntriesFromBackend() {
  const url = resolveBackendUrl();
  if (!url) {
    return [];
  }

  const busterUrl = url.includes('?') 
    ? `${url}&_ts=${Date.now()}` 
    : `${url}?_ts=${Date.now()}`;

  const response = await fetch(busterUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error('Backend tidak dapat dibaca');
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function syncSharedStore() {
  try {
    const remoteEntries = await fetchSharedEntriesFromBackend();
    if (remoteEntries.length > 0) {
      const normalized = normalizeEntries(remoteEntries);
      setSharedEntries(normalized);
      return normalized;
    }
  } catch {
    // Fallback ke penyimpanan lokal jika backend belum tersedia.
  }

  return getSharedEntries();
}

function hoursBetween(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return Math.max(0, (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60);
}

function updateHourTotals() {
  const entries = getLocalEntries();
  updateHourTotalsFromEntries(entries);
}

function updateHourTotalsFromEntries(entries) {
  const totals = entries.reduce(
    (accumulator, entry) => {
      const duration = Number(entry.hours ?? 0);
      if (entry.category === 'pokok') {
        accumulator.pokok += duration;
      } else {
        accumulator.bantu += duration;
      }
      return accumulator;
    },
    { pokok: 0, bantu: 0 },
  );

  if (primaryHoursEl) {
    primaryHoursEl.textContent = totals.pokok.toFixed(1).replace(/\.0$/, '');
  }

  if (supportHoursEl) {
    supportHoursEl.textContent = totals.bantu.toFixed(1).replace(/\.0$/, '');
  }
}

function mergeSharedEntries() {
  const localEntries = getLocalEntries();
  const sharedEntries = getSharedEntries();
  const combined = [...sharedEntries];

  localEntries.forEach((entry) => {
    const existingIndex = combined.findIndex(
      (candidate) => candidate.id === entry.id
    );

    if (existingIndex >= 0) {
      combined[existingIndex] = entry;
    } else {
      combined.push(entry);
    }
  });

  setSharedEntries(combined);
  return combined;
}

function upsertLocalEntry(entry) {
  const entries = getLocalEntries();
  const entryIndex = entries.findIndex((candidate) => candidate.id === entry.id);
  if (entryIndex >= 0) {
    entries[entryIndex] = normalizeEntry(entry);
  } else {
    entries.push(normalizeEntry(entry));
  }
  setLocalEntries(entries);
  mergeSharedEntries();
}

function deleteLocalEntry(entryId) {
  const entries = getLocalEntries().filter((entry) => entry.id !== entryId);
  setLocalEntries(entries);
  const shared = getSharedEntries().filter((entry) => entry.id !== entryId);
  setSharedEntries(shared);
}

async function collectEntriesForMember() {
  try {
    const sharedEntries = await syncSharedStore();
    const currentPersonId = pageConfig.personId ?? pageConfig.memberName ?? 'unknown';
    const filteredSharedEntries = sharedEntries.filter((entry) => entry.personId === currentPersonId);
    if (filteredSharedEntries.length > 0) {
      return filteredSharedEntries;
    }
  } catch {
    // fallback ke local entries
  }

  return getLocalEntries();
}

function createEntryListContainer() {
  return null;
}

function fillFormFromEntry(entry) {
  if (!entryForm) {
    return;
  }

  entryForm.elements.date.value = entry.date ?? '';
  entryForm.elements.startTime.value = entry.startTime ?? '';
  entryForm.elements.endTime.value = entry.endTime ?? '';
  entryForm.elements.category.value = entry.category ?? 'pokok';
  entryForm.elements.activity.value = entry.activity ?? '';
  entryForm.elements.notes.value = entry.notes ?? '';
  editingEntryId = entry.id;

  const submitButton = entryForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Update Timeline';
  }

  if (formStatus) {
    formStatus.textContent = 'Mode edit aktif. Ubah data lalu tekan Update Timeline.';
  }
}

function renderMemberEntryList(entries, container) {
  // No-op: Removed as edit/delete is now managed per hour-item in the calendar.
}

async function submitEntryToBackend(entry, action = 'create') {
  const url = resolveBackendUrl();
  if (!url) {
    return { ok: true, source: 'local' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, entry }),
  });

  if (!response.ok) {
    throw new Error('Backend tidak merespons dengan benar');
  }

  return { ok: true, source: 'backend' };
}

function renderEntryForm() {
  if (!entryForm) {
    return;
  }

  const submitButton = entryForm.querySelector('button[type="submit"]');
  const entryListContainer = memberEntryList ?? createEntryListContainer();

  // Dynamic replacement of time inputs to hourly select elements
  const startTimeInput = entryForm.querySelector('input[name="startTime"]');
  const endTimeInput = entryForm.querySelector('input[name="endTime"]');

  if (startTimeInput && endTimeInput) {
    const startSelect = document.createElement('select');
    startSelect.name = 'startTime';
    startSelect.required = true;

    const endSelect = document.createElement('select');
    endSelect.name = 'endTime';
    endSelect.required = true;

    const startHours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');
    const endHours = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0') + ':00');

    startSelect.innerHTML = startHours.map(h => `<option value="${h}">${h}</option>`).join('');
    endSelect.innerHTML = endHours.map(h => `<option value="${h}">${h}</option>`).join('');

    startTimeInput.replaceWith(startSelect);
    endTimeInput.replaceWith(endSelect);
  }

  function resetFormMode() {
    editingEntryId = null;
    if (submitButton) {
      submitButton.textContent = 'Simpan ke Timeline Bersama';
    }
    if (formStatus) {
      formStatus.textContent = 'Data akan dikirim ke backend bersama jika URL Apps Script sudah diisi.';
    }
    entryForm.reset();
  }

  async function loadMemberView() {
    const entries = await collectEntriesForMember();
    updateHourTotalsFromEntries(entries);
    renderMemberEntryList(entries, entryListContainer);
    renderCalendar(entries);
    if (entries.length === 0 && formStatus) {
      formStatus.textContent = 'Belum ada data tersimpan. Isi form di bawah untuk menambah timeline.';
    }
  }

  entryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(entryForm);
    const date = String(formData.get('date') ?? '');
    const startTime = String(formData.get('startTime') ?? '');
    const endTime = String(formData.get('endTime') ?? '');
    const category = String(formData.get('category') ?? 'pokok');
    const activity = String(formData.get('activity') ?? '').trim();
    const notes = String(formData.get('notes') ?? '').trim();
    const hours = hoursBetween(startTime, endTime);

    if (hours <= 0) {
      alert('Jam selesai harus setelah jam mulai!');
      return;
    }

    const entryId = editingEntryId ?? createEntryId();
    const isUpdate = Boolean(editingEntryId);

    let completed = false;
    if (isUpdate) {
      const existing = getLocalEntries().find((e) => e.id === entryId);
      if (existing) {
        completed = existing.completed === true;
      }
    }

    const entry = {
      id: entryId,
      personId: pageConfig.personId ?? pageConfig.memberName ?? 'unknown',
      memberName: pageConfig.memberName ?? pageConfig.title ?? 'Anggota',
      date,
      startTime,
      endTime,
      category,
      activity,
      notes,
      hours,
      completed,
      timestamp: new Date().toISOString(),
    };

    try {
      await submitEntryToBackend(entry, isUpdate ? 'update' : 'create');
      upsertLocalEntry(entry);
      await syncSharedStore();
      await loadMemberView();
      resetFormMode();
      if (formStatus) {
        formStatus.textContent = isUpdate ? 'Data berhasil diperbarui.' : 'Data tersimpan dan sudah digabung ke timeline bersama.';
      }
    } catch (error) {
      if (formStatus) {
        formStatus.textContent = `Gagal menyimpan: ${error.message}`;
      }
    }
  });

  renderMemberEntryList([], entryListContainer);
  loadMemberView();
}

function hourToGridColumn(hour) {
  return hour + 1;
}

function loadSharedEntriesForTimeline() {
  const entries = getSharedEntries();
  const fallbackEntries = pageConfig.sharedSchedule
    ? pageConfig.sharedSchedule.flatMap((schedule) =>
        schedule.blocks.map((block) => ({
          personId: schedule.member.toLowerCase(),
          memberName: schedule.member,
          date: pageConfig.sharedDate ?? '2026-06-29',
          startTime: `${String(block.start).padStart(2, '0')}:00`,
          endTime: `${String(block.end).padStart(2, '0')}:00`,
          category: 'pokok',
          activity: block.label,
          notes: '',
          hours: block.end - block.start,
        })),
      )
    : [];

  return entries.length ? entries : fallbackEntries;
}

async function loadSharedEntriesForTimelineAsync() {
  try {
    const remoteEntries = await syncSharedStore();
    return remoteEntries.length ? remoteEntries : loadSharedEntriesForTimeline();
  } catch {
    return loadSharedEntriesForTimeline();
  }
}

async function renderSharedTimeline() {
  if (!calendarList) {
    return;
  }

  const members = pageConfig.sharedMembers ?? [];
  const entries = await loadSharedEntriesForTimelineAsync();
  const weeks = buildWeeks();

  // Render filter container and selected week container
  calendarList.innerHTML = `
    <div class="shared-filter-container">
      <label for="week-filter" class="filter-label">Pilih Minggu:</label>
      <select id="week-filter" class="week-filter-select">
        ${weeks
          .map(
            (week, index) => `
              <option value="${index}">Minggu ${index + 1} (${week.range})</option>
            `,
          )
          .join('')}
      </select>
    </div>
    <div id="shared-weeks-container"></div>
  `;

  function renderSelectedWeek(weekIndex) {
    const selectedWeek = weeks[weekIndex];
    const container = document.getElementById('shared-weeks-container');
    if (!container) {
      return;
    }

    container.innerHTML = selectedWeek.days
      .map((day) => {
        // Filter entries for this specific day
        const dayEntries = entries.filter((entry) => entry.date === day.isoDate);

        const rowHtml = members
          .map((member) => {
            const rowBlocks = dayEntries.filter((entry) => entry.memberName === member);

            return `
              <div class="shared-row">
                <div class="shared-name">${member}</div>
                <div class="shared-track">
                  ${rowBlocks
                    .map((block) => {
                      const startHour = Number(block.startTime.split(':')[0]);
                      const endHour = Number(block.endTime.split(':')[0]);
                      const startColumn = hourToGridColumn(startHour);
                      const endColumn = hourToGridColumn(endHour);
                      return `
                        <span class="shared-block ${block.completed ? 'is-completed' : ''}" style="grid-column: ${startColumn} / ${endColumn};" title="${block.startTime} - ${block.endTime}${block.notes ? `\nCatatan: ${block.notes}` : ''}">
                          <strong>${block.completed ? '✓ ' : ''}${block.activity}</strong>
                          <small>${block.category === 'pokok' ? 'Proker Pokok' : 'Proker Bantu'}</small>
                        </span>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            `;
          })
          .join('');

        const hourHeader = sharedHourLabels
          .map((label) => `<div class="shared-hour">${label}</div>`)
          .join('');

        return `
          <article class="shared-board" style="margin-bottom: 32px;">
            <div class="shared-board-head">
              <div>
                <p class="week-label">${day.name}</p>
                <h3 class="shared-title">${day.date}</h3>
              </div>
              <p class="shared-legend">${selectedWeek.label} - Tema: ${selectedWeek.theme}</p>
            </div>

            <div class="shared-scroll">
              <div class="shared-header">
                <div class="shared-name shared-name-head">Nama Anggota</div>
                <div class="shared-hour-track">${hourHeader}</div>
              </div>
              ${rowHtml}
            </div>
          </article>
        `;
      })
      .join('');
  }

  const weekFilter = document.getElementById('week-filter');
  if (weekFilter) {
    weekFilter.addEventListener('change', (e) => {
      renderSelectedWeek(Number(e.target.value));
    });
  }

  // Render the first week by default
  renderSelectedWeek(0);
}

function renderHeader() {
  if (pageTitle) {
    pageTitle.textContent = pageConfig.title ?? 'Kalender Proker KKN';
  }

  if (pageSubtitle) {
    pageSubtitle.textContent = pageConfig.subtitle ?? 'Kalender tanggalan mingguan dari 20 Juni sampai 8 Agustus.';
  }

  if (pageSummary) {
    pageSummary.textContent = pageConfig.summary ?? 'Tampilan ini hanya berisi kalender, jadi lebih ringan dan tidak membingungkan saat dibuka di Google Sites.';
  }
}

function initializeMemberPage() {
  renderEntryForm();
  mergeSharedEntries();
  collectEntriesForMember().then((entries) => {
    updateHourTotalsFromEntries(entries);
    renderCalendar(entries);
    if (entries.length === 0 && formStatus) {
      formStatus.textContent = 'Belum ada data tersimpan. Isi form di bawah untuk menambah timeline.';
    }
  });
}

function renderCalendar(entries = []) {
  if (!calendarList) {
    return;
  }

  function timeToMinutes(timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
  }

  function getSlotRangeString(slotStr) {
    const [hour, minute] = slotStr.split(':').map(Number);
    const endHour = String(hour + 1).padStart(2, '0') + ':00';
    return `${slotStr}-${endHour}`;
  }

  function entryOverlapsSlot(entry, slotStr) {
    const entryStart = timeToMinutes(entry.startTime);
    const entryEnd = timeToMinutes(entry.endTime);
    const slotHour = Number(slotStr.split(':')[0]);
    const slotStart = slotHour * 60;
    const slotEnd = (slotHour + 1) * 60;
    return entryStart < slotEnd && entryEnd > slotStart;
  }

  const weeks = buildWeeks();
  calendarList.innerHTML = weeks
    .map(
      (week) => `
        <article class="week-card">
          <div class="week-header">
            <div>
              <p class="week-label">${week.label}</p>
              <h3 class="week-title">${week.range}</h3>
            </div>
            <p class="week-focus">${week.theme}</p>
          </div>
          <div class="day-grid">
            ${week.days
              .map(
                (day) => {
                  const dayEntries = entries.filter((entry) => entry.date === day.isoDate);

                  return `
                    <section class="day-card">
                      <div class="day-head">
                        <div>
                          <strong class="day-name">${day.name}</strong>
                          <p class="day-date">${day.date}</p>
                        </div>
                      </div>
                      <div class="hour-list">
                        ${hourSlots
                          .map((slot) => {
                            const matchingEntries = dayEntries.filter((entry) => entryOverlapsSlot(entry, slot));

                            if (matchingEntries.length > 0) {
                              return `
                                <div class="hour-item has-entry">
                                  <span class="hour-time">${getSlotRangeString(slot)}</span>
                                  <div class="hour-entry-list">
                                    ${matchingEntries
                                      .map(
                                        (entry) => `
                                          <div class="hour-entry-card ${entry.completed ? 'is-completed' : ''}" data-category="${entry.category}">
                                            <div class="hour-entry-main">
                                              <label class="hour-completed-wrapper" title="Tandai selesai">
                                                <input type="checkbox" class="hour-completed-checkbox" data-action="calendar-complete" data-id="${entry.id}" ${entry.completed ? 'checked' : ''} />
                                                <span class="hour-completed-checkmark"></span>
                                              </label>
                                              <strong class="hour-entry-activity">${entry.activity}</strong>
                                              <span class="hour-entry-badge ${entry.category === 'pokok' ? 'is-primary' : 'is-support'}">
                                                ${entry.category === 'pokok' ? 'Pokok' : 'Bantu'}
                                              </span>
                                            </div>
                                            ${entry.notes ? `<p class="hour-entry-notes">${entry.notes}</p>` : ''}
                                            <div class="hour-entry-meta">
                                              <span class="hour-entry-time">${entry.startTime} - ${entry.endTime}</span>
                                              <div class="hour-entry-actions">
                                                <button type="button" class="btn-text edit" data-action="calendar-edit" data-id="${entry.id}">Edit</button>
                                                <button type="button" class="btn-text delete" data-action="calendar-delete" data-id="${entry.id}">Hapus</button>
                                              </div>
                                            </div>
                                          </div>
                                        `,
                                      )
                                      .join('')}
                                  </div>
                                </div>
                              `;
                            }

                            return `
                              <div class="hour-item">
                                <span class="hour-time">${getSlotRangeString(slot)}</span>
                                <span class="hour-empty">Slot kalender</span>
                              </div>
                            `;
                          })
                          .join('')}
                      </div>
                    </section>
                  `;
                },
              )
              .join('')}
          </div>
        </article>
      `,
    )
    .join('');

  calendarList.querySelectorAll('input[data-action="calendar-complete"]').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const entryId = checkbox.dataset.id;
      const entry = entries.find((item) => item.id === entryId);
      if (!entry) {
        return;
      }

      entry.completed = checkbox.checked;

      const card = checkbox.closest('.hour-entry-card');
      if (card) {
        card.classList.toggle('is-completed', entry.completed);
      }

      try {
        upsertLocalEntry(entry);
        await submitEntryToBackend(entry, 'update');
        await syncSharedStore();

        const refreshedEntries = await collectEntriesForMember();
        updateHourTotalsFromEntries(refreshedEntries);
        renderCalendar(refreshedEntries);
      } catch (error) {
        if (formStatus) {
          formStatus.textContent = `Gagal mengubah status selesai: ${error.message}`;
        }
        checkbox.checked = !checkbox.checked;
        if (card) {
          card.classList.toggle('is-completed', checkbox.checked);
        }
      }
    });
  });

  calendarList.querySelectorAll('button[data-action="calendar-edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const entry = entries.find((item) => item.id === button.dataset.id);
      if (entry) {
        fillFormFromEntry(entry);
        entryForm?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  calendarList.querySelectorAll('button[data-action="calendar-delete"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const entryId = button.dataset.id;
      const entry = entries.find((item) => item.id === entryId);
      if (!entry) {
        return;
      }

      const confirmed = window.confirm(`Hapus data ${entry.activity}?`);
      if (!confirmed) {
        return;
      }

      try {
        await submitEntryToBackend(entry, 'delete');
        deleteLocalEntry(entryId);
        await syncSharedStore();
        const refreshedEntries = await collectEntriesForMember();
        updateHourTotalsFromEntries(refreshedEntries);
        const entryListContainer = memberEntryList ?? document.getElementById('entry-list');
        if (entryListContainer) {
          renderMemberEntryList(refreshedEntries, entryListContainer);
        }
        renderCalendar(refreshedEntries);
        if (editingEntryId === entryId) {
          editingEntryId = null;
          entryForm?.reset();
        }
        if (formStatus) {
          formStatus.textContent = 'Data berhasil dihapus.';
        }
      } catch (error) {
        if (formStatus) {
          formStatus.textContent = `Gagal menghapus: ${error.message}`;
        }
      }
    });
  });
}

renderNavigation();
renderHeader();
if (pageConfig.mode === 'shared') {
  renderSharedTimeline();
} else {
  renderCalendar();
  initializeMemberPage();
}
