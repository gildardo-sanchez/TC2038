# TC2038 · Presentaciones interactivas

Presentaciones en **Reveal.js** para *Analysis and Design of Advanced Algorithms* (Unidad 1: técnicas de diseño).
Las diapositivas están en inglés; este README está en español para el profesor.

Cada sesión de 100 minutos sigue el mismo ritmo:

| Bloque | Qué pasa |
|---|---|
| Warm-up (5 min) | Pregunta o reto que engancha antes de dar teoría |
| Agenda con tiempos | Los alumnos ven cuándo llegan los checkpoints |
| Bloques de 10–15 min | Concepto + animación interactiva |
| **Checkpoint** (cada ~15 min) | Quiz de opción múltiple o "predice el valor" |
| **Your turn** | Actividad en parejas con temporizador |
| **Exit ticket** | 1–3 preguntas finales + "muddiest point" |

Las notas del orador (tecla **S**) incluyen el minuto sugerido (⏱), qué preguntar y errores típicos.

---

## Publicar en GitHub Pages

1. Crea un repositorio (por ejemplo `tc2038-slides`) y sube **todo** el contenido de esta carpeta (incluido `.nojekyll`).
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`**.
3. En 1–2 minutos estará en `https://<tu-usuario>.github.io/tc2038-slides/`.

No hay paso de compilación: son HTML estáticos. Reveal.js, KaTeX y highlight.js se cargan desde el CDN de jsDelivr (versiones fijas).

> Para verlas localmente sin internet hace falta descargar Reveal.js; con internet basta abrir los HTML o servir la carpeta con `python3 -m http.server`.

## Estructura

```
index.html                  ← portada del curso con la lista de sesiones
decks/                      ← una sesión por archivo, numeradas por unidad
  1-1-algorithms.html … 1-6-branch-and-bound.html        (Unidad 1)
  4-1-geometry-intro.html … 4-5-delaunay-randomized.html (Unidad 4)
  5-1-search-bitmasks.html … 5-4-local-search.html       (Unidad 5)
  02-….html, 22-….html, …   ← redirecciones de los nombres anteriores (no borrar: mantienen vivos los enlaces viejos)
assets/
  css/course.css            ← tema minimalista (claro/oscuro) y estilos de widgets
  js/course.js              ← arranque de Reveal + quizzes, "predict", temporizador, atajos
  js/widgets.js             ← animaciones interactivas (ver catálogo abajo)
  js/widgets-geometry.js    ← animaciones de geometría computacional (Unidad 4)
  js/widgets-search.js      ← animaciones de búsqueda avanzada (Unidad 5)
```

## Teclas durante la clase

| Tecla | Acción |
|---|---|
| → ← ↓ | Navegar (↓ = diapositivas verticales, p. ej. exit tickets) |
| **S** | Vista del orador: notas, siguiente diapositiva y cronómetro |
| **.** / **,** | Avanzar / retroceder un paso la animación de la diapositiva actual |
| **1–4** | Responder el quiz en pantalla (A–D) |
| **D** | Modo oscuro |
| **H** | Volver a la portada (también el botón “← All sessions” arriba a la izquierda) |
| **F** · **Esc** · **B** | Pantalla completa · vista general · pantalla en negro |

PDF: abre la presentación con `?print-pdf` al final de la URL e imprime desde Chrome.

---

## Cómo editar o crear diapositivas

Cada HTML contiene el Markdown dentro de `<textarea data-template>`:

```markdown
## Título de la diapositiva

Texto, listas, tablas, código...

- Aparece después <!-- .element: class="fragment" -->

Note:
Todo lo que va después de "Note:" son notas del orador.

---

## Siguiente diapositiva (horizontal)

--

## Diapositiva vertical (debajo de la anterior)
```

