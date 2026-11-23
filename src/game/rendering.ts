// ============================================================================
// 7 & 9. RENDERIZADO: FONDO OFF-SCREEN, PREVIEWS, JUGADOR, ENEMIGOS Y VFX
// ============================================================================

import { CONFIG, CHARACTERS } from './config';
import { STATE } from './state';
import { CAMERA } from './camera';
import { INPUT_TOUCH } from './input';

let canvas: HTMLCanvasElement | null = null;
let ctx!: CanvasRenderingContext2D;

let bgCanvas: HTMLCanvasElement | null = null;
let bgCtx: CanvasRenderingContext2D | null = null;

function ensureRenderContext(): boolean {
  if (ctx) return true;
  if (typeof document === 'undefined') return false;
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  const context = canvas ? canvas.getContext('2d') : null;
  if (!context) return false;
  ctx = context;
  return true;
}

function ensureBgCanvas(): HTMLCanvasElement | null {
  if (bgCanvas && bgCtx) return bgCanvas;
  if (typeof document === 'undefined') return null;
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = CONFIG.WORLD_WIDTH;
  bgCanvas.height = CONFIG.WORLD_HEIGHT;
  bgCtx = bgCanvas.getContext('2d');
  return bgCanvas;
}

export function prerenderBackground(liberated = false): void {
  ensureBgCanvas();
  if (!bgCtx) return;

  bgCtx.fillStyle = liberated ? '#565A64' : '#3E3E44';
  bgCtx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

  const tileW = 80, tileH = 50;
  for (let y = 0; y < CONFIG.WORLD_HEIGHT; y += tileH) {
    const offset = (y / tileH) % 2 === 0 ? 0 : tileW / 2;
    for (let x = -tileW; x < CONFIG.WORLD_WIDTH + tileW; x += tileW) {
      bgCtx.fillStyle = ((x + y) % 160 === 0) ? (liberated ? '#5D626E' : '#46464E') : (liberated ? '#4F535E' : '#3A3A40');
      bgCtx.fillRect(x + offset + 2, y + 2, tileW - 4, tileH - 4);
    }
  }

  bgCtx.strokeStyle = 'rgba(200, 169, 81, 0.35)';
  bgCtx.lineWidth = 6;
  bgCtx.beginPath();
  bgCtx.arc(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2, 220, 0, Math.PI * 2);
  bgCtx.stroke();

  const decorSeed = [
    { x: 420, y: 340, t: 'crate' }, { x: 460, y: 360, t: 'barrel' },
    { x: 920, y: 280, t: 'rock' },  { x: 1640, y: 320, t: 'crate' },
    { x: 2100, y: 420, t: 'barrel' },{ x: 520, y: 1080, t: 'barrel' },
    { x: 1050, y: 1150, t: 'crate' },{ x: 1580, y: 1120, t: 'rock' },
    { x: 2050, y: 1040, t: 'crate' },{ x: 780, y: 720, t: 'sign' },
    { x: 1780, y: 720, t: 'sign' }
  ];

  decorSeed.forEach(d => {
    if (!bgCtx) return;
    if (d.t === 'crate') {
      bgCtx.fillStyle = '#8B5A2B';
      bgCtx.strokeStyle = '#3A2210';
      bgCtx.lineWidth = 3;
      bgCtx.fillRect(d.x - 22, d.y - 22, 44, 44);
      bgCtx.strokeRect(d.x - 22, d.y - 22, 44, 44);
      bgCtx.beginPath();
      bgCtx.moveTo(d.x - 22, d.y - 22); bgCtx.lineTo(d.x + 22, d.y + 22);
      bgCtx.stroke();
    } else if (d.t === 'barrel') {
      bgCtx.fillStyle = '#6B4423';
      bgCtx.strokeStyle = '#2A1A0E';
      bgCtx.lineWidth = 3;
      bgCtx.beginPath();
      bgCtx.arc(d.x, d.y, 18, 0, Math.PI * 2);
      bgCtx.fill(); bgCtx.stroke();
    } else if (d.t === 'rock') {
      bgCtx.fillStyle = '#5A5A66';
      bgCtx.beginPath();
      bgCtx.ellipse(d.x, d.y, 32, 22, 0.2, 0, Math.PI * 2);
      bgCtx.fill();
    } else if (d.t === 'sign') {
      bgCtx.fillStyle = '#4A321F';
      bgCtx.fillRect(d.x - 4, d.y - 24, 8, 48);
      bgCtx.fillStyle = '#F4E4C1';
      bgCtx.fillRect(d.x - 26, d.y - 22, 52, 22);
    }
  });

  const mx = CONFIG.ARENA_MARGIN_X;
  const my = CONFIG.ARENA_MARGIN_Y;
  bgCtx.fillStyle = '#5C3A21';
  bgCtx.fillRect(0, 0, CONFIG.WORLD_WIDTH, my);
  bgCtx.fillRect(0, CONFIG.WORLD_HEIGHT - my, CONFIG.WORLD_WIDTH, my);
  bgCtx.fillRect(0, 0, mx, CONFIG.WORLD_HEIGHT);
  bgCtx.fillRect(CONFIG.WORLD_WIDTH - mx, 0, mx, CONFIG.WORLD_HEIGHT);

  bgCtx.strokeStyle = '#C8A951';
  bgCtx.lineWidth = 6;
  bgCtx.strokeRect(mx, my, CONFIG.WORLD_WIDTH - mx * 2, CONFIG.WORLD_HEIGHT - my * 2);

  bgCtx.fillStyle = '#1B3A6B';
  for (let x = 220; x < CONFIG.WORLD_WIDTH - 220; x += 380) {
    bgCtx.fillRect(x, 12, 95, 48);
    bgCtx.strokeStyle = '#F5C518';
    bgCtx.lineWidth = 2;
    bgCtx.strokeRect(x, 12, 95, 48);
  }
}

export function initRendering(): void {
  ensureRenderContext();
  prerenderBackground(false);
}

if (typeof document !== 'undefined') {
  prerenderBackground(false);
}

