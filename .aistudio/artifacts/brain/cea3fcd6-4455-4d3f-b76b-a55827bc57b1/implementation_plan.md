# Reestructuración Visual y de Game Feel en Canvas 2D — Rogue Piece: Shells Town

Plan de diseño técnico y dirección artística para elevar la calidad visual del combate en Canvas 2D puro, manteniendo la legibilidad anime de las peleas y una estabilidad estricta a 60 FPS sin librerías externas.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario en la fase de alineación:**
> 1. **Alcance completo**: Se incluyen las **3 propuestas de mejora** (Hit-Reaction & Juice, Telegraphs & Proyectiles, Locomoción & Hazards) **más el rework dinámico de los Cortes (Slashes)**.
> 2. **Dirección visual**: **Estilo anime equilibrado y legible en combate** — contrastes nítidos entre núcleo blanco y silueta de color, sin saturar ni tapar la lectura táctica de enemigos y peligros.
> 3. **Presupuesto de rendimiento**: **Estabilidad a 60 FPS** mediante pools pre-asignados de tamaño fijo, límites por cuadro en estelas/partículas y degradación controlada sin `shadowBlur` costoso en bucles masivos.

---

## 1. Overview & Core Concept

- **Objetivo**: Transformar las formas geométricas estáticas ("programmer art") en animaciones fluidas con principio de *anticipation, follow-through, squash & stretch* y estelas cónicas de estilo anime 2D, logrando que cada golpe, esquive y habilidad comunique peso físico y ritmo claro.
- **Público y contexto**: Jugadores de acción roguelike top-down en escritorio y móvil que necesitan feedback inmediato del daño infligido, lectura clara de amenazas enemigas en oleadas densas y sensación fluida a 60 FPS.
- **Valor principal**: Mayor impacto táctil y claridad en combate sin comprometer el rendimiento ni alterar el balance de mecánicas ya calibradas.

---

## 2. User Experience & Visual Design

### Cuatro Pilares Visuales en Canvas 2D

1. **Rework Dinámico de Cortes (Slashes, Arcos y Barridos)**
   - **Problema actual**: Los cortes (`arc`, `arc_cross`, `shanks_electric_arc`, `wb_haki_sweep`, `kid_ground_sweep`, `sanzen_final`, `line`) spawnean de golpe como trazos de grosor constante.
   - **Diseño nuevo**: Cada corte progresará mediante una curva `easeOutQuart` de barrido angular (`sweepProgress` de borde inicial a borde final en sus primeros `~65ms`), dibujando una **media luna cónica afilada** (*tapered crescent polygon*) más ancha en el frente del filo y afilada en la cola, con **gradiente radial/angular**, núcleo blanco incandescente (`#FFFFFF`), borde cromático de personaje (oro, esmeralda, carmesí Haki, azul cian) y micro-estelas paralelas de aire cortado que se disipan suavemente. Los cortes lineales (*Seaquake*, *Divine Departure*) animarán un destello longitudinal veloz con filo afilado en los extremos.

2. **Hit-Reaction, Partículas Direccionales y Daño Elástico**
   - **Squash & Stretch en enemigos**: Al recibir daño, el sprite enemigo almacena el ángulo del impacto y un temporizador breve (`~0.12s`) para comprimirse/estirarse en el eje del golpe recuperando su forma con curva elástica, acompañado de un **destello en cruz de 4 puntas** en el punto de contacto y partículas orientadas.
   - **Partículas híbridas (`smoke`, `spark`, `shard`)**: El pool existente de `180` partículas incorporará forma direccional (`spark` estirada según `Math.hypot(vx, vy)`) para chispas de choque y fragmentos al derrotar enemigos, manteniendo humo circular suave para vapor y polvo.
   - **Números de daño con curva `easeOutBack`**: Los golpes críticos y finishers harán un *pop-in* rápido (`0.4 → 1.42 → 1.0`) con ligera inclinación aleatoria y contorno reforzado; los golpes normales conservarán lectura limpia y discreta.

