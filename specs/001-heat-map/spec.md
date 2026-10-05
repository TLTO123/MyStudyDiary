# Spec: Mapa de calor de actividad (Heat Map)

## Contexto y objetivo
Añadir una visualización tipo GitHub que muestre la actividad de estudio de las últimas N semanas. Cada día es un cuadrado cuyo color indica los minutos estudiados (más intenso = más minutos). Permite ver patrones semanales, rachas visuales y vacíos de un vistazo.

## Usuarios
- Estudiante autodidacta que registra sesiones diarias
- Quiere motivación visual tipo "no rompas la cadena"
- Usa móvil y escritorio

## Historias de usuario
1. **HU-1**: Como usuario, quiero ver un mapa de calor de mis últimas N semanas para identificar patrones de estudio.
2. **HU-2**: Como usuario, quiero elegir cuántas semanas ver (4, 12, 26, 52) para adaptar la vista a mi pantalla.
3. **HU-3**: Como usuario, quiero tocar un día y ver el detalle de sus sesiones para recordar qué estudié.
4. **HU-4**: Como usuario, quiero que los días futuros y los anteriores a mi primera sesión se distingan visualmente de los días con 0 minutos.

## Requisitos funcionales

**RF-1: Renderizado del mapa**
- CUANDO se carga la página Y hay al menos una sesión EN localStorage ENTONCES el sistema DEBE renderizar una cuadrícula donde cada columna es una semana (Lunes a Domingo) y cada fila es un día de la semana (7 filas: Lun, Mar, Mié, Jue, Vie, Sáb, Dom), con un cuadrado por día.
- EL rango de semanas a renderizar es el MÍNIMO entre: (a) la selección del usuario (4, 12, 26, 52) y (b) las semanas desde la semana de la primera sesión registrada hasta la semana actual.
- CUANDO no hay sesiones EN localStorage ENTONCES el sistema DEBE mostrar un estado vacío con mensaje "Aún no hay datos para el mapa de calor" y botón "Añade tu primera sesión" que enfoca el formulario.

**RF-2: Selector de rango**
- EL sistema DEBE proveer un **radio group** (no dropdown) con opciones: 4, 12, 26, 52 semanas. Etiqueta visible: "Semanas:".
- CUANDO el usuario cambia la opción ENTONCES el mapa DEBE volver a renderizarse con el nuevo rango máximo.
- LA preferencia DEBE persistir en localStorage (clave `heatmap-semanas`). Valor por defecto: 12. Si el valor guardado no está en {4,12,26,52}, usar 12.

**RF-3: Cálculo de intensidad (5 niveles GitHub)**
- PARA cada día en el rango renderizado:
  - SI minutos = 0 ENTONCES nivel 0 (gris base).
  - SI 1 ≤ minutos ≤ 15 ENTONCES nivel 1 (color muy suave).
  - SI 16 ≤ minutos ≤ 45 ENTONCES nivel 2 (color suave).
  - SI 46 ≤ minutos ≤ 90 ENTONCES nivel 3 (color medio).
  - SI minutos ≥ 91 ENTONCES nivel 4 (color intenso).
- LOS umbrales son fijos (inclusive en límites inferiores), no percentiles.

**RF-4: Días futuros, días con 0 minutos, y días antes de la primera sesión**
- LOS días > hoy (futuros) DEBEN renderizarse con gris muy claro + patrón sutil (diagonal stripes vía `background-image: repeating-linear-gradient...`). No muestran intensidad aunque tengan sesiones registradas.
- LOS días ≤ hoy y ≥ primera sesión registrada con 0 minutos usan **nivel 0** (gris base, sin patrón).
- LOS días < primera sesión registrada NO DEBEN renderizarse (la cuadrícula empieza en el lunes de la semana de la primera sesión).
- HOY se renderiza normalmente según sus minutos (puede ser nivel 0).

**RF-5: Detalle al click/tap**
- CUANDO el usuario hace click/tap en un día con minutos > 0 ENTONCES el sistema DEBE abrir un modal con:
  - Fecha formateada (ej. "domingo, 4 de octubre de 2026")
  - Total de minutos del día
  - Lista de sesiones ordenadas cronológicamente: tema + minutos cada una
- CUANDO el día tiene 0 minutos (nivel 0) ENTONCES el click NO ABRE modal y NO muestra mensaje.
- EL modal DEBE cerrarse con click fuera, tecla Escape, o botón "Cerrar".
- EN móvil (≤480px) el modal es bottom-sheet (desliza desde abajo); EN desktop (≥768px) es centrado.

