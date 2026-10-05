// Tests unitarios para funciones puras del mapa de calor
// Ejecutar: node --test specs/001-heat-map/heatmap.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert';

// ============================================
// IMPLEMENTACIONES PURAS (copiadas de app.js para test en Node)
// ============================================

const HEATMAP_STORAGE_KEY = 'heatmap-semanas';
const HEATMAP_VALID_VALUES = [4, 12, 26, 52];
const HEATMAP_DEFAULT = 12;

// Mock simple de localStorage para tests
const mockLocalStorage = new Map();
global.localStorage = {
  getItem: (key) => mockLocalStorage.get(key) ?? null,
  setItem: (key, value) => mockLocalStorage.set(key, String(value)),
  removeItem: (key) => mockLocalStorage.delete(key),
  clear: () => mockLocalStorage.clear(),
};

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
  const offset = diaSemana === 0 ? -6 : 1 - diaSemana;
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
    // Silencioso
  }
}

// Helper: formatear fecha como AAAA-MM-DD (copia de app.js)
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// RF-1, RF-3, RF-4: Calcula datos completos del mapa de calor
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
      const esAntesPrimera = fechaDia < primeraSesion;

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
// TESTS
// ============================================

// Helper para crear Date local sin zona horaria
function fechaLocal(año, mes, dia) {
  return new Date(año, mes - 1, dia);
}

const FIXED_TODAY = fechaLocal(2026, 10, 4); // 4 oct 2026 (domingo)

describe('obtenerNivelIntensidad (RF-3)', () => {
  it('0 min → nivel 0', () => {
    assert.strictEqual(obtenerNivelIntensidad(0), 0);
  });
  it('1 min → nivel 1', () => {
    assert.strictEqual(obtenerNivelIntensidad(1), 1);
  });
  it('15 min → nivel 1 (límite sup incl.)', () => {
    assert.strictEqual(obtenerNivelIntensidad(15), 1);
  });
  it('16 min → nivel 2', () => {
    assert.strictEqual(obtenerNivelIntensidad(16), 2);
  });
  it('45 min → nivel 2 (límite sup incl.)', () => {
    assert.strictEqual(obtenerNivelIntensidad(45), 2);
  });
  it('46 min → nivel 3', () => {
    assert.strictEqual(obtenerNivelIntensidad(46), 3);
  });
  it('90 min → nivel 3 (límite sup incl.)', () => {
    assert.strictEqual(obtenerNivelIntensidad(90), 3);
  });
  it('91 min → nivel 4', () => {
    assert.strictEqual(obtenerNivelIntensidad(91), 4);
  });
  it('200 min → nivel 4', () => {
    assert.strictEqual(obtenerNivelIntensidad(200), 4);
  });
});

describe('obtenerLunesDeSemana (RF-4)', () => {
  it('domingo 4 oct 2026 → lunes 28 sep 2026', () => {
    const d = fechaLocal(2026, 10, 4);
    const lunes = obtenerLunesDeSemana(d);
    assert.strictEqual(lunes.toISOString().split('T')[0], '2026-09-28');
  });
  it('lunes 28 sep 2026 → mismo lunes', () => {
    const d = fechaLocal(2026, 9, 28);
    assert.strictEqual(obtenerLunesDeSemana(d).toISOString().split('T')[0], '2026-09-28');
  });
  it('miércoles 30 sep 2026 → lunes 28 sep', () => {
    const d = fechaLocal(2026, 9, 30);
    assert.strictEqual(obtenerLunesDeSemana(d).toISOString().split('T')[0], '2026-09-28');
  });
});

describe('calcularSemanasEntre (RF-1, RF-4)', () => {
  it('mismo lunes → 0', () => {
    const d = fechaLocal(2026, 9, 28);
    assert.strictEqual(calcularSemanasEntre(d, d), 0);
  });
  it('una semana diferencia → 1', () => {
    const d1 = fechaLocal(2026, 9, 28);
    const d2 = fechaLocal(2026, 10, 5); // 5 oct = lunes siguiente
    assert.strictEqual(calcularSemanasEntre(d1, d2), 1);
  });
  it('dos semanas diferencia → 2', () => {
    const d1 = fechaLocal(2026, 9, 28);
    const d2 = fechaLocal(2026, 10, 12); // 12 oct
    assert.strictEqual(calcularSemanasEntre(d1, d2), 2);
  });
});

describe('obtenerPrimeraSesion (RF-1, RF-4)', () => {
  it('array vacío → null', () => {
    assert.strictEqual(obtenerPrimeraSesion([]), null);
  });
  it('una sesión → su fecha', () => {
    const sessions = [{ date: '2026-10-04', topic: 'JS', minutes: 60 }];
    assert.strictEqual(obtenerPrimeraSesion(sessions).toISOString().split('T')[0], '2026-10-04');
  });
  it('múltiples sesiones → la más antigua', () => {
    const sessions = [
      { date: '2026-10-04', topic: 'JS', minutes: 60 },
      { date: '2026-09-28', topic: 'TS', minutes: 30 },
      { date: '2026-10-02', topic: 'React', minutes: 45 },
    ];
    assert.strictEqual(obtenerPrimeraSesion(sessions).toISOString().split('T')[0], '2026-09-28');
  });
});