// ==========================================================================
// 8. UI & PREVIEWS ANIMADOS DE LOS 12 PERSONAJES
// ==========================================================================
export function renderCharacterPreviews(timeMs: number): void {
  if (STATE.screen !== 'select') return;
  const t = timeMs * 0.005;

  ['luffy', 'zoro', 'sanji', 'usopp', 'franky', 'robin', 'law', 'kid', 'killer', 'shanks', 'whitebeard', 'luffy_pts'].forEach((id, idx) => {
    const c = document.getElementById(`preview-${id}`) as HTMLCanvasElement | null;
    if (!c) return;
    const pctx = c.getContext('2d');
    if (!pctx) return;
    pctx.clearRect(0, 0, 52, 52);

    const cfg = CHARACTERS[id];
    const bob = Math.sin(t + idx) * 2.0;

    pctx.save();
    pctx.translate(26, 29 + bob);

    pctx.fillStyle = 'rgba(0,0,0,0.45)';
    pctx.beginPath();
    pctx.ellipse(0, 15 - bob, 14, 5, 0, 0, Math.PI * 2);
    pctx.fill();

    if (id === 'luffy') {
      const armSwing = Math.sin(t * 1.4) * 3.5;
      pctx.fillStyle = '#FFCC80';
      pctx.strokeStyle = '#000';
      pctx.lineWidth = 2;
      pctx.beginPath();
      pctx.arc(-14, 2 + armSwing, 4.5, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();
      pctx.beginPath();
      pctx.arc(14, 2 - armSwing, 4.5, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();

      pctx.fillStyle = '#C8102E';
      pctx.beginPath();
      pctx.arc(0, 1, 13, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();

      pctx.fillStyle = '#F5C518';
      pctx.beginPath();
      pctx.ellipse(0, -6, 17, 7, 0, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();

      pctx.fillStyle = '#E6B400';
      pctx.beginPath();
      pctx.arc(0, -9, 9.5, Math.PI, 0);
      pctx.fill(); pctx.stroke();

      pctx.strokeStyle = '#C8102E';
      pctx.lineWidth = 2.8;
      pctx.beginPath();
      pctx.moveTo(-9.5, -8.5);
      pctx.lineTo(9.5, -8.5);
      pctx.stroke();
    } else if (id === 'zoro') {
      const swordBob = Math.sin(t * 1.3) * 2;
      pctx.fillStyle = '#FFCC80';
      pctx.strokeStyle = '#000';
      pctx.lineWidth = 2;
      pctx.beginPath();
      pctx.arc(-13, 2 - swordBob, 4, 0, Math.PI * 2);
      pctx.arc(13, 2 + swordBob, 4, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();

      pctx.fillStyle = cfg.vestColor;
      pctx.beginPath(); pctx.arc(0, 1, 13, 0, Math.PI * 2); pctx.fill(); pctx.stroke();

      pctx.strokeStyle = '#E0E0E0'; pctx.lineWidth = 2.5;
      pctx.beginPath();
      pctx.moveTo(-18, 9 + swordBob); pctx.lineTo(18, -7 - swordBob);
      pctx.moveTo(-18, -7 + swordBob); pctx.lineTo(18, 9 - swordBob);
      pctx.stroke();

      pctx.fillStyle = '#2E7D32';
      pctx.beginPath(); pctx.arc(0, -5, 9.5, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
    } else if (id === 'sanji') {
      const kickSwing = Math.sin(t * 1.6) * 3;
      pctx.fillStyle = cfg.vestColor;
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.beginPath(); pctx.arc(0, 1, 13, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#FF7043';
      pctx.beginPath(); pctx.arc(11, 9 + kickSwing, 5.5, 0, Math.PI * 2); pctx.fill();
      pctx.fillStyle = '#FDD835';
      pctx.beginPath(); pctx.arc(0, -5, 9.5, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
    } else if (id === 'usopp') {
      pctx.fillStyle = '#6B8E23';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.beginPath(); pctx.ellipse(0, 2, 10, 14, 0, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#5D4037';
      pctx.beginPath(); pctx.ellipse(-5, -8, 13, 6.5, -0.25, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.strokeStyle = '#3E2723'; pctx.lineWidth = 3;
      pctx.beginPath(); pctx.moveTo(9, 2); pctx.lineTo(17, -5); pctx.moveTo(9, 2); pctx.lineTo(17, 6); pctx.stroke();
    } else if (id === 'franky') {
      pctx.fillStyle = '#00BCD4';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.fillRect(-13, -9, 26, 22);
      pctx.strokeRect(-13, -9, 26, 22);
      pctx.fillStyle = '#616161';
      pctx.beginPath(); pctx.arc(14, 2, 9.5, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#D32F2F';
      pctx.fillRect(10, -1, 7, 5);
      pctx.fillStyle = '#4DD0E1';
      pctx.fillRect(-9, -16, 18, 7);
    } else if (id === 'robin') {
      pctx.fillStyle = '#7B1FA2';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.beginPath(); pctx.ellipse(0, 2, 9.5, 15, 0, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#1976D2';
      pctx.fillRect(-7, -2, 14, 5);
      pctx.fillStyle = '#1A1A1A';
      pctx.beginPath(); pctx.arc(0, -9, 8.5, 0, Math.PI * 2); pctx.fill();
    } else if (id === 'law') {
      pctx.fillStyle = '#1A1A1A';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.beginPath(); pctx.roundRect(-11, -8, 22, 22, 6); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#FDD835';
      pctx.fillRect(-11, 6, 22, 6);
      pctx.strokeStyle = '#E0E0E0'; pctx.lineWidth = 3;
      pctx.beginPath(); pctx.moveTo(-14, 12); pctx.lineTo(18, -14); pctx.stroke();
      pctx.fillStyle = '#F5F5F5';
      pctx.beginPath(); pctx.ellipse(0, -10, 12, 8, 0, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#1A1A1A';
      pctx.beginPath();
      pctx.arc(-5, -10, 2, 0, Math.PI * 2);
      pctx.arc(4, -11, 2, 0, Math.PI * 2);
      pctx.arc(0, -8, 1.8, 0, Math.PI * 2);
      pctx.fill();
    } else if (id === 'kid') {
      pctx.fillStyle = '#5D4037';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.beginPath(); pctx.roundRect(-13, -8, 22, 22, 6); pctx.fill(); pctx.stroke();
      const armPulse = Math.sin(t * 1.4) * 1.5;
      pctx.fillStyle = '#757575';
      pctx.beginPath(); pctx.arc(13, 2 + armPulse, 11, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#D32F2F';
      pctx.fillRect(8, -2 + armPulse, 9, 4);
      pctx.fillStyle = '#FFD54F';
      pctx.beginPath();
      pctx.arc(18 + Math.cos(t * 3) * 3, -5 + Math.sin(t * 3) * 3, 2, 0, Math.PI * 2);
      pctx.fill();
      pctx.fillStyle = '#D32F2F';
      pctx.beginPath();
      pctx.moveTo(-10, -8); pctx.lineTo(-7, -18); pctx.lineTo(-2, -11);
      pctx.lineTo(2, -19); pctx.lineTo(6, -11); pctx.lineTo(10, -17); pctx.lineTo(10, -8);
      pctx.closePath(); pctx.fill(); pctx.stroke();
    } else if (id === 'killer') {
      const spin = Math.sin(t * 2.2) * 0.35;
      pctx.fillStyle = '#1A237E';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.beginPath(); pctx.ellipse(0, 3, 10, 12, 0, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#FFD54F';
      pctx.beginPath(); pctx.arc(0, -6, 12, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#ECEFF1';
      pctx.beginPath(); pctx.arc(0, -6, 7.5, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
      pctx.strokeStyle = '#1976D2'; pctx.lineWidth = 1.5;
      pctx.beginPath(); pctx.moveTo(-5, -8); pctx.lineTo(5, -4); pctx.moveTo(5, -8); pctx.lineTo(-5, -4); pctx.stroke();
      pctx.save();
      pctx.rotate(spin);
      pctx.strokeStyle = '#CFD8DC'; pctx.lineWidth = 2.5;
      pctx.beginPath();
      pctx.arc(-15, 2, 7, -Math.PI * 0.5, Math.PI * 0.5);
      pctx.arc(15, 2, 7, Math.PI * 0.5, Math.PI * 1.5);
      pctx.stroke();
      pctx.restore();
    } else if (id === 'shanks') {
      // SHANKS (Romance Dawn): Sombrero paja, pelo rojo, capa marrón, UN SOLO BRAZO (manga izq vacía)
      pctx.fillStyle = '#5D4037';
      pctx.beginPath();
      pctx.ellipse(0, 3, 13, 14, 0, 0, Math.PI * 2);
      pctx.fill();

      pctx.fillStyle = '#F5F5F5';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 1.8;
      pctx.beginPath();
      pctx.ellipse(0, 2, 9, 11, 0, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();

      // Manga izquierda vacía ondeando (sin brazo)
      pctx.fillStyle = '#E0E0E0';
      pctx.beginPath();
      pctx.moveTo(-9, -2);
      pctx.lineTo(-14, 4 + Math.sin(t * 2) * 2);
      pctx.lineTo(-8, 6);
      pctx.closePath();
      pctx.fill(); pctx.stroke();

      // Brazo derecho sosteniendo Gryphon
      pctx.fillStyle = '#FFCC80';
      pctx.beginPath();
      pctx.arc(10, 4, 3.5, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();
      pctx.strokeStyle = '#9E9E9E'; pctx.lineWidth = 2.5;
      pctx.beginPath();
      pctx.moveTo(10, 4); pctx.lineTo(16, -6);
      pctx.stroke();
      pctx.strokeStyle = '#FFB300'; pctx.lineWidth = 2.8;
      pctx.beginPath();
      pctx.moveTo(8, 2); pctx.lineTo(12, 6);
      pctx.stroke();

      // Pelo rojo y Sombrero de paja
      pctx.fillStyle = '#D32F2F';
      pctx.beginPath();
      pctx.arc(0, -6, 9, 0, Math.PI * 2);
      pctx.fill();

      pctx.fillStyle = '#FBC02D';
      pctx.strokeStyle = '#7A5600'; pctx.lineWidth = 1.2;
      pctx.beginPath();
      pctx.ellipse(0, -9, 14, 6, 0, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#B71C1C';
      pctx.fillRect(-8, -12, 16, 2.5);
      pctx.fillStyle = '#FBC02D';
      pctx.beginPath();
      pctx.arc(0, -11, 7, Math.PI, 0);
      pctx.fill(); pctx.stroke();
    } else if (id === 'whitebeard') {
      // BARBABLANCA: Corpulento, bigote blanco media luna, bandana, capa blanca, bisento
      pctx.fillStyle = '#ECEFF1';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.beginPath();
      pctx.ellipse(0, 4, 15, 14, 0, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();

      pctx.fillStyle = '#FFCC80';
      pctx.beginPath();
      pctx.arc(0, 3, 10, 0, Math.PI * 2);
      pctx.fill();

      // Bisento Murakumogiri
      pctx.strokeStyle = '#78909C'; pctx.lineWidth = 2.5;
      pctx.beginPath();
      pctx.moveTo(-16, -18); pctx.lineTo(-6, 18);
      pctx.stroke();
      pctx.strokeStyle = '#FFB300'; pctx.lineWidth = 2.8;
      pctx.beginPath();
      pctx.arc(-16, -18, 5, 0, Math.PI * 0.7);
      pctx.stroke();

      // Cabeza y bandana
      pctx.fillStyle = '#37474F';
      pctx.beginPath();
      pctx.arc(0, -6, 9, Math.PI, 0);
      pctx.fill();

      // Bigote blanco en media luna característico
      pctx.strokeStyle = '#FFFFFF'; pctx.lineWidth = 3.0;
      pctx.beginPath();
      pctx.arc(0, -7, 10, 0.2, Math.PI - 0.2);
      pctx.stroke();
    } else if (id === 'luffy_pts') {
      // LUFFY (POST TIME SKIP): Kimono rojo, cicatriz en X, pelo negro, sombrero de paja
      pctx.fillStyle = '#D32F2F';
      pctx.strokeStyle = '#000'; pctx.lineWidth = 2;
      pctx.beginPath();
      pctx.ellipse(0, 3, 11, 12, 0, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();

      // Pecho descubierto con cicatriz en X
      pctx.fillStyle = '#FFCC80';
      pctx.beginPath();
      pctx.arc(0, 1, 6, 0, Math.PI * 2);
      pctx.fill();
      pctx.strokeStyle = '#8D6E63'; pctx.lineWidth = 1.8;
      pctx.beginPath();
      pctx.moveTo(-3, -2); pctx.lineTo(3, 4);
      pctx.moveTo(3, -2); pctx.lineTo(-3, 4);
      pctx.stroke();

      // Brazos elásticos con Haki
      pctx.fillStyle = '#212121';
      pctx.beginPath();
      pctx.arc(-11, 3, 4, 0, Math.PI * 2);
      pctx.arc(11, 3, 4, 0, Math.PI * 2);
      pctx.fill();

      // Sombrero de paja y pelo negro
      pctx.fillStyle = '#1A1A1A';
      pctx.beginPath();
      pctx.arc(0, -6, 8.5, 0, Math.PI * 2);
      pctx.fill();

      pctx.fillStyle = '#FBC02D';
      pctx.strokeStyle = '#7A5600'; pctx.lineWidth = 1.2;
      pctx.beginPath();
      pctx.ellipse(0, -8, 14, 5.5, 0, 0, Math.PI * 2);
      pctx.fill(); pctx.stroke();
      pctx.fillStyle = '#B71C1C';
      pctx.fillRect(-7, -11, 14, 2.2);
      pctx.fillStyle = '#FBC02D';
      pctx.beginPath();
      pctx.arc(0, -10, 6.5, Math.PI, 0);
      pctx.fill(); pctx.stroke();
    }

    pctx.restore();
  });
}

// ==========================================================================
// 9. RENDERIZADO: 60 FPS CON CAMARA Y MINIMAPA
// ==========================================================================
export function render(): void {
  if (!ensureRenderContext()) return;
  const bg = ensureBgCanvas();

  ctx.save();

  if (STATE.shakeTimer > 0) {
    const sx = (Math.random() - 0.5) * STATE.shakeIntensity * 2;
    const sy = (Math.random() - 0.5) * STATE.shakeIntensity * 2;
    ctx.translate(sx, sy);
  }

  // Zoom out suave durante/después de la Quake Zone de Barbablanca
  const wbCamZoom = (STATE.charId === 'whitebeard' && STATE.player && typeof STATE.player.wbCameraZoom === 'number')
    ? STATE.player.wbCameraZoom : 1.0;
  const isWBQuakeZoom = Math.abs(wbCamZoom - 1.0) > 0.001;
  if (isWBQuakeZoom) {
    ctx.save();
    ctx.translate(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
    ctx.scale(wbCamZoom, wbCamZoom);
    ctx.translate(-CONFIG.WIDTH / 2, -CONFIG.HEIGHT / 2);
  }

  ctx.save();
  ctx.translate(-CAMERA.x, -CAMERA.y);

  if (bg) {
    ctx.drawImage(bg, 0, 0);
  }

  // Zona Sísmica de Barbablanca con transición suave de apertura y cierre hacia el centro
  if (STATE.charId === 'whitebeard' && STATE.player && (STATE.player.quakeZoneTimer > 0 || STATE.player.wbQuakeVisualScale > 0.005)) {
    const p = STATE.player;
    const t = performance.now() * 0.005;
    const rawScale = Math.max(0, Math.min(1, p.wbQuakeVisualScale || 0));
    const easeScale = 1 - Math.pow(1 - rawScale, 3);
    const radius = 250 * easeScale;
    if (radius > 2) {
      ctx.save();
      const alpha = Math.min(1.0, easeScale * 1.05);
      ctx.globalAlpha = alpha;

      const grad = ctx.createRadialGradient(p.x, p.y, Math.max(2, 10 * easeScale), p.x, p.y, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.14)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.35)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Ondas concéntricas de choque
      for (let w = 1; w <= 3; w++) {
        const waveR = ((t * 70 + w * 80) % radius);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * (1 - waveR / radius)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Borde blanco pulsante con perturbación sísmica
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = (3.5 + Math.sin(t * 8) * 1.5) * Math.max(0.4, easeScale);
      ctx.beginPath();
      const segs = 48;
      for (let s = 0; s <= segs; s++) {
        const ang = (s / segs) * Math.PI * 2;
        const wobble = Math.sin(ang * 12 + t * 4) * 3.5 * easeScale;
        const rx = p.x + Math.cos(ang) * (radius + wobble);
        const ry = p.y + Math.sin(ang) * (radius + wobble);
        if (s === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.stroke();

      // Grietas radiales que se expanden al activar y se cierran hacia Barbablanca al cancelar
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2 * Math.max(0.5, easeScale);
      for (let f = 0; f < 8; f++) {
        const fAng = (f / 8) * Math.PI * 2 + Math.sin(f + t) * 0.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        for (let seg = 1; seg <= 4; seg++) {
          const segDist = (radius * 0.85) * (seg / 4);
          const perp = (Math.sin(seg * 3.7 + f) * 8) * easeScale;
          const nx = p.x + Math.cos(fAng) * segDist - Math.sin(fAng) * perp;
          const ny = p.y + Math.sin(fAng) * segDist + Math.cos(fAng) * perp;
          ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Esfera de ROOM de Trafalgar Law: activa o desvaneciéndose en su lugar con distorsión espacial
  if (STATE.charId === 'law' && (STATE.player.roomTimer > 0 || STATE.player.roomFadeTimer > 0)) {
    const p = STATE.player;
    const t = performance.now() * 0.006;
    const isFading = p.roomTimer <= 0 && p.roomFadeTimer > 0;
    const fadeRatio = isFading ? Math.max(0, p.roomFadeTimer / (p.roomFadeMax || 0.45)) : 1.0;
    const cx = isFading ? p.roomFadeX : p.x;
    const cy = isFading ? p.roomFadeY : p.y;
    const castScale = isFading
      ? (1.0 + (1 - fadeRatio) * 0.05)
      : Math.min(1.0, 0.72 + ((p.roomDurationMax - p.roomTimer) / 0.16) * 0.28);
    const r = p.roomRadius * castScale;
    const alpha = isFading ? Math.pow(fadeRatio, 1.15) : 1.0;

    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    grad.addColorStop(0, 'rgba(38, 198, 218, 0.06)');
    grad.addColorStop(0.85, 'rgba(38, 198, 218, 0.24)');
    grad.addColorStop(1, 'rgba(128, 222, 234, 0.45)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#80DEEA';
    ctx.lineWidth = isFading ? 2.5 + fadeRatio * 1.5 : 3.5;
    ctx.beginPath();
    const segs = 48;
    const wobbleFreq = isFading ? 16 : 8;
    const wobbleAmp = isFading ? (2.5 + (1 - fadeRatio) * 8.5) : 2.5;
    for (let s = 0; s <= segs; s++) {
      const ang = (s / segs) * Math.PI * 2;
      const wobble = Math.sin(ang * wobbleFreq + t * (isFading ? 3.5 : 1)) * wobbleAmp;
      const rx = cx + Math.cos(ang) * (r + wobble);
      const ry = cy + Math.sin(ang) * (r + wobble);
      if (s === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.stroke();

    // Efecto rápido de distorsión / corte espacial al desvanecerse
    if (isFading) {
      ctx.strokeStyle = `rgba(224, 247, 250, ${0.75 * fadeRatio})`;
      ctx.lineWidth = 2;
      for (let slice = -2; slice <= 2; slice++) {
        const sy = cy + slice * (r * 0.28);
        const halfW = Math.sqrt(Math.max(0, r * r - (sy - cy) * (sy - cy))) * 0.88;
        const shift = Math.sin(t * 9 + slice * 2.1) * (1 - fadeRatio) * 26;
        ctx.beginPath();
        ctx.moveTo(cx - halfW + shift, sy);
        ctx.lineTo(cx + halfW + shift, sy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;

    if (!en.isBoss && en.telegraphTimer > 0) {
      const tMax = en.telegraphDuration || 0.4;
      const prog = Math.max(0, Math.min(1, 1 - en.telegraphTimer / tMax));
      const isFlash = prog > 0.85;
      ctx.save();
      if (en.type === 'shooter') {
        const aimLen = 285;
        const ex = en.x + Math.cos(en.telegraphAngle) * aimLen;
        const ey = en.y + Math.sin(en.telegraphAngle) * aimLen;
        const cx = en.x + Math.cos(en.telegraphAngle) * (aimLen * prog);
        const cy = en.y + Math.sin(en.telegraphAngle) * (aimLen * prog);
        ctx.strokeStyle = 'rgba(255, 82, 82, 0.28)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = isFlash ? '#FFFFFF' : `rgba(255, 213, 79, ${0.45 + prog * 0.5})`;
        ctx.lineWidth = isFlash ? 3.5 : 2;
        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        if (prog > 0.65) {
          ctx.fillStyle = isFlash ? '#FFFFFF' : '#FFD54F';
          ctx.beginPath();
          ctx.arc(en.x + Math.cos(en.telegraphAngle) * 20, en.y + Math.sin(en.telegraphAngle) * 20, 3 + prog * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const halfAng = en.type === 'officer' ? Math.PI / 3 : Math.PI / 3.5;
        ctx.fillStyle = 'rgba(255, 202, 40, 0.14)';
        ctx.strokeStyle = isFlash ? '#FFFFFF' : 'rgba(255, 160, 0, 0.85)';
        ctx.lineWidth = isFlash ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        ctx.arc(en.x, en.y, en.attackRange, en.telegraphAngle - halfAng, en.telegraphAngle + halfAng);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isFlash ? 'rgba(255, 255, 255, 0.52)' : `rgba(255, 179, 0, ${0.24 + prog * 0.30})`;
        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        ctx.arc(en.x, en.y, Math.max(4, en.attackRange * prog), en.telegraphAngle - halfAng, en.telegraphAngle + halfAng);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (en.isBoss && en.aiState === 'telegraph') {
      const tMax = en.telegraphMaxTimer || 0.60;
      const prog = Math.max(0, Math.min(1, 1 - en.stateTimer / tMax));
      const isFlash = prog > 0.88;
      ctx.save();
      ctx.strokeStyle = isFlash ? '#FFFFFF' : 'rgba(255, 152, 0, 0.92)';
      ctx.lineWidth = isFlash ? 3.5 : 2.5;
      if (en.telegraphType === 'melee') {
        ctx.fillStyle = 'rgba(255, 111, 0, 0.16)';
        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        ctx.arc(en.x, en.y, 70, en.telegraphAngle - Math.PI / 2.2, en.telegraphAngle + Math.PI / 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isFlash ? 'rgba(255, 255, 255, 0.55)' : `rgba(255, 111, 0, ${0.28 + prog * 0.34})`;
        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        ctx.arc(en.x, en.y, Math.max(6, 70 * prog), en.telegraphAngle - Math.PI / 2.2, en.telegraphAngle + Math.PI / 2.2);
        ctx.closePath();
        ctx.fill();
      } else {
        const laneLen = 260;
        const laneW = en.radius * 1.4;
        ctx.translate(en.x, en.y);
        ctx.rotate(en.telegraphAngle);
        ctx.fillStyle = 'rgba(255, 111, 0, 0.16)';
        ctx.fillRect(0, -laneW / 2, laneLen, laneW);
        ctx.strokeRect(0, -laneW / 2, laneLen, laneW);

        ctx.fillStyle = isFlash ? 'rgba(255, 255, 255, 0.55)' : `rgba(255, 111, 0, ${0.28 + prog * 0.36})`;
        ctx.fillRect(0, -laneW / 2, laneLen * prog, laneW);
      }
      ctx.restore();
    }
  }

  for (let i = 0; i < STATE.pendingStrikes.length; i++) {
    const st = STATE.pendingStrikes[i];
    const prog = Math.max(0, Math.min(1, 1 - (st.timer / st.maxTimer)));
    const isFlash = prog > 0.85;
    ctx.save();
    ctx.translate(st.ox, st.oy);
    ctx.rotate(st.angle);
    ctx.fillStyle = 'rgba(123, 31, 162, 0.14)';
    ctx.strokeStyle = isFlash ? '#FFFFFF' : '#E1BEE7';
    ctx.lineWidth = isFlash ? 3.5 : 2.5;
    ctx.fillRect(0, -st.width / 2, st.length, st.width);
    ctx.strokeRect(0, -st.width / 2, st.length, st.width);

    ctx.fillStyle = isFlash ? 'rgba(243, 229, 245, 0.58)' : `rgba(156, 39, 176, ${0.26 + prog * 0.34})`;
    ctx.fillRect(0, -st.width / 2, st.length * prog, st.width);
    ctx.restore();
  }

  for (let i = 0; i < STATE.hazards.length; i++) {
    const hz = STATE.hazards[i];
    const seed = Math.abs(Math.sin(hz.x * 12.9898 + hz.y * 78.233)) * 1000;
    ctx.save();
    if (hz.type === 'kkg_fissure') {
      const lifeRatio = Math.min(0.95, hz.life / (hz.maxLife || 3.0));
      ctx.globalAlpha = lifeRatio;
      ctx.translate(hz.x, hz.y);
      ctx.rotate(hz.angle || 0);
      const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 105);
      aura.addColorStop(0, 'rgba(255, 23, 68, 0.26)');
      aura.addColorStop(1, 'rgba(255, 23, 68, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 105, 0, Math.PI * 2);
      ctx.fill();

      const segs = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const px = -95 + t * 190;
        const py = s === 0 || s === segs ? 0 : Math.sin(seed + s * 2.7) * 14;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 4;
      for (let b = 0; b < 4; b++) {
        const bx = -55 + b * 36;
        const by = Math.sin(seed + (b + 2) * 2.7) * 10;
        const bAng = (b % 2 === 0 ? 1 : -1) * (0.75 + (b % 3) * 0.25);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(bAng) * 32, by + Math.sin(bAng) * 32);
        ctx.stroke();
        ctx.strokeStyle = '#FF5252';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 4;
      }
    } else if (hz.type === 'zoro_crack_line') {
      ctx.globalAlpha = Math.min(0.88, hz.life * 2);
      const dx = hz.endX - hz.x, dy = hz.endY - hz.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let s = 0; s <= 6; s++) {
        const t = s / 6;
        const j = (s === 0 || s === 6) ? 0 : Math.sin(seed + s * 3.1) * 9;
        const px = hz.x + dx * t + nx * j;
        const py = hz.y + dy * t + ny * j;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#1B5E20';
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.strokeStyle = '#A5D6A7';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = '#E8F5E9';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (hz.type === 'zoro_crack') {
      ctx.globalAlpha = Math.min(0.85, hz.life * 2.5);
      const grad = ctx.createRadialGradient(hz.x, hz.y, 4, hz.x, hz.y, hz.radius);
      grad.addColorStop(0, 'rgba(102, 187, 106, 0.45)');
      grad.addColorStop(0.75, 'rgba(46, 125, 50, 0.25)');
      grad.addColorStop(1, 'rgba(46, 125, 50, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#A5D6A7';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      for (let r = 0; r < 5; r++) {
        const ang = seed * 0.01 + (r / 5) * Math.PI * 2;
        const midR = hz.radius * 0.48;
        const endR = hz.radius * 0.92;
        ctx.beginPath();
        ctx.moveTo(hz.x, hz.y);
        ctx.lineTo(hz.x + Math.cos(ang + 0.12) * midR, hz.y + Math.sin(ang + 0.12) * midR);
        ctx.lineTo(hz.x + Math.cos(ang - 0.08) * endR, hz.y + Math.sin(ang - 0.08) * endR);
        ctx.stroke();
      }
    } else if (hz.type === 'usopp_smoke') {
      ctx.globalAlpha = Math.min(0.68, hz.life * 0.42);
      const rot = performance.now() * 0.00045;
      for (let l = 0; l < 5; l++) {
        const ang = rot + seed + (l / 5) * Math.PI * 2;
        const dist = l === 0 ? 0 : hz.radius * 0.38;
        const lx = hz.x + Math.cos(ang) * dist;
        const ly = hz.y + Math.sin(ang) * dist;
        const lr = hz.radius * (l === 0 ? 0.78 : 0.58);
        const smokeGrad = ctx.createRadialGradient(lx, ly, lr * 0.1, lx, ly, lr);
        smokeGrad.addColorStop(0, 'rgba(236, 239, 241, 0.65)');
        smokeGrad.addColorStop(0.55, 'rgba(176, 190, 197, 0.45)');
        smokeGrad.addColorStop(1, 'rgba(176, 190, 197, 0)');
        ctx.fillStyle = smokeGrad;
        ctx.beginPath();
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.globalAlpha = Math.min(0.45, hz.life * 0.2);
      ctx.fillStyle = hz.type === 'alvida_slow' ? '#E91E63' : '#4FC3F7';
      ctx.beginPath();
      ctx.arc(hz.x, hz.y, hz.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (let i = 0; i < STATE.traps.length; i++) {
    const tr = STATE.traps[i];
    const pulse = 1 + Math.sin(performance.now() * 0.015 + i) * 0.2;
    ctx.save();
    ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, 14 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D32F2F';
    ctx.strokeStyle = '#FFCDD2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < STATE.berriesDrops.length; i++) {
    const b = STATE.berriesDrops[i];
    ctx.fillStyle = '#F5C518';
    ctx.strokeStyle = '#7A5600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  for (let i = 0; i < STATE.afterimages.length; i++) {
    const af = STATE.afterimages[i];
    const ratio = Math.max(0, af.life / af.maxLife);
    const r = af.radius || STATE.player.radius;
    ctx.save();
    ctx.translate(af.x, af.y);
    ctx.rotate(af.angle || 0);
    ctx.globalAlpha = ratio * 0.42;
    ctx.fillStyle = af.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.32, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = ratio * 0.55;
    ctx.beginPath();
    ctx.moveTo(-r * 1.85, -r * 0.48);
    ctx.lineTo(-r * 0.45, -r * 0.48);
    ctx.moveTo(-r * 1.65, r * 0.48);
    ctx.lineTo(-r * 0.35, r * 0.48);
    ctx.stroke();
    ctx.restore();
  }

  if (STATE.targetedEnemy && STATE.targetedEnemy.hp > 0) {
    const te = STATE.targetedEnemy;
    const bob = Math.sin(performance.now() * 0.01) * 4;
    ctx.save();
    ctx.strokeStyle = '#F5C518';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(te.x, te.y + te.radius * 0.7, te.radius + 8, 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#F5C518';
    ctx.beginPath();
    ctx.moveTo(te.x, te.y - te.radius - 16 + bob);
    ctx.lineTo(te.x - 8, te.y - te.radius - 28 + bob);
    ctx.lineTo(te.x + 8, te.y - te.radius - 28 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < STATE.enemies.length; i++) {
    drawEnemy(STATE.enemies[i]);
  }

  drawPlayer();

  // Cañón electromagnético activo de Damned Punk de Kid (núcleo ondulante + anillos de pulso)
  if (STATE.charId === 'kid' && STATE.player.damnedPunkTimer > 0) {
    const p = STATE.player;
    const beamLen = 460;
    const now = performance.now() * 0.001;
    const pulse = 1 + Math.sin(now * 42) * 0.14;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.damnedPunkAngle);

    const beamGrad = ctx.createLinearGradient(18, 0, 18 + beamLen, 0);
    beamGrad.addColorStop(0, 'rgba(255, 193, 7, 0.85)');
    beamGrad.addColorStop(0.65, 'rgba(211, 47, 47, 0.65)');
    beamGrad.addColorStop(1, 'rgba(211, 47, 47, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(18, -14 * pulse);
    ctx.lineTo(18 + beamLen, -30 * pulse);
    ctx.lineTo(18 + beamLen, 30 * pulse);
    ctx.lineTo(18, 14 * pulse);
    ctx.closePath();
    ctx.fill();

    // Núcleo ondulante de plasma blanco/dorado
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const segs = 14;
    for (let s = 0; s <= segs; s++) {
      const sx = 18 + (s / segs) * beamLen;
      const sy = Math.sin(s * 1.4 - now * 38) * (5.5 + (s / segs) * 4);
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = 'rgba(255, 193, 7, 0.92)';
    ctx.lineWidth = 18 * pulse;
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 7.5;
    ctx.stroke();

    // Anillos de pulso electromagnético viajando a lo largo del cañón
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const u = (now * 2.6 + rIdx / 3) % 1;
      const rx = 28 + u * (beamLen - 40);
      const rr = 14 + u * 16;
      ctx.strokeStyle = `rgba(255, 245, 157, ${(1 - u) * 0.85})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(rx, 0, 5, rr, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Destello en la boca del cañón
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(22, 0, 14 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FF5252';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < STATE.slashEffects.length; i++) {
    drawSlashEffect(STATE.slashEffects[i]);
  }

  for (let i = 0; i < STATE.projectiles.length; i++) {
    const pr = STATE.projectiles[i];
    const baseAlpha = pr.roomStallTimer > 0 ? Math.max(0.25, 1 - pr.roomStallTimer * 0.85) : 1.0;
    if (pr.trail && pr.trail.length > 1) {
      let trailColor = pr.color || '#FFF59D';
      let headW = (pr.radius || 6) * 0.9;
      if (pr.type === 'zoro_air_cut' || pr.type === 'pound_ho_x') {
        trailColor = '#A5D6A7';
        headW = 14;
      } else if (pr.type === 'firebird_star' || pr.type === 'diable_comet') {
        trailColor = '#FF7043';
        headW = 10;
      } else if (pr.type === 'mace_boomerang') {
        trailColor = '#FF5252';
        headW = 16;
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = trailColor;
      for (let tIdx = 0; tIdx < pr.trail.length - 1; tIdx++) {
        const p0 = pr.trail[tIdx];
        const p1 = pr.trail[tIdx + 1];
        const frac = (tIdx + 1) / pr.trail.length;
        ctx.globalAlpha = baseAlpha * frac * 0.45;
        ctx.lineWidth = Math.max(1.5, headW * frac);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = baseAlpha;
    if (pr.type === 'mace_boomerang') {
      ctx.translate(pr.x, pr.y);
      ctx.rotate(performance.now() * 0.02);
      ctx.fillStyle = '#2A2A30';
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * pr.radius, Math.sin(a) * pr.radius);
        ctx.lineTo(Math.cos(a) * (pr.radius + 7), Math.sin(a) * (pr.radius + 7));
        ctx.stroke();
      }
    } else if (pr.type === 'firebird_star') {
      ctx.translate(pr.x, pr.y);
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.fillStyle = '#FF5722';
      ctx.strokeStyle = '#FFEB3B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-10, -16);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (pr.type === 'pound_ho_x') {
      ctx.translate(pr.x, pr.y);
      ctx.rotate(pr.rotation || 0);
      ctx.strokeStyle = '#66BB6A';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-24, -24); ctx.lineTo(24, 24);
      ctx.moveTo(-24, 24);  ctx.lineTo(24, -24);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    } else if (pr.type === 'zoro_air_cut') {
      ctx.translate(pr.x, pr.y);
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      drawTaperedCrescent(22, -Math.PI * 0.44, Math.PI * 0.44, 9, '#66BB6A', '#FFFFFF');
    } else if (pr.type === 'diable_comet') {
      ctx.translate(pr.x, pr.y);
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.fillStyle = 'rgba(255, 112, 67, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 22, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.ellipse(4, 0, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = pr.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  for (let i = 0; i < STATE.particles.length; i++) {
    const pt: any = STATE.particles[i];
    if (!pt.active) continue;
    const lifeRatio = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = lifeRatio * (pt.alpha != null ? pt.alpha : 1);
    if (pt.shape === 'spark') {
      const ang = Math.atan2(pt.vy, pt.vx);
      const spd = Math.hypot(pt.vx, pt.vy);
      const streakLen = Math.min(20, Math.max(5.5, spd * 0.055)) * lifeRatio;
      const halfW = Math.max(1.2, pt.size * 0.42 * lifeRatio);
      ctx.translate(pt.x, pt.y);
      ctx.rotate(ang);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(streakLen, 0);
      ctx.lineTo(0, -halfW);
      ctx.lineTo(-streakLen * 0.7, 0);
      ctx.lineTo(0, halfW);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (0.72 + 0.28 * lifeRatio), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (let i = 0; i < STATE.floatingTexts.length; i++) {
    const ft: any = STATE.floatingTexts[i];
    if (!ft.active) continue;
    const elapsed = ft.maxLife - ft.life;
    const popT = Math.min(1, elapsed / 0.14);
    const popScale = ft.isCrit ? easeOutBack(popT) : (0.78 + 0.22 * easeOutQuart(popT));
    ctx.save();
    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
    ctx.translate(ft.x, ft.y);
    if (ft.tiltAngle) ctx.rotate(ft.tiltAngle);
    ctx.scale(popScale, popScale);
    ctx.font = `900 ${Math.round(18 * ft.scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = ft.isCrit ? 5 : 4;
    ctx.strokeStyle = '#000';
    ctx.strokeText(ft.text, 0, 0);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);
    ctx.restore();
  }

  ctx.restore(); // Fin de cámara
  if (isWBQuakeZoom) {
    ctx.restore(); // Restaura el zoom out del 10%
  }

  if (INPUT_TOUCH.joystick.active) {
    const j = INPUT_TOUCH.joystick;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.strokeStyle = 'rgba(200, 169, 81, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(j.originX, j.originY, CONFIG.JOYSTICK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(245, 197, 24, 0.85)';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(j.currX, j.currY, CONFIG.JOYSTICK_KNOB_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  renderMinimap();
}

export function renderMinimap(): void {
  const mc = document.getElementById('minimapCanvas') as HTMLCanvasElement | null;
  if (!mc || STATE.screen !== 'playing') return;
  const mctx = mc.getContext('2d');
  if (!mctx) return;
  const mw = mc.width, mh = mc.height;
  mctx.clearRect(0, 0, mw, mh);

  const sx = mw / CONFIG.WORLD_WIDTH;
  const sy = mh / CONFIG.WORLD_HEIGHT;

  mctx.strokeStyle = 'rgba(255,255,255,0.22)';
  mctx.lineWidth = 1;
  mctx.strokeRect(CAMERA.x * sx, CAMERA.y * sy, CONFIG.WIDTH * sx, CONFIG.HEIGHT * sy);

  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    mctx.fillStyle = en.isBoss ? '#FF1744' : '#FF5252';
    mctx.beginPath();
    mctx.arc(en.x * sx, en.y * sy, en.isBoss ? 3.5 : 2, 0, Math.PI * 2);
    mctx.fill();
  }

  mctx.fillStyle = '#4CAF50';
  mctx.beginPath();
  mctx.arc(STATE.player.x * sx, STATE.player.y * sy, 3, 0, Math.PI * 2);
  mctx.fill();
}

export function drawPlayer(): void {
  if (!ensureRenderContext()) return;
  const p = STATE.player;
  const cfg = CHARACTERS[STATE.charId];
  const t = performance.now() * 0.005;

  ctx.save();
  ctx.translate(p.x, p.y);

  if (p.invulnTimer > 0 && Math.floor(performance.now() / 50) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  // Escala dinámica de salto para Barbablanca
  if (STATE.charId === 'whitebeard' && p.wbJumpScale && p.wbJumpScale !== 1.0) {
    ctx.scale(p.wbJumpScale, p.wbJumpScale);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  const shadowScale = (STATE.charId === 'whitebeard' && p.wbJumpScale) ? p.wbJumpScale : 1.0;
  ctx.ellipse(0, p.radius * 0.85 * shadowScale, p.radius * 0.95 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (p.stormTimer > 0) {
    ctx.strokeStyle = 'rgba(245, 197, 24, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 150 * STATE.mods.h3AreaMult, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (STATE.charId === 'franky' && p.cola >= p.maxCola) {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 7 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (STATE.charId === 'killer') {
    if (p.killerFrenzyTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 9 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.ensanamientoTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 82, 82, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (STATE.charId === 'shanks') {
    const val = p.shanksHaki || 0;
    // v1.9f: Círculo de Haki SOLO visible al 100% (lleno)
    if (val >= 100) {
      ctx.strokeStyle = '#D50000';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 10 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const ang = t * 4 + k * Math.PI / 2;
        const r1 = p.radius + 6;
        const r2 = p.radius + 14 + Math.sin(t * 8 + k) * 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        ctx.lineTo(Math.cos(ang + 0.2) * r2, Math.sin(ang + 0.2) * r2);
        ctx.stroke();
      }
    }
    // Haki < 100: no se renderiza círculo permanente
  }

  if (STATE.charId === 'whitebeard' && (p.whitebeardEnergy || 0) >= 100) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 10 + Math.sin(t * 5) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (STATE.charId === 'luffy_pts') {
    if (p.gear2ndTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6 + Math.sin(t * 8) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.isChargingKKG) {
      // Escudo de Haki visible durante Gear 2nd + carga de KKG (comunica carga ininterrumpible)
      if (p.gear2ndTimer > 0) {
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 15 + Math.sin(t * 8) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(17, 17, 17, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 15 + Math.sin(t * 8) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2.5;
        for (let k = 0; k < 6; k++) {
          const ang = t * 6 + (k * Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * (p.radius + 10), Math.sin(ang) * (p.radius + 10));
          ctx.lineTo(Math.cos(ang + 0.3) * (p.radius + 20), Math.sin(ang + 0.3) * (p.radius + 20));
          ctx.stroke();
        }
      }

      // Brazo derecho inflando una enorme esfera negra con rayos rojos
      const chargeFrac = Math.min(1.0, p.kkgChargeTimer / 2.5);
      const ballRadius = 8 + chargeFrac * 22;
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(16 + chargeFrac * 10, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  let extraSpin = 0;
  if (STATE.charId === 'killer' && p.isDashing) {
    const progress = 1 - (p.dashTimer / (p.dashDurationMax || 0.25));
    extraSpin = progress * Math.PI * 2;
  }

  if (p.landSquashTimer > 0) {
    const lsq = Math.sin((p.landSquashTimer / 0.12) * Math.PI);
    ctx.scale(1 + 0.14 * lsq, 1 - 0.12 * lsq);
  }

  ctx.rotate(p.facingAngle + extraSpin);

  if ((p.visualScaleX && Math.abs(p.visualScaleX - 1) > 0.004) || (p.visualScaleY && Math.abs(p.visualScaleY - 1) > 0.004)) {
    ctx.scale(p.visualScaleX || 1, p.visualScaleY || 1);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(p.radius + 10, 0);
  ctx.lineTo(p.radius + 2, -6);
  ctx.lineTo(p.radius + 2, 6);
  ctx.closePath();
  ctx.fill();

  if (STATE.charId === 'law') {
    const nodachiAngle = p.attackAnimTimer > 0 ? Math.sin(p.attackAnimTimer * 25) * 0.9 : 0.25;
    ctx.fillStyle = '#1A1A1A';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FDD835';
    ctx.beginPath();
    ctx.arc(2, -13, 5, 0, Math.PI * 2);
    ctx.arc(2, 13, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(nodachiAngle);
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-16, 14);
    ctx.lineTo(28, 18);
    ctx.stroke();
    ctx.strokeStyle = '#9C27B0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-16, 14);
    ctx.lineTo(-4, 15);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#F5F5F5';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(2, 0, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(-2, -6, 2.2, 0, Math.PI * 2);
    ctx.arc(6, 5, 2.2, 0, Math.PI * 2);
    ctx.arc(-3, 5, 2.0, 0, Math.PI * 2);
    ctx.arc(7, -4, 2.0, 0, Math.PI * 2);
    ctx.fill();
  } else if (STATE.charId === 'kid') {
    const isRotten = p.punkRottenTimer > 0;
    const scaleFactor = isRotten ? 1.5 : 1.0;

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);

    ctx.fillStyle = isRotten ? '#616161' : '#5D4037';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-16, -22, 32, 44, 9);
    ctx.fill();
    ctx.stroke();

    if (isRotten) {
      ctx.fillStyle = '#757575';
      ctx.beginPath();
      ctx.arc(10, -20, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(6, -24, 8, 8);
    }

    const armPunchOffset = p.attackAnimTimer > 0 ? 10 : Math.sin(t) * 1.5;
    ctx.save();
    ctx.translate(10 + armPunchOffset, 18);
    ctx.fillStyle = '#757575';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, isRotten ? 16 : 13.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(Math.cos(t * 4) * 10, Math.sin(t * 4) * 10, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#D32F2F';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(2, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFC107';
    ctx.fillRect(8, -7, 4, 14);

    ctx.restore();
  } else if (STATE.charId === 'killer') {
    const isFrenzy = p.killerFrenzyTimer > 0;
    const spin = isFrenzy ? t * 7.5 : t * 1.4;
    ctx.fillStyle = isFrenzy ? '#B71C1C' : '#1A237E';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(-3, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFrenzy ? '#FFCDD2' : '#ECEFF1';
    ctx.beginPath();
    ctx.arc(4, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(Math.sin(spin) * 0.45);
    ctx.strokeStyle = isFrenzy ? '#FF1744' : '#E0E0E0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(12, -16, 10, -Math.PI * 0.4, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 16, 10, -Math.PI * 0.5, Math.PI * 0.4);
    ctx.stroke();
    ctx.restore();
  } else if (STATE.charId === 'usopp') {
    const sway = Math.sin(t) * 0.08;
    ctx.rotate(sway);

    ctx.fillStyle = '#5D4037';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-10, 0, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6B8E23';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#DAA520';
    ctx.fillRect(-4, -14, 6, 28);

    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(22, 0);
    ctx.moveTo(22, 0); ctx.lineTo(28, -9);
    ctx.moveTo(22, 0); ctx.lineTo(28, 9);
    ctx.stroke();

    ctx.fillStyle = '#FFCC80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(3, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (STATE.charId === 'franky') {
    const breath = Math.sin(t * 0.8) * 1.2;

    ctx.fillStyle = '#00BCD4';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-16, -21 - breath * 0.5, 32, 42 + breath, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(-6, -15, 12, 30);

    const armExtend = p.strongRightTimer > 0 ? 22 : Math.sin(t) * 2;
    ctx.fillStyle = '#616161';
    ctx.beginPath();
    ctx.arc(12 + armExtend, 16, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(8 + armExtend, 12, 8, 8);

    ctx.fillStyle = '#4DD0E1';
    ctx.beginPath();
    ctx.roundRect(-4, -11, 14, 22, 4);
    ctx.fill();
    ctx.stroke();
  } else if (STATE.charId === 'robin') {
    ctx.fillStyle = '#7B1FA2';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1976D2';
    ctx.fillRect(-4, -14, 8, 28);

    const hairSway = Math.sin(t * 0.9) * 1.5;
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(-2, hairSway * 0.4, 11, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const isMoving = Math.hypot(p.vx, p.vy) > 15;
    const swingSpeed = isMoving ? t * 2.6 : t * 1.1;
    const armSwing = Math.sin(swingSpeed) * (isMoving ? 6.5 : 3.0);

    if (STATE.charId === 'luffy') {
      ctx.fillStyle = '#FFCC80';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-4 + armSwing, -26, 12, 8, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-4 - armSwing, 18, 12, 8, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#C8102E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F5C518';
      ctx.beginPath();
      ctx.arc(-1, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#C8102E';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(-1, 0, 11.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.arc(-1, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (STATE.charId === 'zoro') {
      ctx.fillStyle = '#FFCC80';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-2 + armSwing * 0.7, -25, 11, 7, 3.5);
      ctx.roundRect(-2 - armSwing * 0.7, 18, 11, 7, 3.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = cfg.vestColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(2, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-14, 14); ctx.lineTo(24, 18);
      ctx.moveTo(-14, -14); ctx.lineTo(24, -18);
      ctx.stroke();
    } else if (STATE.charId === 'sanji') {
      ctx.fillStyle = cfg.vestColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FDD835';
      ctx.beginPath();
      ctx.arc(2, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (p.diableHitsLeft > 0 || p.ifritShotsLeft > 0) {
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(14, 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.arc(14, 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (STATE.charId === 'shanks') {
      // SHANKS (Romance Dawn): Pelo rojo, sombrero paja, capa marrón, UN SOLO BRAZO (manga izq vacía)
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.arc(-2, 0, p.radius + 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F5F5F5';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Manga izquierda vacía ondeando
      ctx.fillStyle = '#E0E0E0';
      ctx.beginPath();
      ctx.moveTo(-10, -p.radius * 0.7);
      ctx.lineTo(-18, -p.radius * 0.2 + Math.sin(t * 2) * 2);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Brazo derecho con Gryphon
      ctx.fillStyle = '#FFCC80';
      ctx.beginPath();
      ctx.arc(12, 14, 5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#9E9E9E'; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(12, 14); ctx.lineTo(26, 18);
      ctx.stroke();
      ctx.strokeStyle = '#FFB300'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, 11); ctx.lineTo(14, 17);
      ctx.stroke();

      // Pelo rojo y Sombrero de paja
      ctx.fillStyle = '#D32F2F';
      ctx.beginPath();
      ctx.arc(-2, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FBC02D';
      ctx.strokeStyle = '#7A5600'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-1, 0, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#B71C1C';
      ctx.fillRect(-10, -3, 18, 3.5);
      ctx.fillStyle = '#FBC02D';
      ctx.beginPath();
      ctx.arc(-1, -1, 10, Math.PI, 0);
      ctx.fill(); ctx.stroke();
    } else if (STATE.charId === 'whitebeard') {
      // BARBABLANCA: Enorme, corpulento, bigote blanco media luna, bandana, capa blanca, bisento
      ctx.fillStyle = '#ECEFF1';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-3, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#FFCC80';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Gran Bisento Murakumogiri
      ctx.strokeStyle = '#78909C'; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-18, -26); ctx.lineTo(26, 26);
      ctx.stroke();
      ctx.strokeStyle = '#FFB300'; ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(-18, -26, 8, 0, Math.PI * 0.7);
      ctx.stroke();

      // Bandana
      ctx.fillStyle = '#37474F';
      ctx.beginPath();
      ctx.arc(0, -3, 13, Math.PI, 0);
      ctx.fill();

      // Gran bigote blanco en media luna
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.arc(0, -2, 16, 0.25, Math.PI - 0.25);
      ctx.stroke();
    } else if (STATE.charId === 'luffy_pts') {
      // LUFFY (POST TIME SKIP): Kimono rojo, cicatriz en X, pelo negro, sombrero de paja
      ctx.fillStyle = '#D32F2F';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Cicatriz en el pecho en X
      ctx.fillStyle = '#FFCC80';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-4, -4); ctx.lineTo(4, 4);
      ctx.moveTo(4, -4); ctx.lineTo(-4, 4);
      ctx.stroke();

      // Puños oscurecidos con Busoshoku Haki
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(-13, 12, 6, 0, Math.PI * 2);
      ctx.arc(13, 12, 6, 0, Math.PI * 2);
      ctx.fill();

      // Pelo negro y Sombrero de paja
      ctx.fillStyle = '#1A1A1A';
      ctx.beginPath();
      ctx.arc(-1, 0, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FBC02D';
      ctx.strokeStyle = '#7A5600'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-1, 0, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#B71C1C';
      ctx.fillRect(-9, -2.5, 16, 3);
      ctx.fillStyle = '#FBC02D';
      ctx.beginPath();
      ctx.arc(-1, -1, 9, Math.PI, 0);
      ctx.fill(); ctx.stroke();
    }
  }

  ctx.restore();
}

// ==========================================================================
// DIBUJADO AUTÉNTICO DE MARINES DE ONE PIECE Y CAPITANA ALVIDA + PUNTOS SANGRADO
// ==========================================================================
export function drawEnemy(en: any): void {
  if (!ensureRenderContext()) return;
  ctx.save();
  ctx.translate(en.x, en.y);

  if (en.rootTimer > 0) {
    ctx.strokeStyle = en.lawShamblesDebuffTimer > 0 ? 'rgba(38, 198, 218, 0.9)' : 'rgba(186, 104, 200, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, en.radius * 0.7, en.radius + 6, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (en.inLawRoom) {
    ctx.strokeStyle = 'rgba(38, 198, 218, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, en.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, en.radius * 0.85, en.radius * 0.9, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  if (en.hitSquashTimer > 0) {
    const sq = Math.sin((en.hitSquashTimer / (en.hitSquashMax || 0.12)) * Math.PI);
    const hAng = en.hitAngle || 0;
    ctx.rotate(hAng);
    ctx.scale(1 - 0.22 * sq, 1 + 0.18 * sq);
    ctx.rotate(-hAng);
  }
  ctx.rotate(en.facing);

  const isFlash = en.flashTimer > 0;

  if (en.isBoss) {
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#AD1457';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(-4, 0, en.radius + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFlash ? '#FFFFFF' : '#EC407A';
    ctx.beginPath();
    ctx.arc(0, 0, en.radius - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#4E342E';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(10, 20);
    ctx.lineTo(36, 26);
    ctx.stroke();

    ctx.fillStyle = '#37474F';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(40, 27, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let sp = 0; sp < 6; sp++) {
      const sa = (sp / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(40 + Math.cos(sa) * 12, 27 + Math.sin(sa) * 12);
      ctx.lineTo(40 + Math.cos(sa) * 18, 27 + Math.sin(sa) * 18);
      ctx.stroke();
    }

    ctx.fillStyle = '#1A1A20';
    ctx.strokeStyle = '#F5C518';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-2, 0, 20, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.ellipse(-10, -14, 14, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (en.type === 'officer') {
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#ECEFF1';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-24, -22, 26, 44, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(2, 0, en.radius - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F5C518';
    ctx.beginPath();
    ctx.arc(0, -18, 6.5, 0, Math.PI * 2);
    ctx.arc(0, 18, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#CFD8DC';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(12, 14);
    ctx.lineTo(34, 18);
    ctx.stroke();
    ctx.strokeStyle = '#F5C518';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(14, 10);
    ctx.lineTo(14, 18);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(3, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1565C0';
    ctx.beginPath();
    ctx.arc(13, 0, 7, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.fill();
    ctx.fillStyle = '#F5C518';
    ctx.beginPath();
    ctx.arc(9, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (en.type === 'shield') {
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#1E4D8C';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-1, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (en.hasShield && !en.shieldBroken) {
      const isExposed = en.shieldExposedTimer > 0;
      ctx.save();
      if (isExposed) ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#0D47A1';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(isExposed ? -2 : 4, 0, en.radius + 4, -Math.PI * 0.46, Math.PI * 0.46);
      ctx.stroke();

      ctx.strokeStyle = '#B0BEC5';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(isExposed ? -2 : 4, 0, en.radius + 4, -Math.PI * 0.43, Math.PI * 0.43);
      ctx.stroke();
      ctx.restore();
    }
  } else if (en.type === 'shooter') {
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#1976D2';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(22, 8);
    ctx.stroke();
    ctx.strokeStyle = '#CFD8DC';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, 8);
    ctx.lineTo(32, 8);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0D47A1';
    ctx.beginPath();
    ctx.arc(8, 0, 5.5, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.fill();
  } else {
    ctx.fillStyle = isFlash ? '#FFFFFF' : '#F5F5F5';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#1565C0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(2, 0, 11.5, -Math.PI * 0.65, Math.PI * 0.65);
    ctx.stroke();

    ctx.strokeStyle = '#B0BEC5';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(10, 11);
    ctx.lineTo(27, 14);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1565C0';
    ctx.beginPath();
    ctx.arc(8, 0, 5.5, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.fill();
  }

  ctx.restore();

  const barW = en.isBoss ? 64 : 34;
  const barH = 5;
  const hpRatio = Math.max(0, en.hp / en.maxHp);
  ctx.fillStyle = '#000';
  ctx.fillRect(-barW / 2 - 1, -en.radius - 13, barW + 2, barH + 2);
  ctx.fillStyle = en.isBoss ? '#FF5252' : '#4CAF50';
  ctx.fillRect(-barW / 2, -en.radius - 12, barW * hpRatio, barH);

  if (en.type === 'shield' && en.hasShield && !en.shieldBroken) {
    const shRatio = Math.max(0, en.shieldHp / 80);
    ctx.fillStyle = '#0D47A1';
    ctx.fillRect(-barW / 2 - 1, -en.radius - 19, barW + 2, 4);
    ctx.fillStyle = '#4FC3F7';
    ctx.fillRect(-barW / 2, -en.radius - 18, barW * shRatio, 3);
  }

  // E1: Indicador visual de stacks de sangrado de Killer
  if (en.killerBleedStacks > 0) {
    const dotSpacing = 7;
    const startX = -((5 - 1) * dotSpacing) / 2;
    const dotY = -en.radius - (en.type === 'shield' && en.hasShield && !en.shieldBroken ? 25 : 19);
    for (let s = 0; s < 5; s++) {
      ctx.beginPath();
      ctx.arc(startX + s * dotSpacing, dotY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = s < en.killerBleedStacks ? '#FF1744' : 'rgba(0,0,0,0.6)';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function easeOutQuart(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - u, 4);
}

export function easeOutBack(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

export function drawTaperedCrescent(
  r: number,
  startAng: number,
  endAng: number,
  thickness: number,
  outerColor: string,
  coreColor: string | null = null
): void {
  if (!ensureRenderContext()) return;
  const span = endAng - startAng;
  if (Math.abs(span) < 0.03 || r <= 2) return;
  const segs = 14;
  const traceCrescent = (thickScale: number, radialOffset: number) => {
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const a = startAng + span * u;
      const rOut = r + radialOffset + Math.sin(u * Math.PI) * (thickness * 0.22 * thickScale);
      const x = Math.cos(a) * rOut;
      const y = Math.sin(a) * rOut;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = segs; i >= 0; i--) {
      const u = i / segs;
      const a = startAng + span * u;
      const taper = Math.pow(Math.sin(u * Math.PI), 0.78);
      const rIn = Math.max(2, r + radialOffset - thickness * thickScale * taper);
      ctx.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
    }
    ctx.closePath();
  };
  traceCrescent(1.0, 0);
  ctx.fillStyle = outerColor;
  ctx.fill();
  if (coreColor) {
    traceCrescent(0.45, -thickness * 0.14);
    ctx.fillStyle = coreColor;
    ctx.fill();
  }
}

export function drawTaperedSlashLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  maxW: number,
  outerColor: string,
  coreColor: string | null,
  progress: number
): void {
  if (!ensureRenderContext()) return;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ext = easeOutQuart(Math.min(1, progress / 0.32));
  const ex = x1 + dx * ext;
  const ey = y1 + dy * ext;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const mx = (x1 + ex) * 0.5, my = (y1 + ey) * 0.5;
  const w = Math.max(3, maxW * 0.5);

  const drawDiamond = (halfThick: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx + nx * halfThick, my + ny * halfThick);
    ctx.lineTo(ex, ey);
    ctx.lineTo(mx - nx * halfThick, my - ny * halfThick);
    ctx.closePath();
    ctx.fill();
  };
  drawDiamond(w, outerColor);
  if (coreColor) {
    drawDiamond(Math.max(1.5, w * 0.42), coreColor);
  }
}

export function drawSlashEffect(ef: any): void {
  if (!ensureRenderContext()) return;
  const alpha = Math.max(0, ef.life / ef.maxLife);
  const progress = 1 - alpha;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (ef.type === 'impact_flare') {
    const snap = easeOutQuart(Math.min(1, progress / 0.45));
    const r = ef.range * (0.55 + snap * 0.55);
    const w = Math.max(2, r * 0.22 * alpha);
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle || 0);
    ctx.fillStyle = ef.color || '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w, w);
    ctx.lineTo(0, r * 0.72); ctx.lineTo(-w, w);
    ctx.lineTo(-r, 0); ctx.lineTo(-w, -w);
    ctx.lineTo(0, -r * 0.72); ctx.lineTo(w, -w);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 * alpha;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ef.type === 'ring') {
    ctx.strokeStyle = ef.color;
    ctx.lineWidth = 6 * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, ef.range * (0.35 + progress * 0.65), 0, Math.PI * 2);
    ctx.stroke();
  } else if (ef.type === 'shambles_cut') {
    drawTaperedSlashLine(ef.x, ef.y - ef.range, ef.x, ef.y + ef.range, 10 * alpha, '#26C6DA', ef.color || '#FFFFFF', progress);
  } else if (ef.type === 'gamma_room_burst') {
    ctx.fillStyle = 'rgba(224, 64, 251, 0.32)';
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, ef.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8 * alpha;
    ctx.stroke();
  } else if (ef.type === 'magnetic_pull') {
    const prog = 1 - alpha;
    ctx.strokeStyle = '#D32F2F';
    ctx.lineWidth = 5 * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, ef.range * (1 - prog * 0.7), 0, Math.PI * 2);
    ctx.stroke();
  } else if (ef.type === 'kid_ground_sweep') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const hAng = ef.halfAngle || (60 * Math.PI) / 180;
    const headT = easeOutQuart(Math.min(1, progress / 0.36));
    const tailT = easeOutQuart(Math.max(0, (progress - 0.25) / 0.75)) * 0.65;
    const startA = -hAng + (2 * hAng) * tailT;
    const endA = -hAng + (2 * hAng) * headT;
    ctx.fillStyle = 'rgba(255, 193, 7, 0.24)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, ef.range, -hAng, endA);
    ctx.closePath();
    ctx.fill();
    drawTaperedCrescent(ef.range, startA, endA, 14 * Math.max(0.4, alpha), '#BDBDBD', '#FFF59D');
  } else if (ef.type === 'sonic_wave_cone') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const hAng = ef.halfAngle || (30 * Math.PI) / 180;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, ef.range, -hAng, hAng);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ef.color || '#9FA8DA';
    ctx.lineWidth = 7 * alpha;
    ctx.beginPath();
    ctx.arc(0, 0, ef.range, -hAng, hAng);
    ctx.stroke();
  } else if (ef.type === 'radical_beam') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.fillRect(0, -22, ef.range, 44);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
    ctx.fillRect(0, -13, ef.range, 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, -6, ef.range, 12);
  } else if (ef.type === 'strong_right_chain') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    ctx.strokeStyle = '#B0BEC5';
    ctx.lineWidth = 6;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ef.range, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#616161';
    ctx.beginPath();
    ctx.arc(ef.range, 0, 14, 0, Math.PI * 2);
    ctx.fill();
  } else if (ef.type === 'coup_de_vent') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const prog = 1 - alpha;
    const currR = ef.range * (0.45 + prog * 0.55);
    ctx.fillStyle = 'rgba(132, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, currR, -ef.halfAngle, ef.halfAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5 * alpha;
    ctx.beginPath();
    ctx.arc(0, 0, currR, -ef.halfAngle, ef.halfAngle);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, currR * 0.65, -ef.halfAngle * 0.9, ef.halfAngle * 0.9);
    ctx.stroke();
  } else if (ef.type === 'robin_hands') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const count = ef.count || 1;
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * 0.75;
      ctx.save();
      ctx.rotate(spread);
      ctx.fillStyle = 'rgba(156, 39, 176, 0.7)';
      ctx.strokeStyle = '#E1BEE7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(14, -7, ef.range - 14, 14, 7);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (ef.type === 'robin_clutch' || ef.type === 'mil_fleur') {
    const count = ef.count || 6;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const dist = ef.type === 'mil_fleur' ? (25 + (i % 4) * 32) : 14;
      const bx = ef.x + Math.cos(a) * dist;
      const by = ef.y + Math.sin(a) * dist;
      ctx.fillStyle = 'rgba(171, 71, 188, 0.72)';
      ctx.strokeStyle = '#F3E5F5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(bx, by, 7, 16, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (ef.type === 'gigantesco_impact') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    ctx.fillStyle = 'rgba(123, 31, 162, 0.75)';
    ctx.strokeStyle = '#F3E5F5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(0, -ef.width / 2, ef.range, ef.width, 16);
    ctx.fill();
    ctx.stroke();
  } else if (ef.type === 'shanks_electric_arc') {
    // Shanks Golpe 5: Arco rojo eléctrico colosal con barrido dinámico y núcleo de Haki
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const currR = ef.range * (0.42 + easeOutQuart(progress) * 0.58);
    const hAng = (90 * Math.PI) / 180;
    const headT = easeOutQuart(Math.min(1, progress / 0.36));
    const tailT = easeOutQuart(Math.max(0, (progress - 0.28) / 0.72)) * 0.58;
    const startA = -hAng + (2 * hAng) * tailT;
    const endA = -hAng + (2 * hAng) * headT;
    drawTaperedCrescent(currR, startA, endA, 22 * Math.max(0.45, alpha), '#FF1744', '#111111');
    // Rayos eléctricos rojos y blancos chisporroteando a lo largo del filo
    ctx.strokeStyle = Math.floor(progress * 12) % 2 === 0 ? '#FF5252' : '#FFFFFF';
    ctx.lineWidth = 3.2 * alpha;
    for (let k = -3; k <= 3; k++) {
      const a = (k / 4) * hAng;
      if (a < startA || a > endA) continue;
      const r1 = currR - 18;
      const r2 = currR + 22;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a + 0.08) * (currR + 6), Math.sin(a + 0.08) * (currR + 6));
      ctx.lineTo(Math.cos(a - 0.05) * r2, Math.sin(a - 0.05) * r2);
      ctx.stroke();
    }
  } else if (ef.type === 'shanks_haki_burst') {
    // Shanks H1: Círculo rojo vibrante 360° con ondas concéntricas y deformación de borde
    const prog = 1 - alpha;
    const curR = ef.range * (0.25 + prog * 0.75);
    ctx.fillStyle = `rgba(255, 23, 68, ${0.28 * alpha})`;
    ctx.beginPath();
    // Borde vibrante deformado
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.15) {
      const vib = Math.sin(a * 12 + prog * 20) * 4.5 * alpha;
      const r = curR + vib;
      const px = ef.x + Math.cos(a) * r;
      const py = ef.y + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FF1744';
    ctx.lineWidth = 7 * alpha;
    ctx.stroke();
    // Ondas concéntricas internas
    ctx.strokeStyle = '#D50000';
    ctx.lineWidth = 3 * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ef.type === 'wb_fissure_wide') {
    // Barbablanca Golpe 1: Grieta ancha blanca con detalles rojos y roca levantándose (legacy - ya no se usa en v1.9e+)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = (ef.width || 60) * alpha;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ef.x, ef.y);
    ctx.lineTo(ef.endX, ef.endY);
    ctx.stroke();
    ctx.strokeStyle = ef.subColor || '#D50000';
    ctx.lineWidth = 8 * alpha;
    ctx.stroke();
  } else if (ef.type === 'wb_seaquake_crack') {
    // Barbablanca Seaquake (combo hit 1 y H1): Grieta irregular gris en el suelo (v1.9e)
    // Dibuja una línea principal quebrada con grosor variable y fracturas secundarias
    // color = núcleo oscuro (profundidad), subColor = bordes grises medios
    const cx = ef.x, cy = ef.y;
    const ex = ef.endX, ey = ef.endY;
    const dx = ex - cx, dy = ey - cy;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux; // perpendicular
    const baseWidth = (ef.width || 60) * alpha;
    const coreColor = ef.color || '#263238';
    const edgeColor = ef.subColor || '#78909C';
    const segments = 18; // tramos para irregularidad
    // Dibuja borde irregular (lado A)
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = Math.max(2, baseWidth * 0.15);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const bx = cx + ux * len * t;
      const by = cy + uy * len * t;
      // Grosor variable: más grueso en centro (t=0.5), más fino en extremos
      const widthMult = 0.6 + 0.8 * (1 - Math.abs(t - 0.5) * 2);
      const offset = (baseWidth * 0.55) * widthMult;
      // Jitter irregular en perpendicular
      const jitter = (Math.sin(t * Math.PI * 7) * 0.35 + Math.random() * 0.15) * offset;
      const px1 = bx + px * (offset + jitter);
      const py1 = by + py * (offset + jitter);
      if (i === 0) ctx.moveTo(px1, py1);
      else ctx.lineTo(px1, py1);
    }
    ctx.stroke();
    // Dibuja borde irregular (lado B - simétrico)
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const bx = cx + ux * len * t;
      const by = cy + uy * len * t;
      const widthMult = 0.6 + 0.8 * (1 - Math.abs(t - 0.5) * 2);
      const offset = (baseWidth * 0.55) * widthMult;
      const jitter = (Math.sin(t * Math.PI * 7 + 1.3) * 0.35 + Math.random() * 0.15) * offset;
      const px1 = bx - px * (offset + jitter);
      const py1 = by - py * (offset + jitter);
      if (i === 0) ctx.moveTo(px1, py1);
      else ctx.lineTo(px1, py1);
    }
    ctx.stroke();
    // Rellena el interior con color núcleo (profundidad)
    ctx.fillStyle = coreColor;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const bx = cx + ux * len * t;
      const by = cy + uy * len * t;
      const widthMult = 0.6 + 0.8 * (1 - Math.abs(t - 0.5) * 2);
      const offset = (baseWidth * 0.55) * widthMult;
      const jitter = (Math.sin(t * Math.PI * 7) * 0.35 + Math.random() * 0.15) * offset;
      const px1 = bx + px * (offset + jitter);
      const py1 = by + py * (offset + jitter);
      if (i === 0) ctx.moveTo(px1, py1);
      else ctx.lineTo(px1, py1);
    }
    for (let i = segments; i >= 0; i--) {
      const t = i / segments;
      const bx = cx + ux * len * t;
      const by = cy + uy * len * t;
      const widthMult = 0.6 + 0.8 * (1 - Math.abs(t - 0.5) * 2);
      const offset = (baseWidth * 0.55) * widthMult;
      const jitter = (Math.sin(t * Math.PI * 7 + 1.3) * 0.35 + Math.random() * 0.15) * offset;
      const px1 = bx - px * (offset + jitter);
      const py1 = by - py * (offset + jitter);
      ctx.lineTo(px1, py1);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha;
    // Fracturas secundarias cortas ("raíces") saliendo del tronco principal
    const numFractures = 5 + Math.floor(Math.random() * 4);
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = Math.max(1.5, baseWidth * 0.07);
    for (let f = 0; f < numFractures; f++) {
      const t = 0.15 + Math.random() * 0.7; // posición a lo largo de la grieta
      const fx = cx + ux * len * t;
      const fy = cy + uy * len * t;
      const side = Math.random() < 0.5 ? 1 : -1;
      const angle = Math.atan2(uy, ux) + side * (Math.PI / 2 + (Math.random() - 0.5) * 0.6);
      const flen = 15 + Math.random() * (baseWidth * 0.6);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(angle) * flen, fy + Math.sin(angle) * flen);
      ctx.stroke();
      // Sub-fractura
      if (Math.random() < 0.4) {
        const mx = fx + Math.cos(angle) * flen * 0.5;
        const my = fy + Math.sin(angle) * flen * 0.5;
        const angle2 = angle + side * (Math.random() - 0.5) * 0.8;
        const flen2 = flen * 0.4;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(angle2) * flen2, my + Math.sin(angle2) * flen2);
        ctx.stroke();
      }
    }
  } else if (ef.type === 'shanks_h2_haki_circle') {
    // Shanks H2 v1.9f: Círculo de Haki retardado - aura difusa tipo Conqueror's Haki
    // Sin línea de borde: gradiente radial difuso desde centro (intenso) → bordes (tenue)
    // Radio fijo 140px, cortes cruzados rojos/negros rotando, hit-stops por tick
    const prog = 1 - alpha; // 0→1 durante 2s
    const curR = ef.range; // 140px fijo
    const rotation = prog * Math.PI * 4; // 2 vueltas completas en 2s

    // Gradiente radial difuso: centro intenso → bordes transparentes (sin stroke/border)
    const grad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, curR);
    grad.addColorStop(0, `rgba(255, 23, 68, ${0.45 * alpha})`);      // centro: rojo Haki intenso
    grad.addColorStop(0.35, `rgba(255, 23, 68, ${0.28 * alpha})`);   // medio: rojo medio
    grad.addColorStop(0.65, `rgba(213, 0, 0, ${0.18 * alpha})`);      // externo: carmesí tenue
    grad.addColorStop(1, `rgba(17, 17, 17, 0)`);                      // borde: transparente total
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR, 0, Math.PI * 2);
    ctx.fill();

    // Anillos concéntricos sutiles (solo fill, sin stroke) para profundidad
    for (let ring = 0; ring < 2; ring++) {
      const ringR = curR * (0.45 + ring * 0.3);
      const ringGrad = ctx.createRadialGradient(ef.x, ef.y, ringR * 0.6, ef.x, ef.y, ringR);
      ringGrad.addColorStop(0, `rgba(255, 23, 68, ${0.12 * alpha * (1 - ring * 0.4)})`);
      ringGrad.addColorStop(1, `rgba(213, 0, 0, 0)`);
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ringR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cortes cruzados rotando (efecto "carne siendo cortada") - trazos rojos/negros
    ctx.strokeStyle = `rgba(255, 23, 68, ${0.85 * alpha})`;
    ctx.lineWidth = 2.2 * alpha;
    const numCuts = 10;
    for (let c = 0; c < numCuts; c++) {
      const baseAngle = rotation + (c / numCuts) * Math.PI * 2;
      const len = curR * (0.75 + Math.random() * 0.2);
      ctx.beginPath();
      ctx.moveTo(ef.x + Math.cos(baseAngle) * curR * 0.15, ef.y + Math.sin(baseAngle) * curR * 0.15);
      ctx.lineTo(ef.x + Math.cos(baseAngle) * len, ef.y + Math.sin(baseAngle) * len);
      ctx.stroke();
    }
    // Cortes secundarios negros para contraste (estilo Haki avanzado)
    ctx.strokeStyle = `rgba(17, 17, 17, ${0.5 * alpha})`;
    ctx.lineWidth = 1.5 * alpha;
    for (let c = 0; c < numCuts; c++) {
      const baseAngle = rotation + Math.PI / numCuts + (c / numCuts) * Math.PI * 2;
      const len = curR * (0.5 + Math.random() * 0.25);
      ctx.beginPath();
      ctx.moveTo(ef.x + Math.cos(baseAngle) * curR * 0.25, ef.y + Math.sin(baseAngle) * curR * 0.25);
      ctx.lineTo(ef.x + Math.cos(baseAngle) * len, ef.y + Math.sin(baseAngle) * len);
      ctx.stroke();
    }
    // NO hay borde exterior (stroke en el perímetro) - aura difusa sin frontera definida
  } else if (ef.type === 'shanks_h2_haki_explosion') {
    // Shanks H2 v1.9e: Explosión final onda expansiva roja de Haki
    const prog = 1 - alpha; // 0→1 durante 0.35s
    const maxR = ef.range; // 210px (140 + 70)
    const curR = maxR * prog;
    // Onda expansiva principal
    ctx.strokeStyle = `rgba(255, 23, 68, ${alpha})`;
    ctx.lineWidth = 8 * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR, 0, Math.PI * 2);
    ctx.stroke();
    // Ondas secundarias
    for (let w = 1; w <= 3; w++) {
      const waveR = curR - w * 18;
      if (waveR > 0) {
        ctx.strokeStyle = `rgba(213, 0, 0, ${alpha * (0.6 - w * 0.15)})`;
        ctx.lineWidth = Math.max(2, 4 - w) * alpha;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Estela interna negra (profundidad)
    ctx.strokeStyle = `rgba(17, 17, 17, ${0.5 * alpha})`;
    ctx.lineWidth = 3 * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ef.type === 'wb_haki_sweep') {
    // Barbablanca Golpe 3: Barrido rojo Haki en abanico 240° con media luna cónica animada
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const curR = ef.range * (0.45 + easeOutQuart(progress) * 0.55);
    const hAng = ef.halfAngle || ((240 * Math.PI) / 180 / 2);
    const headT = easeOutQuart(Math.min(1, progress / 0.36));
    const tailT = easeOutQuart(Math.max(0, (progress - 0.25) / 0.75)) * 0.55;
    const startA = -hAng + (2 * hAng) * tailT;
    const endA = -hAng + (2 * hAng) * headT;
    drawTaperedCrescent(curR, startA, endA, 20 * Math.max(0.45, alpha), '#D50000', '#111111');
    drawTaperedCrescent(curR * 0.88, startA * 0.92, endA * 0.92, 6 * alpha, 'rgba(255, 255, 255, 0.7)', null);
  } else if (ef.type === 'wb_fissure_ring') {
    // Barbablanca H2 Aterrizaje: Onda circular y grieta sísmica
    const prog = 1 - alpha;
    const curR = ef.range * (0.35 + prog * 0.65);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8 * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ef.subColor || '#D50000';
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ef.type === 'expanding_red_arc') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const prog = 1 - alpha;
    const currR = ef.range * (0.35 + prog * 0.65);
    const hAng = ef.halfAngle || (75 * Math.PI) / 180;
    ctx.strokeStyle = ef.color || '#FF1744';
    ctx.lineWidth = 8 * alpha;
    ctx.beginPath();
    ctx.arc(0, 0, currR, -hAng, hAng);
    ctx.stroke();
    if (ef.subColor) {
      ctx.strokeStyle = ef.subColor;
      ctx.lineWidth = 3.5 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, currR * 0.9, -hAng * 0.9, hAng * 0.9);
      ctx.stroke();
    }
  } else if (ef.type === 'fissure_line') {
    ctx.strokeStyle = ef.color || '#FFFFFF';
    ctx.lineWidth = (ef.width || 40) * alpha;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ef.x, ef.y);
    ctx.lineTo(ef.endX, ef.endY);
    ctx.stroke();
  } else if (ef.type === 'electric_slash') {
    ctx.strokeStyle = ef.color || '#FF1744';
    ctx.lineWidth = 12 * alpha;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ef.x, ef.y);
    ctx.lineTo(ef.endX, ef.endY);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4 * alpha;
    ctx.stroke();
  } else if (ef.type === 'massive_seaquake') {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = (ef.width || 80) * alpha;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ef.x, ef.y);
    ctx.lineTo(ef.endX, ef.endY);
    ctx.stroke();
    ctx.strokeStyle = ef.subColor || '#FF1744';
    ctx.lineWidth = 6 * alpha;
    ctx.stroke();
  } else if (ef.type === 'divine_x') {
    ctx.strokeStyle = ef.color || '#FF1744';
    ctx.lineWidth = 7 * alpha;
    ctx.beginPath();
    ctx.moveTo(ef.x - ef.range, ef.y - ef.range);
    ctx.lineTo(ef.x + ef.range, ef.y + ef.range);
    ctx.moveTo(ef.x + ef.range, ef.y - ef.range);
    ctx.lineTo(ef.x - ef.range, ef.y + ef.range);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3 * alpha;
    ctx.stroke();
  } else if (ef.type === 'red_hawk_explosion') {
    // Explosión ígnea de Red Hawk (escala completa 300px en H1, escala reducida 130px en Jet Bazooka)
    const prog = 1 - alpha;
    const curR = ef.range * (0.35 + prog * 0.65);

    // Halo de llamas exterior con gradiente radial
    const flameGrad = ctx.createRadialGradient(ef.x, ef.y, curR * 0.15, ef.x, ef.y, curR);
    flameGrad.addColorStop(0, `rgba(255, 245, 157, ${0.95 * alpha})`);
    flameGrad.addColorStop(0.45, `rgba(255, 87, 34, ${0.85 * alpha})`);
    flameGrad.addColorStop(0.8, `rgba(213, 0, 0, ${0.55 * alpha})`);
    flameGrad.addColorStop(1, 'rgba(213, 0, 0, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR, 0, Math.PI * 2);
    ctx.fill();

    // Puntas de llamas radiales escaladas proporcionalmente
    ctx.strokeStyle = `rgba(255, 145, 0, ${0.9 * alpha})`;
    ctx.lineWidth = Math.max(3, ef.range * 0.035) * alpha;
    ctx.lineCap = 'round';
    for (let s = 0; s < 10; s++) {
      const sa = (s / 10) * Math.PI * 2 + prog * 0.6;
      ctx.beginPath();
      ctx.moveTo(ef.x + Math.cos(sa) * curR * 0.42, ef.y + Math.sin(sa) * curR * 0.42);
      ctx.lineTo(ef.x + Math.cos(sa) * curR * 0.96, ef.y + Math.sin(sa) * curR * 0.96);
      ctx.stroke();
    }

    // Núcleo compacto de Haki Busoshoku + anillo expansivo naranja-rojo
    ctx.fillStyle = `rgba(24, 24, 27, ${0.88 * alpha})`;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FF1744';
    ctx.lineWidth = Math.max(3, ef.range * 0.028) * alpha;
    ctx.stroke();

    ctx.strokeStyle = '#FFEB3B';
    ctx.lineWidth = Math.max(2, ef.range * 0.02) * alpha;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR * 0.92, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ef.type === 'kkg_impact' || ef.type === 'black_haki_ball') {
    const prog = 1 - alpha;
    const curR = ef.range * (0.35 + prog * 0.65);
    ctx.fillStyle = ef.color || '#111111';
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, curR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ef.subColor || '#FF1744';
    ctx.lineWidth = 6 * alpha;
    ctx.stroke();
  } else if (ef.type === 'marine_saber_arc') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const hAng = ef.halfAngle || Math.PI / 3.5;
    const headT = easeOutQuart(Math.min(1, progress / 0.38));
    const tailT = easeOutQuart(Math.max(0, (progress - 0.28) / 0.72)) * 0.6;
    drawTaperedCrescent(ef.range, -hAng + (2 * hAng) * tailT, -hAng + (2 * hAng) * headT, 9 * Math.max(0.4, alpha), '#CFD8DC', '#FFFFFF');
  } else if (ef.type === 'sanzen_final') {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const hAng = ef.halfAngle || (60 * Math.PI) / 180;
    const headT = easeOutQuart(Math.min(1, progress / 0.34));
    const tailT = easeOutQuart(Math.max(0, (progress - 0.25) / 0.75)) * 0.55;
    const startA = -hAng + (2 * hAng) * tailT;
    const endA = -hAng + (2 * hAng) * headT;
    ctx.fillStyle = 'rgba(165, 214, 167, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, ef.range, -hAng, endA);
    ctx.closePath();
    ctx.fill();
    drawTaperedCrescent(ef.range, startA, endA, 18 * Math.max(0.45, alpha), '#66BB6A', '#FFFFFF');
    drawTaperedCrescent(ef.range * 0.78, startA * 0.9, endA * 0.9, 8 * alpha, '#FFFFFF', null);
  } else if (ef.type === 'stretch') {
    const prog = Math.max(0, Math.min(1, 1 - alpha));
    let ext: number;
    if (prog < 0.55) {
      const tOut = prog / 0.55;
      ext = 1 - Math.pow(1 - tOut, 2.2);
    } else if (prog < 0.72) {
      ext = 1.0;
    } else {
      const tBack = (prog - 0.72) / 0.28;
      ext = 1.0 - tBack * 0.76;
    }
    const startDist = 14;
    const curLen = startDist + (ef.range - startDist) * ext;
    const perp = ef.angle + Math.PI / 2;
    const ox = (ef.followPlayer && STATE.player)
      ? STATE.player.x + Math.cos(perp) * (ef.armOffset || 0)
      : ef.x;
    const oy = (ef.followPlayer && STATE.player)
      ? STATE.player.y + Math.sin(perp) * (ef.armOffset || 0)
      : ef.y;

    ctx.translate(ox, oy);
    ctx.rotate(ef.angle);

    if (ef.isRubberArm) {
      const baseHalfW = 7.5;
      const midHalfW = Math.max(3.6, 6.2 - ext * 2.3);
      const wristHalfW = 6.8;
      const midLen = startDist + (curLen - startDist) * 0.52;

      ctx.beginPath();
      ctx.moveTo(startDist, -baseHalfW);
      ctx.quadraticCurveTo(midLen, -midHalfW, curLen - 6, -wristHalfW);
      ctx.lineTo(curLen - 6, wristHalfW);
      ctx.quadraticCurveTo(midLen, midHalfW, startDist, baseHalfW);
      ctx.closePath();

      if (ef.hakiArm) {
        const armGrad = ctx.createLinearGradient(startDist, 0, curLen, 0);
        armGrad.addColorStop(0, ef.armColor || '#FFCC80');
        armGrad.addColorStop(0.55, ef.armColor || '#FFCC80');
        armGrad.addColorStop(0.72, '#212121');
        armGrad.addColorStop(1, ef.isRedHawk ? '#B71C1C' : '#111111');
        ctx.fillStyle = armGrad;
      } else {
        ctx.fillStyle = ef.armColor || '#FFCC80';
      }
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Estela sutil de velocidad/goma alrededor del brazo estirado
      ctx.strokeStyle = ef.color;
      ctx.lineWidth = 2.0;
      ctx.globalAlpha = alpha * 0.65;
      ctx.beginPath();
      ctx.moveTo(startDist + 6, 0);
      ctx.lineTo(curLen - 8, 0);
      ctx.stroke();
      ctx.globalAlpha = alpha;

      // Puño cartoon al extremo del estiramiento
      ctx.save();
      ctx.translate(curLen, 0);
      ctx.fillStyle = ef.isRedHawk ? '#FF3D00' : (ef.hakiArm ? '#1C1C1C' : (ef.armColor || '#FFCC80'));
      ctx.strokeStyle = ef.isRedHawk ? '#FFEB3B' : '#111111';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-8, -10.5, 18, 21, 6);
      ctx.fill();
      ctx.stroke();

      // Nudillos / dedo pulgar para leerlo como puño y no círculo
      ctx.fillStyle = ef.hakiArm ? '#333333' : '#FFE0B2';
      ctx.beginPath();
      ctx.arc(4, -5.5, 2.5, 0, Math.PI * 2);
      ctx.arc(4, 0, 2.5, 0, Math.PI * 2);
      ctx.arc(4, 5.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (ext >= 0.90) {
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(4, 0, 14 + (1 - ext) * 20, -Math.PI * 0.55, Math.PI * 0.55);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = ef.color;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startDist, 0);
      ctx.lineTo(curLen, 0);
      ctx.stroke();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(curLen, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ef.type === 'line' || ef.type === 'onigiri') {
    const w = (ef.width || (ef.type === 'onigiri' ? 18 : 11)) * Math.max(0.35, alpha);
    drawTaperedSlashLine(ef.x, ef.y, ef.endX, ef.endY, w, ef.color, ef.subColor || '#FFFFFF', progress);
  } else {
    ctx.translate(ef.x, ef.y);
    ctx.rotate(ef.angle);
    const hAng = ef.halfAngle || Math.PI / 3;
    const headT = easeOutQuart(Math.min(1, progress / 0.35));
    const tailT = easeOutQuart(Math.max(0, (progress - 0.24) / 0.76)) * 0.62;
    const startA = -hAng + (2 * hAng) * tailT;
    const endA = -hAng + (2 * hAng) * headT;
    drawTaperedCrescent(ef.range, startA, endA, 13 * Math.max(0.42, alpha), ef.color || '#FFFFFF', '#FFFFFF');

    if (ef.type === 'arc_cross') {
      drawTaperedCrescent(ef.range * 0.78, startA * 0.85, endA * 0.85, 8 * Math.max(0.4, alpha), ef.subColor || '#FFFFFF', '#FFFFFF');
    }
  }

  ctx.restore();
}
