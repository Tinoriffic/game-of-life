import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../../axios';
import { useUser } from '../player/UserContext';
import { parseApiError } from '../../hooks/useYesterdayLogging';
import { Native } from '../../native/nativeBridge';
import IntroCoach from '../common/IntroCoach';
import './WorkoutLogger.css';

// Stable id for the rest timer's Live Activity + scheduled locked-screen alert.
const REST_ALERT_ID = 'workout-rest';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Whole-calendar-day gap between a session's date and now, in local time.
const relativeDay = (iso) => {
    if (!iso) return '';
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
};

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
const WorkoutLogger = ({ program, habitId, sessionDate = null, onLogged, onClose }) => {
    const { user } = useUser();
    const [days, setDays] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [tracking, setTracking] = useState({});      // exercise_name -> 'reps' | 'time'
    const [setData, setSetData] = useState({});        // program_exercise_id -> [{weight, reps, duration, done}]
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Open context: which day to land on next + last session summary.
    const [suggestedDayId, setSuggestedDayId] = useState(null);
    const [lastSession, setLastSession] = useState(null);
    const [contextLoaded, setContextLoaded] = useState(false);
    const userPickedDayRef = useRef(false);   // don't auto-override a manual day pick

    // Last session's sets per program_exercise_id, for ghost-placeholder reference.
    const [lastPerf, setLastPerf] = useState({});
    // Per-field last-tap timestamp, for double-tap-to-fill detection.
    const lastTapRef = useRef({});

    // Rest timer
    const [restOn, setRestOn] = useState(false);
    const [restSec, setRestSec] = useState(0);
    const [restTarget, setRestTarget] = useState(90);
    const restRef = useRef(null);
    const restStartRef = useRef(null);
    const alertedRef = useRef(false);
    const restTargetRef = useRef(90);
    useEffect(() => { restTargetRef.current = restTarget; }, [restTarget]);
    const restJustStartedRef = useRef(false);

    // Set stopwatch (timed exercises): { key, sec }
    const [setTimer, setSetTimer] = useState(null);
    const setTimerRef = useRef(null);
    const setTimerStartRef = useRef(null);

    // --- Audio: one shared, gesture-unlocked context ---
    // A fresh AudioContext created inside a setInterval tick stays "suspended"
    // (no user gesture) and is silent. Unlock ONE shared context on the
    // user's first tap and, specifically for iOS, play a silent buffer inside
    // that gesture (iOS won't allow later programmatic sound otherwise) — then
    // reuse the context for the cue.
    const audioCtxRef = useRef(null);
    const unlockAudio = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) audioCtxRef.current = new Ctx();
            }
            const ctx = audioCtxRef.current;
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume();
            const buf = ctx.createBuffer(1, 1, 22050);   // silent 1-frame blip = iOS unlock
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
        } catch { /* audio not available — vibration only */ }
    }, []);

    const beep = useCallback((freq, startT, dur) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.connect(gain); gain.connect(ctx.destination);
        // Attack/release envelope: clearly audible, but click-free.
        gain.gain.setValueAtTime(0.0001, startT);
        gain.gain.exponentialRampToValueAtTime(0.4, startT + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
        osc.start(startT);
        osc.stop(startT + dur + 0.02);
    }, []);

    // Distinct two-tone chime + a buzz (Android; iOS web has no Vibration API).
    const alertCue = useCallback(() => {
        try {
            const ctx = audioCtxRef.current;
            if (ctx) {
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;
                beep(880, t, 0.18);
                beep(1175, t + 0.2, 0.22);
            }
        } catch { /* fall back to vibration only */ }
        if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
    }, [beep]);

    // Rest's-over alarm: cue for ~10s (or until the timer is stopped)
    const ALARM_MS = 10000;
    const alarmRef = useRef(null);
    const alarmEndRef = useRef(null);
    const stopAlarm = useCallback(() => {
        clearInterval(alarmRef.current);
        clearTimeout(alarmEndRef.current);
        alarmRef.current = null;
        alarmEndRef.current = null;
    }, []);
    const startAlarm = useCallback(() => {
        stopAlarm();
        alertCue();
        alarmRef.current = setInterval(alertCue, 900);
        alarmEndRef.current = setTimeout(stopAlarm, ALARM_MS);
    }, [alertCue, stopAlarm]);

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
            // selectedDay is set by the auto-select effect once open-context resolves,
            // so the logger lands on the suggested next day rather than always day 1.

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

    // Last-session reference is non-critical: fetch separately so a miss (new
    // program, endpoint unavailable) never blocks the logger from loading.
    useEffect(() => {
        if (!user?.id) return;   // user hydrates async; effects wait for the id
        axiosInstance.get(`/users/${user.id}/workout-programs/${program.program_id}/last-performance`)
            .then((r) => setLastPerf(r.data || {}))
            .catch(() => setLastPerf({}));
    }, [program.program_id, user?.id]);

    // Open context: suggested next day + last session. Non-blocking, like above;
    // contextLoaded flips either way so the auto-select effect never stalls.
    useEffect(() => {
        if (!user?.id) return;
        axiosInstance.get(`/users/${user.id}/workout-programs/${program.program_id}/session-context`)
            .then((r) => {
                setSuggestedDayId(r.data?.suggested_day_id ?? null);
                setLastSession(r.data?.last_session ?? null);
            })
            .catch(() => { setSuggestedDayId(null); setLastSession(null); })
            .finally(() => setContextLoaded(true));
    }, [program.program_id, user?.id]);

    // Land on the suggested day once both days and context are ready. Waiting for
    // context avoids a flash of day 1; a manual pick (userPickedDayRef) wins.
    useEffect(() => {
        if (!days.length || !contextLoaded || userPickedDayRef.current || selectedDay) return;
        const suggested = days.find((d) => d.day_id === suggestedDayId);
        setSelectedDay(suggested?.day_name || days[0].day_name);
    }, [days, contextLoaded, suggestedDayId, selectedDay]);

    // --- Rest timer (timestamp-based) ---
    const tickRest = useCallback(() => {
        if (restStartRef.current == null) return;
        const next = Math.floor((Date.now() - restStartRef.current) / 1000);
        setRestSec(next);
        if (restTargetRef.current && next >= restTargetRef.current && !alertedRef.current) {
            alertedRef.current = true;
            startAlarm();
            // Countdown reached zero — retire the Live Activity (the locked-screen
            // notification has already fired at this instant).
            Native.endLiveActivity({ id: REST_ALERT_ID });
        }
    }, [startAlarm]);

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
            // Audio gets suspended when backgrounded or when another app (music)
            // takes audio focus; resume it so the cue still fires after swapping back.
            const ctx = audioCtxRef.current;
            if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
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

    // Keep the native alert/Live Activity in sync when the target is nudged
    // mid-rest. Skips the initial arm (startRest already set it) and the
    // not-running case; only genuine target changes reschedule.
    useEffect(() => {
        if (restJustStartedRef.current) { restJustStartedRef.current = false; return; }
        if (!restOn || restStartRef.current == null || alertedRef.current || !restTarget) return;
        const endsAt = restStartRef.current + restTarget * 1000;
        Native.scheduleAlert({ id: REST_ALERT_ID, fireAt: endsAt, title: 'Rest over', body: 'Time for your next set.', sound: 'workout' });
        Native.updateLiveActivity({ id: REST_ALERT_ID, endsAt, label: 'Rest' });
    }, [restTarget, restOn]);

    // Cleanup intervals on unmount, and retire any live rest alert/activity so
    // it doesn't dangle after the logger closes.
    useEffect(() => () => {
        clearInterval(restRef.current);
        clearInterval(setTimerRef.current);
        clearInterval(alarmRef.current);
        clearTimeout(alarmEndRef.current);
        Native.cancelAlert({ id: REST_ALERT_ID });
        Native.endLiveActivity({ id: REST_ALERT_ID });
    }, []);

    const startRest = () => {
        unlockAudio();
        stopAlarm();                 // a new rest cancels any still-ringing alarm
        clearInterval(restRef.current);
        alertedRef.current = false;
        restStartRef.current = Date.now();
        setRestSec(0);
        setRestOn(true);
        restRef.current = setInterval(tickRest, 1000);
        // Native: fire a locked-screen alert + drive the Dynamic Island so the
        // rest-over cue reaches you even backgrounded. The reschedule effect
        // below keeps the alert in sync if you nudge the target mid-rest.
        restJustStartedRef.current = true;
        if (restTargetRef.current) {
            const endsAt = restStartRef.current + restTargetRef.current * 1000;
            Native.scheduleAlert({ id: REST_ALERT_ID, fireAt: endsAt, title: 'Rest over', body: 'Time for your next set.', sound: 'workout' });
            Native.startLiveActivity({ id: REST_ALERT_ID, type: 'workout', endsAt, label: 'Rest' });
        }
    };
    const stopRest = () => {
        clearInterval(restRef.current);
        stopAlarm();
        restStartRef.current = null;
        setRestOn(false);
        Native.cancelAlert({ id: REST_ALERT_ID });
        Native.endLiveActivity({ id: REST_ALERT_ID });
    };

    // --- Set stopwatch (timed exercises) ---
    const startSetTimer = (key) => {
        unlockAudio();
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

    // Last session's value for a field (null if none, or it was 0/blank).
    const ghostVal = (exId, idx, field) => {
        const row = lastPerf[exId]?.[idx];
        if (!row) return null;
        const v = field === 'reps' ? row.reps : field === 'duration' ? row.duration_seconds : row.weight;
        return v == null || v === 0 ? null : v;
    };

    const fillFromLast = (exId, idx, field) => {
        const cur = setData[exId]?.[idx]?.[field];
        if (cur !== '' && cur != null) return;   // don't clobber a typed value
        const g = ghostVal(exId, idx, field);
        if (g != null) updateSet(exId, idx, field, String(g));
    };

    // Double-tap fills from last session; single tap leaves it empty to type fresh.
    // Timing-based, not dblclick, which is unreliable on touch.
    const onFieldTap = (exId, idx, field) => {
        const key = `${exId}:${idx}:${field}`;
        const now = Date.now();
        const prev = lastTapRef.current[key] || 0;
        lastTapRef.current[key] = now;
        if (now - prev < 350) fillFromLast(exId, idx, field);
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
        if (!user?.id) return;
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
                day_id: day.day_id,
                // Backfill: anchor at local noon of the chosen day so the backend's
                // UTC→local-day conversion lands on that calendar day, not a neighbour.
                session_date: sessionDate
                    ? new Date(`${sessionDate}T12:00:00`).toISOString()
                    : new Date().toISOString(),
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
    if (!days.length || !user?.id) return <div className="wlog-loading">Loading program…</div>;

    const restOver = restOn && restTarget && restSec >= restTarget;

    return (
        <div className="wlog">
            <IntroCoach
                topic="workout-logger"
                icon="🏋️"
                title="Log sets, rest smart"
                lead="Ghost numbers in each field are from your last session - that's the target to match or beat."
                steps={[
                    'Double-tap a field to autofill last session’s number; or type over it to set it manually.',
                    'Checking a set done auto-starts the rest timer - it alerts you at your target.',
                    'Timed exercises (planks, carries) use the ▶ stopwatch instead of reps.',
                ]}
                tips={[
                    'The highlighted day tab is the next one in your rotation - swap freely if you trained out of order.',
                ]}
            />
            {lastSession && (
                <div className="wlog-lastbar">
                    {lastSession.day_name ? `Last: ${lastSession.day_name}` : 'Last workout'}
                    <span className="wlog-lastbar-sep">·</span>
                    {relativeDay(lastSession.session_date)}
                </div>
            )}

            {days.length > 1 && (
                <div className={`wlog-days ${days.length > 5 ? 'grid' : 'row'}`}>
                    {days.map((d) => (
                        <button key={d.day_id}
                            className={`wlog-day ${d.day_name === selectedDay ? 'active' : ''} ${d.day_id === suggestedDayId ? 'is-next' : ''}`}
                            onClick={() => { userPickedDayRef.current = true; setSelectedDay(d.day_name); }}>
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
                                    <input type="number" inputMode="decimal"
                                        placeholder={ghostVal(ex.program_exercise_id, idx, 'weight') ?? '–'}
                                        value={row.weight}
                                        onClick={() => onFieldTap(ex.program_exercise_id, idx, 'weight')}
                                        onChange={(e) => updateSet(ex.program_exercise_id, idx, 'weight', e.target.value)} />
                                    {isTime ? (
                                        <div className="wlog-timed-cell">
                                            <input type="number" inputMode="numeric"
                                                placeholder={ghostVal(ex.program_exercise_id, idx, 'duration') ?? 'sec'}
                                                value={timing ? setTimer.sec : row.duration}
                                                onClick={() => onFieldTap(ex.program_exercise_id, idx, 'duration')}
                                                onChange={(e) => updateSet(ex.program_exercise_id, idx, 'duration', e.target.value)} />
                                            <button className={`wlog-stopwatch ${timing ? 'on' : ''}`}
                                                onClick={() => (timing ? stopSetTimer(ex.program_exercise_id, idx) : startSetTimer(timerKey))}>
                                                {timing ? '■' : '▶'}
                                            </button>
                                        </div>
                                    ) : (
                                        <input type="number" inputMode="numeric"
                                            placeholder={ghostVal(ex.program_exercise_id, idx, 'reps') ?? '–'}
                                            value={row.reps}
                                            onClick={() => onFieldTap(ex.program_exercise_id, idx, 'reps')}
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
