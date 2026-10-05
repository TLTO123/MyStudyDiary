# Tasks: Mapa de calor (Heat Map) — `specs/001-heat-map/tasks.md`

Orden de dependencia. Cada tarea ≤ 30 min. Marcar `[x]` al completar.

---

## Fase 1: Funciones puras (sin DOM)

- [x] **T1.1** `obtenerNivelIntensidad(minutos)` → RF-3
  - Hecho cuando: `node --test` pasa tests de límites (0, 1, 15, 16, 45, 46, 90, 91, 200)

- [x] **T1.2** `obtenerLunesDeSemana(fecha)` → RF-4
  - Hecho cuando: `node --test` pasa: domingo 4 oct 2026 → lunes 28 sep; lunes → mismo lunes

- [x] **T1.3** `calcularSemanasEntre(desdeLunes, hastaLunes)` → RF-1, RF-4
  - Hecho cuando: `node --test` pasa: misma fecha = 0; una semana = 1; DST seguro

- [x] **T1.4** `obtenerPrimeraSesion(sessions)` → RF-1, RF-4
  - Hecho cuando: `node --test` pasa: array vacío = null; una sesión = su fecha; múltiples = la más antigua

- [x] **T1.5** `obtenerSesionesDelDia(sessions, fechaStr)` → RF-5
  - Hecho cuando: `node --test` pasa: filtra por fecha, ordena cronológico, devuelve [{topic, minutes}]

- [x] **T1.6** `cargarPreferenciaSemanas()` / `guardarPreferenciaSemanas(semanas)` → RF-2
  - Hecho cuando: `node --test` pasa: default 12; inválido → 12; válido persiste y recupera

- [x] **T1.7** `calcularDatosMapaCalor(sessions, today, maxSemanas)` → RF-1, RF-3, RF-4
  - Hecho cuando: `node --test` pasa: respeta maxSemanas; recorta por primera sesión; marca futuros="futuro"; antes primera = no aparecen; hoy normal; semanas hacia atrás

---

## Fase 2: HTML (estructura)

- [x] **T2.1** Añadir en `index.html` tras `<header>`: `<section class="card heatmap-card" id="heatmap-card">` con header, radio group `#heatmap-range`, contenedor `#heatmap-container`, grid `#heatmap-grid`, labels, estado vacío `#heatmap-empty` → RF-1, RF-2
  - Hecho cuando: abriendo `index.html` se ve el contenedor, 4 radios (4/12/26/52), grid vacío, mensaje vacío

- [x] **T2.2** Añadir modal `#day-modal` al final de `<main>`: backdrop, content, header (título + close), body (fecha, total, lista, empty) → RF-5
  - Hecho cuando: en DevTools Elements existe `#day-modal` con `role="dialog" aria-modal="true"`

---

## Fase 3: CSS (presentación)

- [x] **T3.1** Variables `--heat-0` a `--heat-4` en `:root` + override `@media (prefers-color-scheme: dark)` → RF-3, RNF-4
  - Hecho cuando: en DevTools Computed, `.heatmap-cell--0` usa `--heat-0`, y cambia en dark mode

- [x] **T3.2** Grid: `.heatmap-grid { display: grid; grid-template-rows: repeat(7, 11px); grid-auto-flow: column; grid-auto-columns: 11px; gap: 2px; }` + `.heatmap-cell` 11x11 + border-radius → RNF-2
  - Hecho cuando: 7 filas visibles, columnas se añaden horizontalmente, celdas cuadradas 11px

- [x] **T3.3** Clases nivel: `.heatmap-cell--0`..`--4` con `background: var(--heat-N)` + `.heatmap-cell--future` con `repeating-linear-gradient` light/dark → RF-3, RF-4
  - Hecho cuando: asignando clase `--3` se ve color medio; `--future` muestra diagonales; en dark mode ambos cambian

- [x] **T3.4** Contenedor responsive: `.heatmap-container { overflow-x: auto; max-width: 100%; padding-bottom: 8px; }` + scrollbar styling → RNF-2
  - Hecho cuando: en 375px se ve scroll horizontal nativo; 4 semanas caben sin scroll forzado

- [x] **T3.5** Radio group: `.heatmap-range` flex gap 8px, labels clicables, input nativo → RF-2
  - Hecho cuando: teclado flechas navega entre radios; 12 marcado por defecto

- [x] **T3.6** Modal: `.modal` fixed inset 0, backdrop, content centrado; `@media (max-width: 480px)` bottom-sheet con `slideUp` → RF-5
  - Hecho cuando: en desktop modal centrado; en 375px modal ocupa ancho completo, sale de abajo, se cierra con Escape/click fuera/botón

- [x] **T3.7** Accesibilidad visual: `.visually-hidden` para legend; focus-visible en radios, celdas, botones → RF-6
  - Hecho cuando: Tab navega radios, celdas, modal; focus ring visible en todos

---

## Fase 4: Renderizado DOM (app.js)

- [x] **T4.1** `renderHeatMapRange()`: lee `cargarPreferenciaSemanas()`, marca radio checked, escucha `change` → recalcula y `renderHeatMap()` → RF-2
  - Hecho cuando: cambiar radio recalcula mapa instantáneo; persiste en localStorage

