import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './StrengthProgression.css';

const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric'
});

const formatSet = (set) => {
    if ((set.duration_seconds || 0) > 0) {
        const base = `${set.duration_seconds}s`;
        return set.weight > 0 ? `${set.weight}×${base}` : base;
    }
    if ((set.reps || 0) > 0) return `${set.weight || 0}×${set.reps}`;
    return null;
};

const METRICS = [
    { key: 'e1rm', label: 'Est. 1RM', prKey: 'pr_e1rm', unit: 'lbs' },
    { key: 'top_weight', label: 'Top set', prKey: 'pr_weight', unit: 'lbs' },
    { key: 'volume', label: 'Volume', prKey: null, unit: 'lbs' },
];

const RANGES = [
    { key: '3m', label: '3M', days: 90 },
    { key: '1y', label: '1Y', days: 365 },
    { key: 'all', label: 'All', days: null },
];

const Delta = ({ value, unit = 'lbs' }) => {
    if (value == null || value === 0) return <span className="sp-delta flat">= last</span>;
    return (
        <span className={`sp-delta ${value > 0 ? 'up' : 'down'}`}>
            {value > 0 ? '▲' : '▼'} {Math.abs(value)} {unit}
        </span>
    );
};

/** PR sessions get a ringed dot — the "getting stronger" moments, visible at a glance. */
const prDot = (prKey) => (props) => {
    const { cx, cy, payload, index } = props;
    if (cx == null || cy == null) return null;
    const isPr = prKey && payload[prKey];
    return isPr ? (
        <g key={`dot-${index}`}>
            <circle cx={cx} cy={cy} r={5} fill="#ffd700" stroke="#1a1a2e" strokeWidth={2} />
            <circle cx={cx} cy={cy} r={7.5} fill="none" stroke="#ffd700" strokeWidth={1} opacity={0.6} />
        </g>
    ) : (
        <circle key={`dot-${index}`} cx={cx} cy={cy} r={2} fill="#ffd700" />
    );
};

/**
 * The strength dashboard, modeled on how Strong/Hevy read progression:
 * per-exercise Records (tiles) + Charts (metric/time-range controlled trend
 * with PR markers) + History (full session log in a sheet).
 * Data comes from the parent (`/users/{id}/strength-progression` shape).
 */
