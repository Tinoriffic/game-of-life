import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { habitService } from '../../services/habitService';
import { useFeedback } from '../feedback/FeedbackContext';
import OnboardingPicker from '../today/OnboardingPicker';
import './ManageHabitsPage.css';

const CADENCE_LABEL = (habit) => {
    if (habit.cadence_type === 'weekly') return `${habit.times_per_week}× / week`;
    if (habit.cadence_type === 'weekdays') {
        const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return (habit.weekdays || []).map((d) => names[d]).join(' ');
    }
    return 'Daily';
};

/**
 * Habit management: archive to free a slot (history retained — no data is
 * ever lost by rotating focus), restore, and add from the library.
 */
const ManageHabitsPage = () => {
    const [habits, setHabits] = useState([]);
    const [slots, setSlots] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [dragId, setDragId] = useState(null);
    const { pushToast } = useFeedback();
    const habitsRef = useRef([]);
    habitsRef.current = habits;

    const load = useCallback(async () => {
        try {
            const [allHabits, slotData] = await Promise.all([
                habitService.getHabits(true),
                habitService.getSlots()
            ]);
            setHabits(allHabits);
            setSlots(slotData);
        } catch (err) {
            console.error('Error loading habits:', err);
            pushToast({ kind: 'partial', text: 'Could not load habits' });
        }
    }, [pushToast]);

    useEffect(() => { load(); }, [load]);

    const archive = async (habit) => {
        if (!window.confirm(`Archive "${habit.name}"? Its history is kept and the slot is freed.`)) return;
        try {
            await habitService.archiveHabit(habit.id);
            pushToast({ kind: 'daycomplete', text: `"${habit.name}" archived — slot freed` });
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not archive' });
        }
    };

    const restore = async (habit) => {
        try {
            await habitService.restoreHabit(habit.id);
            pushToast({ kind: 'daycomplete', text: `"${habit.name}" is back in rotation` });
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not restore' });
        }
    };

    const editGoal = async (habit) => {
        const input = window.prompt(
            `Target ${habit.measurement_unit || ''} for "${habit.name}":`,
            habit.target_value ?? ''
        );
        if (input === null || input.trim() === '') return;
        const target_value = parseFloat(input);
        if (Number.isNaN(target_value)) {
            pushToast({ kind: 'partial', text: 'Enter a number' });
            return;
        }
        try {
            await habitService.updateHabit(habit.id, { target_value });
            pushToast({ kind: 'daycomplete', text: 'Goal updated' });
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: err.response?.data?.detail || 'Could not update goal' });
        }
    };

    const persistOrder = async (newActiveIds, archivedIds) => {
        const byId = Object.fromEntries(habits.map((h) => [h.id, h]));
        // Optimistic local reorder so it feels instant.
        setHabits([...newActiveIds.map((id) => byId[id]).filter(Boolean),
                   ...archivedIds.map((id) => byId[id]).filter(Boolean)]);
        try {
            await habitService.reorderHabits([...newActiveIds, ...archivedIds]);
            load();
        } catch (err) {
            pushToast({ kind: 'partial', text: 'Could not save the new order' });
            load();
        }
    };

    // Pointer-based drag so a single ⠿ handle works on both desktop and touch
    // (native HTML5 drag doesn't fire on touch). Listeners are attached once on
    // grab and read live data via habitsRef, so re-renders mid-drag are safe.
    const dragState = useRef(null);

    const onPointerMove = (e) => {
        const st = dragState.current;
        if (!st) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const row = el && el.closest('[data-habit-id]');
        if (!row) return;
        const overId = Number(row.getAttribute('data-habit-id'));
        if (!overId || overId === st.draggingId) return;
        const from = st.order.indexOf(st.draggingId);
        const to = st.order.indexOf(overId);
        if (from < 0 || to < 0 || from === to) return;
        st.order.splice(to, 0, st.order.splice(from, 1)[0]);
        const byId = Object.fromEntries(habitsRef.current.map((h) => [h.id, h]));
        const archivedRows = habitsRef.current.filter((h) => h.status === 'archived');
        setHabits([...st.order.map((id) => byId[id]).filter(Boolean), ...archivedRows]);
    };

    const onPointerUp = () => {
        const st = dragState.current;
        dragState.current = null;
        setDragId(null);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        if (st) {
            const archivedIds = habitsRef.current.filter((h) => h.status === 'archived').map((h) => h.id);
            persistOrder(st.order, archivedIds);
        }
    };

    const startDrag = (habit) => (e) => {
        e.preventDefault();
        dragState.current = {
            draggingId: habit.id,
            order: habits.filter((h) => h.status === 'active').map((h) => h.id),
        };
        setDragId(habit.id);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    if (showPicker) {
        return (
            <OnboardingPicker
                single
                slots={slots}
                onClose={() => setShowPicker(false)}
                onCreated={() => { setShowPicker(false); load(); }}
            />
        );
    }

    const active = habits.filter((h) => h.status === 'active');
    const archived = habits.filter((h) => h.status === 'archived');

    return (
        <div className="manage-page">
            <header className="manage-header">
                <h1>Your habits</h1>
                {slots && (
                    <span className="manage-slots">
                        {slots.used}/{slots.total} slots
                    </span>
                )}
            </header>
            <p className="manage-hint">
                Focus over hoarding: slots are limited on purpose. Level up to earn more room.
            </p>

            <button className="add-habit-button" onClick={() => setShowPicker(true)}>
                ＋ Add a habit
            </button>

            {active.length > 1 && <p className="manage-hint subtle">Drag the ⠿ handle to reorder.</p>}
            <section>
                {active.map((habit) => (
                    <div
                        className={`manage-row ${dragId === habit.id ? 'dragging' : ''}`}
                        key={habit.id}
                        data-habit-id={habit.id}
                    >
                        <span className="manage-drag" title="Drag to reorder" onPointerDown={startDrag(habit)}>⠿</span>
                        <span className="manage-icon">{habit.icon}</span>
                        <div className="manage-main">
                            <div className="manage-name">{habit.name}</div>
                            <div className="manage-cadence">
                                {CADENCE_LABEL(habit)}
                                {habit.habit_type === 'measurement' && ` · measurement (${habit.measurement_unit || 'value'})`}
                                {habit.habit_type === 'measurement' && habit.target_value != null
                                    && ` · goal ${habit.target_value}`}
                            </div>
                        </div>
                        <div className="manage-actions">
                            {habit.habit_type === 'measurement' && (
                                <button className="manage-action" onClick={() => editGoal(habit)}>
                                    {habit.target_value != null ? 'Edit goal' : 'Set goal'}
                                </button>
                            )}
                            <button className="manage-action" onClick={() => archive(habit)}>Archive</button>
                        </div>
                    </div>
                ))}
                {active.length === 0 && (
                    <p className="manage-empty">No active habits — add one above to bring your Today view alive.</p>
                )}
            </section>

            {archived.length > 0 && (
                <section>
                    <h2 className="section-label">ARCHIVED</h2>
                    {archived.map((habit) => (
                        <div className="manage-row archived" key={habit.id}>
                            <span className="manage-icon">{habit.icon}</span>
                            <div className="manage-main">
                                <div className="manage-name">{habit.name}</div>
                                <div className="manage-cadence">{CADENCE_LABEL(habit)}</div>
                            </div>
                            <button className="manage-action restore" onClick={() => restore(habit)}>Restore</button>
                        </div>
                    ))}
                </section>
            )}

            <Link to="/" className="manage-back">← Back to Today</Link>
        </div>
    );
};

export default ManageHabitsPage;
