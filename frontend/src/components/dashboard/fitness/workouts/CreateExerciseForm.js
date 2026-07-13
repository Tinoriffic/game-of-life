import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import axiosInstance from '../../../../axios';
import './CreateExerciseForm.css';

// Themed react-select styling (dark navy + gold, matches the app).
const selectStyles = {
  control: (b, s) => ({
    ...b, background: 'rgba(0,0,0,0.4)', minHeight: 44,
    borderColor: s.isFocused ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.18)',
    borderRadius: 10, boxShadow: 'none', ':hover': { borderColor: 'rgba(255,215,0,0.4)' },
  }),
  menu: (b) => ({ ...b, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', zIndex: 30 }),
  menuList: (b) => ({ ...b, background: '#1a1a2e' }),
  option: (b, s) => ({
    ...b, cursor: 'pointer', color: '#f8f8f2',
    background: s.isSelected ? 'rgba(255,215,0,0.25)' : s.isFocused ? 'rgba(255,255,255,0.08)' : 'transparent',
  }),
  singleValue: (b) => ({ ...b, color: '#f8f8f2' }),
  multiValue: (b) => ({ ...b, background: 'rgba(255,215,0,0.18)' }),
  multiValueLabel: (b) => ({ ...b, color: '#ffd700' }),
  multiValueRemove: (b) => ({ ...b, color: '#ffd700', ':hover': { background: 'rgba(255,215,0,0.35)', color: '#fff' } }),
  input: (b) => ({ ...b, color: '#f8f8f2' }),
  placeholder: (b) => ({ ...b, color: '#8a8a8a' }),
  indicatorSeparator: (b) => ({ ...b, background: 'rgba(255,255,255,0.15)' }),
  dropdownIndicator: (b) => ({ ...b, color: '#9a9a9a' }),
};

const byName = (opts, name) => opts.find((o) => o.label === name);

/**
 * Create a new exercise. Minimal by default - just a name + how it's tracked - so
 * a user can add "Reverse Flys, reps" and go. Everything else (equipment, difficulty,
 * muscles worked...) lives under "More details" and is optional, pre-filled with
 * sensible defaults so the minimal path always saves.
 */
const CreateExerciseForm = ({ onSave, onCancel }) => {
  const [lookup, setLookup] = useState({
    categories: [], muscleGroups: [], equipment: [], difficultyLevels: [], exerciseTypes: [],
  });
  const [form, setForm] = useState({
    name: '',
    tracking_type: 'reps',
    muscle_group_id: null,
    category_id: null,
    equipment_id: null,
    difficulty_level_id: null,
    exercise_type_id: null,
    primary_muscles: [],
    secondary_muscles: [],
    description: '',
    instructions: '',
  });
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axiosInstance.get('/exercises/lookup-data').then(({ data }) => {
      const categories = data.categories.map((c) => ({ value: c.id, label: c.name }));
      const muscleGroups = data.muscleGroups.map((m) => ({ value: m.id, label: m.name }));
      const equipment = data.equipment.map((e) => ({ value: e.id, label: e.name }));
      const difficultyLevels = data.difficultyLevels.map((d) => ({ value: d.id, label: d.level }));
      const exerciseTypes = data.exerciseTypes.map((t) => ({ value: t.id, label: t.type }));
      setLookup({ categories, muscleGroups, equipment, difficultyLevels, exerciseTypes });
      // Preselect neutral/sensible defaults so name + tracking alone can save.
      setForm((f) => ({
        ...f,
        muscle_group_id: (byName(muscleGroups, 'Other') || muscleGroups[0])?.value ?? null,
        category_id: categories[0]?.value ?? null,
        equipment_id: (byName(equipment, 'Other') || equipment[0])?.value ?? null,
        difficulty_level_id: (byName(difficultyLevels, 'Beginner') || difficultyLevels[0])?.value ?? null,
        exercise_type_id: exerciseTypes[0]?.value ?? null,
      }));
    }).catch(() => setError('Could not load exercise options. Try again.'));
  }, []);

  const ready = lookup.muscleGroups.length > 0;
  const muscleOptions = useMemo(
    () => lookup.muscleGroups.filter((m) => m.label !== 'Other'),
    [lookup.muscleGroups]
  );

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const selected = (opts, id) => opts.find((o) => o.value === id) || null;

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) { setError('Give the exercise a name.'); return; }
    if (!ready) { setError('Still loading options - one sec.'); return; }
    setSubmitting(true);
    try {
      await onSave({
        name: form.name.trim(),
        tracking_type: form.tracking_type,
        muscle_group_id: form.muscle_group_id,
        category_id: form.category_id,
        equipment_id: form.equipment_id,
        difficulty_level_id: form.difficulty_level_id,
        exercise_type_id: form.exercise_type_id,
        primary_muscles: form.primary_muscles.map((o) => o.label).join(', ') || null,
        secondary_muscles: form.secondary_muscles.map((o) => o.label).join(', ') || null,
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
      });
      setSuccess('Exercise created ✓');
      setTimeout(onCancel, 900);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create exercise. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="cxf">
      <h2 className="cxf-title">New Exercise</h2>

      {error && <div className="cxf-banner cxf-error">{error}</div>}
      {success && <div className="cxf-banner cxf-success">{success}</div>}

      {/* Core: name + how it's tracked + muscle group. That's all it takes. */}
      <label className="cxf-field">
        <span className="cxf-label">Name</span>
        <input
          className="cxf-input"
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Reverse Flys"
          autoFocus
        />
      </label>

      <div className="cxf-field">
        <span className="cxf-label">Tracking</span>
        <div className="cxf-toggle">
          <button
            type="button"
            className={form.tracking_type === 'reps' ? 'active' : ''}
            onClick={() => set('tracking_type', 'reps')}
          >
            Reps × Weight
          </button>
          <button
            type="button"
            className={form.tracking_type === 'time' ? 'active' : ''}
            onClick={() => set('tracking_type', 'time')}
          >
            Time (plank, carries)
          </button>
        </div>
      </div>

      <label className="cxf-field">
        <span className="cxf-label">Muscle group</span>
        <Select
          options={lookup.muscleGroups}
          value={selected(lookup.muscleGroups, form.muscle_group_id)}
          onChange={(o) => set('muscle_group_id', o?.value ?? null)}
          styles={selectStyles}
          placeholder="Select..."
          isSearchable={false}
        />
      </label>

      <button type="button" className="cxf-more" onClick={() => setShowMore((v) => !v)}>
        {showMore ? '▾ Hide details' : '▸ More details (optional)'}
      </button>

      {showMore && (
        <div className="cxf-more-panel">
          <label className="cxf-field">
            <span className="cxf-label">Primary muscles <em>optional</em></span>
            <Select
              isMulti
              options={muscleOptions}
              value={form.primary_muscles}
              onChange={(v) => set('primary_muscles', v || [])}
              styles={selectStyles}
              placeholder="Add muscles..."
            />
          </label>

          <label className="cxf-field">
            <span className="cxf-label">Secondary muscles <em>optional</em></span>
            <Select
              isMulti
              options={muscleOptions}
              value={form.secondary_muscles}
              onChange={(v) => set('secondary_muscles', v || [])}
              styles={selectStyles}
              placeholder="Add muscles..."
            />
          </label>

          <div className="cxf-row">
            <label className="cxf-field">
              <span className="cxf-label">Equipment <em>optional</em></span>
              <Select
                options={lookup.equipment}
                value={selected(lookup.equipment, form.equipment_id)}
                onChange={(o) => set('equipment_id', o?.value ?? null)}
                styles={selectStyles} isSearchable={false}
              />
            </label>
            <label className="cxf-field">
              <span className="cxf-label">Difficulty <em>optional</em></span>
              <Select
                options={lookup.difficultyLevels}
                value={selected(lookup.difficultyLevels, form.difficulty_level_id)}
                onChange={(o) => set('difficulty_level_id', o?.value ?? null)}
                styles={selectStyles} isSearchable={false}
              />
            </label>
          </div>

          <div className="cxf-row">
            <label className="cxf-field">
              <span className="cxf-label">Category <em>optional</em></span>
              <Select
                options={lookup.categories}
                value={selected(lookup.categories, form.category_id)}
                onChange={(o) => set('category_id', o?.value ?? null)}
                styles={selectStyles} isSearchable={false}
              />
            </label>
            <label className="cxf-field">
              <span className="cxf-label">Type <em>optional</em></span>
              <Select
                options={lookup.exerciseTypes}
                value={selected(lookup.exerciseTypes, form.exercise_type_id)}
                onChange={(o) => set('exercise_type_id', o?.value ?? null)}
                styles={selectStyles} isSearchable={false}
              />
            </label>
          </div>

          <label className="cxf-field">
            <span className="cxf-label">Description <em>optional</em></span>
            <textarea
              className="cxf-input cxf-textarea"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </label>

          <label className="cxf-field">
            <span className="cxf-label">Instructions <em>optional</em></span>
            <textarea
              className="cxf-input cxf-textarea"
              value={form.instructions}
              onChange={(e) => set('instructions', e.target.value)}
              placeholder="How to perform it..."
            />
          </label>
        </div>
      )}

      <div className="cxf-actions">
        <button type="button" className="cxf-cancel" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="button" className="cxf-save" onClick={handleSubmit} disabled={submitting || !ready}>
          {submitting ? 'Saving…' : 'Save exercise'}
        </button>
      </div>
    </div>
  );
};

export default CreateExerciseForm;
