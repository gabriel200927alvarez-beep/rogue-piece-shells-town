# PROYECTO: Rogue Piece

## QUÉ ES
Rogue Piece es un juego roguelike de oleadas ambientado en One Piece, para móvil horizontal, 100% táctil (sin teclado, sin ratón). Actualmente el escenario es Shells Town (arco de Alvida). Construido en un único `index.html` con CSS y JS embebidos, sin dependencias externas ni assets externos (todo dibujado con Canvas 2D y audio procedural con Web Audio API).

## VERSIÓN ACTUAL: 1.9b (funcional y estable)
El archivo `index.html` es la versión 1.9b de Rogue Piece: Ajustes de gameplay y visuales profundos para los 3 Legendarios (Shanks Straw Hat, Barbablanca y Luffy Post Time Skip) resolviendo problemas de balance, movilidad y feedback sensorial. Conserva los 12 personajes jugables, la selección ampliada y los 9 personajes no-Legendarios intactos, así como la regla intocable de Sanji vs Alvida.

## SISTEMAS IMPLEMENTADOS Y FUNCIONANDO (NO ROMPER)
- 12 personajes jugables con rareza asignada:
  - Comunes (gris, 1.0×): Luffy, Zoro, Sanji.
  - Raros (azul, 1.1×): Usopp, Franky, Robin.
  - Épicos (púrpura, 1.25×): Law, Kid, Killer.
  - Legendarios (dorado, 1.5×): Shanks (Straw Hat), Barbablanca, Luffy (Post Time Skip).
- Cada personaje: ataque normal, dash con i-frames, 3 habilidades (H1, H2, H3) con cooldown, pasiva, recurso propio (algunos).
- Sistema de rarezas definido (Común 1.0×, Raro 1.1×, Épico 1.25×, Legendario 1.5×, Yonko 2.0×) con `multiplicadorStats` activo en HP, Daño y Armadura.

---

### AJUSTES Y ESPECIFICACIÓN DE LOS 3 LEGENDARIOS (v1.9b):

#### 1. Shanks (Straw Hat) [Rareza Legendario - Daño base 18, efectivo 27 (18 × 1.5)]:
- **A1. Dash (CD 1.5 s)**:
  - Cooldown reducido de 2.0 s a 1.5 s (`dashCd: 1.5`, `p.dashCdMax = 1.5`).
  - Alcance: 180 px (`p.customDashDist = 180`), i-frames 0.15 s (`p.invulnTimer = 0.15`), estela de corte roja.
- **A2. Ataque Normal — Golpe 5 (Arco Rojo Eléctrico Colosal)**:
  - Alcance ampliado de 180 px a **300 px**.
  - Ancho de corte aumentado **×2** (`width: 140`).
  - Empuje aumentado de 60 px a **100 px**.
  - Visual: `shanks_electric_arc` con núcleo negro de Haki avanzado y rayos eléctricos rojos/blancos chisporroteando a lo largo del arco.
  - Daño 1.8× + 2 stacks de sangrado.
  - Sensación: Hit-stop 0.08 s, screen shake 5 px al impactar. Sonido slash-boom grave + chisporroteo eléctrico.
- **A3. H1 — "Conqueror's Haki" (Círculo Rojo Vibrante 360° + Stun Base 3.0 s)**:
  - Hitbox circular 360° de radio **220 px** alrededor de Shanks.
  - Stun BASE aumentado a **3.0 s** (antes 2.5 s).
  - Escalado por Haki acumulado:
    - 0–24 Haki: 1.5× daño, stun 3.0 s.
    - 25–49 Haki: 1.8× daño, stun 3.3 s.
    - 50–74 Haki: 2.2× daño, stun 3.6 s.
    - 75–99 Haki: 2.6× daño, stun 3.9 s.
    - 100 Haki: 3.2× daño, stun 4.2 s, y consume TODO el Haki (vuelve a 0).
  - Visual: `shanks_haki_burst` (círculo rojo vibrante con deformación en los bordes y ondas concéntricas de impacto). Cooldown 10 s.
- **A4. H2 — "Divine Departure" (Dash-Cortes Dinámicos + Alcance 320 px + Sangrado Extra)**:
  - Cada corte de la cadena (1 al 5) es ahora un **dash-corte** con desplazamiento real: Shanks viaja hacia el enemigo targeteado hasta posicionarse a ~60 px de distancia.
  - Alcance ampliado de 250 px a **320 px**.
  - Invulnerabilidad (i-frames): 0.10 s en cada desplazamiento con estela de afterimages rojas.
  - Cortes 1 al 4: 0.8× daño + 1 stack de sangrado.
  - Corte 5 (Remate): 2.5× daño al objetivo + stun 1.5 s + 2 stacks de sangrado base + **2 stacks de sangrado extra al objetivo principal** (4 stacks totales al target) + daño en área de 80 px (`divine_x`).
  - Si el target muere durante la cadena, retargetea dinámicamente al enemigo más cercano vivo en 320 px.
