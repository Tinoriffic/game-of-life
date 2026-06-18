import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ATTRIBUTE_SHORT = {
    Strength: 'STR', Endurance: 'END', Awareness: 'AWA', Intelligence: 'INT',
    Wisdom: 'WIS', Charisma: 'CHA', Resilience: 'RES', Creativity: 'CRE'
};

const DETAILABLE = new Set(['duration', 'distance_duration', 'volume', 'quantity', 'pages', 'note']);

/**
 * One habit in the Today list. Tap the circle -> done (under one second).
 * [+] opens the detail sheet. Measurement habits take their value inline.
 * Program-backed Strength habits open the full-screen per-set logger instead.
 */
const HabitRow = ({ habit, done, weekly = false, scheduledToday = true,
                    onCheck, onUncheck, onDetail, onMeasurement }) => {
    const [measureValue, setMeasureValue] = useState('');
    const navigate = useNavigate();
    const isMeasurement = habit.habit_type === 'measurement';
    const isProgram = Boolean(habit.program_id);
    const canDetail = !isMeasurement && !isProgram && DETAILABLE.has(habit.detail_kind);

    const goLog = () => navigate(`/workout/log/${habit.id}`);

    const streakLabel = habit.current_streak > 0
        ? `🔥${habit.current_streak}${weekly ? 'w' : ''}`
        : null;

    // Skip the sub-line entirely when it would be empty (e.g. an un-logged
    // measurement habit) so the row doesn't carry a blank second line.
    const showSubLine =
        weekly ||
        !scheduledToday ||
        (done && isMeasurement && habit.today_log?.value != null) ||
        (done && !isMeasurement && habit.attribute && habit.today_log) ||
        (!done && !isMeasurement && habit.attribute);

    const handleCircle = () => {
        if (done) {
            onUncheck();
        } else if (isProgram) {
            goLog();   // open the per-set logger; logging there completes the habit
        } else if (isMeasurement) {
            // circle defers to the inline input for measurements
        } else {
            onCheck();
        }
    };

    const submitMeasurement = (e) => {
        e.preventDefault();
        const value = parseFloat(measureValue);
        if (!Number.isFinite(value)) return;
        onMeasurement(value);
        setMeasureValue('');
    };

    const trendArrow = () => {
        const current = habit.today_log?.value;
        if (current == null || habit.last_value == null) return '';
        if (current < habit.last_value) return ' ↘';
        if (current > habit.last_value) return ' ↗';
        return ' →';
    };

    return (
        <div className={`habit-row ${done ? 'done' : ''} ${!scheduledToday ? 'unscheduled' : ''}`}>
            <button
                className={`habit-circle ${done ? 'checked' : ''}`}
                onClick={handleCircle}
                disabled={isMeasurement && !done}
                aria-label={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
            >
                {done ? '✓' : ''}
            </button>

            <div className="habit-main" onClick={() => {
                if (isProgram) goLog();
                else if (done && canDetail) onDetail();
            }}>
                <div className="habit-name-line">
                    <span className="habit-icon">{habit.icon}</span>
                    <span className="habit-name">{habit.name}</span>
                    {streakLabel && <span className="habit-streak">{streakLabel}</span>}
                </div>
                {showSubLine && (
                <div className="habit-sub-line">
                    {weekly && (
                        <span className="week-progress">
                            {habit.week_count} of {habit.times_per_week} this week{' '}
                            <span className="week-pips">
                                {Array.from({ length: habit.times_per_week }).map((_, i) => (
                                    <span key={i} className={i < habit.week_count ? 'pip filled' : 'pip'} />
                                ))}
                            </span>
                        </span>
                    )}
                    {!weekly && !scheduledToday && <span className="rest-day">rest day</span>}
                    {isMeasurement && done && habit.today_log?.value != null && (
                        <span className="measure-value">
                            {habit.today_log.value} {habit.measurement_unit}{trendArrow()}
                        </span>
                    )}
                    {!isMeasurement && done && habit.attribute && habit.today_log && (
                        <span className="earned-xp">
                            +{habit.today_log.attribute_xp} {ATTRIBUTE_SHORT[habit.attribute] || habit.attribute}
                        </span>
                    )}
                    {!done && !isMeasurement && habit.attribute && (
                        <span className="potential-xp">
                            +{habit.base_xp} {ATTRIBUTE_SHORT[habit.attribute] || habit.attribute}
                        </span>
                    )}
                </div>
                )}
            </div>

            {!done && isMeasurement && (
                <form className="measure-form" onSubmit={submitMeasurement}>
                    <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        placeholder={habit.measurement_unit || 'value'}
                        value={measureValue}
                        onChange={(e) => setMeasureValue(e.target.value)}
                    />
                    <button type="submit" disabled={!measureValue}>✓</button>
                </form>
            )}

            {!done && canDetail && (
                <button className="detail-button" onClick={onDetail} aria-label={`Log ${habit.name} with detail`}>
                    ＋
                </button>
            )}
            {done && canDetail && (
                <button className="detail-button subtle" onClick={onDetail} aria-label={`Edit ${habit.name} detail`}>
                    ✎
                </button>
            )}
            {isProgram && (
                <button className="detail-button" onClick={goLog} aria-label={`Log workout: ${habit.name}`}>
                    🏋️
                </button>
            )}
        </div>
    );
};

export default HabitRow;
