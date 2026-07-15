import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { focusService, formatClicks, hasClickTracking } from '../../services/focusService';
import { useUser } from '../player/UserContext';
import { useFeedback } from '../feedback/FeedbackContext';
import CategoryManager from './CategoryManager';
import ManualLogModal from './ManualLogModal';
import RitualEditor from './RitualEditor';
import IntroCoach from '../common/IntroCoach';
import './Focus.css';

const pad2 = (n) => String(n).padStart(2, '0');

const formatElapsed = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
};

const BASE_TITLE = document.title;

/** Desktop-only keyboard shortcut hints (hidden on touch layouts). */
const KeyHints = ({ hints }) => (
    <div className="key-hints">
        {hints.map(([key, label]) => (
            <span key={label}><kbd>{key}</kbd> {label}</span>
        ))}
    </div>
);

/**
 * The focus session tool: operationalize the sit-down (ritual), run the
 * timer, offload pop-up thoughts (capture pad), log the click. A live
 * session is a server row, so it survives refresh and device switches.
 */
const FocusPage = () => {
    const { user } = useUser();
    const { celebrateLogResult, pushToast } = useFeedback();
    const navigate = useNavigate();

    const [state, setState] = useState(null);
    const [error, setError] = useState(null);
    const [ritualCategory, setRitualCategory] = useState(null);  // category pending start
    const [ritualChecked, setRitualChecked] = useState([]);
    const [stopping, setStopping] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const [manageOpen, setManageOpen] = useState(false);
    const [ritualEditOpen, setRitualEditOpen] = useState(false);
    const [targetOpen, setTargetOpen] = useState(false);
    const [now, setNow] = useState(Date.now());
    const captureRef = useRef(null);

    const enabled = hasClickTracking(user);

    // Shared, gesture-unlocked audio context (same pattern as the rest timer:
    // a context created outside a user gesture stays suspended and silent).
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
            const buf = ctx.createBuffer(1, 1, 22050);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
        } catch { /* audio unavailable - vibration only */ }
    }, []);

    // Click-boundary chime: two rising notes at each full hour of focus.
    const chime = useCallback(() => {
        try {
            const ctx = audioCtxRef.current;
            if (ctx) {
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;
                [[660, 0], [990, 0.18]].forEach(([freq, offset]) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    osc.connect(gain); gain.connect(ctx.destination);
                    gain.gain.setValueAtTime(0.0001, t + offset);
                    gain.gain.exponentialRampToValueAtTime(0.28, t + offset + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.35);
                    osc.start(t + offset);
                    osc.stop(t + offset + 0.4);
                });
            }
            navigator.vibrate?.(200);
        } catch { /* non-fatal */ }
    }, []);

    const load = useCallback(async () => {
        try {
            setState(await focusService.getState());
            setError(null);
        } catch (err) {
            console.error('Error loading focus state:', err);
            setError(err.response?.status === 403
                ? 'Click tracking is not enabled for this account.'
                : 'Could not load. Retry?');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const active = state?.active_session || null;

    // 1s tick while a session is running (a paused clock doesn't move).
    useEffect(() => {
        if (!active || active.paused) return undefined;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [active]);

    // Server-computed focused time (elapsed minus pauses) anchors the clock;
    // the client only advances it while running, so pauses freeze it exactly.
    const anchor = useMemo(() => (active ? {
        baseMs: (active.elapsed_minutes || 0) * 60000,
        at: Date.now(),
        paused: Boolean(active.paused),
    } : null), [active]);

    const elapsedMs = useMemo(() => {
        if (!anchor) return 0;
        return anchor.baseMs + (anchor.paused ? 0 : Math.max(0, now - anchor.at));
    }, [anchor, now]);

    const suspect = elapsedMs > 3 * 60 * 60 * 1000;

    // The timer lives in the tab title, visible from wherever the work is.
    useEffect(() => {
        if (!active) return undefined;
        document.title = `${active.paused ? '⏸ ' : ''}${formatElapsed(elapsedMs)} · Focus`;
        return () => { document.title = BASE_TITLE; };
    }, [active, elapsedMs]);

    // "That's a click": chime once at each full-hour boundary. Resuming a
    // 90-minute session must not chime immediately, so sync the ref on resume.
    const lastHourRef = useRef(0);
    useEffect(() => {
        lastHourRef.current = Math.floor(elapsedMs / 3600000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active?.id]);
    useEffect(() => {
        if (!active) return;
        const hours = Math.floor(elapsedMs / 3600000);
        if (hours > lastHourRef.current) {
            lastHourRef.current = hours;
            chime();
        }
    }, [active, chime, elapsedMs]);

    const startSession = useCallback(async (category) => {
        unlockAudio();  // the start tap is the gesture that arms the chime
        try {
            await focusService.startSession(category.id);
            setRitualCategory(null);
            setRitualChecked([]);
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not start session' });
            load();
        }
    }, [load, pushToast, unlockAudio]);

    // Resuming a live session involves no tap, so arm audio on the first
    // pointer interaction instead.
    useEffect(() => {
        window.addEventListener('pointerdown', unlockAudio, { once: true });
        return () => window.removeEventListener('pointerdown', unlockAudio);
    }, [unlockAudio]);

    const togglePause = useCallback(async () => {
        if (!active) return;
        try {
            const payload = active.paused
                ? await focusService.resumeSession(active.id)
                : await focusService.pauseSession(active.id);
            setState((s) => s && ({ ...s, active_session: payload }));
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not update session' });
            load();
        }
    }, [active, load, pushToast]);

    // Keyboard flow (PC-first): Enter starts from the ritual sheet; Space
    // pauses/resumes; Esc walks back one layer (or opens the end-session
    // sheet); typing during a live session lands in the capture pad.
    useEffect(() => {
        const noSheets = !stopping && !ritualEditOpen && !targetOpen && !manageOpen && !manualOpen;
        const inField = () => {
            const el = document.activeElement;
            return el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (ritualEditOpen) setRitualEditOpen(false);
                else if (targetOpen) setTargetOpen(false);
                else if (manageOpen) setManageOpen(false);
                else if (manualOpen) setManualOpen(false);
                else if (stopping) setStopping(false);
                else if (ritualCategory) setRitualCategory(null);
                else if (active) setStopping(true);
                return;
            }
            if (e.key === 'Enter' && ritualCategory && !ritualEditOpen) {
                e.preventDefault();
                startSession(ritualCategory);
                return;
            }
            if (e.key === ' ' && active && noSheets && !inField()) {
                e.preventDefault();
                togglePause();
                return;
            }
            if (active && noSheets && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (!inField()) captureRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, manageOpen, manualOpen, ritualCategory, ritualEditOpen, startSession, stopping,
        targetOpen, togglePause]);

    const finishStop = useCallback(async (payload) => {
        try {
            const result = await focusService.stopSession(active.id, payload);
            setStopping(false);
            const payout = result.habit_payout;
            if (payout?.auto_logged) {
                celebrateLogResult(payout, {});
            } else if (payout?.already_logged) {
                pushToast({
                    kind: 'daycomplete',
                    text: `+${Math.round(payload.duration_minutes ?? result.session.duration_minutes)} min → ${payout.habit_name}`,
                    duration: 2400
                });
            } else {
                pushToast({
                    kind: 'daycomplete',
                    text: `Session saved · ${formatClicks(result.today_minutes)} clicks today`,
                    duration: 2400
                });
            }
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not save session' });
        }
    }, [active, celebrateLogResult, load, pushToast]);

    const discardActive = useCallback(async () => {
        if (!window.confirm('Discard this session? No time will be recorded.')) return;
        try {
            await focusService.deleteSession(active.id);
            setStopping(false);
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: 'Could not discard' });
        }
    }, [active, load, pushToast]);

    if (error) {
        return (
            <div className="focus-page">
                <div className="focus-error">
                    <p>{error}</p>
                    {!enabled ? null : <button onClick={load}>Retry</button>}
                </div>
            </div>
        );
    }
    if (!state) {
        return <div className="focus-page"><div className="focus-skeleton">Loading…</div></div>;
    }

    const { categories, settings } = state;
    const targetLabel = `${formatClicks(state.today_minutes)} / ${settings.daily_target_clicks} clicks today`;

    return (
        <div className="focus-page">
            <header className="focus-header">
                <button className="focus-back" onClick={() => navigate(-1)}>‹</button>
                <h1 className="focus-title">FOCUS</h1>
                <span className="focus-today-chip" title="Tap to edit your daily target"
                      onClick={() => setTargetOpen(true)}>{targetLabel}</span>
            </header>

            {active ? (
                <ActiveSession
                    session={active}
                    category={categories.find((c) => c.id === active.category_id)}
                    elapsedMs={elapsedMs}
                    suspect={suspect}
                    paused={Boolean(active.paused)}
                    captureRef={captureRef}
                    onTogglePause={togglePause}
                    onStop={() => setStopping(true)}
                    onCapture={async (text) => {
                        const result = await focusService.addCapture(active.id, text);
                        setState((s) => s && ({
                            ...s,
                            active_session: { ...s.active_session, captures: result.captures }
                        }));
                    }}
                />
            ) : (
                <Picker
                    categories={categories}
                    onPick={(category) => { setRitualCategory(category); setRitualChecked([]); }}
                    onManual={() => setManualOpen(true)}
                    onManage={() => setManageOpen(true)}
                />
            )}

            {ritualCategory && (
                <div className="focus-overlay" onClick={() => setRitualCategory(null)}>
                    <div className="focus-sheet" onClick={(e) => e.stopPropagation()}>
                        <h3 className="sheet-heading">Set the stage</h3>
                        <p className="sheet-sub">{ritualCategory.icon} {ritualCategory.name}</p>
                        <ul className="ritual-list">
                            {settings.ritual.map((item, i) => (
                                <li key={i}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={ritualChecked.includes(i)}
                                            onChange={() => setRitualChecked((cur) =>
                                                cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i])}
                                        />
                                        <span>{item}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                        <button className="btn-link ritual-edit" onClick={() => setRitualEditOpen(true)}>
                            ✎ Edit this list
                        </button>
                        <div className="sheet-actions">
                            <button className="btn-ghost" onClick={() => setRitualCategory(null)}>Cancel</button>
                            <button className="btn-gold" onClick={() => startSession(ritualCategory)}>
                                ▶ Start focus
                            </button>
                        </div>
                        <KeyHints hints={[['↵', 'start'], ['Esc', 'cancel']]} />
                    </div>
                </div>
            )}

            {ritualEditOpen && (
                <RitualEditor
                    ritual={settings.ritual}
                    onClose={() => setRitualEditOpen(false)}
                    onSave={async (items) => {
                        setRitualEditOpen(false);
                        try {
                            await focusService.updateSettings({ ritual: items });
                            load();
                        } catch {
                            pushToast({ kind: 'partial', text: 'Could not save ritual' });
                        }
                    }}
                />
            )}

            {stopping && active && (
                <StopSheet
                    session={active}
                    elapsedMs={elapsedMs}
                    onSave={finishStop}
                    onDiscard={discardActive}
                    onClose={() => setStopping(false)}
                />
            )}

            {manualOpen && (
                <ManualLogModal
                    categories={categories}
                    defaultDate={state.date}
                    onLogged={(result) => {
                        setManualOpen(false);
                        const payout = result.habit_payout;
                        if (payout?.auto_logged) celebrateLogResult(payout, {});
                        else pushToast({ kind: 'daycomplete', text: 'Time logged', duration: 2000 });
                        load();
                    }}
                    onClose={() => setManualOpen(false)}
                />
            )}

            {manageOpen && (
                <CategoryManager onClose={() => { setManageOpen(false); load(); }} />
            )}

            {/* First live session ever: explain the tool at the moment it matters. */}
            {active && (
                <IntroCoach
                    topic="focus-session"
                    icon="🎯"
                    title="You're locked in"
                    lead="The timer is running - your only job now is the work."
                    steps={[
                        'Pop-up thought? Type it into the capture pad and stay in the task - it will be waiting when you finish.',
                        'Interrupted? Pause stops the clock; paused time never counts.',
                        'Done? End session, trim any unfocused minutes, and the time books itself.',
                    ]}
                    tips={[
                        'A chime marks each full hour - that is a click earned.',
                        'On desktop: Space pauses, Esc ends, and typing anywhere lands in the capture pad.',
                    ]}
                    cta="Lock in"
                />
            )}

            {targetOpen && (
                <TargetSheet
                    target={settings.daily_target_clicks}
                    onSaved={() => { setTargetOpen(false); load(); }}
                    onViewStats={() => navigate('/stats/clicks')}
                    onClose={() => setTargetOpen(false)}
                />
            )}
        </div>
    );
};

/** Edit the daily click target without leaving the focus screen. */
const TargetSheet = ({ target, onSaved, onViewStats, onClose }) => {
    const [draft, setDraft] = useState(String(target));
    const [busy, setBusy] = useState(false);

    const save = async (e) => {
        e.preventDefault();
        const value = parseFloat(draft);
        if (!value || busy) return;
        if (value === target) { onClose(); return; }
        setBusy(true);
        try {
            await focusService.updateSettings({ click_daily_target: value });
            onSaved();
        } catch {
            setBusy(false);
        }
    };

    return (
        <div className="focus-overlay" onClick={onClose}>
            <div className="focus-sheet" onClick={(e) => e.stopPropagation()}>
                <h3 className="sheet-heading">Daily target</h3>
                <p className="sheet-sub">1 click = 1 hour of focused, needle-moving work.</p>
                <form onSubmit={save}>
                    <label className="sheet-field">
                        <span>Clicks per day</span>
                        <input
                            type="number" inputMode="decimal" step="0.25" min="0.25" max="24"
                            autoFocus value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                        />
                    </label>
                    <button type="button" className="btn-link ritual-edit" onClick={onViewStats}>
                        View click stats →
                    </button>
                    <div className="sheet-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-gold" disabled={busy}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Picker = ({ categories, onPick, onManual, onManage }) => (
    <div className="focus-picker">
        {categories.length === 0 ? (
            <div className="focus-empty">
                <p className="empty-def">⚡ <b>1 click = 1 hour of focused, needle-moving work.</b></p>
                <p>
                    Most days hold fewer real hours than they feel like: two or three of
                    genuine focus, the rest lost to meetings, half-attention and task
                    switching. Clicks are the honest count - full-attention hours spent on
                    what actually changes your situation, not the maintenance that keeps it
                    running. One extra click a day is roughly 30 extra hours a month on the
                    thing that matters most. That compounds fast.
                </p>
                <p>
                    You decide what counts, because clicks follow <b>your</b> main goal -
                    landing a new job, shipping a project, growing a channel. The focus
                    session tool is how a click gets earned: the pre-flight ritual sets up
                    your space, the timer keeps the hour honest, and the capture pad holds
                    stray thoughts so they can't pull you out of the work.
                </p>
                <ol className="empty-steps">
                    <li>
                        Create a <b>category</b> for each kind of needle-moving work you do.
                    </li>
                    <li>
                        Optionally <b>link a category to one of your habits</b>. Time counts
                        both ways: logging the habit with a duration adds clicks, and 30+
                        focused minutes checks the habit off for you, XP and streak included.
                    </li>
                    <li>
                        <b>Start a focus session</b> when you sit down to work, or log time
                        after the fact. Progress lives under Stats → Clicks. The default
                        target is <b>2 clicks a day</b> - tap the counter up top to change it.
                    </li>
                </ol>
                <button className="btn-gold" onClick={onManage}>+ Create your first category</button>
            </div>
        ) : (
            <>
                <p className="picker-label">What are you locking in on?</p>
                <div className="category-grid">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            className="category-tile"
                            style={{ '--cat-color': category.color || '#ffd700' }}
                            onClick={() => onPick(category)}
                        >
                            <span className="cat-icon">{category.icon || '🎯'}</span>
                            <span className="cat-name">{category.name}</span>
                            {category.today_minutes > 0 && (
                                <span className="cat-today">{formatClicks(category.today_minutes)} today</span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="picker-footer">
                    <button className="btn-ghost" onClick={onManual}>+ Log time manually</button>
                    <button className="btn-link" onClick={onManage}>Manage categories</button>
                </div>
            </>
        )}
    </div>
);

const ActiveSession = ({ session, category, elapsedMs, suspect, paused, captureRef,
                         onTogglePause, onStop, onCapture }) => {
    const [captureText, setCaptureText] = useState('');

    const submitCapture = async (e) => {
        e.preventDefault();
        const text = captureText.trim();
        if (!text) return;
        setCaptureText('');
        try {
            await onCapture(text);
        } catch {
            setCaptureText(text); // keep the thought if the call failed
        }
        captureRef.current?.focus();
    };

    return (
        <div className="focus-active">
            {suspect && (
                <div className="focus-suspect">
                    Did you forget to stop? Trim the time when you end the session.
                </div>
            )}
            <div className="focus-cat-label" style={{ '--cat-color': category?.color || '#ffd700' }}>
                {category?.icon || '🎯'} {category?.name || 'Focus'}
            </div>
            <div className={`focus-timer ${paused ? 'timer-paused' : ''}`}>{formatElapsed(elapsedMs)}</div>
            <div className="focus-timer-sub">
                {paused ? '⏸ Paused - the clock is stopped' : '1 click = 60 min of real work'}
            </div>

            <div className="active-controls">
                <button className="btn-pause" onClick={onTogglePause}>
                    {paused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button className="btn-stop" onClick={onStop}>■ End session</button>
            </div>

            <div className="capture-pad">
                <p className="capture-label">
                    Pop-up thought? Park it here and stay in the work.
                </p>
                <form onSubmit={submitCapture} className="capture-form">
                    <input
                        ref={captureRef}
                        type="text"
                        maxLength={300}
                        placeholder="e.g. call dentist back"
                        value={captureText}
                        onChange={(e) => setCaptureText(e.target.value)}
                    />
                    <button type="submit" disabled={!captureText.trim()}>＋</button>
                </form>
                {(session.captures || []).length > 0 && (
                    <ul className="capture-list">
                        {session.captures.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                )}
            </div>

            <KeyHints hints={[['Space', 'pause'], ['Esc', 'end session'], ['A-Z', 'capture a thought']]} />
        </div>
    );
};

const StopSheet = ({ session, elapsedMs, onSave, onDiscard, onClose }) => {
    // The timer keeps running behind this sheet; the prefill freezes at the
    // moment Stop was tapped, but the editable max tracks the live clock.
    const elapsedMin = Math.max(1, Math.round(elapsedMs / 60000));
    const [duration, setDuration] = useState(String(elapsedMin));
    const [note, setNote] = useState('');
    const [copied, setCopied] = useState(false);

    const copyCaptures = async () => {
        try {
            await navigator.clipboard.writeText(
                session.captures.map((item) => `- ${item}`).join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch { /* clipboard unavailable */ }
    };

    const save = (e) => {
        e.preventDefault();
        const minutes = parseInt(duration, 10);
        onSave({
            ...(minutes && minutes !== elapsedMin ? { duration_minutes: minutes } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
        });
    };

    return (
        <div className="focus-overlay" onClick={onClose}>
            <div className="focus-sheet" onClick={(e) => e.stopPropagation()}>
                <h3 className="sheet-heading">End session</h3>
                <form onSubmit={save}>
                    <label className="sheet-field">
                        <span>Focused minutes (trim breaks - honesty is the metric)</span>
                        <input
                            type="number" inputMode="numeric" min="1" max={elapsedMin}
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        />
                    </label>
                    <label className="sheet-field">
                        <span>What got done? (optional)</span>
                        <input type="text" maxLength={200} value={note}
                               onChange={(e) => setNote(e.target.value)} />
                    </label>

                    {(session.captures || []).length > 0 && (
                        <div className="capture-replay">
                            <span>Captured thoughts - take them to your notes:</span>
                            <ul>
                                {session.captures.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                            <button type="button" className="btn-link" onClick={copyCaptures}>
                                {copied ? 'Copied ✓' : 'Copy all'}
                            </button>
                        </div>
                    )}

                    <div className="sheet-actions">
                        <button type="button" className="btn-danger" onClick={onDiscard}>Discard</button>
                        <button type="button" className="btn-ghost" onClick={onClose}>Keep going</button>
                        <button type="submit" className="btn-gold">Save session</button>
                    </div>
                    <KeyHints hints={[['Esc', 'keep going']]} />
                </form>
            </div>
        </div>
    );
};

export default FocusPage;