3. **Telegraphs Progresivos, Cintas de Proyectiles y Damned Punk**
   - **Telegraphs con relleno de carga ("Charge Fill")**: Los conos de ataque de marines, el círculo/línea de Alvida y las zonas pendientes de Robin dibujarán un perímetro guía y un **relleno interior que crece del 0% al 100%** hasta el instante del impacto, culminando con un flash blanco breve (`~50ms`) para anticipar exactamente cuándo hacer Dash.
   - **Estelas en proyectiles (`trail[]`)**: Proyectiles veloces (*Zoro Air Cut*, *Pound Ho*, *Firebird Star*, *Diable Comet*, *Usopp Pellet*, *Mace Boomerang*) conservarán un búfer circular corto (`5–6` puntos) para trazar cintas cónicas decrecientes detrás del proyectil.
   - **Rework de Damned Punk (Kid)**: Sustituir los tres rectángulos rígidos por un haz electromagnético con **núcleo ondulante**, anillos de pulso viajando por el cañón, boca cónica emisora y arcos eléctricos contenidos dentro de un presupuesto fijo de trazos.

4. **Inercia de Personaje, Siluetas de Dash y Hazards Orgánicos**
   - **Locomoción con peso**: Pequeña inclinación/estiramiento en la dirección del Dash (`scale(1.15, 0.86)`) y compresión breve al aterrizar del salto de Barbablanca (`scale(1.18, 0.84)` en `~0.10s`).
   - **Estelas de Dash (`afterimages`)**: Reemplazar los círculos simples por cápsulas/estelas orientadas al ángulo de desplazamiento con desvanecimiento cónico, líneas de velocidad laterales y pequeñas motas de polvo bajo los pies al correr o girar brusco.
   - **Hazards orgánicos en suelo**: Transformar `kkg_fissure` y `zoro_crack_line` en grietas quebradas con profundidad e irradiación Haki/esmeralda, y `usopp_smoke` en racimos multicapa de lóbulos difusos rotatorios sin bordes duros.

### Paleta, Contraste y Legibilidad Anime (60-30-10)

- **60% Arena y fondo**: Piedra oscura y tonos neutros de Shells Town que mantienen alto contraste con las siluetas y avisos de peligro.
- **30% Personajes y siluetas**: Contornos oscuros firmes (`#000000` / `#111111`) y sombras proyectadas en suelo para anclar la posición exacta de cada hitbox.
- **10% Acentos de combate**: Núcleos blancos (`#FFFFFF`) dentro de colores de firma por personaje (`#F5C518` Luffy, `#66BB6A` Zoro, `#FF1744` Shanks/Haki, `#26C6DA` Law, `#FF5722` fuego) reservados a ataques, críticos y telegraphs de peligro.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Pools pre-asignados y presupuesto por cuadro vs. creación libre de objetos**
  - *Enfoque elegido*: Mantener el pool de `180` partículas y `55` textos flotantes (con soporte de tipos `spark`/`smoke` y datos de escala), limitar los historiales `trail[]` de proyectiles a `5–6` vértices y evitar `ctx.shadowBlur` en bucles de partículas/proyectiles.
  - *Por qué*: El usuario priorizó **estabilidad a 60 FPS** en dispositivos modestos; `shadowBlur` en Canvas 2D dispara picos de GPU/CPU cuando hay múltiples efectos simultáneos, mientras que capas aditivas de gradiente o trazos dobles logran el mismo look anime a una fracción del costo.
  - *Alternativas descartadas*: Incrementar pools a 500+ partículas o usar múltiples `offscreen` blurs por frame.

- **Decisión 2: Animación visual desacoplada de la hitbox instantánea**
  - *Enfoque elegido*: Conservar la detección de daño exacta y probada en el instante de ejecución del ataque, mientras el barrido visual de media luna o el *squash* se interpola en `65ms–180ms`.
  - *Por qué*: Preserva intacta la respuesta inmediata de controles, *auto-aim* y combos ya balanceados sin introducir retrasos artificiales en el registro de golpes.
  - *Alternativas descartadas*: Barrido de colisión cuadro a cuadro sincronizado al ángulo visual (riesgo de fallos de hit en enemigos rápidos o a baja tasa de frames).

- **Decisión 3: Legibilidad de telegraphs por forma + progreso de llenado (no solo color)**
  - *Enfoque elegido*: Combinar contorno exterior definido, relleno progresivo interior desde `0%` a `100%` y destello de advertencia justo antes del impacto.
  - *Por qué*: Cumple principios de accesibilidad (sin depender únicamente del matiz de color) y evita que el efecto anime tape enemigos o proyectiles debajo.

