import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { focusService, formatClicks } from '../../services/focusService';
import { useFeedback } from '../feedback/FeedbackContext';
import CategoryManager from './CategoryManager';
import ManualLogModal from './ManualLogModal';
import RitualEditor from './RitualEditor';
import './Focus.css';
import './ClicksPage.css';

const SUMMARY_DAYS = 105;      // ~one quarter feeds the weekly rollups
const RECENT_DAYS_DEFAULT = 7; // compact by default; expandable

const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric'
});
const weekdayShort = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short'
});

/**
 * The Clicks page: derived hours of needle-moving work, visualized.
 * Private, no XP - the metric is the reward. Heatmap is mobile-first:
 * a rolling window anchored to today, newest cells always on screen.
 */
const ClicksPage = ({ embedded = false }) => {
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);
    const [manualDate, setManualDate] = useState(null);   // date string opens the modal
    const [manageOpen, setManageOpen] = useState(false);
    const [editingTarget, setEditingTarget] = useState(false);
    const [targetDraft, setTargetDraft] = useState('');
    const [ritualOpen, setRitualOpen] = useState(false);
    const [showAllDays, setShowAllDays] = useState(false);
    const { celebrateLogResult, pushToast } = useFeedback();
    const navigate = useNavigate();

    const load = useCallback(async () => {
        try {
            setSummary(await focusService.getSummary(SUMMARY_DAYS));
            setError(null);
        } catch (err) {
            setError(err.response?.status === 403
                ? 'Click tracking is not enabled for this account.'
                : 'Could not load clicks.');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const categoryById = useMemo(() => {
        const map = {};
        (summary?.categories || []).forEach((c) => { map[c.id] = c; });
        return map;
    }, [summary]);

    const currentWeek = useMemo(() => {
        if (!summary) return [];
        const lastWeekStart = summary.weeks[summary.weeks.length - 1]?.week_start;
        return summary.days.filter((d) => d.date >= lastWeekStart);
    }, [summary]);

    if (error) {
        return <div className="clicks-page"><div className="focus-error"><p>{error}</p></div></div>;
    }
    if (!summary) {
        return <div className="clicks-page"><div className="focus-skeleton">Loading…</div></div>;
    }

    const { settings } = summary;
    const weekMinutes = currentWeek.reduce((sum, d) => sum + d.minutes, 0);
    const weekTargetMinutes = settings.weekly_target_clicks * 60;
    const weekPct = Math.min(100, Math.round((weekMinutes / weekTargetMinutes) * 100));
    const recentDays = summary.days.slice(showAllDays ? -21 : -RECENT_DAYS_DEFAULT).reverse();

    const saveTarget = async () => {
        const value = parseFloat(targetDraft);
        setEditingTarget(false);
        if (!value || value === settings.daily_target_clicks) return;
        try {
            await focusService.updateSettings({ click_daily_target: value });
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not save target' });
        }
    };

    return (
        <div className="clicks-page">
            <header className="clicks-header">
                {/* Embedded in the Stats shell the tab is the title */}
                {embedded
                    ? <p className="clicks-definition">1 click = 1 hour of focused, needle-moving work</p>
                    : <h1 className="clicks-title">⚡ CLICKS</h1>}
                <button className="btn-gold clicks-start" onClick={() => navigate('/focus')}>
                    ▶ Focus
                </button>
            </header>
            {!embedded && (
                <p className="clicks-definition">1 click = 1 hour of focused, needle-moving work</p>
            )}

            {/* Today + week pace */}
            <section className="clicks-hero">
                <div className="hero-today">
                    <span className="hero-value">{formatClicks(summary.today_minutes)}</span>
                    <span className="hero-sub">
                        of{' '}
                        {editingTarget ? (
                            <input
                                className="target-input" type="number" step="0.25" min="0.25" max="24"
                                autoFocus value={targetDraft}
                                onChange={(e) => setTargetDraft(e.target.value)}
                                onBlur={saveTarget}
                                onKeyDown={(e) => e.key === 'Enter' && saveTarget()}
                            />
                        ) : (
                            <button
                                className="target-chip"
                                title="Tap to edit your daily target"
                                onClick={() => {
                                    setTargetDraft(String(settings.daily_target_clicks));
                                    setEditingTarget(true);
                                }}
                            >
                                {settings.daily_target_clicks}
                            </button>
                        )}
                        {' '}today
                    </span>
                </div>
                <div className="hero-week">
                    <div className="hero-week-label">
                        <span>This week</span>
                        <span>{formatClicks(weekMinutes)} / {settings.weekly_target_clicks} clicks</span>
                    </div>
                    <div className="week-bar">
                        <div className="week-bar-fill" style={{ width: `${weekPct}%` }} />
                    </div>
                </div>
            </section>

            {/* This week, day by day, stacked by category */}
            <section className="clicks-card-block">
                <h2 className="section-label">THIS WEEK</h2>
                <div className="week-columns">
                    {currentWeek.map((day) => (
                        <div className="wc-col" key={day.date}>
                            <div className="wc-track">
                                {/* Columns are scaled so the daily target sits at 70% height. */}
                                <div className="wc-target" style={{ bottom: '70%' }} />
                                <div className="wc-stack">
                                    {Object.entries(day.by_category).map(([catId, minutes]) => (
                                        <div
                                            key={catId}
                                            className="wc-segment"
                                            style={{
                                                height: `${(minutes / (settings.daily_target_clicks * 60 / 0.7)) * 100}%`,
                                                background: categoryById[catId]?.color || '#ffd700'
                                            }}
                                            title={`${categoryById[catId]?.name}: ${formatClicks(minutes)}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <span className="wc-value">{day.minutes > 0 ? formatClicks(day.minutes) : ''}</span>
                            <span className="wc-day">{weekdayShort(day.date).slice(0, 2)}</span>
                        </div>
                    ))}
                </div>
                <div className="cat-legend">
                    {summary.categories.filter((c) => c.status === 'active').map((c) => (
                        <span className="legend-item" key={c.id}>
                            <span className="legend-dot" style={{ background: c.color || '#ffd700' }} />
                            {c.name}
                        </span>
                    ))}
                </div>
            </section>

            {/* Weekly summary - the old spreadsheet block */}
            <section className="clicks-card-block">
                <h2 className="section-label">WEEKLY TOTALS</h2>
                {[...summary.weeks].reverse().slice(0, 8).map((week) => (
                    <div className="week-row" key={week.week_start}>
                        <div className="week-row-head">
                            <span className="week-row-label">Wk of {shortDate(week.week_start)}</span>
                            <span className="week-row-total">
                                {formatClicks(week.minutes)} clicks
                                <span className="week-row-avg">
                                    {' '}· {formatClicks(week.minutes / week.days_elapsed)}/day
                                </span>
                            </span>
                        </div>
                        {week.minutes > 0 && (
                            <div className="week-row-bar">
                                {Object.entries(week.by_category).map(([catId, minutes]) => (
                                    <div
                                        key={catId}
                                        style={{
                                            width: `${(minutes / week.minutes) * 100}%`,
                                            background: categoryById[catId]?.color || '#ffd700'
                                        }}
                                        title={`${categoryById[catId]?.name}: ${formatClicks(minutes)}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </section>

            {/* Recent days with notes + backfill */}
            <section className="clicks-card-block">
                <h2 className="section-label">RECENT DAYS</h2>
                {recentDays.map((day) => (
                    <DayRow
                        key={day.date}
                        day={day}
                        categoryById={categoryById}
                        onAddTime={() => setManualDate(day.date)}
                        onSaveNote={async (note) => {
                            try {
                                await focusService.upsertDayNote(day.date, note);
                                load();
                            } catch {
                                pushToast({ kind: 'partial', text: 'Could not save note' });
                            }
                        }}
                    />
                ))}
                <button className="btn-link days-toggle" onClick={() => setShowAllDays(!showAllDays)}>
                    {showAllDays ? 'Show fewer days' : 'Show more days'}
                </button>
            </section>

            <div className="clicks-footer">
                <button className="btn-link" onClick={() => setManualDate(summary.end)}>+ Log time</button>
                <button className="btn-link" onClick={() => setManageOpen(true)}>Manage categories</button>
                <button className="btn-link" onClick={() => setRitualOpen(true)}>Edit ritual</button>
            </div>

            {manualDate && (
                <ManualLogModal
                    categories={summary.categories.filter((c) => c.status === 'active')}
                    defaultDate={manualDate === summary.end ? summary.end : manualDate}
                    onLogged={(result) => {
                        setManualDate(null);
                        if (result.habit_payout?.auto_logged) celebrateLogResult(result.habit_payout, {});
                        else pushToast({ kind: 'daycomplete', text: 'Time logged', duration: 2000 });
                        load();
                    }}
                    onClose={() => setManualDate(null)}
                />
            )}
            {manageOpen && <CategoryManager onClose={() => { setManageOpen(false); load(); }} />}
            {ritualOpen && (
                <RitualEditor
                    ritual={settings.ritual}
                    onClose={() => setRitualOpen(false)}
                    onSave={async (items) => {
                        setRitualOpen(false);
                        try {
                            await focusService.updateSettings({ ritual: items });
                            load();
                        } catch {
                            pushToast({ kind: 'partial', text: 'Could not save ritual' });
                        }
                    }}
                />
            )}
        </div>
    );
};

const DayRow = ({ day, categoryById, onAddTime, onSaveNote }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(day.note || '');

    const save = () => {
        setEditing(false);
        if ((day.note || '') !== draft.trim()) onSaveNote(draft.trim());
    };

    return (
        <div className="day-row">
            <div className="day-row-main">
                <span className="day-row-date">
                    {weekdayShort(day.date)} {shortDate(day.date)}
                </span>
                <span className="day-row-cats">
                    {Object.entries(day.by_category).map(([catId, minutes]) => (
                        <span className="day-cat" key={catId}>
                            <span className="legend-dot"
                                  style={{ background: categoryById[catId]?.color || '#ffd700' }} />
                            {formatClicks(minutes)}
                        </span>
                    ))}
                </span>
                <span className={`day-row-total ${day.minutes > 0 ? '' : 'zero'}`}>
                    {formatClicks(day.minutes)}
                </span>
                <button className="day-add" title="Add time" onClick={onAddTime}>＋</button>
            </div>
            {editing ? (
                <input
                    className="day-note-input" type="text" maxLength={500} autoFocus
                    value={draft}
                    placeholder="Note for this day (e.g. wrist injury)"
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={save}
                    onKeyDown={(e) => e.key === 'Enter' && save()}
                />
            ) : (
                <button className="day-note" onClick={() => { setDraft(day.note || ''); setEditing(true); }}>
                    {day.note || <span className="day-note-hint">+ note</span>}
                </button>
            )}
        </div>
    );
};

export default ClicksPage;
