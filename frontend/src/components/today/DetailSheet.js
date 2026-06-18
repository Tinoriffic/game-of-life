import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DURATION_CHIPS = [10, 15, 20, 30, 45, 60];

/**
 * The bottom sheet for optional detail. Checkmark first — detail is a bonus
 * for people who want richer stats (and bonus XP).
 */
const DetailSheet = ({ habit, existingLog, onSubmit, onClose }) => {
    const navigate = useNavigate();
    const [duration, setDuration] = useState(existingLog?.duration_minutes ?? '');
    const [distance, setDistance] = useState(existingLog?.distance ?? '');
    const [quantity, setQuantity] = useState(existingLog?.quantity ?? '');
    const [note, setNote] = useState(existingLog?.note ?? '');
    const [volume, setVolume] = useState(existingLog?.value ?? '');

    const kind = habit.detail_kind;
    const editing = Boolean(existingLog);

    const submit = (e) => {
        e.preventDefault();
        const payload = {};
        if (duration !== '' && kind !== 'volume') payload.duration_minutes = parseInt(duration, 10);
        if (distance !== '') payload.distance = parseFloat(distance);
        if (quantity !== '') payload.quantity = parseInt(quantity, 10);
        if (note.trim()) payload.note = note.trim();
        if (kind === 'volume' && volume !== '') payload.value = parseFloat(volume);
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

                    {(kind === 'duration' || kind === 'distance_duration' || kind === 'pages') && (
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
                        <label className="sheet-field">
                            <span>Distance (miles)</span>
                            <input type="number" inputMode="decimal" step="0.1" min="0"
                                   value={distance} onChange={(e) => setDistance(e.target.value)} />
                        </label>
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
