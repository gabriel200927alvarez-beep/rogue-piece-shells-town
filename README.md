# Rogue Piece: Shells Town

Roguelike de acción en HTML5 Canvas + Web Audio API ambientado en Shells Town, con **12 piratas jugables**, **5 oleadas**, **Boss Capitana Alvida (3 fases)**, sistema de mejoras de 3 capas y soporte completo **táctil + teclado/ratón**.

## Controles rápidos (PC y Móvil)
- **Móvil / Táctil:** Joystick izquierdo virtual + botones de ataque, dash y 3 habilidades en la esquina inferior derecha.
- **Teclado:**
  - `WASD` o `Flechas`: Moverse
  - `Espacio` o `J`: Ataque normal (mantener para combos)
  - `Shift` o `K`: Dash
  - `1 / 2 / 3` (o `U / I / O`): Habilidades H1 / H2 / H3 (mantener `3` con Luffy PTS para cargar King Kong Gun)
  - `Esc` o `P`: Pausa

## Cómo subir y guardar versiones en GitHub

1. Crea un repositorio vacío en GitHub (por ejemplo `rogue-piece`) sin inicializar README ni `.gitignore`.
2. Conecta tu repositorio local y sube la rama principal junto con las etiquetas de versión:

```bash
git remote add origin https://github.com/TU_USUARIO/rogue-piece.git
git push -u origin main
git push origin --tags
```

3. **Para guardar una nueva versión (por ejemplo `v1.9c` o `v2.0`) en el futuro:**

```bash
git add .
git commit -m "Release v1.9c: descripción de cambios"
git tag -a v1.9c -m "Rogue Piece v1.9c"
git push origin main --tags
```

Cada vez que subas una etiqueta `v*`, el workflow `.github/workflows/release.yml` compilará automáticamente la versión y creará un **GitHub Release** con el archivo `rogue-piece-v*.html` adjunto listo para descargar o probar. Además, `.github/workflows/pages.yml` publica la rama `main` en **GitHub Pages** (actívalo en *Settings → Pages → Source: GitHub Actions*).

## Desarrollo local

```bash
npm install
npm run dev
npx tsx --test src/game/rules.test.ts
npm run build
```
