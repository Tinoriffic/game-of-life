import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DURATION_CHIPS = [10, 15, 20, 30, 45, 60];

// Split fractional minutes (how cardio time is stored) into h / m / s fields.
const minutesToHMS = (totalMin) => {
    if (totalMin === '' || totalMin == null) return { h: '', m: '', s: '' };
    const totalSec = Math.round(Number(totalMin) * 60);
    return {
        h: Math.floor(totalSec / 3600),
        m: Math.floor((totalSec % 3600) / 60),
        s: totalSec % 60,
    };
};

/**
 * The bottom sheet for optional detail. Checkmark first - detail is a bonus
 * for people who want richer stats (and bonus XP).
 */
const DetailSheet = ({ habit, existingLog, focusCategory, onSubmit, onClose }) => {
    const navigate = useNavigate();
    const kind = habit.detail_kind;
    const editing = Boolean(existingLog);

    const [duration, setDuration] = useState(existingLog?.duration_minutes ?? '');
    const [distance, setDistance] = useState(existingLog?.distance ?? '');
    const [quantity, setQuantity] = useState(existingLog?.quantity ?? '');
    const [note, setNote] = useState(existingLog?.note ?? '');
    const [volume, setVolume] = useState(existingLog?.value ?? '');

    // Cardio time is entered as hours / minutes / seconds (mileage matters to the second).
    const initHMS = minutesToHMS(existingLog?.duration_minutes);
    const [hrs, setHrs] = useState(initHMS.h === '' ? '' : String(initHMS.h));
    const [mins, setMins] = useState(initHMS.m === '' ? '' : String(initHMS.m));
    const [secs, setSecs] = useState(initHMS.s === '' ? '' : String(initHMS.s));

    const submit = (e) => {
        e.preventDefault();
        const payload = {};

        if (kind === 'distance_duration') {
            const h = parseInt(hrs, 10) || 0;
            const m = parseInt(mins, 10) || 0;
            const s = parseInt(secs, 10) || 0;
            const totalMinutes = h * 60 + m + s / 60;
            if (totalMinutes > 0) payload.duration_minutes = Number(totalMinutes.toFixed(4));
            if (distance !== '') payload.distance = parseFloat(distance);
        } else {
            if (duration !== '' && kind !== 'volume') payload.duration_minutes = parseInt(duration, 10);
            if (quantity !== '') payload.quantity = parseInt(quantity, 10);
            if (kind === 'volume' && volume !== '') payload.value = parseFloat(volume);
        }

        if (note.trim()) payload.note = note.trim();
        onSubmit(payload);
    };

    const quantityLabel = kind === 'pages' ? 'Pages' : 'Count (problems, reps, items…)';

    return (
        <div className="sheet-backdrop" onClick={onClose}>
            <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-handle" />
                <h3 className="sheet-title">
                    {habit.icon} {habit.name}
                    <span className="sheet-subtitle">{editing ? 'Edit details' : 'Log with detail (+bonus XP)'}</span>
                </h3>

                {focusCategory && (
                    <div className="sheet-focus-warning">
                        ⚡ You already have {Math.round(focusCategory.today_minutes)} min of focus
                        logged for {focusCategory.name} today - durations add together, so only
                        enter time that isn't already counted.
                    </div>
                )}

                <form onSubmit={submit}>
                    {kind === 'volume' && (
                        <>
                            <button
                                type="button"
                                className="sheet-workout-link"
                                onClick={() => navigate(`/fitness?habitId=${habit.id}`)}
                            >
                                🏋️ Open the full workout logger
                            </button>
                            <label className="sheet-field">
                                <span>Total volume (lbs, optional quick log)</span>
                                <input type="number" inputMode="decimal" step="50" min="0"
                                       value={volume} onChange={(e) => setVolume(e.target.value)} />
                            </label>
                        </>
                    )}

                    {(kind === 'duration' || kind === 'pages') && (
                        <label className="sheet-field">
                            <span>Duration (minutes)</span>
                            <div className="chip-row">
                                {DURATION_CHIPS.map((minutes) => (
                                    <button type="button" key={minutes}
                                            className={`chip ${String(duration) === String(minutes) ? 'active' : ''}`}
                                            onClick={() => setDuration(minutes)}>
                                        {minutes}
                                    </button>
                                ))}
                            </div>
                            <input type="number" inputMode="numeric" min="0" placeholder="custom"
                                   value={duration} onChange={(e) => setDuration(e.target.value)} />
                        </label>
                    )}

                    {kind === 'distance_duration' && (
                        <>
                            <label className="sheet-field">
                                <span>Distance (miles)</span>
                                <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="e.g. 4.82"
                                       value={distance} onChange={(e) => setDistance(e.target.value)} />
                            </label>
                            <label className="sheet-field">
                                <span>Time</span>
                                <div className="hms-row">
                                    <div className="hms-cell">
                                        <input type="number" inputMode="numeric" min="0" max="23" placeholder="0"
                                               value={hrs} onChange={(e) => setHrs(e.target.value)} />
                                        <span>hr</span>
                                    </div>
                                    <div className="hms-cell">
                                        <input type="number" inputMode="numeric" min="0" max="59" placeholder="0"
                                               value={mins} onChange={(e) => setMins(e.target.value)} />
                                        <span>min</span>
                                    </div>
                                    <div className="hms-cell">
                                        <input type="number" inputMode="numeric" min="0" max="59" placeholder="0"
                                               value={secs} onChange={(e) => setSecs(e.target.value)} />
                                        <span>sec</span>
                                    </div>
                                </div>
                            </label>
                        </>
                    )}

                    {(kind === 'quantity' || kind === 'pages') && (
                        <label className="sheet-field">
                            <span>{quantityLabel}</span>
                            <input type="number" inputMode="numeric" min="0"
                                   value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                        </label>
                    )}

                    <label className="sheet-field">
                        <span>Note (optional)</span>
                        <input type="text" maxLength={200} value={note}
                               placeholder={kind === 'note' ? 'What was it? Who was there?' : ''}
                               onChange={(e) => setNote(e.target.value)} />
                    </label>

                    <div className="sheet-actions">
                        <button type="button" className="sheet-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="sheet-submit">
                            {editing ? 'Save details' : 'Log it'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DetailSheet;
