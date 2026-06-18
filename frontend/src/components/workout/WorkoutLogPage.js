import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { habitService } from '../../services/habitService';
import { useFeedback } from '../feedback/FeedbackContext';
import WorkoutLogger from './WorkoutLogger';
import ProgramBuilder from './ProgramBuilder';
import './WorkoutLogPage.css';

/**
 * Full-screen per-set logger for a program-backed Strength habit. The rich
 * LogWorkoutEntry is reused as the body; logging creates the WorkoutSession AND
 * the habit log server-side, and the returned habit payout drives the feedback layer.
 */
const WorkoutLogPage = () => {
    const { habitId } = useParams();
    const navigate = useNavigate();
    const { celebrateLogResult, pushToast } = useFeedback();
    const [habit, setHabit] = useState(null);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        habitService.getHabits().then((habits) => {
            const found = habits.find((h) => String(h.id) === String(habitId));
            if (!found) { setError('Habit not found.'); return; }
            if (!found.program_id) { setError('This habit has no workout program attached.'); return; }
            setHabit(found);
        }).catch(() => setError('Could not load this workout.'));
    }, [habitId]);

    const onLogged = (sessionResult) => {
        const payout = sessionResult?.habit_payout;
        if (payout && !payout.already_logged) {
            celebrateLogResult(payout, {});
        } else {
            pushToast({ kind: 'daycomplete', text: 'Workout logged 💪' });
        }
        // Return to Today so the button doesn't sit on "Logging…"; the celebration
        // overlay/toast is app-level and persists across the navigation.
        navigate('/');
    };

    const close = () => navigate('/');

    if (error) {
        return (
            <div className="workout-log-page">
                <div className="wl-error">{error}</div>
                <button className="wl-back" onClick={close}>← Back to Today</button>
            </div>
        );
    }
    if (!habit) {
        return <div className="workout-log-page"><div className="wl-loading">Loading workout…</div></div>;
    }

    return (
        <div className="workout-log-page">
            <header className="wl-header">
                <button className="wl-back" onClick={close}>←</button>
                <div className="wl-title">{habit.icon} {habit.name}</div>
                <button className="wl-edit" onClick={() => setEditing(true)}>Edit program</button>
            </header>
            <WorkoutLogger
                key={reloadKey}
                program={{ program_id: habit.program_id, name: habit.name }}
                habitId={habit.id}
                onLogged={onLogged}
                onClose={close}
            />
            {editing && (
                <ProgramBuilder
                    mode="edit"
                    programId={habit.program_id}
                    onSaved={() => { setEditing(false); setReloadKey((k) => k + 1); pushToast({ kind: 'daycomplete', text: 'Program updated' }); }}
                    onClose={() => setEditing(false)}
                />
            )}
        </div>
    );
};

export default WorkoutLogPage;
