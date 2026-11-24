// ============================================================================
// 3. INPUT: Rastreo Global de Dedos + Joystick Virtual + Teclado y Botones
// ============================================================================

import { CONFIG } from './config';
import { CHARACTERS, getCharacterModule } from './characters/index';
import { STATE } from './state';
import { AUDIO } from './audio';

export interface TouchInputState {
  joystick: {
    active: boolean;
    touchId: number | null;
    originX: number;
    originY: number;
    currX: number;
    currY: number;
    dirX: number;
    dirY: number;
    magnitude: number;
  };
  attackHeld: boolean;
  attackTouchId: number | null;
}

export const INPUT_TOUCH: TouchInputState = {
  joystick: {
    active: false,
    touchId: null,
    originX: 0,
    originY: 0,
    currX: 0,
    currY: 0,
    dirX: 0,
    dirY: 0,
    magnitude: 0
  },
  attackHeld: false,
  attackTouchId: null
};

export const INPUT_KEYS = new Set<string>();
let holdKeyIdx: number | null = null;
let holdKeyStartTime = 0;
let holdMouseIdx: number | null = null;
let holdTouchId: number | null = null;
let holdTouchIdx: number | null = null;
let holdTouchStartTime = 0;
let holdDashKeyCode: string | null = null;
let holdDashMouse = false;
let holdDashTouchId: number | null = null;
let inputInitialized = false;

export interface InputHandlers {
  onUnlockModalTouchStart: (touchId: number) => void;
  onUnlockModalTouchEnd: (touchId: number) => void;
  onAdvanceTutorial: () => void;
  onStartGame: (e: Event) => void;
  onSwitchScreen: (screen: string) => void;
  onAttack: () => void;
  onDash: () => void;
  onReleaseHoldDash: () => void;
  onSkill: (idx: number) => void;
  onReleaseHoldSkill: (idx: number) => void;
}

export function screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) return { x: clientX, y: clientY };
  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.WIDTH / (rect.width || CONFIG.WIDTH);
  const scaleY = CONFIG.HEIGHT / (rect.height || CONFIG.HEIGHT);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

export function flashButton(flashId: string): void {
  const el = document.getElementById(flashId);
  if (!el) return;
  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');
}

export function getMoveInput(): { dirX: number; dirY: number; magnitude: number } {
  if (INPUT_TOUCH.joystick.active && INPUT_TOUCH.joystick.magnitude > 0) {
    return {
      dirX: INPUT_TOUCH.joystick.dirX,
      dirY: INPUT_TOUCH.joystick.dirY,
      magnitude: INPUT_TOUCH.joystick.magnitude
    };
  }
  let kx = 0;
  let ky = 0;
  if (INPUT_KEYS.has('KeyA') || INPUT_KEYS.has('ArrowLeft')) kx -= 1;
  if (INPUT_KEYS.has('KeyD') || INPUT_KEYS.has('ArrowRight')) kx += 1;
  if (INPUT_KEYS.has('KeyW') || INPUT_KEYS.has('ArrowUp')) ky -= 1;
  if (INPUT_KEYS.has('KeyS') || INPUT_KEYS.has('ArrowDown')) ky += 1;
  if (kx !== 0 || ky !== 0) {
    const len = Math.hypot(kx, ky);
    return { dirX: kx / len, dirY: ky / len, magnitude: 1 };
  }
  return { dirX: 0, dirY: 0, magnitude: 0 };
}

export function clearAllHeldInputs(): void {
  INPUT_KEYS.clear();
  INPUT_TOUCH.attackHeld = false;
  INPUT_TOUCH.attackTouchId = null;
  INPUT_TOUCH.joystick.active = false;
  INPUT_TOUCH.joystick.magnitude = 0;
  holdKeyIdx = null;
  holdMouseIdx = null;
  holdTouchId = null;
  holdTouchIdx = null;
  holdDashKeyCode = null;
  holdDashMouse = false;
  holdDashTouchId = null;
  const btnAtk = document.getElementById('btn-attack');
  if (btnAtk) btnAtk.classList.remove('pressed');
}

