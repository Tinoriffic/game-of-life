import React, { useEffect, useState } from 'react';
import { habitService } from '../../services/habitService';
import { useFeedback } from '../feedback/FeedbackContext';
import './HabitEditSheet.css';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CADENCE_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'N× / week' },
    { value: 'weekdays', label: 'Set days' }
];

/**
 * Edit an existing habit in place: rename, change cadence (daily ⇄ N× per week
 * ⇄ specific days), and set a measurement goal. Rotating a habit down from
 * 6×/week to 4×/week shouldn't cost you its history, so this is an edit rather
 * than an archive-and-recreate.
 */
const HabitEditSheet = ({ habit, onClose, onSaved }) => {
    const [name, setName] = useState(habit.name);
    const [cadenceType, setCadenceType] = useState(habit.cadence_type);
    const [timesPerWeek, setTimesPerWeek] = useState(habit.times_per_week || 3);
    const [weekdays, setWeekdays] = useState(habit.weekdays || [0, 1, 2, 3, 4]);
    const [targetValue, setTargetValue] = useState(
        habit.target_value != null ? String(habit.target_value) : ''
    );
    const [saving, setSaving] = useState(false);
    const { pushToast } = useFeedback();

    const isMeasurement = habit.habit_type === 'measurement';

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const toggleWeekday = (day) => {
        const next = new Set(weekdays);
        if (next.has(day)) next.delete(day); else next.add(day);
        setWeekdays([...next].sort((a, b) => a - b));
    };

    const save = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            pushToast({ kind: 'partial', text: 'Give the habit a name' });
            return;
        }
        if (cadenceType === 'weekdays' && weekdays.length === 0) {
            pushToast({ kind: 'partial', text: 'Pick at least one day' });
            return;
        }

        const changes = {
            name: trimmed,
            cadence_type: cadenceType,
            times_per_week: cadenceType === 'weekly' ? timesPerWeek : null,
            weekdays: cadenceType === 'weekdays' ? weekdays : null
        };
        if (isMeasurement && targetValue.trim() !== '') {
            const parsed = parseFloat(targetValue);
            if (Number.isNaN(parsed)) {
                pushToast({ kind: 'partial', text: 'Goal must be a number' });
                return;
            }
            changes.target_value = parsed;
        }

        setSaving(true);
        try {
            await habitService.updateHabit(habit.id, changes);
            pushToast({ kind: 'daycomplete', text: `"${trimmed}" updated` });
            onSaved();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not save changes' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="edit-overlay" onClick={onClose}>
            <div className="edit-sheet" onClick={(e) => e.stopPropagation()}>
                <header className="edit-head">
                    <h2><span className="edit-icon">{habit.icon}</span> Edit habit</h2>
                    <button className="edit-close" onClick={onClose} aria-label="Close">×</button>
                </header>

                <label className="edit-label" htmlFor="habit-name">NAME</label>
                <input
                    id="habit-name"
                    className="edit-input"
                    type="text"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                />

                <span className="edit-label">CADENCE</span>
                <div className="edit-segmented">
                    {CADENCE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            className={cadenceType === option.value ? 'seg active' : 'seg'}
                            onClick={() => setCadenceType(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {cadenceType === 'weekly' && (
                    <div className="edit-stepper">
                        <button onClick={() => setTimesPerWeek(Math.max(1, timesPerWeek - 1))}>−</button>
                        <span className="edit-stepper-value">{timesPerWeek}× per week</span>
                        <button onClick={() => setTimesPerWeek(Math.min(7, timesPerWeek + 1))}>＋</button>
                    </div>
                )}

                {cadenceType === 'weekdays' && (
                    <div className="edit-weekdays">
                        {WEEKDAY_LABELS.map((label, day) => (
                            <button
                                key={day}
                                className={weekdays.includes(day) ? 'wd active' : 'wd'}
                                onClick={() => toggleWeekday(day)}
                            >{label}</button>
                        ))}
                    </div>
                )}

                <p className="edit-hint">
                    {cadenceType === 'daily' && 'Counts toward day-complete every day.'}
                    {cadenceType === 'weekly' && 'Lives in THIS WEEK — hit the target any days you like.'}
                    {cadenceType === 'weekdays' && 'Only the days you pick count; the rest are rest days.'}
                </p>

                {isMeasurement && (
                    <>
                        <label className="edit-label" htmlFor="habit-goal">
                            GOAL{habit.measurement_unit ? ` (${habit.measurement_unit})` : ''}
                        </label>
                        <input
                            id="habit-goal"
                            className="edit-input"
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                        />
                    </>
                )}

                <button className="edit-save" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button className="edit-cancel" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default HabitEditSheet;
