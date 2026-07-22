import React, { useCallback, useEffect, useRef, useState } from 'react';
import { playStartChime, playEndChime } from '../../utils/sound';
import { Native } from '../../native/nativeBridge';
import './MeditationTimer.css';

const PRESETS = [5, 10, 15, 20, 30, 45];
const num = (v) => Math.max(0, parseInt(v, 10) || 0);

// A number field you can scroll to adjust (wheel listener is non-passive so it
// can preventDefault the page scroll). Typing still works and clamps to [0, max].
const WheelNumber = ({ label, value, max, onSet }) => {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const onWheel = (e) => {
            e.preventDefault();
            const next = Math.max(0, Math.min(max, num(value) + (e.deltaY < 0 ? 1 : -1)));
            onSet(String(next));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [value, max, onSet]);
    return (
        <label>
            <input ref={ref} type="number" inputMode="numeric" min="0" max={max}
                   value={value} onChange={(e) => onSet(e.target.value)} />
            <span>{label}</span>
        </label>
    );
};

const fmt = (totalSec) => {
    const s = Math.max(0, Math.round(totalSec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

/**
 * A meditation timer to offload a dedicated timer app. Two modes:
 *  - Countdown: set an exact h:m:s (presets for quick picks), start + end chimes.
 *  - Stopwatch: count up, stop when you're done; logs the elapsed time.
 * On completion it hands the elapsed minutes back so the log gets the duration.
 *
 * Locked-screen/backgrounded alerts: on iOS (Capacitor) a countdown also drives
 * a Dynamic Island Live Activity and schedules a local notification at the end
 * time, so the sound + haptic fire even when the phone is locked or the user is
 * in another app. On web these are no-ops (see native/nativeBridge.js) and the
 * Web Audio chimes cover the foreground case.
 */
const MeditationTimer = ({ defaultMinutes = 10, label = 'Meditation', onComplete, onRunningChange, onEnterManual }) => {
    const [mode, setMode] = useState('countdown');
    const [hms, setHms] = useState(() => {
        const total = Math.max(60, Math.round((defaultMinutes || 10) * 60));
        return { h: String(Math.floor(total / 3600)), m: String(Math.floor((total % 3600) / 60)), s: String(total % 60) };
    });
    const [running, setRunning] = useState(false);
    const [paused, setPaused] = useState(false);
    const [elapsedSec, setElapsedSec] = useState(0);
    // Pause-aware clock: ms accumulated before the current running segment, plus
    // the wall-clock start of that segment. elapsed = base + (now - runStart).
    const baseMsRef = useRef(0);
    const runStartRef = useRef(null);
    const doneRef = useRef(false);
    // Stable id for the Live Activity / scheduled notification for this sit.
    const idRef = useRef(`med-${Math.random().toString(36).slice(2)}`);

    const targetSec = num(hms.h) * 3600 + num(hms.m) * 60 + num(hms.s);

    useEffect(() => { onRunningChange?.(running); }, [running, onRunningChange]);

    const elapsedMs = useCallback(
        () => baseMsRef.current + (runStartRef.current != null && !paused ? Date.now() - runStartRef.current : 0),
        [paused],
    );

    // Arm the native countdown (Live Activity + locked-screen notification) to a
    // wall-clock end. No-op on web and in stopwatch mode (open-ended).
    const armNative = useCallback((remainingSec, { fresh }) => {
        if (mode !== 'countdown') return;
        const endsAt = Date.now() + remainingSec * 1000;
        Native.scheduleAlert({ id: idRef.current, fireAt: endsAt, title: `${label} complete`, body: 'Your timer has finished.' });
        if (fresh) {
            Native.startLiveActivity({ id: idRef.current, type: 'meditation', endsAt, label });
        } else {
            Native.updateLiveActivity({ id: idRef.current, endsAt, label, paused: false });
        }
    }, [mode, label]);

    const clearNative = useCallback(() => {
        if (mode !== 'countdown') return;
        Native.cancelAlert({ id: idRef.current });
        Native.endLiveActivity({ id: idRef.current });
    }, [mode]);

    const finish = useCallback((seconds) => {
        if (doneRef.current) return;
        doneRef.current = true;
        setRunning(false);
        setPaused(false);
        clearNative();
        playEndChime();
        onComplete?.(Math.max(1, Math.round(seconds / 60)));
    }, [onComplete, clearNative]);

    // Timestamp-based so it stays accurate across re-renders and tab backgrounding.
    useEffect(() => {
        if (!running || paused) return undefined;
        const tick = () => {
            const secs = elapsedMs() / 1000;
            setElapsedSec(secs);
            if (mode === 'countdown' && secs >= targetSec) finish(targetSec);
        };
        tick();
        const id = setInterval(tick, 250);
        const onVis = () => { if (!document.hidden) tick(); };
        document.addEventListener('visibilitychange', onVis);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
    }, [running, paused, mode, targetSec, finish, elapsedMs]);

    const setField = (field, raw) => {
        if (raw === '') return setHms((p) => ({ ...p, [field]: '' }));
        const max = field === 'h' ? 23 : 59;
        const v = Math.max(0, Math.min(max, parseInt(raw, 10) || 0));
        setHms((p) => ({ ...p, [field]: String(v) }));
    };
    const applyPreset = (m) => setHms({ h: '0', m: String(m), s: '0' });
    const presetActive = (m) => num(hms.h) === 0 && num(hms.m) === m && num(hms.s) === 0;

    const start = () => {
        doneRef.current = false;
        baseMsRef.current = 0;
        runStartRef.current = Date.now();
        setElapsedSec(0);
        setPaused(false);
        setRunning(true);
        armNative(targetSec, { fresh: true });
        playStartChime();
    };

    const pause = () => {
        baseMsRef.current += Date.now() - runStartRef.current;
        runStartRef.current = null;
        setPaused(true);
        if (mode === 'countdown') {
            const remaining = Math.max(0, targetSec - baseMsRef.current / 1000);
            Native.cancelAlert({ id: idRef.current });
            Native.updateLiveActivity({ id: idRef.current, label, paused: true, remainingAtPause: remaining });
        }
    };

    const resume = () => {
        runStartRef.current = Date.now();
        setPaused(false);
        if (mode === 'countdown') {
            armNative(Math.max(0, targetSec - baseMsRef.current / 1000), { fresh: false });
        }
    };

    const cancel = () => {
        doneRef.current = true;
        setRunning(false);
        setPaused(false);
        setElapsedSec(0);
        clearNative();
    };

    const display = mode === 'countdown'
        ? fmt(running ? targetSec - elapsedSec : targetSec)
        : fmt(elapsedSec);
    const progress = mode === 'countdown' && targetSec > 0
        ? Math.min(1, elapsedSec / targetSec)
        : (running ? 1 : 0);

    return (
        <div className="medtimer">
            {!running && (
                <div className="medtimer-modes">
                    <button type="button" className={mode === 'countdown' ? 'active' : ''}
                            onClick={() => setMode('countdown')}>Countdown</button>
                    <button type="button" className={mode === 'stopwatch' ? 'active' : ''}
                            onClick={() => setMode('stopwatch')}>Stopwatch</button>
                </div>
            )}

            {!running && mode === 'countdown' && (
                <>
                    <div className="medtimer-presets">
                        {PRESETS.map((m) => (
                            <button type="button" key={m}
                                    className={`medtimer-chip ${presetActive(m) ? 'active' : ''}`}
                                    onClick={() => applyPreset(m)}>{m}</button>
                        ))}
                    </div>
                    <div className="medtimer-hms">
                        <WheelNumber label="hr" value={hms.h} max={23} onSet={(v) => setField('h', v)} />
                        <WheelNumber label="min" value={hms.m} max={59} onSet={(v) => setField('m', v)} />
                        <WheelNumber label="sec" value={hms.s} max={59} onSet={(v) => setField('s', v)} />
                    </div>
                </>
            )}

            <div className={`medtimer-dial ${running ? 'is-running' : ''} ${paused ? 'is-paused' : ''}`}
                 style={{ '--progress': progress }}>
                <span className="medtimer-time">{display}</span>
                <span className="medtimer-sub">{paused ? 'paused' : (mode === 'countdown' ? 'remaining' : 'elapsed')}</span>
            </div>

            <div className="medtimer-actions">
                {!running ? (
                    <>
                        <button type="button" className="medtimer-start" onClick={start}
                                disabled={mode === 'countdown' && targetSec === 0}>▶ Start</button>
                        {onEnterManual && (
                            <button type="button" className="medtimer-manual" onClick={onEnterManual}>
                                ✎ Enter manually
                            </button>
                        )}
                    </>
                ) : (
                    <div className="medtimer-running">
                        <button type="button" className="medtimer-pause" onClick={paused ? resume : pause}>
                            {paused ? '▶ Resume' : '⏸ Pause'}
                        </button>
                        <button type="button" className="medtimer-stop" onClick={() => finish(elapsedMs() / 1000)}>
                            {mode === 'countdown' ? 'Finish early' : '■ Stop & log'}
                        </button>
                        <button type="button" className="medtimer-cancel" onClick={cancel}>Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeditationTimer;
