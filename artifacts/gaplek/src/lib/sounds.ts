// Web Audio API sound generator for game events
let audioCtx: AudioContext | null = null;
let lobbyNodes: { stop: () => void } | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.3, delay = 0) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.start(t0); osc.stop(t0 + dur);
  } catch (_) {}
}

function tepak() {
  try {
    const ctx = getCtx(); const now = ctx.currentTime;
    const bufLen = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.55, now); nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    const hpf = ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = 1200;
    noise.connect(hpf); hpf.connect(nGain); nGain.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.15);
    const osc = ctx.createOscillator(); const oGain = ctx.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    oGain.gain.setValueAtTime(0.45, now); oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(oGain); oGain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.18);
  } catch (_) {}
}

function shuffleWhoosh() {
  try {
    const ctx = getCtx(); const now = ctx.currentTime;
    const bufLen = ctx.sampleRate * 0.12;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0, now); g.gain.linearRampToValueAtTime(0.22, now + 0.04); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(lpf); lpf.connect(g); g.connect(ctx.destination); src.start(now); src.stop(now + 0.12);
  } catch (_) {}
}

/** Gentle lobby ambient: soft repeating pentatonic arpeggio */
function startLobbyAmbient() {
  if (lobbyNodes) return;
  try {
    const ctx = getCtx();
    const NOTES = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3];
    let stopped = false;
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.06;
    masterGain.connect(ctx.destination);

    function playNote(idx: number, delay: number) {
      if (stopped) return;
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = NOTES[idx % NOTES.length];
        const t0 = ctx.currentTime + delay;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.8, t0 + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);
        osc.connect(g); g.connect(masterGain); osc.start(t0); osc.stop(t0 + 1.3);
      } catch (_) {}
    }

    let step = 0;
    function tick() {
      if (stopped) return;
      playNote(step, 0);
      step = (step + 1) % NOTES.length;
      const t = setTimeout(tick, 700 + Math.random() * 300);
      timeouts.push(t);
    }
    tick();

    lobbyNodes = {
      stop() {
        stopped = true;
        timeouts.forEach(clearTimeout);
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        lobbyNodes = null;
      }
    };
  } catch (_) {}
}

function stopLobbyAmbient() {
  lobbyNodes?.stop();
}

export const sounds = {
  placeTile: tepak,
  shuffleTile: shuffleWhoosh,
  startLobbyAmbient,
  stopLobbyAmbient,

  yourTurn() {
    tone(523, 0.14, "sine", 0.28);
    tone(659, 0.14, "sine", 0.28, 0.14);
    tone(784, 0.2, "sine", 0.28, 0.28);
  },
  pass() { tone(220, 0.28, "triangle", 0.18); },
  roundWin() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, "sine", 0.35, i * 0.12)); },
  roundLose() { tone(330, 0.22, "sawtooth", 0.18); tone(220, 0.38, "sawtooth", 0.18, 0.2); },
  blocked() { [330, 294, 262].forEach((f, i) => tone(f, 0.22, "triangle", 0.22, i * 0.15)); },
  gameEnd() { [784, 659, 523, 392].forEach((f, i) => tone(f, 0.2, "sine", 0.32, i * 0.15)); },
  chat() { tone(880, 0.07, "sine", 0.12); },
  join() { tone(440, 0.11, "sine", 0.18); tone(550, 0.11, "sine", 0.18, 0.11); },
  pause() { tone(400, 0.09, "square", 0.18); tone(320, 0.14, "square", 0.18, 0.09); },
  resume() { tone(320, 0.09, "square", 0.18); tone(400, 0.11, "square", 0.18, 0.09); tone(480, 0.14, "square", 0.18, 0.2); },
  error() { tone(200, 0.18, "sawtooth", 0.22); },
  kick() { tone(160, 0.3, "sawtooth", 0.3); },
  dealCard() {
    try {
      const ctx = getCtx(); const now = ctx.currentTime;
      const bufLen = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hpf = ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = 3000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      src.connect(hpf); hpf.connect(g); g.connect(ctx.destination); src.start(now); src.stop(now + 0.05);
    } catch (_) {}
  },
};
