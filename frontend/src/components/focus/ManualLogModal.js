import React, { useState } from 'react';
import { focusService } from '../../services/focusService';
import './Focus.css';

const QUICK_MINUTES = [15, 30, 45, 60, 90];

/**
 * Log focus time without a timer - already did the work, know the duration.
 * In a linked category this behaves exactly like a completed session
 * (threshold auto-log, additive duration).
 */
const ManualLogModal = ({ categories, defaultDate, maxDate, onLogged, onClose }) => {
    const activeCategories = categories.filter((c) => c.status !== 'archived');
    const [categoryId, setCategoryId] = useState(activeCategories[0]?.id || '');
    const [minutes, setMinutes] = useState('');
    const [date, setDate] = useState(defaultDate);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        const duration = parseInt(minutes, 10);
        if (!categoryId || !duration || busy) return;
        setBusy(true);
        setError(null);
        try {
            const result = await focusService.logManual({
                category_id: Number(categoryId),
                duration_minutes: duration,
                date,
                ...(note.trim() ? { note: note.trim() } : {}),
            });
            onLogged(result);
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not log time');
            setBusy(false);
        }
    };

    return (
        <div className="focus-overlay" onClick={onClose}>
            <div className="focus-sheet" onClick={(e) => e.stopPropagation()}>
                <h3 className="sheet-heading">Log time</h3>
                {error && <div className="manager-error">{error}</div>}
                <form onSubmit={submit}>
                    <label className="sheet-field">
                        <span>Category</span>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            {activeCategories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="sheet-field">
                        <span>Minutes of focused work</span>
                        <div className="chip-row">
                            {QUICK_MINUTES.map((m) => (
                                <button type="button" key={m}
                                        className={`chip ${String(minutes) === String(m) ? 'active' : ''}`}
                                        onClick={() => setMinutes(String(m))}>
                                    {m}
                                </button>
                            ))}
                        </div>
                        <input type="number" inputMode="numeric" min="1" max="1440" placeholder="custom"
                               value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                    </label>

                    <label className="sheet-field">
                        <span>Date</span>
                        <input type="date" value={date} max={maxDate || defaultDate}
                               onChange={(e) => setDate(e.target.value)} />
                    </label>

                    <label className="sheet-field">
                        <span>Note (optional)</span>
                        <input type="text" maxLength={200} value={note}
                               onChange={(e) => setNote(e.target.value)} />
                    </label>

                    <div className="sheet-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-gold"
                                disabled={!categoryId || !parseInt(minutes, 10) || busy}>
                            Log it
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualLogModal;
