import React, { useEffect, useState } from 'react';
import axiosInstance from '../../axios';
import { useUser } from '../player/UserContext';
import Modal from '../common/Modal';
import CreateExerciseForm from '../dashboard/fitness/workouts/CreateExerciseForm';
import ExerciseSelect from './ExerciseSelect';
import './ProgramBuilder.css';

const blankExercise = () => ({ exercise_id: '', sets: 3, recommended_reps: 8, recommended_weight: 0 });
const blankDay = () => ({ day_name: '', exercises: [] });

/**
 * Themed program builder/editor (create + edit). Both use the same nested shape:
 * { name, workout_days: [{ day_name, exercises: [{exercise_id, sets, recommended_reps, recommended_weight}] }] }.
 */
const ProgramBuilder = ({ mode = 'create', programId = null, onSaved, onClose }) => {
    const { user } = useUser();
    const [name, setName] = useState('');
    const [days, setDays] = useState([blankDay()]);
    const [library, setLibrary] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showCreateExercise, setShowCreateExercise] = useState(false);

    useEffect(() => {
        axiosInstance.get(`/exercises?user_id=${user.id}`).then((r) => setLibrary(r.data || [])).catch(() => {});
        if (mode === 'edit' && programId) {
            axiosInstance.get(`/workout-programs/${programId}`).then((r) => {
                const p = r.data;
                setName(p.name || '');
                setDays((p.workout_days || []).map((d) => ({
                    day_name: d.day_name,
                    exercises: (d.exercises || []).map((e) => ({
                        exercise_id: e.exercise_id,
                        sets: e.sets,
                        recommended_reps: e.recommended_reps || 0,
                        recommended_weight: e.recommended_weight || 0,
                    })),
                })) || [blankDay()]);
            }).catch(() => setError('Could not load this program.'));
        }
    }, [mode, programId, user.id]);

    const setDay = (di, changes) => setDays((ds) => ds.map((d, i) => (i === di ? { ...d, ...changes } : d)));
    const addDay = () => setDays((ds) => [...ds, blankDay()]);
    const removeDay = (di) => setDays((ds) => ds.filter((_, i) => i !== di));
    const addExercise = (di) => setDays((ds) => ds.map((d, i) => (i === di ? { ...d, exercises: [...d.exercises, blankExercise()] } : d)));
    const setExercise = (di, ei, changes) => setDays((ds) => ds.map((d, i) =>
        (i === di ? { ...d, exercises: d.exercises.map((e, j) => (j === ei ? { ...e, ...changes } : e)) } : d)));
    const removeExercise = (di, ei) => setDays((ds) => ds.map((d, i) =>
        (i === di ? { ...d, exercises: d.exercises.filter((_, j) => j !== ei) } : d)));

    const save = async () => {
        setError('');
        if (!name.trim()) { setError('Give your program a name.'); return; }
        const payloadDays = days
            .filter((d) => d.day_name.trim())
            .map((d) => ({
                day_name: d.day_name.trim(),
                exercises: d.exercises.filter((e) => e.exercise_id).map((e) => ({
                    exercise_id: Number(e.exercise_id),
                    sets: Number(e.sets) || 1,
                    recommended_reps: Number(e.recommended_reps) || 0,
                    recommended_weight: Number(e.recommended_weight) || 0,
                })),
            }));
        if (!payloadDays.length) { setError('Add at least one day with a name.'); return; }

        const payload = { name: name.trim(), workout_days: payloadDays };
        setSaving(true);
        try {
            const res = mode === 'edit' && programId
                ? await axiosInstance.put(`/workout-programs/${programId}`, payload)
                : await axiosInstance.post(`/users/${user.id}/workout-programs`, payload);
            onSaved?.(res.data || { program_id: programId, name: payload.name });
        } catch (e) {
            setError(e.response?.data?.detail || 'Could not save the program.');
            setSaving(false);
        }
    };

    const createExercise = async (data) => {
        try {
            const r = await axiosInstance.post(`/exercises?user_id=${user.id}`, data);
            setLibrary((l) => [...l, r.data]);
        } catch { /* surfaced inside the form */ }
        setShowCreateExercise(false);
    };

    return (
        <div className="pbuild-overlay" onClick={onClose}>
            <div className="pbuild" onClick={(e) => e.stopPropagation()}>
                <div className="pbuild-handle" />
                <h2 className="pbuild-title">{mode === 'edit' ? 'Edit program' : 'Create a workout program'}</h2>
                <input className="pbuild-name" placeholder="Program name (e.g. PPL)"
                    value={name} onChange={(e) => setName(e.target.value)} />

                {days.map((day, di) => (
                    <div className="pbuild-day" key={di}>
                        <div className="pbuild-day-head">
                            <input className="pbuild-day-name" placeholder="Day (e.g. Push)"
                                value={day.day_name} onChange={(e) => setDay(di, { day_name: e.target.value })} />
                            {days.length > 1 && <button className="pbuild-x" onClick={() => removeDay(di)}>✕</button>}
                        </div>
                        {day.exercises.map((ex, ei) => (
                            <div className="pbuild-ex" key={ei}>
                                <ExerciseSelect
                                    value={ex.exercise_id}
                                    options={library}
                                    onChange={(id) => setExercise(di, ei, { exercise_id: id })}
                                />
                                <div className="pbuild-ex-nums">
                                    <label>Sets<input type="number" value={ex.sets}
                                        onChange={(e) => setExercise(di, ei, { sets: e.target.value })} /></label>
                                    <label>Reps<input type="number" value={ex.recommended_reps}
                                        onChange={(e) => setExercise(di, ei, { recommended_reps: e.target.value })} /></label>
                                    <label>Weight<input type="number" value={ex.recommended_weight}
                                        onChange={(e) => setExercise(di, ei, { recommended_weight: e.target.value })} /></label>
                                    <button className="pbuild-x" onClick={() => removeExercise(di, ei)}>✕</button>
                                </div>
                            </div>
                        ))}
                        <div className="pbuild-day-actions">
                            <button className="pbuild-add" onClick={() => addExercise(di)}>+ Exercise</button>
                            <button className="pbuild-add ghost" onClick={() => setShowCreateExercise(true)}>+ New exercise</button>
                        </div>
                    </div>
                ))}

                <button className="pbuild-add wide" onClick={addDay}>+ Add day</button>
                {error && <div className="pbuild-error">{error}</div>}

                <div className="pbuild-actions">
                    <button className="pbuild-cancel" onClick={onClose}>Cancel</button>
                    <button className="pbuild-save" onClick={save} disabled={saving}>
                        {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create program'}
                    </button>
                </div>

                {showCreateExercise && (
                    <Modal onClose={() => setShowCreateExercise(false)}>
                        <CreateExerciseForm onSave={createExercise} onCancel={() => setShowCreateExercise(false)} userId={user.id} />
                    </Modal>
                )}
            </div>
        </div>
    );
};

export default ProgramBuilder;