- `---` separa diapositivas horizontales; `--` verticales.
- Clases de diapositiva: `<!-- .slide: class="checkpoint" -->`, `activity`, `divider`, `title`.
- Animación automática entre dos diapositivas: `<!-- .slide: data-auto-animate -->` en ambas.
- Código con resaltado por pasos: ```` ```cpp [1-2|3-5|6] ````
- Matemáticas con KaTeX: `$...$` y `$$...$$`. Dentro del Markdown escribe `\_` en vez de `_` cuando haya varios subíndices en el mismo párrafo, y usa `\lbrace` `\rbrace` en lugar de `\{ \}`.

> **Regla de oro para HTML dentro del Markdown:** bloques pegados al margen izquierdo y **sin líneas en blanco** dentro (si no, Markdown los rompe).

### Quiz de opción múltiple

```html
<div class="quiz" data-answer="2">
<p class="q">¿Pregunta?</p>
<ol><li>Opción A</li><li>Opción B (correcta)</li><li>Opción C</li></ol>
<p class="explain">Explicación que aparece al responder.</p>
</div>
```
`data-answer` empieza en 1. Agrega la clase `grid2` para opciones en dos columnas.

### Predice el valor

```html
<div class="predict" data-answer="25" data-tol="0">
<p class="q">¿Cuántas llamadas hace fib(6)?</p>
<p class="explain">Explicación…</p>
</div>
```

### Temporizador y desplegables

```html
<div class="timer" data-seconds="300"></div>
<details><summary>Ver solución</summary>Texto oculto…</details>
```

### Catálogo de widgets animados

Todos se insertan con una línea: `<div class="w" data-widget="NOMBRE" ...></div>`.
`data-h="300"` limita la altura (px) de la animación.

| `data-widget` | Qué muestra | Atributos |
|---|---|---|
| `tsp` | Robot tour / TSP: vecino más cercano, par más cercano, búsqueda exhaustiva; clic para agregar puntos | `data-preset="line\|clusters\|random"`, `data-algo="nn\|cp\|opt"` |
| `race` | Computadora rápida + n² vs computadora lenta + n log n | — |
| `growth` | Gráfica de crecimiento de funciones (lineal/log) | `data-nmax`, `data-show="log,n,nlogn,n2,n3,2n,fact"` |
| `bigo` | Definición de Big-O con deslizadores c y n₀ | — |
| `opcount` | Conteo de operaciones de distintos ciclos | — |
| `fibtree` | Árbol de llamadas de Fibonacci, ingenuo vs memo | `data-n`, `data-mode="naive\|memo"` |
| `queens` | N reinas con backtracking paso a paso | `data-n` (4–8) |
| `dctree` | Árbol de divide y vencerás (merge sort o máximo) | `data-mode="sort\|max"`, `data-input="40,21,4"` |
| `merge` | Mezcla de dos listas ordenadas | `data-u`, `data-v` |
| `bsearch` | Búsqueda binaria con low/mid/high | `data-input`, `data-target` |
| `master` | Calculadora del teorema maestro | `data-a`, `data-b`, `data-d` |
| `change` | Cambio de monedas: voraz vs óptimo | `data-coins`, `data-amount` |
| `changedp` | Tabla DP de cambio de monedas | `data-coins`, `data-amount` |
| `coinrow` | Tabla DP del coin-row problem | `data-input` |
| `schedule` | Diagrama de Gantt: LPT, SPT, óptimo | `data-jobs`, `data-m`, `data-strategy="lpt\|spt\|opt"` |
| `huffman` | Construcción del árbol de Huffman | `data-text` |
| `knapsack` | Branch & bound best-first para mochila 0/1 | `data-instance="example\|exercise"` |

Para crear un widget nuevo: `Widgets.register("nombre", (host, data) => { ... })` en `widgets.js`; usa `Stepper(render)` para obtener la barra Reset · Prev · Play · Next · End.

### Widgets de geometría computacional (Unidad 4)

Requieren cargar también `assets/js/widgets-geometry.js` (ya incluido en las sesiones 4.1–4.5).
En casi todos se puede **hacer clic para agregar puntos** y **arrastrarlos**.

| `data-widget` | Qué muestra | Atributos |
|---|---|---|
| `orient` | Prueba de orientación con puntos arrastrables en una cuadrícula | — |
| `segtest` | ¿Se cruzan dos segmentos? Las 4 pruebas de orientación | — |
| `closestpair` | Par más cercano por divide y vencerás (franja 2δ) | `data-n`, `data-seed` |
| `sweep` | Barrido de Bentley–Ottmann: cola de eventos y estado | `data-n`, `data-seed` |
| `kdtree` | Construcción de kd-tree y consulta por rango | `data-n`, `data-seed` |
| `hull` | Envolvente convexa: barrido superior/inferior o Jarvis | `data-algo="andrew\|jarvis"`, `data-n` |
| `duality` | Dualidad punto–recta y arreglos de rectas | — |
| `voronoi` | Diagrama de Voronoi interactivo, Delaunay dual, círculos vacíos | `data-n`, `data-delaunay="1"` |
| `fortune` | Algoritmo de Fortune: línea de playa, eventos de sitio y de círculo | `data-n`, `data-seed` |
| `flips` | Flips de Lawson hasta obtener Delaunay | `data-n`, `data-seed` |
| `ric` | Construcción incremental aleatoria de Delaunay | `data-n`, `data-seed` |
| `montecarlo` | Estimación de π o de ∫₀¹ x³ dx con dardos | `data-mode="pi\|int"` |
| `karger` | Corte mínimo de Karger (contracción aleatoria) | — |

### Widgets de búsqueda avanzada (Unidad 5)

Requieren cargar también `assets/js/widgets-search.js` (ya incluido en las sesiones 5.1–5.4).

| `data-widget` | Qué muestra | Atributos |
|---|---|---|
| `treesearch` | BFS, DFS, búsqueda limitada e iterative deepening sobre el árbol 1–15, con la FRINGE | `data-algo="bfs\|dfs\|dls\|ids"`, `data-goal` |
| `gridsearch` | Laberinto editable (muros, lodo): BFS, DFS, Dijkstra, greedy, A*, A* ponderado | `data-algo`, `data-preset="wall\|mud\|maze"` |
| `bits` | Operaciones de bits con bits clicables | — |
| `nqbits` | N reinas con máscaras (cols, diagonales) y conteo de soluciones | `data-n` |
| `pruning` | Laboratorio de poda en suma de subconjuntos (nodos explorados) | `data-n` |
| `mitm` | Meet in the middle con dos apuntadores | `data-input`, `data-target` |
| `puzzle8` | IDA* en el 8-puzzle con h₁ / h₂ | `data-preset="easy\|medium\|hard"` |
| `landscape` | Hill climbing, reinicios aleatorios y recocido simulado | `data-mode="hill\|restart\|sa"` |
| `satsp` | Recocido simulado en el TSP (2-opt), en vivo | `data-n` |
| `ga` | Algoritmo genético para la mochila (W = 15) | — |
| `aco` | Colonia de hormigas en el TSP con feromona visible | `data-n` |

### Numeración

Las sesiones se numeran **unidad.sesión** (1.1, 1.2 … 4.1 … 5.4), dejando lugar para las unidades 2 y 3.
Para una sesión nueva usa el mismo patrón de nombre, por ejemplo `decks/2-1-kmp.html`, y agrégala a `index.html`.
