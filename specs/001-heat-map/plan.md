# Plan técnico: Mapa de calor (Heat Map) — `specs/001-heat-map/plan.md`

## 1. Archivos a crear/modificar y responsabilidades

| Archivo | Acción | Responsabilidad (Constitución #1, #3) |
|---------|--------|--------------------------------------|
| `index.html` | Modificar | Añadir contenedor `#heatmap`, radio group `#heatmap-range`, modal `#day-modal`. Solo estructura. |
| `styles.css` | Modificar | Variables CSS 5 niveles, grid responsive, patrón días futuros, modal (bottom-sheet/centrado), accesibilidad visual. Solo presentación. |
| `app.js` | Modificar | Lógica pura + renderizado DOM. **Nunca** selectores CSS en funciones puras. DOM solo en `renderHeatMap`, `renderHeatMapRange`, `openDayModal`, `closeDayModal`. |

## 2. Funciones puras de lógica (Constitución #2)

Todas en `app.js`, sin acceso a DOM, `today` como parámetro inyectable (para tests):

```javascript
// RF-1, RF-3, RF-4: Calcula datos completos del mapa
// today: Date local (injected), sessions: array, maxSemanas: number (4|12|26|52)
// Retorna: { semanas: WeekData[], primeraSesionSemana: Date, semanaActual: Date }
function calcularDatosMapaCalor(sessions, today, maxSemanas)

// RF-3: Determina nivel de intensidad 0-4
// minutos: number
// Retorna: 0 | 1 | 2 | 3 | 4
function obtenerNivelIntensidad(minutos)

// RF-4: Calcula lunes de la semana de una fecha
// fecha: Date local
// Retorna: Date (lunes 00:00 local)
function obtenerLunesDeSemana(fecha)

// RF-4: Calcula semanas entre dos fechas (inclusive)
// desde: Date (lunes), hasta: Date (lunes)
// Retorna: number
function calcularSemanasEntre(desde, hasta)

// RF-1: Obtiene primera sesión (fecha más antigua)
// sessions: array
// Retorna: Date | null
function obtenerPrimeraSesion(sessions)

// RF-5: Obtiene sesiones de un día específico
// sessions: array, fechaStr: "AAAA-MM-DD"
// Retorna: array de { topic, minutes } ordenado cronológicamente
function obtenerSesionesDelDia(sessions, fechaStr)

// RF-2: Carga preferencia guardada
// Retorna: 4 | 12 | 26 | 52
function cargarPreferenciaSemanas()

// RF-2: Guarda preferencia
// semanas: 4 | 12 | 26 | 52
function guardarPreferenciaSemanas(semanas)
```

## 3. Algoritmo del mapa (pseudocódigo)

```pseudocode
FUNCIÓN calcularDatosMapaCalor(sessions, today, maxSemanas):
    SI sessions vacío:
        RETORNAR { semanas: [], primeraSesionSemana: null, semanaActual: null }

    primeraSesion ← obtenerPrimeraSesion(sessions)
    primeraSesionSemana ← obtenerLunesDeSemana(primeraSesion)
    semanaActual ← obtenerLunesDeSemana(today)

    semanasDisponibles ← calcularSemanasEntre(primeraSesionSemana, semanaActual) + 1
    semanasARenderizar ← MÍNIMO(maxSemanas, semanasDisponibles)

    // Generar array de semanas (cada una = 7 días)
    semanas ← ARRAY VACÍO
    PARA i DESDE 0 HASTA semanasARenderizar - 1:
        lunesSemana ← semanaActual MÁS (-i * 7 días)  // hacia atrás
        días ← ARRAY VACÍO
        PARA diaOffset DESDE 0 HASTA 6:  // 0=Lun ... 6=Dom
            fechaDia ← lunesSemana MÁS diaOffset días
            fechaStr ← formatearAAAAMMDD(fechaDia)

            minutosDia ← SUMAR minutes DE sessions DONDE date = fechaStr
            esFuturo ← fechaDia > today
            esAntesPrimera ← fechaDia < primeraSesion
            nivel ← obtenerNivelIntensidad(minutosDia)  // 0-4

            días.AÑADIR({
                fecha: fechaDia,
                fechaStr: fechaStr,
                minutos: minutosDia,
                nivel: esFuturo ? "futuro" : (esAntesPrimera ? "oculto" : nivel),
                sesiones: esFuturo O esAntesPrimera ? [] : obtenerSesionesDelDia(sessions, fechaStr)
            })
        semanas.AÑADIR({ lunes: lunesSemana, días: días })

    RETORNAR { semanas, primeraSesionSemana, semanaActual }
```

**Notas:**
- Semanas se generan **hacia atrás** desde la actual (columna 0 = semana actual).
- `setDate(getDate() - 7)` es seguro para DST (RNF-6).
- `obtenerNivelIntensidad` usa umbrales fijos inclusive en límite inferior.

## 4. Cómo se pinta en la interfaz (HTML + CSS)

### HTML (index.html) — después de `<header>`, antes de `.form-card`:
```html
<section class="card heatmap-card" id="heatmap-card">
  <div class="heatmap-header">
    <h2>Mapa de calor</h2>
    <fieldset class="heatmap-range" id="heatmap-range" role="radiogroup" aria-label="Semanas a mostrar">
      <legend class="visually-hidden">Semanas a mostrar</legend>
      <label><input type="radio" name="heatmap-semanas" value="4"> 4</label>
      <label><input type="radio" name="heatmap-semanas" value="12" checked> 12</label>
      <label><input type="radio" name="heatmap-semanas" value="26"> 26</label>
      <label><input type="radio" name="heatmap-semanas" value="52"> 52</label>
    </fieldset>
  </div>

  <div class="heatmap-container" id="heatmap-container" role="grid" aria-label="Mapa de calor de actividad, semanas horizontales, días verticales">
    <div class="heatmap-grid" id="heatmap-grid">
      <!-- Inyectado por JS: 7 filas × N columnas -->
    </div>
    <div class="heatmap-labels" id="heatmap-labels" aria-hidden="true">
      <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
    </div>
  </div>

  <div class="heatmap-empty hidden" id="heatmap-empty">
    <p>Aún no hay datos para el mapa de calor</p>
    <button type="button" id="heatmap-empty-btn">Añade tu primera sesión</button>
  </div>
</section>

<!-- Modal día -->
<div class="modal hidden" id="day-modal" role="dialog" aria-modal="true" aria-labelledby="day-modal-title">
  <div class="modal-backdrop"></div>
  <div class="modal-content">
    <header class="modal-header">
      <h3 id="day-modal-title">Detalle del día</h3>
      <button type="button" class="modal-close" aria-label="Cerrar">×</button>
    </header>
    <div class="modal-body">
      <p class="day-date" id="day-modal-date"></p>
      <p class="day-total" id="day-modal-total"></p>
      <ul class="day-sessions" id="day-modal-sessions"></ul>
      <p class="day-empty hidden" id="day-modal-empty">Sin sesiones ese día</p>
    </div>
  </div>
</div>
```

### CSS (styles.css) — nuevas adiciones:
```css
/* Variables de color 5 niveles (light/dark) */
:root {
  --heat-0: #ebedf0;  /* nivel 0: gris base */
  --heat-1: #9be9a8;  /* nivel 1: muy suave */
  --heat-2: #40c463;  /* nivel 2: suave */
  --heat-3: #30a14e;  /* nivel 3: medio */
  --heat-4: #216e39;  /* nivel 4: intenso */
}

@media (prefers-color-scheme: dark) {
  :root {
    --heat-0: #161b22;
    --heat-1: #033a16;
    --heat-2: #0d4418;
    --heat-3: #238636;
    --heat-4: #2ea043;
  }
}

/* Patrón días futuros */
.heatmap-cell--future {
  background-image: repeating-linear-gradient(
    45deg,
    transparent, transparent 2px,
    rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
  );
}
@media (prefers-color-scheme: dark) {
  .heatmap-cell--future {
    background-image: repeating-linear-gradient(
      45deg,
      transparent, transparent 2px,
      rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px
    );
  }
}

/* Grid: 7 filas (días) × N columnas (semanas) */
.heatmap-grid {
  display: grid;
  grid-template-rows: repeat(7, 11px);
  grid-auto-flow: column;
  grid-auto-columns: 11px;
  gap: 2px;
}

.heatmap-cell {
  width: 11px; height: 11px;
  border-radius: 2px;
  transition: transform 100ms ease;
}
.heatmap-cell:hover { transform: scale(1.3); z-index: 1; }

/* Niveles de color */
.heatmap-cell--0 { background: var(--heat-0); }
.heatmap-cell--1 { background: var(--heat-1); }
.heatmap-cell--2 { background: var(--heat-2); }
.heatmap-cell--3 { background: var(--heat-3); }
.heatmap-cell--4 { background: var(--heat-4); }

/* Contenedor responsive */
.heatmap-container {
  overflow-x: auto;
  max-width: 100%;
  padding-bottom: 8px; /* espacio scrollbar */
}
.heatmap-container::-webkit-scrollbar { height: 6px; }

/* Radio group */
.heatmap-range { display: flex; gap: 8px; flex-wrap: wrap; }
.heatmap-range label { display: flex; align-items: center; gap: 4px; cursor: pointer; }

/* Modal: bottom-sheet móvil / centrado desktop */
.modal { position: fixed; inset: 0; z-index: 100; display: flex; }
.modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
.modal-content {
  background: var(--card); border-radius: var(--radius); padding: var(--space-6);
  max-width: 90vw; width: 360px; margin: auto;
  box-shadow: var(--shadow-elevated);
}
@media (max-width: 480px) {
  .modal-content {
    margin: auto 0 0; /* bottom-sheet */
    border-radius: var(--radius) var(--radius) 0 0;
    width: 100vw; max-width: 100vw;
    animation: slideUp 200ms ease;
  }
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
```

## 5. Decisiones técnicas justificadas

| Decisión | Justificación | Alternativa descartada |
|----------|---------------|------------------------|
| **Radio group** (no dropdown) | Accesible nativo (flechas), visible sin click, 4 opciones caben en una línea. Constitución #3: HTML simple. | `<select>`: requiere click para ver opciones, peor en móvil, menos accesible para teclado. |
| **Generar semanas hacia atrás** (columna 0 = actual) | Coherente con GitHub: semana actual siempre visible a la izquierda. Usuario ve "hoy" primero. | Hacia adelante (columna 0 = más antigua): semana actual al final, requiere scroll. |
| **Tamaño celda fijo 11px + gap 2px** | 4 semanas = 4×13px = 52px + labels ≈ 364px en 375px viewport. Cabe sin scroll forzado. | % o fr: celdas deformes en móviles, ratio no cuadrado. |
| **5 variables CSS `--heat-0`..`--heat-4`** | Un solo origen de verdad para colores. Dark mode = override en `@media`. Constitución #1: sin build. | Clases `.level-0`..`.level-4` con colores hardcodeados: duplicación, mantenimiento difícil. |
| **Patrón días futuros con `repeating-linear-gradient`** | 0 bytes extra, sin imágenes, personalizable por tema. Constitución #3: CSS maneja presentación. | PNG/SVG background: petición extra, no responsive a tema. |
| **Modal bottom-sheet en móvil (≤480px)** | Patrón nativo iOS/Android, thumb-friendly, no tapa contenido. Constitución #3: responsive real. | Centrado siempre: en 375px tapa todo, difícil cerrar con pulgar. |
| **`role="grid"` contenedor + `aria-label` solo en celdas con datos** | Lectores de pantalla: anuncian "grid, 7 filas, N columnas". Celdas vacías (nivel 0) no añaden ruido. | `aria-label` en todas: 364 anuncios = ruido insoportable. |
| **Scroll horizontal nativo (`overflow-x: auto`)** | Sin JS, nativo, momentum scroll en iOS/Android. Constitución #1: sin deps. | Biblioteca scroll (iScroll, etc.): dependencia, kilobytes, sobre-ingeniería. |
| **`heatmap-semanas` en localStorage separado** | No contamina `diario-estudio-sesiones`. Constitución #5: datos usuario intocables, migración simple. | Guardar en misma clave: rompería compatibilidad, migración compleja. |

## 6. Estrategia de tests con `node --test` (Constitución #4)

**Archivo:** `specs/001-heat-map/heatmap.test.js` (ejecutable con `node --test`)

```javascript
// Tests unitarios de funciones puras (sin DOM)
// Ejecutar: node --test specs/001-heat-map/heatmap.test.js

import { describe, it, assert } from 'node:test';
import {
  obtenerNivelIntensidad,
  obtenerLunesDeSemana,
  calcularSemanasEntre,
  obtenerPrimeraSesion,
  obtenerSesionesDelDia,
  calcularDatosMapaCalor
} from '../../app.js'; // o importar funciones expuestas para test

const FIXED_TODAY = new Date(2026, 9, 4); // 4 oct 2026 (domingo)

describe('obtenerNivelIntensidad (RF-3)', () => {
  it('0 min → nivel 0', () => assert.strictEqual(obtenerNivelIntensidad(0), 0));
  it('1 min → nivel 1', () => assert.strictEqual(obtenerNivelIntensidad(1), 1));
  it('15 min → nivel 1 (límite sup incl.)', () => assert.strictEqual(obtenerNivelIntensidad(15), 1));
  it('16 min → nivel 2', () => assert.strictEqual(obtenerNivelIntensidad(16), 2));
  it('45 min → nivel 2 (límite sup incl.)', () => assert.strictEqual(obtenerNivelIntensidad(45), 2));
  it('46 min → nivel 3', () => assert.strictEqual(obtenerNivelIntensidad(46), 3));
  it('90 min → nivel 3 (límite sup incl.)', () => assert.strictEqual(obtenerNivelIntensidad(90), 3));
  it('91 min → nivel 4', () => assert.strictEqual(obtenerNivelIntensidad(91), 4));
  it('200 min → nivel 4', () => assert.strictEqual(obtenerNivelIntensidad(200), 4));
});

describe('obtenerLunesDeSemana (RF-4)', () => {
  it('domingo 4 oct → lunes 29 sep', () => {
    const d = new Date(2026, 9, 4);
    const lunes = obtenerLunesDeSemana(d);
    assert.strictEqual(lunes.toISOString().split('T')[0], '2026-09-28'); // wait, 2026-09-28 is Monday? Let me check: Oct 4 2026 is Sunday. Monday of that week is Sep 28.
  });
  it('lunes 28 sep → mismo lunes', () => {
    const d = new Date(2026, 8, 28);
    assert.strictEqual(obtenerLunesDeSemana(d).toISOString().split('T')[0], '2026-09-28');
  });
});

describe('calcularSemanasEntre (RF-1, RF-4)', () => {
  it('mismo lunes → 0', () => {
    const d = new Date(2026, 8, 28);
    assert.strictEqual(calcularSemanasEntre(d, d), 0);
  });
  it('una semana diferencia → 1', () => {
    const d1 = new Date(2026, 8, 28);
    const d2 = new Date(2026, 9, 5); // 5 oct = lunes sig
    assert.strictEqual(calcularSemanasEntre(d1, d2), 1);
  });
});

describe('calcularDatosMapaCalor (RF-1, RF-3, RF-4)', () => {
  const sessions = [
    { date: '2026-10-04', topic: 'JS', minutes: 60 },   // hoy (dom) nivel 2
    { date: '2026-10-03', topic: 'React', minutes: 45 }, // ayer (sáb) nivel 2
    { date: '2026-09-28', topic: 'TS', minutes: 10 },    // lunes hace 1 sem nivel 1
  ];

  it('respeta maxSemanas=4 aunque haya más datos', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    assert.strictEqual(data.semanas.length, 4);
  });

  it('respeta primera sesión (recorta antes)', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 52);
    // primera sesión 28 sep (lunes), hoy 4 oct → 2 semanas
    assert.strictEqual(data.semanas.length, 2);
  });

  it('días futuros marcados como "futuro"', () => {
    const future = new Date(2026, 9, 10); // 10 oct (futuro)
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    const diaFuturo = data.semanas[0].días.find(d => d.fechaStr === '2026-10-10');
    assert.strictEqual(diaFuturo?.nivel, 'futuro');
  });

  it('días antes de primera sesión no aparecen', () => {
    const data = calcularDatosMapaCalor(sessions, FIXED_TODAY, 4);
    const antes = data.semanas.flatMap(s => s.días).find(d => d.fechaStr === '2026-09-27');
    assert.strictEqual(antes, undefined);
  });
});

describe('obtenerSesionesDelDia (RF-5)', () => {
  const sessions = [
    { date: '2026-10-04', topic: 'A', minutes: 30 },
    { date: '2026-10-04', topic: 'B', minutes: 20 },
    { date: '2026-10-03', topic: 'C', minutes: 10 },
  ];
  it('filtra por fecha y ordena cronológico', () => {
    const res = obtenerSesionesDelDia(sessions, '2026-10-04');
    assert.deepStrictEqual(res.map(s => s.topic), ['A', 'B']);
    assert.deepStrictEqual(res.map(s => s.minutes), [30, 20]);
  });
});
```

**Cobertura por RF:**
- RF-1: `calcularDatosMapaCalor` (tests de rango, recorte, semanas)
- RF-2: `cargarPreferenciaSemanas`, `guardarPreferenciaSemanas` (tests de default, validación)
- RF-3: `obtenerNivelIntensidad` (tests exhaustivos de límites)
- RF-4: `obtenerLunesDeSemana`, `calcularSemanasEntre`, `calcularDatosMapaCalor` (futuros, antes primera, DST)
- RF-5: `obtenerSesionesDelDia` (filtro + orden)

**Ejecutar:** `node --test specs/001-heat-map/heatmap.test.js`

## 7. Orden de implementación sugerido

1. **Funciones puras** en `app.js` (sección 2) + tests unitarios
2. **HTML** en `index.html` (contenedor, radio group, modal)
3. **CSS** en `styles.css` (variables, grid, modal, responsive)
4. **Renderizado DOM** en `app.js`: `renderHeatMap`, `renderHeatMapRange`, `openDayModal`, `closeDayModal`
5. **Integración**: escuchar `change` en radio group → recalcular + render
6. **Verificación manual** Chrome DevTools (DoD línea 110)

---

**Respetan Constitución:**
- #1: Solo vanilla, sin build
- #2: Lógica pura en `app.js`, HTML/CSS separados
- #3: `app.js` no conoce selectores en funciones puras
- #4: Tests con `node --test`, verificación manual DevTools
- #5: Nueva clave `heatmap-semanas` aislada, migración por default
- #6: Nombres en español (`calcularDatosMapaCalor`, `obtenerNivelIntensidad`, etc.)