- [x] **T4.2** `renderHeatMap()`: llama `calcularDatosMapaCalor()`, si vacío muestra `#heatmap-empty` y oculta grid; si datos: limpia `#heatmap-grid`, crea 7×N `div.heatmap-cell` con clases `--{nivel}` o `--future`, `role="gridcell"`, `aria-label` solo si minutos>0, `data-fecha` para click → RF-1, RF-3, RF-4, RF-6
  - Hecho cuando: con 3 sesiones (hoy, ayer, anteayer) se ven 3 celdas coloreadas, resto nivel 0; días futuros con diagonales; antes primera no existen

- [x] **T4.3** `openDayModal(fechaStr, minutos, sesiones)`: rellena `#day-modal-date`, `#day-modal-total`, `#day-modal-sessions` (li por sesión), muestra modal, foco en botón cerrar, atrapa foco → RF-5, RF-6
  - Hecho cuando: click en celda con minutos>0 abre modal con datos correctos; focus en "Cerrar"; Tab no sale del modal

- [x] **T4.4** `closeDayModal()`: oculta modal, restaura foco al elemento que lo abrió, limpia contenido → RF-5, RF-6
  - Hecho cuando: click backdrop / Escape / botón cierra; foco vuelve a la celda clicada

- [x] **T4.5** Delegación click en `#heatmap-grid`: `click` → si `target.closest('.heatmap-cell')` y `minutos>0` → `openDayModal`; si `minutos===0` → nada → RF-5
  - Hecho cuando: click celda nivel 0 no abre modal; click celda nivel 3 abre modal; click fuera de celdas no hace nada

---

## Fase 5: Integración y arranque

- [x] **T5.1** En `refreshUI()` (existente): llamar `renderHeatMapRange()` + `renderHeatMap()` tras cargar sesiones → RF-1, RF-2
  - Hecho cuando: añadir sesión → mapa se actualiza; borrar todas → estado vacío

- [x] **T5.2** Inicialización: al final de `app.js`, tras `refreshUI()`, asegurar `renderHeatMapRange()` se ejecuta una vez → RF-2
  - Hecho cuando: carga inicial muestra 12 semanas (default) y grid poblado

---

## Fase 6: Verificación manual (DoD)

- [x] **T6.1** Chrome DevTools: 4/12/26/52 semanas → render correcto, sin errores consola → RNF-1
  - Hecho cuando: 4 radios funcionan; 52 semanas = 364 celdas; render < 100ms subjetivo

- [x] **T6.2** Móvil 375px (emulación): grid scroll horizontal, 4 semanas visibles, modal bottom-sheet, radio group usable → RNF-2, RF-5
  - Hecho cuando: emulación 375px muestra scroll, modal sale de abajo, radios se pulsan con pulgar

- [x] **T6.3** Dark mode: colores `--heat-N` correctos, patrón futuros visible, modal legible → RNF-4
  - Hecho cuando: toggle dark mode en DevTools → mapa y modal se ven bien en ambos temas

- [x] **T6.4** Casos límite: 0 sesiones (estado vacío + botón enfoca formulario), 1 sesión antigua (recorte), sesiones futuras (ignoran intensidad), localStorage corrupto (fallback vacío) → Casos límite spec
  - Hecho cuando: cada caso se comporta como especificado en tabla Casos límite

- [x] **T6.5** Accesibilidad: `role="grid"` contenedor, `aria-label` en celdas >0, radio group operable teclado, modal focus trap + restore → RF-6
  - Hecho cuando: NVDA/VoiceOver anuncia "Mapa de calor, grid, 7 filas"; Tab navega todo sin saltos

- [x] **T6.6** `node --test specs/001-heat-map/heatmap.test.js` pasa todos → Tests unitarios
  - Hecho cuando: comando termina con 0 fallos

---

## Fase 7: Documentación

- [x] **T7.1** Actualizar `MEMORY.md`: decisiones heatmap (selector radio, 5 niveles, bottom-sheet, patrón diagonales, key localStorage) → Constitución #6
  - Hecho cuando: `MEMORY.md` tiene entrada nueva con fecha y decisiones

- [x] **T7.2** Actualizar `AGENTS.md` si hay reglas permanentes nuevas (ej. nueva clave localStorage, patrón DST) → Constitución #2
  - Hecho cuando: `AGENTS.md` refleja cambios o confirma que no hay nuevos permanentes

---

## Resumen de cobertura RF por tarea

| RF | Tareas |
|----|--------|
| RF-1 | T1.4, T1.7, T2.1, T4.2, T5.1 |
| RF-2 | T1.6, T2.1, T3.5, T4.1, T5.1, T5.2 |
| RF-3 | T1.1, T1.7, T3.1, T3.3, T4.2 |
| RF-4 | T1.2, T1.3, T1.4, T1.7, T3.3, T4.2 |
| RF-5 | T2.2, T4.3, T4.4, T4.5 |
| RF-6 | T3.7, T4.2, T4.3, T4.4, T6.5 |

---

**Total: 25 tareas**. Estimación total: ~10-12 horas.