- **A5. H3 — "Future Sight" (+30% Velocidad de Movimiento)**:
  - 5.0 s de invulnerabilidad total con texto flotante `MISS` y esquiva lateral ante impactos.
  - **+30% de velocidad de movimiento** durante toda la duración (`speedMult *= 1.30`).
  - Visual: aura roja translúcida y estelas rojas de velocidad (`shanks_speed_trail`) mientras se desplaza. Cooldown 18 s.
- **A6. Pasiva Exclusiva — Parry de Proyectiles**:
  - Mecánica reactiva: cuando una bala enemiga (proyectil de marine tirador o mazo boomerang de Alvida) colisiona con Shanks, si el jugador está atacando o pulsó ataque en una ventana de ~0.2 s, la bala es **CORTADA** y se desintegra sin infligir daño.
  - Visual: destello de partículas rojas + texto flotante `CUT!` en rojo.
  - Sonido: impacto metálico "ting" (`playMetalClank` + `playShing`).

---

#### 2. Edward Newgate (Barbablanca) [Rareza Legendario - Daño base 17, efectivo 25.5 (17 × 1.5)]:
- **B1. Ataque Normal — Golpe 1 (Grieta Sísmica Fuerte)**:
  - Mantener dimensiones (200 × 60 px), 1.5× daño, aturdimiento 0.8 s, hit-stop 0.06 s, sin screen shake.
  - Visual renovado: `wb_fissure_wide` con fisura ancha blanca, detalles carmesí y rocas que se levantan del suelo (sensación de mini-Island Shaking en línea recta).
- **B2. Ataque Normal — Golpe 2 (Abanico de 3 Cortes Largos)**:
  - 3 cortes largos hacia adelante en abanico con cadencia rápida:
    - Corte 1: frontal recto (0°), alcance 150 px.
    - Corte 2: diagonal izquierda (-30°), alcance 150 px (a los 0.12 s).
    - Corte 3: diagonal derecha (+30°), alcance 150 px (a los 0.24 s).
  - Cada corte inflige 0.6× daño + 1 stack de sangrado, hit-stop 0.03 s y sonido de tajos sucesivos ("shing-shing-shing").
- **B3. Ataque Normal — Golpe 3 (Barrido Rojo con Haki en Abanico 180°)**:
  - Hitbox en abanico semicircular frontal de **180°** con **180 px** de alcance (`wb_haki_sweep`).
  - Daño 2.0×, empuje de 80 px, **aturdimiento de 0.5 s (NUEVO)**, 2 stacks de sangrado.
  - Visual: arco carmesí amplio con electricidad negra y roja de Haki avanzado (reemplaza el rayo tipo láser anterior). Screen shake 5 px, hit-stop 0.06 s.
- **B4. H2 — "Island Shaking" Salto (Animación de Salto Real con Sprite 1.4×)**:
  - Desplazamiento cinemático en 2 fases:
    1. Anticipación: 0.15 s donde se agacha (escala 0.85×).
    2. Vuelo: 0.40 s donde viaja por el aire hacia el target; el sprite se agranda suavemente hasta **1.4×** en el ápice de la parábola para dar profundidad 3D y la sombra en el suelo se expande.
  - Invulnerabilidad completa (i-frames de 0.55 s) durante todo el salto.
  - Aterrizaje: 2.0× daño, empuje 100 px en radio de 120 px, stun 0.8 s, screen shake 7 px y fisura circular sísmica (`wb_fissure_ring`). 2 cargas con recarga de 2.2 s por carga.
- **B5. H3 — "Island Shaking" Gura Gura (Cancelable + Bloqueo de Movimiento y Habilidades)**:
  - **Cancelable anticipadamente**: botón visible `#btn-cancel-quake` ("CANCEL") en la esquina inferior derecha o **pulsando H3 nuevamente**. Al activarse la habilidad, el cooldown se mantiene en 0 s; al cancelarse (por botón o re-toque de H3) o al expirar tras su duración (6 a 11 s), el área y escudo se disipan y empieza de inmediato su cooldown de 20 s.
  - **Bloqueo estricto**: mientras la zona está activa, el Dash, H1 y H2 están completamente bloqueados (botones atenuados con candado).
  - Únicamente el ataque básico permanece activo, disparando terremotos sísmicos bajo los enemigos (CD interno 1.0 s).

---

