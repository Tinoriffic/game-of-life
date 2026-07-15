// Gentle meditation bells via Web Audio - softer than the workout rest-timer beep.
// One lazily-created, shared AudioContext. Browsers suspend contexts created
// outside a user gesture, so resume on each play; the first play must happen
// inside a click (the timer's Start button) for the later end-chime to sound.
let ctx;

function audioCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

// A single bell strike: sine tone with a soft attack and long exponential decay.
function strike(freq, offset = 0, dur = 1.6, peak = 0.5) {
    const c = audioCtx();
    if (!c) return;
    const t = c.currentTime + offset;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
}

// A single warm strike to begin the sit.
export function playStartChime() {
    strike(432, 0, 1.8);
    if (navigator.vibrate) navigator.vibrate(120);
}

// Three ascending strikes to close it out.
export function playEndChime() {
    strike(432, 0, 1.6);
    strike(540, 0.55, 1.6);
    strike(648, 1.1, 2.4);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
