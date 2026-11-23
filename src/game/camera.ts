// ============================================================================
// 2D. CAMERA: Cámara con Deadzone Central 20% y Clamp al Mundo 2560x1440
// ============================================================================

import { CONFIG } from './config';
import { STATE } from './state';

export function triggerScreenShake(intensity = 4, duration = 0.12): void {
  STATE.shakeIntensity = Math.min(12, intensity);
  STATE.shakeTimer = duration;
}

export const CAMERA = {
  x: 640,
  y: 360,

  resetToPlayer() {
    this.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - CONFIG.WIDTH, STATE.player.x - CONFIG.WIDTH / 2));
    this.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.HEIGHT, STATE.player.y - CONFIG.HEIGHT / 2));
  },

  update() {
    const p = STATE.player;
    const centerX = this.x + CONFIG.WIDTH / 2;
    const centerY = this.y + CONFIG.HEIGHT / 2;
    const halfDeadW = CONFIG.CAM_DEADZONE_W / 2;
    const halfDeadH = CONFIG.CAM_DEADZONE_H / 2;

    let targetX = this.x;
    let targetY = this.y;

    if (p.x < centerX - halfDeadW) {
      targetX = p.x + halfDeadW - CONFIG.WIDTH / 2;
    } else if (p.x > centerX + halfDeadW) {
      targetX = p.x - halfDeadW - CONFIG.WIDTH / 2;
    }

    if (p.y < centerY - halfDeadH) {
      targetY = p.y + halfDeadH - CONFIG.HEIGHT / 2;
    } else if (p.y > centerY + halfDeadH) {
      targetY = p.y - halfDeadH - CONFIG.HEIGHT / 2;
    }

    targetX = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - CONFIG.WIDTH, targetX));
    targetY = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.HEIGHT, targetY));

    this.x += (targetX - this.x) * CONFIG.CAM_LERP;
    this.y += (targetY - this.y) * CONFIG.CAM_LERP;
  }
};
