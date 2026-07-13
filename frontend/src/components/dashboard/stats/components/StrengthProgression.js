import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser } from '../../../player/UserContext';
import axiosInstance from '../../../../axios';
import './StrengthProgression.css';

const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric'
});

const formatSet = (set) => {
    if ((set.duration_seconds || 0) > 0) {
        const base = `${set.duration_seconds}s`;
        return set.weight > 0 ? `${set.weight}x${base}` : base;
    }
    if ((set.reps || 0) > 0) return `${set.weight || 0}x${set.reps}`;
    return null;
};

const Delta = ({ value, unit = 'lbs' }) => {
    if (value == null || value === 0) return <span className="sp-delta flat">= last</span>;
    return (
        <span className={`sp-delta ${value > 0 ? 'up' : 'down'}`}>
            {value > 0 ? '▲' : '▼'} {Math.abs(value)} {unit}
        </span>
    );
};

/**
 * Strength over time, the way a lifter reads it: per exercise, the top-set
 * weight and estimated 1RM per session, with deltas vs last time. Replaces
 * the volume/intensity charts that didn't say anything about progression.
 */
const StrengthProgression = () => {
    const { user } = useUser();
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        if (!user?.id) return;
        axiosInstance.get(`/users/${user.id}/strength-progression`)
            .then((res) => {
                setData(res.data);
                setSelected(res.data?.exercises?.[0]?.name || null);
            })
            .catch((err) => console.error('Error fetching strength progression:', err));
    }, [user?.id]);

    const exercise = useMemo(
        () => data?.exercises?.find((e) => e.name === selected) || null,
        [data, selected]
    );

    if (!data?.exercises?.length) return null;

    return (
        <div className="stats-card strength-progression">
            <div className="sp-header">
                <span className="sp-title">🏋️ STRENGTH</span>
                <span className="sp-subtitle">top set + est. 1RM per session</span>
            </div>

            <div className="sp-chips">
                {data.exercises.map((e) => (
                    <button
                        key={e.name}
                        className={`sp-chip ${e.name === selected ? 'active' : ''}`}
                        onClick={() => setSelected(e.name)}
                    >
                        {e.name}
                    </button>
                ))}
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

                    {exercise.sessions.length > 1 ? (
                        <div className="sp-chart">
                            <ResponsiveContainer width="100%" height={160}>
                                <LineChart data={exercise.sessions}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="date" tickFormatter={shortDate}
                                           stroke="#888" tick={{ fontSize: 10 }}
                                           interval="preserveStartEnd" />
                                    <YAxis domain={['auto', 'auto']} stroke="#888"
                                           width={38} tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        labelFormatter={shortDate}
                                        formatter={(value, key) => [
                                            `${value} lbs`,
                                            key === 'e1rm' ? 'est. 1RM' : 'top set',
                                        ]}
                                        contentStyle={{
                                            backgroundColor: 'rgba(0,0,0,0.9)',
                                            border: '1px solid rgba(255,215,0,0.5)',
                                            color: '#f8f8f2',
                                        }}
                                    />
                                    <Line type="monotone" dataKey="e1rm" stroke="#ffd700"
                                          strokeWidth={2} dot={{ r: 2 }} />
                                    <Line type="monotone" dataKey="top_weight" stroke="#4cc9f0"
                                          strokeWidth={2} dot={{ r: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                            <div className="sp-legend">
                                <span><span className="sp-dot" style={{ background: '#ffd700' }} /> est. 1RM</span>
                                <span><span className="sp-dot" style={{ background: '#4cc9f0' }} /> top-set weight</span>
                            </div>
                        </div>
                    ) : (
                        <p className="sp-hint">One session logged - the trend line starts with your next workout.</p>
                    )}
                </>
            )}

            {data.recent_sessions.length > 0 && (
                <div className="sp-log">
                    <span className="sp-log-title">RECENT SESSIONS</span>
                    {data.recent_sessions.map((session) => (
                        <div className="sp-session" key={`${session.date}-${session.day || ''}`}>
                            <div className="sp-session-head">
                                <span>{shortDate(session.date)}</span>
                                <span className="sp-session-day">
                                    {[session.day, session.program].filter(Boolean).join(' · ')}
                                </span>
                            </div>
                            {session.exercises.map((ex) => {
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
                    ))}
                </div>
            )}
        </div>
    );
};

export default StrengthProgression;
