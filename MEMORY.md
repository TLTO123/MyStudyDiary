# MEMORY.md — Diario de Estudio

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- v1 funcionando: registrar sesiones (fecha, tema, minutos), racha actual y lista de sesiones.
- Datos en localStorage.
- **Añadida "mejor racha" (🏆)**: se muestra junto a la racha actual en el header.
- **Añadidos "minutos esta semana" (📊)**: suma minutos lunes-domingo semana actual, se muestra en header.
- **Añadidos "días este mes" (📅)**: días únicos con sesión del 1 al día actual, se muestra en header.
- **Rediseño visual aplicado**: paleta cálida neutra, sin gradientes, sombras suaves, tipografía más intencional.
- **Añadido mapa de calor (Heat Map)**: 5 niveles GitHub, radio group 4/12/26/52 semanas, modal detalle día, bottom-sheet en móvil.

## Aprendizajes y errores a evitar
- Calcular mejor racha: recorrer fechas únicas ordenadas asc, detectar secuencias consecutivas, ignorar fechas > hoy.
- Semana ISO: lunes=1, domingo=7. Calcular lunes restando (díaSemana - 1) días, domingo = lunes + 6.
- Mes actual: primer día = `new Date(año, mes, 1)`, límite superior = hoy. Reutilizar `getUniqueDatesAsc` y `formatDateForInput`.
- **Diseño minimalista**: una sola paleta de acento, colores semánticos suaves para badges, sin gradientes ni sombras pesadas.
- **Heatmap**: rango = min(selección, semanas desde 1ª sesión); días futuros = gris + patrón diagonales; días antes 1ª sesión = no renderizan; `setDate(-7)` seguro para DST.
- **Heatmap bug crítico**: al filtrar "días antes de la 1ª sesión", comparar **semana a semana** (lunes de semana), no día a día. Si la 1ª sesión es domingo, comparar día a día oculta lunes-sábado de esa misma semana → celdas colapsadas (`display: none`) y domingo desalineado. Fix: `semanaDia < primeraSesionSemana` en lugar de `fechaDia < primeraSesion`.

## Decisiones (y por qué)
- Sin backend ni dependencias: cualquiera debe poder abrirlo con doble clic.
- Fecha editable en el formulario: permite registrar días pasados y ver la racha crecer.
- Better racha con icono 🏆 y color rosa (distinto del naranja de racha actual) para diferenciación visual clara.
- Minutos semana con icono 📊 y color azul para diferenciar de rachas (naranja/rosa).
- Días mes con icono 📅 y color verde para diferenciar del resto (naranja/rosa/azul).
- **Paleta única cálida** (--primary naranja terracota) + colores semánticos apagados para badges.
- **Labels uppercase + letter-spacing** para jerarquía tipográfica clara.
- **Focus states visibles** (3px ring) para accesibilidad.
- **Heatmap: selector radio group** (accesible, visible sin click); **5 niveles fijos** (GitHub-style); **modal bottom-sheet en móvil** (thumb-friendly); **patrón diagonales CSS** (0 bytes, sin imágenes); **scroll nativo** (sin JS); **key localStorage separada** (`heatmap-semanas`).

## Próximos pasos
- (vacío por ahora)