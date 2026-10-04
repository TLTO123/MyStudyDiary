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