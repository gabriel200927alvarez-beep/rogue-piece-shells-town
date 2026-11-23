# Rogue Piece: Shells Town

**Roguelike de oleadas táctil** ambientado en el universo de One Piece. Derrota oleadas de marines y derrota a la capitana Alvida.

🎮 **[Jugar en línea](https://<TU_USUARIO>.github.io/rogue-piece-shells-town/)** (GitHub Pages)

---

## Controles

### Móvil (Táctil)
| Zona | Acción |
|------|--------|
| Joystick izquierdo | Movimiento |
| Botón grande derecho (👊) | Ataque básico / Combo (mantener) |
| Botón Dash (💨) | Esquiva con i-frames |
| H1, H2, H3 | Habilidades especiales del personaje |

### Escritorio (Teclado/Ratón)
| Tecla | Acción |
|-------|--------|
| WASD / Flechas | Movimiento |
| Espacio / Click izquierdo | Ataque básico |
| Shift / Click derecho | Dash |
| 1, 2, 3 | Habilidades H1, H2, H3 |

---

## Personajes (12)

### Comunes (1.0×)
- **Luffy** - Tanque/Luchador | Gatling, Bazooka, Storm
- **Zoro** - DPS Área | Oni Giri, Pound Ho, Sanzen
- **Sanji** - DPS Móvil | Diable, Concasse, Diable Jambe Barrage

### Raros (1.1×)
- **Usopp** - Francotirador (280px) | Firebird, Smoke, Ledger
- **Franky** - Tanque Cyborg | Radical, Hammer, Coup Vent
- **Robin** - Control Masas | Clutch, MilFleur, Mano Gigante

### Épicos (1.25×)
- **Law** - Control ROOM | ROOM, Shambles, Gamma Knife
- **Kid** - Tanque Transformable | Attract, Punk Rotten, Damned Punk
- **Killer** - DPS Sangrado | Sonic Scythe, Bloodlust, Killer Frenzy

### Legendarios (1.5×)
- **Shanks** - Emperador Haki | Conqueror's Haki, Divine Departure, Future Sight
- **Barbablanca** - Devastador Sísmico | Seaquake, Island Shaking (salto), Island Shaking (zona)
- **Luffy PTS** - Capitán Post-TS | Red Hawk Gatling, Gear 2nd, King Kong Gun

---

## Mecánicas Clave

- **Combo básico**: 3 golpes (4 para Shanks/Killer/Luffy PTS), ventana 0.65s
- **Dash**: 165px, 0.16s, i-frames 0.22s (1 carga base, 2 para Killer)
- **Habilidades**: 3 por personaje con cooldowns individuales
- **Oleadas**: 5 oleadas, dificultad creciente, boss Alvida en oleada 5 (3 fases)
- **Mejoras roguelike**: 3 opciones por oleada, modo seguro 3 capas (bloqueo → liberación → confirmación)

### Reglas Especiales
- **Sanji vs Alvida**: Ataque normal = 0 daño + "¡No pateo damas! ♥" | Habilidades SÍ dañan
- **Sanji dash**: +15% velocidad 2s tras dash
- **Killer dash**: 2 cargas + sangrado

---

## Desarrollo

### Requisitos
- Navegador moderno con soporte Web Audio API y Canvas 2D
- Servidor local para evitar CORS (ej: `npx serve` o `python3 -m http.server`)

### Estructura
```
├── index.html          # Juego completo (HTML5 Canvas + Web Audio API)
├── CHANGELOG.md        # Historial de versiones
├── .gitignore
└── README.md
```

### Ejecutar localmente
```bash
npx serve .
# o
python3 -m http.server 8000
# Abrir http://localhost:3000 o http://localhost:8000
```

---

## Créditos

- **Desarrollo**: Hefesto + AI Studio
- **Arte/Sprites**: Generados por código (Canvas 2D)
- **Audio**: Web Audio API sintético
- **Inspiración**: One Piece (Eiichiro Oda / Shueisha / Toei)

---

## Licencia

Proyecto personal sin fines de lucro. Código y assets generados para aprendizaje.
