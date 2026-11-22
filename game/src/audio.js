// Marisol Bay — WebAudio sound, all synthesised: engine hum that follows
// speed, two-tone police sirens, gunshots, mission stingers and three
// procedural radio stations (Bay FM, Sunset Drive, Harbor Nights).
import { clampNumber } from './config.js';

export const RADIO_STATIONS = ['Bay FM — coastal pop', 'Sunset Drive — synthwave', 'Harbor Nights — smooth jazz'];

export function createAudioEngine() {
  let ctx = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
  let radioTimer = null, radioStep = 0, radioOn = true;
  const state = { station: 0, muted: false, started: false };

  function ensureContext() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineGain); engineGain.connect(ctx.destination); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(ctx.destination); sirenOsc.start();
    } catch { ctx = null; }
    return ctx;
  }

  function playTone(freq, seconds, type, volume, when) {
    if (!ensureContext() || state.muted) return;
    const t0 = ctx.currentTime + (when ?? 0);
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type ?? 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume ?? 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + seconds + 0.05);
  }

  function playGunshot() {
    if (!ensureContext() || state.muted) return;
    const len = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const gain = ctx.createGain(); gain.gain.value = 0.35;
    src.connect(gain); gain.connect(ctx.destination); src.start();
    playTone(140, 0.08, 'square', 0.12);
  }

  function playStinger(kind) {
    if (kind === 'mission') { playTone(523, 0.16, 'triangle', 0.16); playTone(659, 0.16, 'triangle', 0.16, 0.14); playTone(784, 0.3, 'triangle', 0.18, 0.28); }
    else if (kind === 'fail') { playTone(220, 0.25, 'sawtooth', 0.12); playTone(175, 0.4, 'sawtooth', 0.12, 0.2); }
    else if (kind === 'cash') { playTone(880, 0.1, 'sine', 0.14); playTone(1174, 0.22, 'sine', 0.14, 0.09); }
    else playTone(440, 0.15, 'triangle', 0.12);
  }

  function startRadio() {
    if (!ensureContext() || radioTimer) return;
    const scales = [[0, 3, 5, 7, 10], [0, 2, 5, 7, 9], [0, 3, 5, 8, 10]];
    radioTimer = window.setInterval(() => {
      if (!radioOn || state.muted || !ctx) return;
      const scale = scales[state.station % scales.length];
      const note = 220 * Math.pow(2, scale[radioStep % scale.length] / 12);
      playTone(note, 0.22, 'triangle', 0.05);
      if (radioStep % 4 === 0) playTone(note / 2, 0.3, 'sine', 0.06);
      radioStep += 1;
    }, 240);
  }

  return {
    state,
    unlock() { ensureContext(); if (ctx && ctx.state === 'suspended') ctx.resume(); state.started = true; startRadio(); },
    setEngine(speed, maxSpeed) {
      if (!ctx || !engineOsc) return;
      const k = clampNumber(Math.abs(speed) / Math.max(1, maxSpeed), 0, 1);
      engineOsc.frequency.value = 50 + k * 130;
      engineGain.gain.value = state.muted ? 0 : 0.02 + k * 0.05;
    },
    setSiren(on, time) {
      if (!ctx || !sirenOsc) return;
      if (!on) { sirenGain.gain.value = 0; return; }
      sirenOsc.frequency.value = 650 + Math.sin(time * 4) * 220;
      sirenGain.gain.value = state.muted ? 0 : 0.045;
    },
    playGunshot, playStinger,
    nextStation() { state.station = (state.station + 1) % RADIO_STATIONS.length; radioStep = 0; return RADIO_STATIONS[state.station]; },
    toggleMute() { state.muted = !state.muted; return state.muted; },
  };
}