export function initInput(handlers: InputHandlers): void {
  if (inputInitialized) return;
  inputInitialized = true;

  document.addEventListener('touchstart', (e) => {
    AUDIO.unlock();
    for (let i = 0; i < e.changedTouches.length; i++) {
      handlers.onUnlockModalTouchStart(e.changedTouches[i].identifier);
    }
  }, { passive: true, capture: true });

  document.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      handlers.onUnlockModalTouchEnd(e.changedTouches[i].identifier);
    }
  }, { passive: true, capture: true });

  document.addEventListener('touchcancel', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      handlers.onUnlockModalTouchEnd(e.changedTouches[i].identifier);
    }
  }, { passive: true, capture: true });

  document.addEventListener('mousedown', () => AUDIO.unlock(), { passive: true });
  document.addEventListener('pointerdown', () => AUDIO.unlock(), { passive: true });

  const gameWrapper = document.getElementById('game-wrapper');
  if (gameWrapper) {
    gameWrapper.addEventListener('touchstart', (e) => {
      if (STATE.screen !== 'playing') return;

      if (STATE.tutorial.active) {
        handlers.onAdvanceTutorial();
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const target = t.target as HTMLElement | null;
        if (target && target.closest('.interactive')) continue;

        const pos = screenToCanvas(t.clientX, t.clientY);
        if (pos.x < CONFIG.WIDTH * 0.5 && !INPUT_TOUCH.joystick.active) {
          INPUT_TOUCH.joystick.active = true;
          INPUT_TOUCH.joystick.touchId = t.identifier;
          INPUT_TOUCH.joystick.originX = pos.x;
          INPUT_TOUCH.joystick.originY = pos.y;
          INPUT_TOUCH.joystick.currX = pos.x;
          INPUT_TOUCH.joystick.currY = pos.y;
          INPUT_TOUCH.joystick.dirX = 0;
          INPUT_TOUCH.joystick.dirY = 0;
          INPUT_TOUCH.joystick.magnitude = 0;
        }
      }
    }, { passive: false });

    gameWrapper.addEventListener('touchmove', (e) => {
      if (STATE.screen !== 'playing') return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (INPUT_TOUCH.joystick.active && t.identifier === INPUT_TOUCH.joystick.touchId) {
          const pos = screenToCanvas(t.clientX, t.clientY);
          let dx = pos.x - INPUT_TOUCH.joystick.originX;
          let dy = pos.y - INPUT_TOUCH.joystick.originY;
          const dist = Math.hypot(dx, dy);
          const maxR = CONFIG.JOYSTICK_RADIUS;

          if (dist > maxR) {
            const angle = Math.atan2(dy, dx);
            INPUT_TOUCH.joystick.originX = pos.x - Math.cos(angle) * maxR;
            INPUT_TOUCH.joystick.originY = pos.y - Math.sin(angle) * maxR;
            dx = pos.x - INPUT_TOUCH.joystick.originX;
            dy = pos.y - INPUT_TOUCH.joystick.originY;
          }

          INPUT_TOUCH.joystick.currX = pos.x;
          INPUT_TOUCH.joystick.currY = pos.y;

          const clampedDist = Math.min(dist, maxR);
          const norm = clampedDist / maxR;

          if (norm < CONFIG.JOYSTICK_DEADZONE) {
            INPUT_TOUCH.joystick.dirX = 0;
            INPUT_TOUCH.joystick.dirY = 0;
            INPUT_TOUCH.joystick.magnitude = 0;
          } else {
            const adjustedMag = (norm - CONFIG.JOYSTICK_DEADZONE) / (1 - CONFIG.JOYSTICK_DEADZONE);
            const angle = Math.atan2(dy, dx);
            INPUT_TOUCH.joystick.dirX = Math.cos(angle);
            INPUT_TOUCH.joystick.dirY = Math.sin(angle);
            INPUT_TOUCH.joystick.magnitude = Math.min(1, adjustedMag);
          }
        }
      }
    }, { passive: false });

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (INPUT_TOUCH.joystick.active && t.identifier === INPUT_TOUCH.joystick.touchId) {
          INPUT_TOUCH.joystick.active = false;
          INPUT_TOUCH.joystick.touchId = null;
          INPUT_TOUCH.joystick.dirX = 0;
          INPUT_TOUCH.joystick.dirY = 0;
          INPUT_TOUCH.joystick.magnitude = 0;
        }
        if (INPUT_TOUCH.attackHeld && t.identifier === INPUT_TOUCH.attackTouchId) {
          INPUT_TOUCH.attackHeld = false;
          INPUT_TOUCH.attackTouchId = null;
          const btnAtk = document.getElementById('btn-attack');
          if (btnAtk) btnAtk.classList.remove('pressed');
        }
      }
    };
    gameWrapper.addEventListener('touchend', handleTouchEnd);
    gameWrapper.addEventListener('touchcancel', handleTouchEnd);
  }

  window.addEventListener('blur', clearAllHeldInputs);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAllHeldInputs();
  });

  window.addEventListener('keydown', (e) => {
    AUDIO.unlock();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (STATE.screen === 'menu' && (e.code === 'Enter' || e.code === 'Space') && !e.repeat) {
      handlers.onStartGame(e);
      return;
    }
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      if (STATE.screen === 'playing') {
        AUDIO.playUIClick();
        const pauseStats = document.getElementById('pause-stats');
        if (pauseStats) {
          pauseStats.textContent =
            `Pirata: ${CHARACTERS[STATE.charId].name} • Oleada: ${STATE.wave}/${CONFIG.MAX_WAVES} • Mejoras: ${STATE.mods.acquiredIds.length}`;
        }
        handlers.onSwitchScreen('pause');
        return;
      } else if (STATE.screen === 'pause') {
        AUDIO.playUIClick();
        handlers.onSwitchScreen('playing');
        return;
      }
    }
    if (STATE.screen !== 'playing') return;
    INPUT_KEYS.add(e.code);
    if (
      STATE.tutorial.active &&
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyJ'].includes(e.code)
    ) {
      handlers.onAdvanceTutorial();
    }
    if ((e.code === 'Space' || e.code === 'KeyJ') && !e.repeat) {
      INPUT_TOUCH.attackHeld = true;
      const btnAtk = document.getElementById('btn-attack');
      if (btnAtk) btnAtk.classList.add('pressed');
      flashButton('flash-attack');
      handlers.onAttack();
    } else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') && !e.repeat) {
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.supportsHoldDash?.() && !charMod.isHoldDashActive?.(STATE.player)) {
        holdDashKeyCode = e.code;
      }
      flashButton('flash-dash');
      handlers.onDash();
    } else if ((e.code === 'Digit1' || e.code === 'KeyU') && !e.repeat) {
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.supportsHoldSkill?.(0) && !charMod.isHoldSkillActive?.(STATE.player, 0)) {
        holdKeyIdx = 0;
        holdKeyStartTime = performance.now();
      }
      flashButton('flash-h1');
      handlers.onSkill(0);
    } else if ((e.code === 'Digit2' || e.code === 'KeyI') && !e.repeat) {
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.supportsHoldSkill?.(1) && !charMod.isHoldSkillActive?.(STATE.player, 1)) {
        holdKeyIdx = 1;
        holdKeyStartTime = performance.now();
      }
      flashButton('flash-h2');
      handlers.onSkill(1);
    } else if ((e.code === 'Digit3' || e.code === 'KeyO') && !e.repeat) {
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.supportsHoldSkill?.(2) && !charMod.isHoldSkillActive?.(STATE.player, 2)) {
        holdKeyIdx = 2;
        holdKeyStartTime = performance.now();
      }
      flashButton('flash-h3');
      handlers.onSkill(2);
    }
  });

  window.addEventListener('keyup', (e) => {
    INPUT_KEYS.delete(e.code);
    if (e.code === 'Space' || e.code === 'KeyJ') {
      INPUT_TOUCH.attackHeld = false;
      const btnAtk = document.getElementById('btn-attack');
      if (btnAtk) btnAtk.classList.remove('pressed');
    }
    if (holdDashKeyCode && e.code === holdDashKeyCode) {
      holdDashKeyCode = null;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.isHoldDashActive?.(STATE.player)) {
        handlers.onReleaseHoldDash();
      }
    }
    const keySkillIdx =
      e.code === 'Digit1' || e.code === 'KeyU' ? 0 :
      e.code === 'Digit2' || e.code === 'KeyI' ? 1 :
      e.code === 'Digit3' || e.code === 'KeyO' ? 2 : -1;
    if (keySkillIdx >= 0 && holdKeyIdx === keySkillIdx) {
      holdKeyIdx = null;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.isHoldSkillActive?.(STATE.player, keySkillIdx)) {
        if (performance.now() - holdKeyStartTime >= 150) {
          handlers.onReleaseHoldSkill(keySkillIdx);
        }
      }
    }
  });

  const btnAttack = document.getElementById('btn-attack');
  if (btnAttack) {
    btnAttack.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (STATE.screen !== 'playing') return;
      const t = e.changedTouches[0];
      INPUT_TOUCH.attackHeld = true;
      INPUT_TOUCH.attackTouchId = t.identifier;
      btnAttack.classList.add('pressed');
      flashButton('flash-attack');
      handlers.onAttack();
    }, { passive: false });
    btnAttack.addEventListener('mousedown', () => {
      if (STATE.screen !== 'playing') return;
      INPUT_TOUCH.attackHeld = true;
      btnAttack.classList.add('pressed');
      flashButton('flash-attack');
      handlers.onAttack();
    });
  }

  const btnDash = document.getElementById('btn-dash');
  if (btnDash) {
    btnDash.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (STATE.screen !== 'playing') return;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.supportsHoldDash?.()) {
        const t = e.changedTouches[0];
        holdDashTouchId = t.identifier;
      }
      flashButton('flash-dash');
      handlers.onDash();
    }, { passive: false });
    const onDashTouchEnd = (e: TouchEvent) => {
      if (holdDashTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === holdDashTouchId) {
          holdDashTouchId = null;
          const charMod = getCharacterModule(STATE.charId);
          if (charMod.isHoldDashActive?.(STATE.player)) {
            e.preventDefault();
            handlers.onReleaseHoldDash();
          }
          break;
        }
      }
    };
    btnDash.addEventListener('touchend', onDashTouchEnd, { passive: false });
    btnDash.addEventListener('touchcancel', onDashTouchEnd, { passive: false });
    btnDash.addEventListener('mousedown', () => {
      if (STATE.screen !== 'playing') return;
      const charMod = getCharacterModule(STATE.charId);
      if (!charMod.supportsHoldDash?.()) return;
      holdDashMouse = true;
      flashButton('flash-dash');
      handlers.onDash();
    });
    btnDash.addEventListener('mouseup', () => {
      if (!holdDashMouse) return;
      holdDashMouse = false;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.isHoldDashActive?.(STATE.player)) {
        handlers.onReleaseHoldDash();
      }
    });
    btnDash.addEventListener('click', () => {
      if (STATE.screen !== 'playing') return;
      if (getCharacterModule(STATE.charId).supportsHoldDash?.()) return;
      flashButton('flash-dash');
      handlers.onDash();
    });
  }

  [0, 1, 2].forEach((idx) => {
    const btnH = document.getElementById(`btn-h${idx + 1}`);
    if (!btnH) return;

    btnH.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (STATE.screen !== 'playing') return;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.supportsHoldSkill?.(idx)) {
        const t = e.changedTouches[0];
        holdTouchId = t.identifier;
        holdTouchIdx = idx;
        holdTouchStartTime = performance.now();
      }
      flashButton(`flash-h${idx + 1}`);
      handlers.onSkill(idx);
    }, { passive: false });

    const onSkillTouchEnd = (e: TouchEvent) => {
      if (holdTouchId === null || holdTouchIdx !== idx) return;
      const charMod = getCharacterModule(STATE.charId);
      if (!charMod.isHoldSkillActive?.(STATE.player, idx)) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === holdTouchId) {
          const holdDuration = performance.now() - holdTouchStartTime;
          holdTouchId = null;
          holdTouchIdx = null;
          if (holdDuration >= 150) {
            e.preventDefault();
            handlers.onReleaseHoldSkill(idx);
          }
          break;
        }
      }
    };
    btnH.addEventListener('touchend', onSkillTouchEnd, { passive: false });
    btnH.addEventListener('touchcancel', onSkillTouchEnd, { passive: false });

    btnH.addEventListener('mousedown', () => {
      if (STATE.screen !== 'playing') return;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.supportsHoldSkill?.(idx)) {
        holdMouseIdx = idx;
      }
      flashButton(`flash-h${idx + 1}`);
      handlers.onSkill(idx);
    });

    btnH.addEventListener('mouseup', () => {
      if (holdMouseIdx !== idx) return;
      holdMouseIdx = null;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.isHoldSkillActive?.(STATE.player, idx)) {
        handlers.onReleaseHoldSkill(idx);
      }
    });
  });

  window.addEventListener('mouseup', () => {
    if (INPUT_TOUCH.attackHeld && INPUT_TOUCH.attackTouchId === null) {
      INPUT_TOUCH.attackHeld = false;
      const btnAtk = document.getElementById('btn-attack');
      if (btnAtk) btnAtk.classList.remove('pressed');
    }
    if (holdDashMouse) {
      holdDashMouse = false;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.isHoldDashActive?.(STATE.player)) {
        handlers.onReleaseHoldDash();
      }
    }
    if (holdMouseIdx !== null) {
      const idx = holdMouseIdx;
      holdMouseIdx = null;
      const charMod = getCharacterModule(STATE.charId);
      if (charMod.isHoldSkillActive?.(STATE.player, idx)) {
        handlers.onReleaseHoldSkill(idx);
      }
    }
  });

  window.addEventListener('touchend', (e) => {
    if (holdDashTouchId !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === holdDashTouchId) {
          holdDashTouchId = null;
          const charMod = getCharacterModule(STATE.charId);
          if (charMod.isHoldDashActive?.(STATE.player)) {
            handlers.onReleaseHoldDash();
          }
          break;
        }
      }
    }
    if (holdTouchId === null || holdTouchIdx === null) return;
    const charMod = getCharacterModule(STATE.charId);
    if (!charMod.isHoldSkillActive?.(STATE.player, holdTouchIdx)) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === holdTouchId) {
        const holdDuration = performance.now() - holdTouchStartTime;
        const idx = holdTouchIdx;
        holdTouchId = null;
        holdTouchIdx = null;
        if (holdDuration >= 150) {
          handlers.onReleaseHoldSkill(idx);
        }
        break;
      }
    }
  });
}