describe('obtenerSesionesDelDia (RF-5)', () => {
  const sessions = [
    { date: '2026-10-04', topic: 'A', minutes: 30 },
    { date: '2026-10-04', topic: 'B', minutes: 20 },
    { date: '2026-10-03', topic: 'C', minutes: 10 },
    { date: '2026-10-04', topic: 'D', minutes: 15 },
  ];
  it('filtra por fecha y ordena cronológico (orden de inserción = cronológico)', () => {
    const res = obtenerSesionesDelDia(sessions, '2026-10-04');
    assert.deepStrictEqual(res.map(s => s.topic), ['A', 'B', 'D']);
    assert.deepStrictEqual(res.map(s => s.minutes), [30, 20, 15]);
  });
  it('fecha sin sesiones → array vacío', () => {
    const res = obtenerSesionesDelDia(sessions, '2026-10-01');
    assert.deepStrictEqual(res, []);
  });
});

describe('cargarPreferenciaSemanas / guardarPreferenciaSemanas (RF-2)', () => {
  it('default 12 cuando no existe', () => {
    localStorage.clear();
    assert.strictEqual(cargarPreferenciaSemanas(), 12);
  });
  it('valor guardado válido se recupera', () => {
    localStorage.clear();
    guardarPreferenciaSemanas(26);
    assert.strictEqual(cargarPreferenciaSemanas(), 26);
  });
  it('valor inválido (8) → default 12', () => {
    localStorage.clear();
    localStorage.setItem('heatmap-semanas', '8');
    assert.strictEqual(cargarPreferenciaSemanas(), 12);
  });
  it('valor inválido (string) → default 12', () => {
    localStorage.clear();
    localStorage.setItem('heatmap-semanas', 'abc');
    assert.strictEqual(cargarPreferenciaSemanas(), 12);
  });
});

describe('calcularDatosMapaCalor (RF-1, RF-3, RF-4)', () => {
  // Primera sesión: 28 sep (lunes). Hoy: 4 oct (domingo). Misma semana → 1 semana disponible.
  const sessions = [
    { date: '2026-10-04', topic: 'JS', minutes: 60 },   // hoy (dom) nivel 3 (60 min)
    { date: '2026-10-03', topic: 'React', minutes: 45 }, // ayer (sáb) nivel 2
    { date: '2026-09-28', topic: 'TS', minutes: 10 },    // lunes (misma semana) nivel 1
  ];

  it('respeta maxSemanas pero limita a semanas disponibles (1 semana)', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    assert.strictEqual(data.semanas.length, 1); // min(4, 1) = 1
  });

  it('respeta primera sesión (recorta antes) - maxSemanas=52 pero solo 1 semana desde primera', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 52);
    assert.strictEqual(data.semanas.length, 1); // min(52, 1) = 1
  });

  it('semanas generadas hacia atrás: semana 0 = actual', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    const semanaActual = data.semanas[0];
    assert.strictEqual(semanaActual.lunes.toISOString().split('T')[0], '2026-09-28');
  });

  it('días futuros marcados como "futuro" (están en semana 0 si caen en esa semana)', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    // 10 oct NO está en semana actual (28 sep - 4 oct). Está en semana siguiente.
    // Buscar en la semana actual un día futuro (ej. 5 oct si hoy fuera 4 oct... pero 5 oct > today)
    // Con FIXED_TODAY = 4 oct, días futuros en semana 0 son del 5 al 4 oct... ninguno.
    // Test ajustado: verificar que un día > today en la semana actual se marca "futuro"
    const data2 = calcularDatosMapaCalor(
      [{ date: '2026-10-04', topic: 'X', minutes: 10 }],
      fechaLocal(2026, 10, 2), // hoy = 2 oct (viernes)
      4
    );
    // Semana actual: 28 sep - 4 oct. Días futuros: 3 oct (sáb) y 4 oct (dom)
    const diaFuturo = data2.semanas[0].días.find(d => d.fechaStr === '2026-10-03');
    assert.ok(diaFuturo, 'Debería existir día futuro 2026-10-03');
    assert.strictEqual(diaFuturo.nivel, 'futuro');
  });

  it('días antes de primera sesión no aparecen (no están en el array)', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    const antes = data.semanas.flatMap(s => s.días).find(d => d.fechaStr === '2026-09-27');
    assert.strictEqual(antes, undefined);
  });

  it('hoy se renderiza normalmente según sus minutos (nivel 3 para 60 min)', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    const hoy = data.semanas[0].días.find(d => d.fechaStr === '2026-10-04');
    assert.ok(hoy);
    assert.strictEqual(hoy.nivel, 3); // 60 min → nivel 3 (46-90)
  });

  it('día con 0 min (pasado) usa nivel 0', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    // 29 sep (martes) está en semana 0, no en semana 1
    const dia = data.semanas[0].días.find(d => d.fechaStr === '2026-09-29');
    assert.ok(dia);
    assert.strictEqual(dia.nivel, 0);
  });

  it('cada día incluye array de sesiones si minutos > 0', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    const hoy = data.semanas[0].días.find(d => d.fechaStr === '2026-10-04');
    assert.ok(hoy.sesiones);
    assert.strictEqual(hoy.sesiones.length, 1);
    assert.strictEqual(hoy.sesiones[0].topic, 'JS');
    assert.strictEqual(hoy.sesiones[0].minutes, 60);
  });
});