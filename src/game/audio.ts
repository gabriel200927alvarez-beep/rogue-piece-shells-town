// ============================================================================
// 2C. AUDIO: Sintetizador Procedural Web Audio API + Música Pirata Roguelike
// ============================================================================

import { STATE } from './state';

export function triggerHaptic(pattern: number | number[]): void {
  if (!STATE.settings.vibration) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignorar si el navegador bloquea vibración fuera de gesto
    }
  }
}

export const AUDIO = {
  ctx: null as AudioContext | null,
  noiseBuffer: null as AudioBuffer | null,
  bgmTimer: null as ReturnType<typeof setInterval> | null,
  bgmStep: 0,

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      const bufferSize = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.startMusic();
  },

  getVol(mult = 1.0) {
    return Math.max(0.0001, STATE.settings.sfxVolume * mult);
  },

  getMusicVol(mult = 1.0) {
    return Math.max(0.0001, STATE.settings.musicVolume * mult);
  },

  startMusic() {
    if (this.bgmTimer || !this.ctx) return;
    const melodyMenu = [
      293.66, 0, 349.23, 440.00, 523.25, 440.00, 349.23, 329.63,
      293.66, 0, 293.66, 329.63, 349.23, 392.00, 440.00, 0,
      440.00, 0, 523.25, 587.33, 523.25, 440.00, 392.00, 349.23,
      329.63, 349.23, 329.63, 261.63, 293.66, 0, 293.66, 0
    ];
    const bassMenu = [
      146.83, 0, 146.83, 220.00, 174.61, 0, 174.61, 220.00,
      146.83, 0, 146.83, 164.81, 174.61, 196.00, 220.00, 0,
      174.61, 0, 174.61, 261.63, 196.00, 0, 196.00, 246.94,
      130.81, 0, 164.81, 0, 146.83, 220.00, 146.83, 0
    ];

    const playStep = () => {
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.ctx.state !== 'running' || STATE.settings.musicVolume <= 0.01) {
        this.bgmStep = (this.bgmStep + 1) % melodyMenu.length;
        return;
      }
      const idx = this.bgmStep % melodyMenu.length;
      const isCombat = STATE.screen === 'playing';
      const pitchShift = isCombat ? 1.12246 : 1.0;
      const now = this.ctx.currentTime;

      const mFreq = melodyMenu[idx];
      if (mFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isCombat ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(mFreq * pitchShift, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(this.getMusicVol(0.14), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.21);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }

      const bFreq = bassMenu[idx];
      if (bFreq > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bFreq * pitchShift, now);
        bGain.gain.setValueAtTime(0.001, now);
        bGain.gain.linearRampToValueAtTime(this.getMusicVol(0.11), now + 0.015);
        bGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.20);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.21);
      }

      if (isCombat && (idx % 4 === 0 || idx % 4 === 2) && this.noiseBuffer) {
        const pSrc = this.ctx.createBufferSource();
        pSrc.buffer = this.noiseBuffer;
        const pFilter = this.ctx.createBiquadFilter();
        pFilter.type = 'highpass';
        pFilter.frequency.setValueAtTime(idx % 4 === 0 ? 1200 : 3200, now);
        const pGain = this.ctx.createGain();
        pGain.gain.setValueAtTime(this.getMusicVol(0.045), now);
        pGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);
        pSrc.connect(pFilter);
        pFilter.connect(pGain);
        pGain.connect(this.ctx.destination);
        pSrc.start(now);
        pSrc.stop(now + 0.055);
      }

      this.bgmStep = (this.bgmStep + 1) % melodyMenu.length;
    };

    this.bgmTimer = setInterval(playStep, 220);
  },

  playPunch(pitchMult = 1.0) {
    if (!this.ctx || !this.noiseBuffer || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 * pitchMult, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.45), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    src.start(now); src.stop(now + 0.065);
  },

  playSlash(intensity = 1.0) {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200 * (0.85 + intensity * 0.15), now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.16);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(Math.min(0.5, 0.28 * intensity)), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.17);
  },

  playShing() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.09);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.28), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.10);
  },

  playBloodShlip() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.07);
  },

  playHeartbeat() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    [0, 0.14].forEach((offset, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 78 : 62, now + offset);
      osc.frequency.exponentialRampToValueAtTime(34, now + offset + 0.11);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.getVol(idx === 0 ? 0.30 : 0.22), now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now + offset); osc.stop(now + offset + 0.13);
    });
  },

  playRoar() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(175, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.42);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.38), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.43);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.44);
  },

  playExhale() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0 || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.26);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.24), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    src.start(now); src.stop(now + 0.28);
  },

  playTeleport() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.13);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.32), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.135);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.14);
  },

  playMagneticPull() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.26);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.28), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.28);
  },

  playKick() {
    if (!this.ctx || !this.noiseBuffer || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.Q.value = 1.5;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.5), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    src.start(now); src.stop(now + 0.11);
  },

  playDash() {
    if (!this.ctx || !this.noiseBuffer || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.32), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    src.start(now); src.stop(now + 0.13);
  },

  playSlingshot() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.07);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.28), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.085);
  },

  playSmokePoof() {
    if (!this.ctx || !this.noiseBuffer || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.45), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    src.start(now); src.stop(now + 0.26);
  },

  playTrapClick() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.03);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.04);
  },

  playMetalClank() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    [440, 680].forEach(freq => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.09);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.getVol(0.18), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.11);
    });
  },

  playLaserCharge() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(1350, now + 0.2);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.26), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.22);
  },

  playEtherealSwish() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.11);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.13);
  },

  playFwoosh() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.07);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.085);
  },

  playFireCrackle() {
    if (!this.ctx || !this.noiseBuffer || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.32), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    src.start(now); src.stop(now + 0.115);
  },

  playExplosion(pitchMult = 1.0) {
    if (!this.ctx || !this.noiseBuffer || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90 * pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(32 * pitchMult, now + 0.28);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(this.getVol(0.55), now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(oscGain); oscGain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.31);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600 * pitchMult, now);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(this.getVol(0.45), now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    src.connect(filter); filter.connect(nGain); nGain.connect(this.ctx.destination);
    src.start(now); src.stop(now + 0.26);
  },

  playHit() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const pitch = 950 * (0.9 + Math.random() * 0.2);
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.025);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.25), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.03);
  },

  playBossHit() {
    this.playExplosion(0.65);
  },

  playBerry() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1250, now + 0.08);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.09);
  },

  playUpgrade() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime + idx * 0.06;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.getVol(0.25), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.15);
    });
  },

  playUIClick() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.035);
  },

  playVictory() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    [523.25, 659.25, 1046.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.getVol(0.35), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.36);
    });
  },

  playDefeat() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    [220, 146.83].forEach((freq, idx) => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime + idx * 0.22;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.getVol(0.3), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.36);
    });
  },

  playBoing() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.26);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.getVol(0.42), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.33);
  },

  playToonLaugh() {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const notes = [440, 523.25, 493.88, 587.33];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime + idx * 0.075;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + 0.05);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.getVol(0.24), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.068);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.072);
    });
  },

  playDawnRocket(isStep = false) {
    if (!this.ctx || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    if (isStep) {
      osc.frequency.setValueAtTime(360 + Math.random() * 140, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.045);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.getVol(0.16), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.06);
    } else {
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.14);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.getVol(0.32), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.17);
    }
  },

  playThunder() {
    if (!this.ctx || !this.noiseBuffer || STATE.settings.sfxVolume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.24);
    const oGain = this.ctx.createGain();
    oGain.gain.setValueAtTime(this.getVol(0.38), now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(oGain); oGain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.27);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(this.getVol(0.42), now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    src.connect(filter); filter.connect(nGain); nGain.connect(this.ctx.destination);
    src.start(now); src.stop(now + 0.29);
  }
};