**RF-6: Accesibilidad básica**
- EL contenedor del mapa DEBE tener `role="grid"` y `aria-label="Mapa de calor de actividad, semanas horizontales, días verticales"`.
- CADA cuadrado con minutos > 0 DEBE tener `role="gridcell"` + `aria-label` con formato: "Fecha, minutos, intensidad nivel X de 4". Los cuadrados nivel 0 (0 min) NO requieren aria-label individual.
- EL radio group de semanas DEBE ser operable por teclado (flechas izquierda/derecha).
- EL modal DEBE atrapar foco mientras está abierto y restaurar foco al elemento que lo abrió al cerrarse.

## Requisitos no funcionales

**RNF-1: Rendimiento**
- Renderizado inicial y re-render al cambiar rango: fluido, sin bloqueo visible de la UI en móvil (375px) con 52 semanas (364 cuadrados). Sin métrica numérica obligatoria (verificación manual en DevTools Performance).

**RNF-2: Responsive**
- Tamaño de cuadrado: 11px × 11px + gap 2px = 13px por celda.
- En ≤ 480px: contenedor con `overflow-x: auto`; 4 semanas visibles (≈364px) sin scroll horizontal forzado; resto accesible con scroll horizontal nativo.
- En ≥ 768px: tantas semanas como quepan (mínimo 12 visibles).
- El contenedor del mapa NO crece indefinidamente: `max-width: 100%`.

**RNF-3: Sin dependencias**
- Solo HTML/CSS/JS vanilla. Sin librerías de gráficos, date-fns, etc.

**RNF-4: Dark mode**
- Paleta de 5 niveles funcione en ambos temas mediante CSS variables. Nivel 0 (gris base) distinto en light/dark.

**RNF-5: Idioma**
- Textos visibles en español. Nombres de funciones/variables en español descriptivo.

**RNF-6: Zona horaria y DST**
- Todos los cálculos de fecha usan `getTodayLocal()` existente (fecha local, sin UTC). El cálculo de "semana de la primera sesión" y "hace N semanas" usa `setDate(getDate() - 7*N)` que es seguro ante cambios DST (el día de la semana no cambia).

## Casos límite
| Caso | Comportamiento esperado |
|------|------------------------|
| 0 sesiones totales | Estado vacío con mensaje y botón "Añade tu primera sesión" que enfoca `#topic` |
| 1 sola sesión hace 3 meses | Mapa muestra desde la semana de esa sesión (lunes de esa semana) hasta hoy; semanas intermedias con nivel 0 |
| Sesión con 200 min en un día | Nivel 4 (≥91) — color máximo |
| Cambio de mes/año en rango | Semanas continuas, no se rompe por límites de mes |
| localStorage corrupto (`diario-estudio-sesiones`) | Fallback silencioso a estado vacío (try/catch en load) |
| Usuario borra todas las sesiones | Mapa vuelve a estado vacío |
| Sesiones registradas en fechas futuras | Se ignoran para intensidad (días futuros siempre gris + patrón) |
| `heatmap-semanas` no existe o valor inválido | Default 12 semanas |
| Usuario hace scroll horizontal, cambia selector | Scroll se resetea a inicio (semana actual visible) |

## Fuera de alcance (v1)
- Exportar imagen del mapa
- Comparativa con semana/mes anterior
- Tooltip al hover (solo click/tap abre modal)
- Animaciones de entrada
- Múltiples mapas (por tema, por año, etc.)
- Configuración de umbrales de intensidad
- Integración con rachas (ya existe header)

## Criterios de finalización (Definition of Done)
- [ ] `specs/001-heat-map/spec.md` aprobado
- [ ] Plan técnico en `specs/001-heat-map/plan.md` (separado)
- [ ] Implementación en `app.js`: funciones puras para (a) calcular datos del mapa, (b) determinar nivel de intensidad, (c) renderizar mapa, (d) abrir/cerrar modal de día
- [ ] HTML: contenedor `#heatmap` + radio group `#heatmap-range` + modal `#day-modal`
- [ ] CSS: grid responsive, 5 variables de color para niveles 0-4, dark mode, patrón días futuros, modal accesible (bottom-sheet en móvil)
- [ ] Verificación manual Chrome DevTools: 4/12/26/52 semanas, móvil 375px, desktop, dark/light, click día con/sin datos, modal abre/cierra, consola limpia, scroll horizontal funciona
- [ ] `MEMORY.md` actualizado con decisiones
- [ ] `AGENTS.md` actualizado si hay nuevas reglas permanentes

## Dudas resueltas (ya no abiertas)
- Selector de semanas: radio group encima del mapa (no en header).
- Modal: bottom-sheet en móvil (≤480px), centrado en desktop.
- Patrón días futuros: líneas diagonales sutiles (`repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)` en light; `rgba(255,255,255,0.03)` en dark).