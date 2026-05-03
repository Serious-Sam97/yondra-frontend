let _ctx: AudioContext | null = null;

function ac(): AudioContext {
    if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
}

// Paper rustle — filtered white noise burst
export function playPickup() {
    if (typeof window === 'undefined') return;
    try {
        const c = ac();
        const len = Math.floor(c.sampleRate * 0.09);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.22));
        const src = c.createBufferSource(); src.buffer = buf;
        const filt = c.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1200; filt.Q.value = 0.7;
        const g = c.createGain(); g.gain.value = 0.11;
        src.connect(filt); filt.connect(g); g.connect(c.destination);
        src.start();
    } catch {}
}

// Low thud — sine wave decaying quickly
export function playDrop() {
    if (typeof window === 'undefined') return;
    try {
        const c = ac();
        const t = c.currentTime;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.connect(g); g.connect(c.destination);
        osc.frequency.setValueAtTime(115, t);
        osc.frequency.exponentialRampToValueAtTime(36, t + 0.20);
        g.gain.setValueAtTime(0.26, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.start(t); osc.stop(t + 0.26);
    } catch {}
}

// Triple sawtooth buzz — rejection
export function playWipReject() {
    if (typeof window === 'undefined') return;
    try {
        const c = ac();
        const t = c.currentTime;
        [0, 0.09, 0.18].forEach(offset => {
            const osc = c.createOscillator();
            const g = c.createGain();
            osc.type = 'sawtooth';
            osc.connect(g); g.connect(c.destination);
            osc.frequency.value = 82;
            g.gain.setValueAtTime(0.14, t + offset);
            g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.07);
            osc.start(t + offset); osc.stop(t + offset + 0.09);
        });
    } catch {}
}

// Two-tone pen click — task complete
export function playComplete() {
    if (typeof window === 'undefined') return;
    try {
        const c = ac();
        const t = c.currentTime;
        [0, 0.055].forEach((offset, i) => {
            const osc = c.createOscillator();
            const g = c.createGain();
            osc.connect(g); g.connect(c.destination);
            osc.frequency.value = i === 0 ? 1050 : 1440;
            g.gain.setValueAtTime(0.11, t + offset);
            g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.065);
            osc.start(t + offset); osc.stop(t + offset + 0.08);
        });
    } catch {}
}
