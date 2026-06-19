import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../../axios';
import { useUser } from '../player/UserContext';
import { parseApiError } from '../../hooks/useYesterdayLogging';
import './WorkoutLogger.css';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const CheckIcon = () => (
    <svg className="wlog-check" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * Workout Logger — log per-set numbers AND time your rest in one place,
 * so there's no swapping between a tracking app and a stopwatch at the gym.
 * Rest timer: counts up, auto-starts when you finish a set, buzzes at an
 * optional target. Timed exercises (plank, carries) use a tap-to-time stopwatch.
 *
 * Timers are timestamp-based (elapsed = now − start), not tick-counters, so
 * they stay accurate when the PWA is backgrounded and the browser throttles
 * setInterval. We also recompute on focus/visibility regain.
 */
const WorkoutLogger = ({ program, habitId, onLogged, onClose }) => {
    const { user } = useUser();
    const [days, setDays] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [tracking, setTracking] = useState({});      // exercise_name -> 'reps' | 'time'
    const [setData, setSetData] = useState({});        // program_exercise_id -> [{weight, reps, duration, done}]
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Rest timer
    const [restOn, setRestOn] = useState(false);
    const [restSec, setRestSec] = useState(0);
    const [restTarget, setRestTarget] = useState(90);
    const restRef = useRef(null);
    const restStartRef = useRef(null);
    const alertedRef = useRef(false);
    const restTargetRef = useRef(90);
    useEffect(() => { restTargetRef.current = restTarget; }, [restTarget]);

    // Set stopwatch (timed exercises): { key, sec }
    const [setTimer, setSetTimer] = useState(null);
    const setTimerRef = useRef(null);
    const setTimerStartRef = useRef(null);

    // --- Audio: one shared, gesture-unlocked context ---
    // A fresh AudioContext created inside a setInterval tick stays "suspended"
    // (no user gesture) and is silent. We create one context and resume() it on
    // the user's tap (start rest / mark a set), then reuse it for the cue.
    const audioCtxRef = useRef(null);
    const ensureAudio = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) audioCtxRef.current = new Ctx();
            }
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
            }
        } catch { /* audio not available — vibration only */ }
    }, []);

    // Short attention beep + a buzz (Android; iOS web has no Vibration API).
    const alertCue = useCallback(() => {
        try {
            const ctx = audioCtxRef.current;
            if (ctx) {
                if (ctx.state === 'suspended') ctx.resume();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 880; gain.gain.value = 0.15;
                osc.start();
                osc.stop(ctx.currentTime + 0.22);
            }
        } catch { /* fall back to vibration only */ }
        if (navigator.vibrate) navigator.vibrate(250);
    }, []);

    useEffect(() => {
        Promise.all([
            axiosInstance.get(`/workout-programs/${program.program_id}/program-details`),
            axiosInstance.get('/exercises'),
        ]).then(([detailsRes, exRes]) => {
            const grouped = detailsRes.data.reduce((acc, item) => {
                acc[item.day_name] = acc[item.day_name] || { day_id: item.day_id, day_name: item.day_name, exercises: [] };
                acc[item.day_name].exercises.push({
                    program_exercise_id: item.program_exercise_id,
                    exercise_name: item.exercise_name,
                    sets: item.sets,
                });
                return acc;
            }, {});
            const dayList = Object.values(grouped);
            setDays(dayList);
            setSelectedDay(dayList[0]?.day_name || null);

            // Pre-build the full set array per exercise so typing never collapses rows.
            const initSets = {};
            detailsRes.data.forEach((item) => {
                if (!initSets[item.program_exercise_id]) {
                    initSets[item.program_exercise_id] = Array.from(
                        { length: item.sets || 1 },
                        () => ({ weight: '', reps: '', duration: '', done: false })
                    );
                }
            });
            setSetData(initSets);

            const trackMap = {};
            (exRes.data || []).forEach((e) => { trackMap[e.name] = e.tracking_type || 'reps'; });
            setTracking(trackMap);
        }).catch((e) => setError(parseApiError(e, 'Could not load this program.')));
    }, [program.program_id]);

    // --- Rest timer (timestamp-based) ---
    const tickRest = useCallback(() => {
        if (restStartRef.current == null) return;
        const next = Math.floor((Date.now() - restStartRef.current) / 1000);
        setRestSec(next);
        if (restTargetRef.current && next >= restTargetRef.current && !alertedRef.current) {
            alertedRef.current = true;
            alertCue();
        }
    }, [alertCue]);

    const tickSet = useCallback(() => {
        if (setTimerStartRef.current == null) return;
        const sec = Math.floor((Date.now() - setTimerStartRef.current) / 1000);
        setSetTimer((t) => (t ? { ...t, sec } : t));
    }, []);

    // Recompute on focus/visibility regain so a backgrounded timer catches up
    // (and fires a missed target cue) the moment you swap back to the app.
    useEffect(() => {
        const onResume = () => {
            if (document.visibilityState !== 'visible') return;
            tickRest();
            tickSet();
        };
        document.addEventListener('visibilitychange', onResume);
        window.addEventListener('focus', onResume);
        return () => {
            document.removeEventListener('visibilitychange', onResume);
            window.removeEventListener('focus', onResume);
        };
    }, [tickRest, tickSet]);

    // Cleanup intervals on unmount.
    useEffect(() => () => { clearInterval(restRef.current); clearInterval(setTimerRef.current); }, []);

    const startRest = () => {
        ensureAudio();
        clearInterval(restRef.current);
        alertedRef.current = false;
        restStartRef.current = Date.now();
        setRestSec(0);
        setRestOn(true);
        restRef.current = setInterval(tickRest, 1000);
    };
    const stopRest = () => {
        clearInterval(restRef.current);
        restStartRef.current = null;
        setRestOn(false);
    };

    // --- Set stopwatch (timed exercises) ---
    const startSetTimer = (key) => {
        ensureAudio();
        clearInterval(setTimerRef.current);
        setTimerStartRef.current = Date.now();
        setSetTimer({ key, sec: 0 });
        setTimerRef.current = setInterval(tickSet, 1000);
    };
    const stopSetTimer = (exId, idx) => {
        clearInterval(setTimerRef.current);
        const secs = setTimerStartRef.current != null
            ? Math.floor((Date.now() - setTimerStartRef.current) / 1000)
            : (setTimer?.sec || 0);
        setTimerStartRef.current = null;
        setSetTimer(null);
        updateSet(exId, idx, 'duration', secs);
    };

    // --- Set data ---
    const rowsFor = (exId, count) => setData[exId] || Array.from({ length: count }, () => ({ weight: '', reps: '', duration: '', done: false }));

    const blankRow = () => ({ weight: '', reps: '', duration: '', done: false });

    const updateSet = (exId, idx, field, value) => {
        setSetData((cur) => {
            const rows = cur[exId] ? cur[exId].slice() : [];
            while (rows.length <= idx) rows.push(blankRow());
            rows[idx] = { ...rows[idx], [field]: value };
            return { ...cur, [exId]: rows };
        });
    };

    const markSetDone = (exId, idx, count) => {
        setSetData((cur) => {
            const rows = cur[exId] ? cur[exId].slice() : Array.from({ length: count }, blankRow);
            while (rows.length <= idx) rows.push(blankRow());
            rows[idx] = { ...rows[idx], done: !rows[idx]?.done };
            return { ...cur, [exId]: rows };
        });
        // Auto-start rest when a set is completed (not when un-completing).
        const wasDone = (setData[exId] || [])[idx]?.done;
        if (!wasDone) startRest();
    };

    const submit = async () => {
        const day = days.find((d) => d.day_name === selectedDay);
        if (!day) return;
        const exercises = day.exercises.map((ex) => {
            const rows = setData[ex.program_exercise_id] || [];
            const isTime = tracking[ex.exercise_name] === 'time';
            const sets = rows
                .map((r, i) => ({
                    set_number: i + 1,
                    weight: r.weight === '' ? 0 : parseFloat(r.weight),
                    reps: isTime ? 0 : (r.reps === '' ? 0 : parseInt(r.reps, 10)),
                    duration_seconds: isTime ? (r.duration === '' ? 0 : parseInt(r.duration, 10)) : null,
                }))
                .filter((s) => s.reps > 0 || s.weight > 0 || (s.duration_seconds || 0) > 0);
            return { program_exercise_id: ex.program_exercise_id, sets };
        }).filter((e) => e.sets.length > 0);

        if (!exercises.length) { setError('Log at least one set first.'); return; }

        setSubmitting(true);
        try {
            const res = await axiosInstance.post(`/users/${user.id}/workout-sessions`, {
                program_id: program.program_id,
                session_date: new Date().toISOString(),
                exercises,
                habit_id: habitId,
            });
            onLogged?.(res.data);
        } catch (e) {
            setError(parseApiError(e, 'Failed to log workout.'));
            setSubmitting(false);
        }
    };

    const dayExercises = useMemo(
        () => days.find((d) => d.day_name === selectedDay)?.exercises || [],
        [days, selectedDay]
    );

    if (error && !days.length) return <div className="wlog-error">{error}</div>;
    if (!days.length) return <div className="wlog-loading">Loading program…</div>;

    const restOver = restOn && restTarget && restSec >= restTarget;

    return (
        <div className="wlog">
            {days.length > 1 && (
                <div className={`wlog-days ${days.length > 5 ? 'grid' : 'row'}`}>
                    {days.map((d) => (
                        <button key={d.day_id}
                            className={`wlog-day ${d.day_name === selectedDay ? 'active' : ''}`}
                            onClick={() => setSelectedDay(d.day_name)}>
                            {d.day_name}
                        </button>
                    ))}
                </div>
            )}

            {dayExercises.map((ex) => {
                const isTime = tracking[ex.exercise_name] === 'time';
                const rows = rowsFor(ex.program_exercise_id, ex.sets);
                return (
                    <div className="wlog-ex" key={ex.program_exercise_id}>
                        <div className="wlog-ex-name">
                            {ex.exercise_name}
                            {isTime && <span className="wlog-tag">timed</span>}
                        </div>
                        <div className={`wlog-set-head ${isTime ? 'timed' : ''}`}>
                            <span>Set</span><span>Weight</span><span>{isTime ? 'Time' : 'Reps'}</span><span>Done</span>
                        </div>
                        {rows.map((row, idx) => {
                            const timerKey = `${ex.program_exercise_id}:${idx}`;
                            const timing = setTimer?.key === timerKey;
                            return (
                                <div className={`wlog-set ${row.done ? 'done' : ''}`} key={idx}>
                                    <span className="wlog-set-n">{idx + 1}</span>
                                    <input type="number" inputMode="decimal" placeholder="–"
                                        value={row.weight}
                                        onChange={(e) => updateSet(ex.program_exercise_id, idx, 'weight', e.target.value)} />
                                    {isTime ? (
                                        <div className="wlog-timed-cell">
                                            <input type="number" inputMode="numeric" placeholder="sec"
                                                value={timing ? setTimer.sec : row.duration}
                                                onChange={(e) => updateSet(ex.program_exercise_id, idx, 'duration', e.target.value)} />
                                            <button className={`wlog-stopwatch ${timing ? 'on' : ''}`}
                                                onClick={() => (timing ? stopSetTimer(ex.program_exercise_id, idx) : startSetTimer(timerKey))}>
                                                {timing ? '■' : '▶'}
                                            </button>
                                        </div>
                                    ) : (
                                        <input type="number" inputMode="numeric" placeholder="–"
                                            value={row.reps}
                                            onChange={(e) => updateSet(ex.program_exercise_id, idx, 'reps', e.target.value)} />
                                    )}
                                    <button className={`wlog-done ${row.done ? 'on' : ''}`}
                                        aria-label={row.done ? 'Set done' : 'Mark set done'}
                                        onClick={() => markSetDone(ex.program_exercise_id, idx, ex.sets)}>
                                        {row.done && <CheckIcon />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {error && <div className="wlog-error inline">{error}</div>}

            <button className="wlog-submit" onClick={submit} disabled={submitting}>
                {submitting ? 'Logging…' : 'Finish & log workout'}
            </button>

            {/* Persistent rest bar */}
            <div className={`wlog-restbar ${restOn ? 'on' : ''}`}>
                <div className="wlog-rest-main">
                    <span className={`wlog-rest-time ${restOver ? 'over' : ''}`}>
                        {fmt(restSec)}
                    </span>
                    <span className="wlog-rest-label">
                        rest{restTarget ? ` · target ${fmt(restTarget)}` : ''}
                    </span>
                </div>
                <div className="wlog-rest-actions">
                    <div className="wlog-target-steppers">
                        <button onClick={() => setRestTarget((t) => Math.max(0, t - 5))}>−5</button>
                        <button onClick={() => setRestTarget((t) => Math.max(0, t - 1))}>−1</button>
                        <button onClick={() => setRestTarget((t) => t + 1)}>+1</button>
                        <button onClick={() => setRestTarget((t) => t + 5)}>+5</button>
                    </div>
                    {restOn
                        ? <button className="wlog-rest-stop" onClick={stopRest}>Stop</button>
                        : <button className="wlog-rest-start" onClick={startRest}>Rest</button>}
                </div>
            </div>

            <button className="wlog-cancel" onClick={onClose}>Cancel</button>
        </div>
    );
};

export default WorkoutLogger;
