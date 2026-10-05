const STORAGE_KEY = 'study-diary-sessions';

const dateInput = document.getElementById('date');
const topicInput = document.getElementById('topic');
const minutesInput = document.getElementById('minutes');
const form = document.getElementById('session-form');
const sessionsList = document.getElementById('sessions-list');
const emptyMessage = document.getElementById('empty-message');
const streakNumber = document.getElementById('streak-number');
const bestStreakNumber = document.getElementById('best-streak-number');
const weekMinutesNumber = document.getElementById('week-minutes-number');
const monthDaysNumber = document.getElementById('month-days-number');

// Heatmap DOM elements
const heatmapGrid = document.getElementById('heatmap-grid');
const heatmapContainer = document.getElementById('heatmap-container');
const heatmapEmpty = document.getElementById('heatmap-empty');
const heatmapEmptyBtn = document.getElementById('heatmap-empty-btn');
const heatmapRange = document.getElementById('heatmap-range');
const dayModal = document.getElementById('day-modal');
const dayModalDate = document.getElementById('day-modal-date');
const dayModalTotal = document.getElementById('day-modal-total');
const dayModalSessions = document.getElementById('day-modal-sessions');
const dayModalEmpty = document.getElementById('day-modal-empty');
const dayModalClose = document.querySelector('.modal-close');
const modalBackdrop = document.querySelector('.modal-backdrop');

function getTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function loadSessions() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function getUniqueDates(sessions) {
  const dates = new Set();
  sessions.forEach(s => dates.add(s.date));
  return Array.from(dates).sort().reverse();
}

function getUniqueDatesAsc(sessions) {
  const dates = new Set();
  sessions.forEach(s => dates.add(s.date));
  return Array.from(dates).sort();
}