---

## 4. Technical Architecture & Data Strategy

### Flujo de Renderizado y Game Feel en Canvas 2D

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GAME LOOP (dt <= 0.05s)                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌────────────────┐      ┌────────────────┐
│  Combat Logic │      │  Entity Motion │      │  Visual Pools  │
│  (Hitboxes &  │─────▶│  & Kinesthetics│─────▶│ (Fixed Caps)   │
│   Telegraphs) │      │                │      │                │
│               │      │ • hitSquash    │      │ • particles180 │
│ • slashSweep  │      │ • dashStretch  │      │ • floatText55  │
│ • impactAngle │      │ • landSquash   │      │ • trail[5..6]  │
│ • chargeProg  │      │ • footDust     │      │ • afterimages  │
└───────┬───────┘      └───────┬────────┘      └───────┬────────┘
        │                      │                       │
        └──────────────────────┼───────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CANVAS 2D RENDER PIPELINE (Ordered)                  │
│  1. Camera + Smooth Zoom & Shake                                        │
│  2. Arena Floor + Progressive Telegraphs (0→100%) + Organic Hazards     │
│  3. Directional Dash Afterimages + Foot Dust                            │
│  4. Enemies (Hit Squash/Stretch + Status) & Player (Inertia Scale)      │
│  5. Tapered Crescent Slashes + Rubber Arms + Damned Punk Beam           │
│  6. Projectiles with Gradient Trails + Hybrid Sparks/Smoke              │
│  7. Impact Flares + EaseOutBack Floating Damage Numbers                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Contratos de Estado y Comportamiento por Módulo

| Módulo / Entidad | Nuevos campos de estado | Comportamiento visual y límites |
| :--- | :--- | :--- |
| **Slash Effects** | `sweepSpeed`, `tapered`, `subColor` | Barrido angular rápido (`easeOutQuart`) en polígono de media luna afilada; cortes lineales con núcleo incandescente y estelas laterales. |
| **Enemies (`drawEnemy`)** | `hitSquashTimer`, `hitSquashMax`, `hitAngle` | Compresión/estiramiento rotado hacia `hitAngle` durante `0.12s` al recibir daño, más destello en cruz al momento del impacto. |
| **Particles Pool** | `shape` (`'circle'` \| `'spark'`), `spin` | Tope estricto de `180` ranuras; `spark` dibuja trazo afilado alineado al vector `(vx, vy)` con reducción progresiva. |
| **Floating Texts Pool** | `isCrit`, `tiltAngle` | Tope de `55` ranuras; *pop-in* con `easeOutBack` (`0.14s`) y escala diferenciada para críticos y finishers. |
| **Player (`STATE.player`)** | `visualScaleX`, `visualScaleY`, `stepDustTimer` | Interpolación suave hacia `(1, 1)` cada frame; estiramiento al iniciar Dash, compresión al aterrizar de salto y polvo ocasional al correr. |
| **Projectiles & Telegraphs** | `trail: [{x, y}]` (máx. 6), `telegraphDuration` | Cola cónica con gradiente en proyectiles rápidos; telegraphs enemigos y `pendingStrikes` rellenan área `0→100%` antes de detonar. |
| **Hazards (`kkg`, `zoro`, `smoke`)** | `seed` / vértices deterministas | Grietas quebradas pre-calculadas (sin parpadeo aleatorio por frame) y nubes multicapa suaves sin borde duro. |

### Mapeo de Interacciones y Transiciones Críticas

1. **Ataque cuerpo a cuerpo / Habilidad de corte**: Calcula el daño inmediatamente como hasta ahora → registra `hitAngle` y `hitSquashTimer` en cada enemigo alcanzado + emite chispas `spark` en el punto de contacto → inserta el efecto en `slashEffects` para su barrido visual en Canvas.
2. **Enemigo telegrafiando ataque**: Incrementa su ratio de progreso `1 - (telegraphTimer / telegraphDuration)` hasta alcanzar el borde exterior y emitir un breve destello antes de ejecutar el golpe o proyectil.
3. **Dash / Salto de Barbablanca**: Activa deformación direccional temporal en el jugador, genera estelas orientadas al ángulo de movimiento y recupera escala `(1, 1)` suavemente al frenar o aterrizar, limpiando todos los estados temporales al reiniciar partida o cambiar de personaje.