#### 3. Luffy (Post Time Skip) [Rareza Legendario - Daño base 17, efectivo 25.5 (17 × 1.5)]:
- **C1. Ataque Normal — Cadencia Pausada + Cooldown Post-Combo**:
  - Golpes 1 y 2 (Jet Pistol): añadidos 0.15 s de recuperación tras el impacto antes del siguiente golpe.
  - Golpe 3 (Jet Gatling): ráfaga de 12 puñetazos espaciados a 0.125 s cada uno (~1.5 s de duración total) transmitiendo peso y contundencia.
  - Golpe 4 (Jet Bazooka Finisher): al disparar el finisher se aplica un **cooldown post-combo de 0.6 s** que impide el spam inmediato, acompañado de un overlay de recarga visual circular en el botón de ataque (`#btn-attack-cd-overlay`).
- **C2. H1 — "Red Hawk Gatling" (Cono 140° + Ráfaga Rápida 1.2 s + Targeteo Dinámico + Finisher 300 px)**:
  - Cono ensanchado de 90° a **140°**.
  - Velocidad aumentada: 15 impactos ejecutados en **1.2 s** (0.08 s por golpe).
  - **Targeteo dinámico continuo**: rastrea activamente al enemigo vivo más cercano en un radio de 250 px, rotando el ángulo de ataque si el objetivo original muere.
  - Finisher: pelota colosal de Haki negro que estalla en un área de **300 px** (el doble que antes), infligiendo **5.5× daño**, empujando **150 px**, screen shake de 10 px y hit-stop de 0.12 s. Cooldown 12 s.
- **C3. H2 — "Gear 2nd" (Bloqueo de Re-activación)**:
  - Mientras el buff de Gear 2nd está activo, el botón H2 queda atenuado con candado y etiqueta `ACTIVE`, impidiendo re-activaciones infinitas.
  - El cooldown completo de 18 s inicia estrictamente cuando el buff expira.
- **C4. H3 — "King Kong Gun" (Carga Ininterrumpible en Gear 2 + Escudo de Haki + Daño +50% + Área 300 px)**:
  - **Carga Ininterrumpible y Aislamiento Táctil**: si Luffy está en Gear 2nd al cargar el King Kong Gun, recibir daño NO cancela la carga. Un aura/escudo visible de Haki avanzado negro/rojo rodea a Luffy. Fuera de Gear 2nd, el daño sí cancela la carga.
  - **Control Táctil Tocar / Sostener**: seguimiento aislado mediante `kkgTouchId` con umbral de 150 ms para que soltar el joystick o tocar otras zonas de la pantalla no cancele la carga. Puede sostenerse para cargar y soltar, o tocar para comenzar a cargar y volver a tocar para disparar (o disparo automático a los 2.5 s de carga máxima). El CD de 18 s inicia estrictamente tras el impacto.
  - **Área ampliada**: radio de impacto de 200 px a **300 px** (×1.5).
  - **Daño incrementado un +50%**:
    - 0 s: 4.5× (antes 3×).
    - 1 s: 6.75× (antes 4.5×).
    - 2 s: 9.0× (antes 6×).
    - 2.5 s (máximo): **12.0×** (antes 8×).
  - Empuje 180 px, stun 2.0 s, quemadura (5 dps por 3 s), screen shake de 12 px, hit-stop de 0.15 s y grieta en el suelo de 3.0 s. Cooldown 18 s.

---

### SISTEMAS COMUNES Y PERSONAJES NO-LEGENDARIOS:
- Los 9 personajes no-Legendarios (Luffy, Zoro, Sanji, Usopp, Franky, Robin, Law, Kid, Killer) se mantienen completamente funcionales y con sus sistemas intactos.
- Killer: sistema de sangrado con stacks y "Desgarro 5×".
- Law: ROOM que ralentiza proyectiles, buff y rango extra SOLO dentro del ROOM, Shambles (H2) solo usable con ROOM activo.
- Kid: Attract/Repel en dos fases, Punk Rotten (transformación 8 s, escala 1.5×), Damned Punk.
- Boss: Alvida con 3 fases.
- Audio procedural Web Audio API para todos los eventos.

## REGLAS INTOCABLES (NO CAMBIAR NUNCA)
1. Sanji no puede golpear a Alvida con ataque normal (`en.isFemale = true` muestra ❤️ y hace 0 daño). Sus habilidades SÍ le hacen daño.
2. Todo el código debe estar comentado en español por secciones.
3. El juego es 100% móvil horizontal, táctil. Sin teclado, sin ratón, sin hover.
4. Todo en un único `index.html`, sin dependencias externas, sin assets externos.
5. Todos los nombres de habilidades deben estar en INGLÉS y ser CANÓNICOS de One Piece.
6. El modo de trabajo es ITERATIVO: cambios quirúrgicos, verificando que no se rompe lo que funciona.
7. Shanks (Straw Hat) es la versión del East Blue / Romance Dawn (un solo brazo, sombrero de paja).
8. Luffy (Post Time Skip) tiene el Gear 4 bloqueado (icono de hype). El Gear 5 (Nika) está reservado para Luffy (Yonko).