function calculateStreak(sessions) {
  const today = getTodayLocal();
  const todayStr = formatDateForInput(today);

  const uniqueDates = getUniqueDates(sessions);

  if (uniqueDates.length === 0) return 0;

  let streak = 0;
  let currentDate = today;

  const hasToday = uniqueDates.includes(todayStr);

  if (!hasToday) {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateForInput(yesterday);
    if (!uniqueDates.includes(yesterdayStr)) {
      return 0;
    }
    currentDate = yesterday;
  }

  while (true) {
    const currentStr = formatDateForInput(currentDate);
    if (uniqueDates.includes(currentStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function calculateBestStreak(sessions) {
  const uniqueDates = getUniqueDatesAsc(sessions);

  if (uniqueDates.length === 0) return 0;

  const today = getTodayLocal();
  const todayStr = formatDateForInput(today);

  let best = 0;
  let current = 0;
  let prevDate = null;

  uniqueDates.forEach(dateStr => {
    if (dateStr > todayStr) return;

    const currentDate = new Date(...dateStr.split('-').map((n, i) => i === 1 ? n - 1 : n));

    if (prevDate === null) {
      current = 1;
    } else {
      const diffDays = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current++;
      } else {
        current = 1;
      }
    }

    if (current > best) best = current;
    prevDate = currentDate;
  });

  return best;
}

function calculateWeekMinutes(sessions) {
  const today = getTodayLocal();
  const todayStr = formatDateForInput(today);

  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(monday.getDate() + mondayOffset);
  const mondayStr = formatDateForInput(monday);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sundayStr = formatDateForInput(sunday);

  let total = 0;
  sessions.forEach(session => {
    if (session.date >= mondayStr && session.date <= sundayStr && session.date <= todayStr) {
      total += session.minutes;
    }
  });

  return total;
}

function calculateDaysThisMonth(sessions) {
  const today = getTodayLocal();
  const todayStr = formatDateForInput(today);

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayStr = formatDateForInput(firstDay);

  const uniqueDates = getUniqueDatesAsc(sessions);

  let count = 0;
  uniqueDates.forEach(dateStr => {
    if (dateStr >= firstDayStr && dateStr <= todayStr) {
      count++;
    }
  });

  return count;
}

// ============================================
// FUNCIONES PURAS: MAPA DE CALOR (Heat Map)
// ============================================

const HEATMAP_STORAGE_KEY = 'heatmap-semanas';
const HEATMAP_VALID_VALUES = [4, 12, 26, 52];
const HEATMAP_DEFAULT = 12;

// RF-3: Determina nivel de intensidad 0-4 según minutos
function obtenerNivelIntensidad(minutos) {
  if (minutos === 0) return 0;
  if (minutos <= 15) return 1;
  if (minutos <= 45) return 2;
  if (minutos <= 90) return 3;
  return 4;
}

// RF-4: Calcula el lunes de la semana de una fecha dada (fecha local)
function obtenerLunesDeSemana(fecha) {
  const copia = new Date(fecha);
  const diaSemana = copia.getDay(); // 0=Dom, 1=Lun... 6=Sáb
  const offset = diaSemana === 0 ? -6 : 1 - diaSemana; // si domingo, -6; si lunes, 0; si martes, -1...
  copia.setDate(copia.getDate() + offset);
  return copia;
}

// RF-1, RF-4: Calcula semanas entre dos fechas (ambas lunes)
function calcularSemanasEntre(desde, hasta) {
  const diffMs = hasta - desde;
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDias / 7);
}

// RF-1, RF-4: Obtiene la fecha de la primera sesión registrada
function obtenerPrimeraSesion(sessions) {
  if (sessions.length === 0) return null;
  const fechas = sessions.map(s => s.date).sort();
  const primeraStr = fechas[0];
  const [año, mes, dia] = primeraStr.split('-').map(Number);
  return new Date(año, mes - 1, dia);
}

// RF-5: Obtiene sesiones de un día específico, ordenadas cronológicamente
function obtenerSesionesDelDia(sessions, fechaStr) {
  return sessions
    .filter(s => s.date === fechaStr)
    .map(s => ({ topic: s.topic, minutes: s.minutes }));
}

// RF-2: Carga preferencia de semanas desde localStorage
function cargarPreferenciaSemanas() {
  try {
    const valor = localStorage.getItem(HEATMAP_STORAGE_KEY);
    if (valor === null) return HEATMAP_DEFAULT;
    const num = parseInt(valor, 10);
    return HEATMAP_VALID_VALUES.includes(num) ? num : HEATMAP_DEFAULT;
  } catch {
    return HEATMAP_DEFAULT;
  }
}

// RF-2: Guarda preferencia de semanas en localStorage
function guardarPreferenciaSemanas(semanas) {
  if (!HEATMAP_VALID_VALUES.includes(semanas)) return;
  try {
    localStorage.setItem(HEATMAP_STORAGE_KEY, String(semanas));
  } catch {
    // Silencioso: localStorage puede fallar en modo privado
  }
}

// RF-1, RF-3, RF-4: Calcula datos completos del mapa de calor
// today: Date local (inyectable para tests), sessions: array, maxSemanas: 4|12|26|52
function calcularDatosMapaCalor(sessions, today, maxSemanas) {
  if (sessions.length === 0) {
    return { semanas: [], primeraSesionSemana: null, semanaActual: null };
  }

  const primeraSesion = obtenerPrimeraSesion(sessions);
  const primeraSesionSemana = obtenerLunesDeSemana(primeraSesion);
  const semanaActual = obtenerLunesDeSemana(today);

  const semanasDisponibles = calcularSemanasEntre(primeraSesionSemana, semanaActual) + 1;
  const semanasARenderizar = Math.min(maxSemanas, semanasDisponibles);

  const semanas = [];

  for (let i = 0; i < semanasARenderizar; i++) {
    const lunesSemana = new Date(semanaActual);
    lunesSemana.setDate(lunesSemana.getDate() - i * 7);

    const días = [];
    for (let diaOffset = 0; diaOffset < 7; diaOffset++) {
      const fechaDia = new Date(lunesSemana);
      fechaDia.setDate(fechaDia.getDate() + diaOffset);

      const fechaStr = formatDateForInput(fechaDia);
      const esFuturo = fechaDia > today;
      const semanaDia = obtenerLunesDeSemana(fechaDia);
      const esAntesPrimera = semanaDia < primeraSesionSemana;

      let minutosDia = 0;
      if (!esFuturo && !esAntesPrimera) {
        sessions.forEach(s => {
          if (s.date === fechaStr) minutosDia += s.minutes;
        });
      }

      const nivel = esFuturo ? 'futuro' : (esAntesPrimera ? 'oculto' : obtenerNivelIntensidad(minutosDia));

      let sesionesDia = [];
      if (!esFuturo && !esAntesPrimera && minutosDia > 0) {
        sesionesDia = obtenerSesionesDelDia(sessions, fechaStr);
      }

      días.push({
        fecha: fechaDia,
        fechaStr,
        minutos: minutosDia,
        nivel,
        sesiones: sesionesDia
      });
    }

    semanas.push({ lunes: lunesSemana, días });
  }

  return { semanas, primeraSesionSemana, semanaActual };
}

// ============================================
// RENDERIZADO DOM: MAPA DE CALOR
// ============================================

let lastFocusedElement = null;

// RF-2: Renderiza el radio group con la preferencia guardada
function renderHeatMapRange() {
  const preferencia = cargarPreferenciaSemanas();
  const radios = heatmapRange.querySelectorAll('input[name="heatmap-semanas"]');
  radios.forEach(radio => {
    radio.checked = parseInt(radio.value, 10) === preferencia;
  });
}

// RF-1, RF-3, RF-4: Renderiza el mapa de calor completo
function renderHeatMap() {
  const sessions = loadSessions();
  const maxSemanas = cargarPreferenciaSemanas();
  const today = getTodayLocal();
  const data = calcularDatosMapaCalor(sessions, today, maxSemanas);

  if (data.semanas.length === 0) {
    heatmapGrid.innerHTML = '';
    heatmapContainer.classList.add('hidden');
    heatmapEmpty.classList.remove('hidden');
    return;
  }

  heatmapContainer.classList.remove('hidden');
  heatmapEmpty.classList.add('hidden');
  heatmapGrid.innerHTML = '';

  // Generar celdas: 7 filas × N columnas
  // El grid CSS usa grid-auto-flow: column, así que añadimos en orden: col0-fila0, col0-fila1... col0-fila6, col1-fila0...
  data.semanas.forEach((semana, colIndex) => {
    semana.días.forEach((dia, rowIndex) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.dataset.fecha = dia.fechaStr;
      cell.dataset.minutos = dia.minutos;
      cell.dataset.nivel = dia.nivel;

      if (dia.nivel === 'futuro') {
        cell.classList.add('heatmap-cell--future');
      } else if (dia.nivel === 'oculto') {
        // No debería renderizarse, pero por seguridad
        cell.style.display = 'none';
      } else {
        cell.classList.add(`heatmap-cell--${dia.nivel}`);
      }

      // Accesibilidad: solo celdas con minutos > 0
      if (dia.minutos > 0) {
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('tabindex', '0');
        const fechaFormateada = formatDateForDisplay(dia.fechaStr);
        const nivelTexto = typeof dia.nivel === 'number' ? dia.nivel : '0';
        cell.setAttribute('aria-label', `${fechaFormateada}, ${dia.minutos} minutos, intensidad nivel ${nivelTexto} de 4`);
      }

      heatmapGrid.appendChild(cell);
    });
  });

  // Reset scroll al cambiar rango
  heatmapContainer.scrollLeft = 0;
}

// RF-5: Abre modal con detalle del día
function openDayModal(fechaStr, minutos, sesiones) {
  lastFocusedElement = document.activeElement;

  const fechaFormateada = formatDateForDisplay(fechaStr);
  const diaSemana = new Date(...fechaStr.split('-').map((n, i) => i === 1 ? n - 1 : n))
    .toLocaleDateString('es-ES', { weekday: 'long' });
  const fechaCompleta = `${diaSemana}, ${fechaFormateada}`;

  dayModalDate.textContent = fechaCompleta;
  dayModalTotal.textContent = `${minutos} min`;

  if (sesiones.length > 0) {
    dayModalSessions.innerHTML = '';
    sesiones.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(s.topic)}</span><span>${s.minutes} min</span>`;
      dayModalSessions.appendChild(li);
    });
    dayModalSessions.classList.remove('hidden');
    dayModalEmpty.classList.add('hidden');
  } else {
    dayModalSessions.classList.add('hidden');
    dayModalEmpty.classList.remove('hidden');
  }

  dayModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Focus trap: enfocar botón cerrar
  setTimeout(() => dayModalClose.focus(), 0);
}

// RF-5: Cierra modal y restaura foco
function closeDayModal() {
  dayModal.classList.add('hidden');
  document.body.style.overflow = '';
  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

// RF-5: Delegación de click en el grid
function setupHeatMapClick() {
  heatmapGrid.addEventListener('click', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (!cell) return;

    const minutos = parseInt(cell.dataset.minutos, 10);
    if (minutos === 0) return; // RF-5.2: no abre modal si 0 min

    const fechaStr = cell.dataset.fecha;
    const sesiones = JSON.parse(cell.dataset.sesiones || '[]');
    // Re-obtener sesiones completas para el modal
    const sessions = loadSessions();
    const sesionesDia = obtenerSesionesDelDia(sessions, fechaStr);
    openDayModal(fechaStr, minutos, sesionesDia);
  });

  // Teclado: Enter/Espacio en celda con tabindex
  heatmapGrid.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('heatmap-cell')) {
      e.preventDefault();
      e.target.click();
    }
  });
}

// RF-5: Cerrar modal con backdrop, Escape, botón
function setupModalClose() {
  dayModalClose.addEventListener('click', closeDayModal);
  modalBackdrop.addEventListener('click', closeDayModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dayModal.classList.contains('hidden')) {
      closeDayModal();
    }
  });
}

// RF-2: Selector de rango - listener change
function setupHeatMapRange() {
  heatmapRange.addEventListener('change', (e) => {
    if (e.target.name === 'heatmap-semanas') {
      const semanas = parseInt(e.target.value, 10);
      guardarPreferenciaSemanas(semanas);
      renderHeatMap();
    }
  });
}

// RF-1.3: Botón estado vacío -> enfoca formulario
function setupHeatmapEmptyBtn() {
  heatmapEmptyBtn.addEventListener('click', () => {
    topicInput.focus();
    topicInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// Focus trap para modal
function setupFocusTrap() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !dayModal.classList.contains('hidden')) {
      const focusableElements = dayModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

function renderSessions(sessions) {
  sessionsList.innerHTML = '';

  if (sessions.length === 0) {
    emptyMessage.classList.remove('hidden');
    return;
  }

  emptyMessage.classList.add('hidden');

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  sorted.forEach(session => {
    const li = document.createElement('li');
    li.className = 'session-item';
    li.innerHTML = `
      <div class="session-info">
        <div class="session-date">${formatDateForDisplay(session.date)}</div>
        <div class="session-topic">${escapeHtml(session.topic)}</div>
      </div>
      <span class="session-minutes">${session.minutes} min</span>
    `;
    sessionsList.appendChild(li);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateStreakDisplay(sessions) {
  const streak = calculateStreak(sessions);
  const bestStreak = calculateBestStreak(sessions);
  const weekMinutes = calculateWeekMinutes(sessions);
  const monthDays = calculateDaysThisMonth(sessions);
  streakNumber.textContent = streak;
  bestStreakNumber.textContent = bestStreak;
  weekMinutesNumber.textContent = weekMinutes;
  monthDaysNumber.textContent = monthDays;
}

function refreshUI() {
  const sessions = loadSessions();
  renderSessions(sessions);
  updateStreakDisplay(sessions);
  renderHeatMapRange();
  renderHeatMap();
}

function validateForm() {
  const date = dateInput.value;
  const topic = topicInput.value.trim();
  const minutes = parseInt(minutesInput.value, 10);

  if (!date) return 'Selecciona una fecha';
  if (!topic) return 'Escribe un tema';
  if (!minutes || minutes < 1) return 'Los minutos deben ser mayor que 0';

  return null;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const error = validateForm();
  if (error) {
    alert(error);
    return;
  }

  const sessions = loadSessions();
  const newSession = {
    id: Date.now().toString(),
    date: dateInput.value,
    topic: topicInput.value.trim(),
    minutes: parseInt(minutesInput.value, 10)
  };

  sessions.push(newSession);
  saveSessions(sessions);

  topicInput.value = '';
  minutesInput.value = '';
  dateInput.value = formatDateForInput(getTodayLocal());

  refreshUI();
});

dateInput.value = formatDateForInput(getTodayLocal());

refreshUI();

// Heatmap initialization
setupHeatMapClick();
setupModalClose();
setupHeatMapRange();
setupHeatmapEmptyBtn();
setupFocusTrap();