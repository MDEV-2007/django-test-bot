// Web Audio API oscillator sounds — no external audio files, works everywhere.
// Toggled via localStorage('ilm_audio'), default on.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('ilm_audio') !== 'off';
}

export function setAudioEnabled(enabled: boolean) {
  localStorage.setItem('ilm_audio', enabled ? 'on' : 'off');
}

function tone(freq: number, start: number, duration: number, gainPeak = 0.08, type: OscillatorType = 'sine') {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, audio.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak, audio.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(audio.currentTime + start);
  osc.stop(audio.currentTime + start + duration + 0.02);
}

function play(fn: () => void) {
  if (!isAudioEnabled()) return;
  try { fn(); } catch { /* audio not available (autoplay policy, no user gesture yet) */ }
}

export const soundFX = {
  click: () => play(() => tone(600, 0, 0.07, 0.05)),
  correct: () => play(() => { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.22); }),
  incorrect: () => play(() => { tone(220, 0, 0.16, 0.07, 'triangle'); tone(180, 0.12, 0.22, 0.07, 'triangle'); }),
  fanfare: () => play(() => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 0.08));
  }),
};
