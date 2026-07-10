import React, { useCallback, useEffect, useState } from 'react';
import { focusService } from '../../services/focusService';
import { habitService } from '../../services/habitService';
import './Focus.css';

// Fixed assignment order, never cycled per-render; colors stick to the
// category (entity), not its position. Hues luminance-matched for the dark
// surface (CVD ΔE 19.2, contrast ≥3:1 - validated).
const PALETTE = ['#ffd700', '#4cc9f0', '#ff6ec7', '#06d6a0', '#ff9e00', '#b388ff'];

/**
 * Manage focus categories: create, rename, archive, and link each one to a
 * habit (the click<->habit bridge). Unlinked categories are clicks-only -
 * for work that isn't habit-shaped or isn't worth a habit slot.
 */
const CategoryManager = ({ onClose }) => {
    const [categories, setCategories] = useState(null);
    const [habits, setHabits] = useState([]);
    const [newName, setNewName] = useState('');
    const [newHabitId, setNewHabitId] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        const [cats, habitList] = await Promise.all([
            focusService.getCategories(true),
            habitService.getHabits(true),
        ]);
        setCategories(cats);
        setHabits(habitList);
    }, []);

    useEffect(() => { load().catch(() => setError('Could not load categories')); }, [load]);

    const linkedIds = new Set((categories || [])
        .filter((c) => c.linked_habit_id)
        .map((c) => c.linked_habit_id));

    const habitOptions = (current) => habits
        .filter((h) => h.status === 'active' || h.id === current)
        .map((h) => (
            <option key={h.id} value={h.id}
                    disabled={linkedIds.has(h.id) && h.id !== current}>
                {h.name}{h.status === 'archived' ? ' (archived)' : ''}
            </option>
        ));

    const create = async (e) => {
        e.preventDefault();
        if (!newName.trim() || busy) return;
        setBusy(true);
        setError(null);
        try {
            await focusService.createCategory({
                name: newName.trim(),
                color: PALETTE[(categories?.length || 0) % PALETTE.length],
                linked_habit_id: newHabitId ? Number(newHabitId) : null,
            });
            setNewName('');
            setNewHabitId('');
            await load();
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not create category');
        } finally {
            setBusy(false);
        }
    };

    const patch = async (categoryId, changes) => {
        setError(null);
        try {
            await focusService.updateCategory(categoryId, changes);
            await load();
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not update category');
        }
    };

    return (
        <div className="focus-overlay" onClick={onClose}>
            <div className="focus-sheet manager-sheet" onClick={(e) => e.stopPropagation()}>
                <h3 className="sheet-heading">Focus categories</h3>
                {error && <div className="manager-error">{error}</div>}

                {!categories ? <div className="focus-skeleton">Loading…</div> : (
                    <ul className="manager-list">
                        {categories.map((category) => (
                            <li key={category.id}
                                className={`manager-row ${category.status === 'archived' ? 'archived' : ''}`}>
                                <span className="manager-dot" style={{ background: category.color || '#ffd700' }} />
                                <div className="manager-main">
                                    <span className="manager-name">{category.name}</span>
                                    <select
                                        className="manager-link"
                                        value={category.linked_habit_id || ''}
                                        onChange={(e) => patch(category.id, {
                                            linked_habit_id: e.target.value ? Number(e.target.value) : null
                                        })}
                                    >
                                        <option value="">No linked habit (clicks only)</option>
                                        {habitOptions(category.linked_habit_id)}
                                    </select>
                                    {category.linked_habit?.status === 'archived' && (
                                        <span className="manager-warn">
                                            Linked habit is archived - still pays XP, but is off your Today view.
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="btn-link"
                                    onClick={() => patch(category.id, {
                                        status: category.status === 'archived' ? 'active' : 'archived'
                                    })}
                                >
                                    {category.status === 'archived' ? 'Restore' : 'Archive'}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <form className="manager-add" onSubmit={create}>
                    <input
                        type="text" maxLength={60} placeholder="New category (e.g. DS&A)"
                        value={newName} onChange={(e) => setNewName(e.target.value)}
                    />
                    <select value={newHabitId} onChange={(e) => setNewHabitId(e.target.value)}>
                        <option value="">No linked habit</option>
                        {habitOptions(null)}
                    </select>
                    <button type="submit" className="btn-gold" disabled={!newName.trim() || busy}>Add</button>
                </form>

                <div className="sheet-actions">
                    <button className="btn-ghost" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default CategoryManager;
