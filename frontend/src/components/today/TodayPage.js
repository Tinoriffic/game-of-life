import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { habitService } from '../../services/habitService';
import { useFeedback } from '../feedback/FeedbackContext';
import HabitRow from './HabitRow';
import DetailSheet from './DetailSheet';
import OnboardingPicker from './OnboardingPicker';
import MiniHeatmap from './MiniHeatmap';
import './TodayPage.css';

/**
 * The Today view — the dashboard's center of gravity: "here is your day."
 * One screen, thumb-reachable, loads instantly. One tap = logged.
 */
const TodayPage = () => {
    const [today, setToday] = useState(null);
    const [heatmap, setHeatmap] = useState(null);
    const [error, setError] = useState(null);
    const [logDate, setLogDate] = useState('today');   // 'today' | 'yesterday' (48h backfill)
    const [sheetHabit, setSheetHabit] = useState(null);
    const [pendingSync, setPendingSync] = useState(habitService.pendingCount());
    const { celebrateLogResult, pushToast } = useFeedback();
    const navigate = useNavigate();

    const isBackfill = logDate === 'yesterday';

    const load = useCallback(async () => {
        try {
            const [todayData, heatmapData] = await Promise.all([
                habitService.getToday(),
                habitService.getHeatmap(119)
            ]);
            setToday(todayData);
            setHeatmap(heatmapData);
            setError(null);
        } catch (err) {
            console.error('Error loading Today view:', err);
            setError('Could not load your day. Pull to retry.');
        }
    }, []);

    useEffect(() => {
        // Flush any offline-queued logs first so the day state is honest.
        habitService.flushQueue().then((flushed) => {
            setPendingSync(habitService.pendingCount());
            if (flushed > 0) pushToast({ kind: 'daycomplete', text: 'Offline logs synced ✓' });
            load();
        });

        const onOnline = () => habitService.flushQueue().then(() => {
            setPendingSync(habitService.pendingCount());
            load();
        });
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [load, pushToast]);

    const targetDate = useMemo(() => {
        if (!today) return null;
        if (!isBackfill) return today.date;
        const d = new Date(`${today.date}T12:00:00`);
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    }, [today, isBackfill]);

    const isDone = useCallback(
        (habit) => (isBackfill ? habit.yesterday_logged : habit.completed_today),
        [isBackfill]
    );

    const patchHabit = useCallback((habitId, changes) => {
        setToday((current) => {
            if (!current) return current;
            const patch = (list) => list.map((h) => (h.id === habitId ? { ...h, ...changes } : h));
            return {
                ...current,
                habits_today: patch(current.habits_today),
                habits_weekly: patch(current.habits_weekly)
            };
        });
    }, []);

    const applyLogResult = useCallback((habit, result) => {
        if (result.already_logged) {
            patchHabit(habit.id, isBackfill
                ? { yesterday_logged: true }
                : { completed_today: true, today_log: result.log });
            return;
        }
        const changes = isBackfill
            ? { yesterday_logged: true }
            : { completed_today: true, today_log: result.log };
        if (result.streak) changes.current_streak = result.streak.current;
        if (!isBackfill) changes.week_count = (habit.week_count || 0) + 1;
        patchHabit(habit.id, changes);

        if (!isBackfill && result.day) {
            setToday((current) => current && ({
                ...current,
                day: {
                    ...current.day,
                    scheduled: result.day.scheduled,
                    completed: result.day.completed,
                    status: result.day.status,
                    is_complete: result.day.status === 'complete',
                    day_streak: result.day.day_streak
                },
                player: result.player ? { ...current.player, ...result.player, slots: current.player.slots } : current.player,
                active_challenge: result.challenge?.progressed
                    ? {
                        ...current.active_challenge,
                        completed_days: result.challenge.completed_days,
                        today_completed: true
                    }
                    : current.active_challenge
            }));
        }
        celebrateLogResult(result, { isBackfill });
    }, [celebrateLogResult, isBackfill, patchHabit]);

    const logHabit = useCallback(async (habit, payload = {}) => {
        const body = { ...payload };
        if (isBackfill) body.date = targetDate;

        // Optimistic: the tap registers instantly, sync happens behind.
        patchHabit(habit.id, isBackfill ? { yesterday_logged: true } : { completed_today: true });

        try {
            const result = await habitService.logHabit(habit.id, body);
            applyLogResult(habit, result);
            // Backfill changes a past day, so the current week's count/streak and
            // day-completion can't be derived from an optimistic +1 (e.g. yesterday
            // may fall in the previous week). Resync the authoritative Today state.
            if (isBackfill) load();
        } catch (err) {
            if (err.response) {
                // The server rejected it — revert and say why.
                patchHabit(habit.id, isBackfill ? { yesterday_logged: false } : { completed_today: false });
                pushToast({ kind: 'partial', text: err.response.data?.detail || 'Could not log habit' });
            } else {
                // Offline — queue it; the tap still "worked".
                habitService.queueLog(habit.id, { ...body, date: targetDate });
                setPendingSync(habitService.pendingCount());
                pushToast({ kind: 'partial', text: 'Saved offline — will sync', duration: 2400 });
            }
        }
    }, [applyLogResult, isBackfill, load, patchHabit, pushToast, targetDate]);

    const undoLog = useCallback(async (habit) => {
        if (!window.confirm(`Undo "${habit.name}" for ${isBackfill ? 'yesterday' : 'today'}?`)) return;
        patchHabit(habit.id, isBackfill
            ? { yesterday_logged: false }
            : { completed_today: false, today_log: null });
        try {
            const result = await habitService.deleteLog(habit.id, targetDate);
            if (!isBackfill && result.day) {
                setToday((current) => current && ({
                    ...current,
                    day: {
                        ...current.day,
                        scheduled: result.day.scheduled,
                        completed: result.day.completed,
                        status: result.day.status,
                        is_complete: result.day.status === 'complete',
                        day_streak: result.day.day_streak
                    }
                }));
            }
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not undo' });
            load();
        }
    }, [isBackfill, load, patchHabit, pushToast, targetDate]);

    const openDetail = useCallback((habit) => setSheetHabit(habit), []);

    const submitDetail = useCallback(async (habit, payload) => {
        setSheetHabit(null);
        if (isDone(habit)) {
            try {
                await habitService.updateLog(habit.id, targetDate, payload);
                pushToast({ kind: 'daycomplete', text: 'Details saved', duration: 2000 });
                load();
            } catch (err) {
                pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not save details' });
            }
        } else {
            await logHabit(habit, payload);
        }
    }, [isDone, logHabit, load, pushToast, targetDate]);

    if (error) {
        return (
            <div className="today-page">
                <div className="today-error">
                    <p>{error}</p>
                    <button onClick={load}>Retry</button>
                </div>
            </div>
        );
    }

    if (!today) {
        return <div className="today-page"><div className="today-skeleton">Loading your day…</div></div>;
    }

    const noHabits = today.habits_today.length === 0 && today.habits_weekly.length === 0;
    if (noHabits) {
        return <OnboardingPicker onCreated={load} slots={today.player.slots} />;
    }

    const { day, player } = today;
    const ringPct = day.scheduled > 0 ? Math.round((day.completed / day.scheduled) * 100) : 0;
    const dateLabel = new Date(`${today.date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric'
    });

    return (
        <div className="today-page">
            {/* Identity strip: level + day ring + day streak */}
            <header className="today-header">
                <div className="today-title-row">
                    <div>
                        <h1 className="today-title">TODAY</h1>
                        <div className="today-date">{dateLabel}</div>
                    </div>
                    <div className="today-identity">
                        <Link to="/profile" className="level-chip">LVL {player.level}</Link>
                        <div className="day-ring" title={`${day.completed} of ${day.scheduled} habits`}>
                            <svg viewBox="0 0 44 44">
                                <circle className="ring-track" cx="22" cy="22" r="19" />
                                <circle
                                    className={`ring-fill ${day.is_complete ? 'ring-complete' : ''}`}
                                    cx="22" cy="22" r="19"
                                    strokeDasharray={`${(ringPct / 100) * 119.4} 119.4`}
                                />
                            </svg>
                            <span className="ring-label">{day.completed}/{day.scheduled}</span>
                        </div>
                    </div>
                </div>

                <div className="player-xp-bar" title={`${player.xp_into_level} / ${player.xp_into_level + player.xp_to_next} XP`}>
                    <div className="player-xp-fill" style={{ width: `${Math.round(player.level_progress * 100)}%` }} />
                </div>

                <div className="today-meta-row">
                    <span className="day-streak">🔥 Day streak: {day.day_streak}</span>
                    <div className="backfill-toggle">
                        <button
                            className={logDate === 'today' ? 'active' : ''}
                            onClick={() => setLogDate('today')}
                        >Today</button>
                        <button
                            className={logDate === 'yesterday' ? 'active' : ''}
                            onClick={() => setLogDate('yesterday')}
                        >Yesterday</button>
                    </div>
                </div>
                {isBackfill && (
                    <div className="backfill-note">
                        Logging for yesterday — back-filling a genuinely done day restores streaks.
                    </div>
                )}
                {pendingSync > 0 && (
                    <div className="backfill-note">⏳ {pendingSync} log{pendingSync > 1 ? 's' : ''} waiting to sync</div>
                )}
            </header>

            {/* Daily habits */}
            <section className="habit-section">
                {today.habits_today.map((habit) => (
                    <HabitRow
                        key={habit.id}
                        habit={habit}
                        done={isDone(habit)}
                        scheduledToday={habit.cadence_type !== 'weekdays' || habit.weekdays?.includes(today.weekday)}
                        onCheck={() => logHabit(habit)}
                        onUncheck={() => undoLog(habit)}
                        onDetail={() => openDetail(habit)}
                        onMeasurement={(value) => logHabit(habit, { value })}
                    />
                ))}
            </section>

            {/* Weekly cadence habits */}
            {today.habits_weekly.length > 0 && (
                <section className="habit-section">
                    <h2 className="section-label">THIS WEEK</h2>
                    {today.habits_weekly.map((habit) => (
                        <HabitRow
                            key={habit.id}
                            habit={habit}
                            done={isDone(habit)}
                            weekly
                            scheduledToday
                            onCheck={() => logHabit(habit)}
                            onUncheck={() => undoLog(habit)}
                            onDetail={() => openDetail(habit)}
                            onMeasurement={(value) => logHabit(habit, { value })}
                        />
                    ))}
                </section>
            )}

            {/* Active challenge strip */}
            {today.active_challenge && (
                <button className="challenge-strip" onClick={() => navigate('/challenges')}>
                    <span className="challenge-icon">{today.active_challenge.icon || '⚔'}</span>
                    <span className="challenge-name">{today.active_challenge.title}</span>
                    <span className="challenge-progress">
                        {today.active_challenge.today_completed ? '✓ today · ' : ''}
                        day {today.active_challenge.current_day}/{today.active_challenge.duration_days}
                    </span>
                </button>
            )}

            {/* Streak heatmap, on the home surface where it's seen daily */}
            {heatmap && <MiniHeatmap heatmap={heatmap} />}

            <div className="today-footer">
                <Link to="/habits" className="manage-link">Manage habits</Link>
                <span className="slots-hint">
                    {player.slots.used}/{player.slots.total} slots used
                </span>
            </div>

            {sheetHabit && (
                <DetailSheet
                    habit={sheetHabit}
                    existingLog={isBackfill ? null : sheetHabit.today_log}
                    onSubmit={(payload) => submitDetail(sheetHabit, payload)}
                    onClose={() => setSheetHabit(null)}
                />
            )}
        </div>
    );
};

export default TodayPage;
