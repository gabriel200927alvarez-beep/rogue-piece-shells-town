# Changelog - Rogue Piece: Shells Town

## [v1.9b-playable] - 2026-11-23
### Fixed
- Cerrado el bloque `function trySkill(idx)` después de `luffy_pts` y eliminada la llave sobrante al final del script para restaurar el alcance global de `update()`, `render()`, listeners y `gameLoop()`.
- Eliminado el overlay temporal `#__dbg_box` y funciones duplicadas (`addShanksHaki`, `addWhitebeardEnergy`).
- Añadido soporte completo de teclado (`WASD`/Flechas, `Espacio`/`J` atacar, `Shift`/`K` dash, `1`/`2`/`3` habilidades, `Esc`/`P` pausa) y clics de ratón en todos los botones del HUD.
- Ajustados `.skill-label` y `#tutorial-tooltip` para evitar solapamientos en pantalla.

## [v1.9b] - 2026-11-23
- Ajustes de los 3 Legendarios (Shanks Straw Hat, Barbablanca, Luffy PTS), 9 personajes base intactos y regla Sanji vs Alvida.

## [v1.9] - 2026-11-23
- Rediseño integral de los 3 Legendarios con mecánicas de combate avanzadas, hit-stops y shakes calibrados.

## [v1.8] - 2026-11-22
- Añadidos Shanks Straw Hat, Barbablanca y Luffy PTS, rarezas Legendario (1.5x) y Yonko (2.0x), y selector ampliado a 12 piratas.

## [v1.7b] - 2026-11-22
- Versión base funcional en `index.html` (HTML5 Canvas + Web Audio API) con 9 personajes y Alvida como boss.