const StrengthProgression = ({ data }) => {
    const [selected, setSelected] = useState(null);
    const [metricKey, setMetricKey] = useState('e1rm');
    const [rangeKey, setRangeKey] = useState('all');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [expandedSession, setExpandedSession] = useState(null);

    useEffect(() => {
        setSelected(data?.exercises?.[0]?.name || null);
    }, [data]);

    const exercise = useMemo(
        () => data?.exercises?.find((e) => e.name === selected) || null,
        [data, selected]
    );

    const metric = METRICS.find((m) => m.key === metricKey);

    const chartData = useMemo(() => {
        if (!exercise) return [];
        const range = RANGES.find((r) => r.key === rangeKey);
        if (!range.days) return exercise.sessions;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - range.days);
        const cutoffIso = cutoff.toISOString().slice(0, 10);
        const inRange = exercise.sessions.filter((s) => s.date >= cutoffIso);
        // A range with <2 points can't draw a trend — fall back to everything.
        return inRange.length >= 2 ? inRange : exercise.sessions;
    }, [exercise, rangeKey]);

    if (!data?.exercises?.length) return null;
    const { summary } = data;

    return (
        <div className="stats-card strength-progression">
            <div className="sp-header">
                <span className="sp-title">🏋️ STRENGTH</span>
                <button className="sp-history-btn" onClick={() => setHistoryOpen(true)}>
                    Session log →
                </button>
            </div>

            {summary && (
                <div className="sp-summary sp-overview">
                    <div className="sp-stat">
                        <span className="sp-stat-value">{summary.sessions_30d}</span>
                        <span className="sp-stat-label">sessions (30d)</span>
                    </div>
                    <div className="sp-stat">
                        <span className="sp-stat-value">{summary.prs_30d > 0 ? `🏆 ${summary.prs_30d}` : summary.prs_30d}</span>
                        <span className="sp-stat-label">PRs (30d)</span>
                    </div>
                    <div className="sp-stat">
                        <span className="sp-stat-value">{summary.total_sessions}</span>
                        <span className="sp-stat-label">all time</span>
                    </div>
                </div>
            )}

            <div className="sp-controls">
                <select
                    className="sp-select"
                    value={selected || ''}
                    onChange={(e) => setSelected(e.target.value)}
                >
                    {data.exercises.map((e) => (
                        <option key={e.name} value={e.name}>
                            {e.name} ({e.sessions_count})
                        </option>
                    ))}
                </select>
                <div className="sp-ranges">
                    {RANGES.map((r) => (
                        <button
                            key={r.key}
                            className={`sp-range ${r.key === rangeKey ? 'active' : ''}`}
                            onClick={() => setRangeKey(r.key)}
                        >{r.label}</button>
                    ))}
                </div>
            </div>

            {exercise && (
                <>
                    <div className="sp-summary">
                        <div className="sp-stat">
                            <span className="sp-stat-value">{exercise.latest.top_set}</span>
                            <span className="sp-stat-label">last top set</span>
                            <Delta value={exercise.delta_weight} />
                        </div>
                        <div className="sp-stat">
                            <span className="sp-stat-value">{exercise.latest.e1rm}</span>
                            <span className="sp-stat-label">est. 1RM</span>
                            <Delta value={exercise.delta_e1rm} />
                        </div>
                        <div className="sp-stat">
                            <span className="sp-stat-value">{exercise.best_weight}</span>
                            <span className="sp-stat-label">best weight</span>
                            <span className="sp-delta flat">{exercise.sessions_count} sessions</span>
                        </div>
                    </div>

                    <div className="sp-metrics">
                        {METRICS.map((m) => (
                            <button
                                key={m.key}
                                className={`sp-metric ${m.key === metricKey ? 'active' : ''}`}
                                onClick={() => setMetricKey(m.key)}
                            >{m.label}</button>
                        ))}
                    </div>

                    {chartData.length > 1 ? (
                        <div className="sp-chart">
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={chartData} margin={{ top: 10, right: 10 }}>
                                    <CartesianGrid stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={shortDate}
                                           stroke="#888" tick={{ fontSize: 10 }}
                                           interval="preserveStartEnd" />
                                    <YAxis domain={['auto', 'auto']} stroke="#888"
                                           width={42} tick={{ fontSize: 10 }}
                                           tickFormatter={(v) => v.toLocaleString()} />
                                    <Tooltip
                                        labelFormatter={shortDate}
                                        formatter={(value, key, item) => [
                                            `${Number(value).toLocaleString()} ${metric.unit}${metric.prKey && item?.payload?.[metric.prKey] ? ' · 🏆 PR' : ''}`,
                                            metric.label,
                                        ]}
                                        contentStyle={{
                                            backgroundColor: 'rgba(0,0,0,0.9)',
                                            border: '1px solid rgba(255,215,0,0.5)',
                                            color: '#f8f8f2',
                                        }}
                                    />
                                    <Line type="monotone" dataKey={metric.key} stroke="#ffd700"
                                          strokeWidth={2} dot={prDot(metric.prKey)}
                                          activeDot={{ r: 5, stroke: '#1a1a2e', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                            {metric.prKey && <span className="sp-chart-hint">◉ ringed dots = new personal record</span>}
                        </div>
                    ) : (
                        <p className="sp-hint">One session logged - the trend line starts with your next workout.</p>
                    )}
                </>
            )}

            {historyOpen && (
                <div className="sp-log-overlay" onClick={() => setHistoryOpen(false)}>
                    <div className="sp-log-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="sp-log-head">
                            <h2>Session log</h2>
                            <button className="sp-log-close" onClick={() => setHistoryOpen(false)}>×</button>
                        </div>
                        {(data.session_history || []).map((session, i) => {
                            const open = expandedSession === i;
                            const meta = [session.day, session.program].filter(Boolean).join(' · ');
                            return (
                                <div className={`sp-session ${open ? 'open' : ''}`} key={`${session.date}-${i}`}>
                                    <button className="sp-session-head" onClick={() => setExpandedSession(open ? null : i)}>
                                        <span className="sp-session-date">{shortDate(session.date)}</span>
                                        <span className="sp-session-day">{meta}</span>
                                        <span className="sp-session-caret">{open ? '▾' : '▸'}</span>
                                    </button>
                                    {open && session.exercises.map((ex) => {
                                        const sets = ex.sets.map(formatSet).filter(Boolean);
                                        if (!sets.length) return null;
                                        return (
                                            <div className="sp-session-ex" key={ex.name}>
                                                <span className="sp-session-ex-name">{ex.name}</span>
                                                <span className="sp-session-sets">{sets.join(' · ')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                        {(data.session_history || []).length === 0 && (
                            <p className="sp-hint">No sessions logged yet.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrengthProgression;
